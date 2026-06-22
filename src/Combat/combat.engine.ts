/**
 * Spec 25 — Hazard-Pattern Combat: the engine (§4, §9).
 *
 * `resolveCombatPhase` replaces `resolveCombatRound` as the primary combat
 * driver. Every verb is a skill card; the player rolls four stance dice, plays
 * cards, and fills two Pressure Tracks that are the only practical win
 * conditions. The legacy resolver, the effects engine, the skill engine, and
 * all 112 effects are UNCHANGED — this engine *drives* `executeSkill` /
 * `applyEffect` / the Phase 125 resolution math differently.
 *
 * Card bottom actions execute through the unchanged `executeSkill`: the stance
 * die authorizes the skill's heart/body/mind resource cost (basic-attack token
 * generation is gone), while Fallacy/Paradox costs must be pre-banked — that is
 * the Tier-3 gate (§4.3, §6). Landed `effect-applied` events drive the pressure
 * tracks (mirroring `effect-resolution.ts`) and the self-reinforcing die loop
 * (§4.7).
 *
 * Randomness flows through the seedable global RNG singleton; pass `seed` to
 * `initializeCombatEncounter` for a reproducible encounter (hermetic tests +
 * Monte-Carlo sim).
 */

import { deepClone } from '../Utils';
import { getRng, setSeed } from '../Utils/rng';
import { lookupEffect, applyEffect } from '../Effects';
import type { Effect, ActiveEffect } from '../Effects/types';
import type { Character } from '../Character/types';
import type { Enemy } from '../Enemy/types';
import { getSkillById } from '../Skills/skill.library';
import { executeSkill, calculateSkillDamage } from '../Skills/skill.engine';
import type { Skill, CombatResources } from '../Skills/types';
import type { CombatState, Stance } from './types';
import { applyDamage, heal, isDefeated } from './health';
import { processRoundStartEffects, processRoundEndEffects } from './effects';
import {
    TURN_DICE_COUNT, rollTurnDice, dieHasStance,
    combatDieCanPower, availableDiceFor, spendDice, refreshOneDie, availableDieCount,
} from './combat.dice';
import {
    COMBAT_HAND_SIZE, buildCombatDeck, drawCombatCards, shuffleCombatDeck,
} from './combat.deck';
import {
    toCombatCard, cardStanceColor, effectPressure,
} from './combat.cards';
import {
    pressureForLanded, momentumCarry, dotErosionReached, controlSaturationReached,
    recordAttribution, marginalPressure, SYNERGY_BONUS,
} from './combat.pressure';
import { getThreatSequence, deriveGlobalThresholds } from './combat.threat';
import { getSignatureSkill, applySignatureSkill, playerArchetype, SIGNATURE_KITS } from './combat.signature';
import type {
    CombatCard, CombatDieColor, CombatEncounterState, CombatEvent, CardPlay,
    CombatManaDie, CombatPhaseResult, CombatTransition, LandedEffect, CombatReadResult,
} from './combat.encounter.types';

// ── Tunable constants ────────────────────────────────────────────────────────

/** Flat pressure a free (top) action contributes to its track (§4.3, §6 Rule 4). */
export const TOP_ACTION_PRESSURE = 1;
/** Control-threshold reduction granted by the Befriend card (§6 Q6). */
export const BEFRIEND_THRESHOLD_REDUCTION = 3;
/** Safety cap on total phases processed — prevents a degenerate stalemate loop. */
const MAX_PHASES = 60;

// ── Spec 26b — read & color-match tuning ─────────────────────────────────────

/** Pressure multipliers by stance-read result (drafted die vs hidden enemy stance). */
export const READ_PRESSURE_MULT: Record<CombatReadResult, number> = {
    advantage: 1.5, neutral: 1.0, disadvantage: 0.5, none: 1.0,
};
/** Conviction granted by the unpicked die each draft (§1). */
export const CONVICTION_PER_UNPICKED_DIE = 1;
/** Bonus Conviction for winning the stance read (§1 — reading fuels power). */
export const CONVICTION_READ_WIN_BONUS = 1;
/** Flat pressure bonus when the drafted die color matches the card's stance (§3). */
export const COLOR_MATCH_PRESSURE_BONUS = 2;
/** HARD (§6): an Overwhelmed phase's threat damage is scaled up so failed
 *  clears genuinely threaten the player over a fight. */
export const THREAT_DAMAGE_SCALE = 1.05;
/** HARD (§6): Conviction is capped so a long grind can't bank a Signature spam. */
export const CONVICTION_CAP = 12;

const EMPTY_RESOURCES: CombatResources = { heart: 0, body: 0, mind: 0, fallacy: 0, paradox: 0 };
const defaultRng = (): number => getRng().random();

// ── Skill / lookup adapters ──────────────────────────────────────────────────

const lookupSkill = (id: string): Skill | undefined => getSkillById(id);
const lookupEffectDef = (id: string): Effect | undefined => lookupEffect(id);

/** Projects a card id into its card view (skill or synthetic). */
export function getCard(cardId: string): CombatCard | null {
    return toCombatCard(cardId, lookupSkill, lookupEffectDef);
}

// ── RPS advantage — per-phase die-cost scaling (§4.8) ────────────────────────

/** Heart > Body > Mind > Heart. True if stance `a` beats stance `b`. */
export function stanceBeats(a: Stance, b: Stance): boolean {
    return (a === 'heart' && b === 'body')
        || (a === 'body' && b === 'mind')
        || (a === 'mind' && b === 'heart');
}

export interface CardDieCost {
    cost: number;
    advantage: 'advantage' | 'neutral' | 'disadvantage';
}

/**
 * Resolves the die cost of a card's bottom action against the current enemy
 * phase stance (§4.8). Advantage → free (0 dice). Neutral → 1 die. Disadvantage
 * → 2 dice. Wild cards are always neutral.
 */
export function resolveCardDieCost(cardColor: CombatDieColor, enemyPhaseStance: Stance): CardDieCost {
    if (cardColor === 'wild' || cardColor === 'x') return { cost: 1, advantage: 'neutral' };
    const stance = cardColor as Stance;
    if (stanceBeats(stance, enemyPhaseStance)) return { cost: 0, advantage: 'advantage' };
    if (stanceBeats(enemyPhaseStance, stance)) return { cost: 2, advantage: 'disadvantage' };
    return { cost: 1, advantage: 'neutral' };
}

/**
 * Spec 26b §1 — the hidden-stance READ. The drafted die's stance contests the
 * enemy's hidden phase stance (Heart > Body > Mind > Heart). A Wild/X die has no
 * stance → `none` (no contest, no bonus). Winning the read amplifies the powered
 * card and grants bonus Conviction.
 */
export function resolveRead(dieColor: CombatDieColor, enemyPhaseStance: Stance): CombatReadResult {
    if (!dieHasStance(dieColor)) return 'none';
    const stance = dieColor as Stance;
    if (stanceBeats(stance, enemyPhaseStance)) return 'advantage';
    if (stanceBeats(enemyPhaseStance, stance)) return 'disadvantage';
    return 'neutral';
}

/** Maps a read result to the legacy advantage label used in card-played events. */
function readToAdvantage(read: CombatReadResult): 'advantage' | 'neutral' | 'disadvantage' {
    return read === 'advantage' ? 'advantage' : read === 'disadvantage' ? 'disadvantage' : 'neutral';
}

// ── Internal helpers ─────────────────────────────────────────────────────────

/** Builds the legacy `CombatState` shim `executeSkill` needs. */
function skillShim(enc: CombatEncounterState): CombatState {
    return {
        active: true,
        phase: 'resolving',
        round: enc.round,
        friendshipCounter: 0,
        player: enc.player,
        enemy: enc.enemy,
        playerChoice: {},
        enemyChoice: {},
        log: [],
        combatResources: enc.combatResources,
    };
}

/** Heart/body/mind portion of a skill's cost — granted just-in-time by the die
 *  spend (§4.3). Fallacy/Paradox are NOT granted; they must be pre-banked. */
function grantStanceCost(resources: CombatResources, skill: Skill): CombatResources {
    const c = skill.resourceCost;
    return {
        ...resources,
        heart: resources.heart + (c.heart ?? 0),
        body: resources.body + (c.body ?? 0),
        mind: resources.mind + (c.mind ?? 0),
    };
}

/** Snapshot of enemy effect intensities (for the meaningful-land / refresh check). */
function intensityMap(effects: readonly ActiveEffect[]): Record<string, number> {
    const m: Record<string, number> = {};
    for (const e of effects) m[e.effectId] = Math.max(m[e.effectId] ?? 0, e.intensity);
    return m;
}

/** True when the enemy carries BOTH a DoT-track and a Control-track status at
 *  once — the diversity-synergy condition (Spec 26b tuning §2). */
function enemyHasDiverseStatus(effects: readonly ActiveEffect[]): boolean {
    let hasDot = false, hasControl = false;
    for (const ae of effects) {
        const def = lookupEffectDef(ae.effectId);
        if (!def) continue;
        const t = effectPressure(def, ae.intensity, ae.remainingDuration).track;
        if (t === 'dot') hasDot = true;
        else if (t === 'control') hasControl = true;
        if (hasDot && hasControl) return true;
    }
    return false;
}

const currentPhaseStance = (enc: CombatEncounterState): Stance => {
    const phase = enc.threatPhases[Math.min(enc.currentPhaseIndex, enc.threatPhases.length - 1)];
    return phase?.enemyStance ?? 'heart';
};

// ── Initialization (§9) ──────────────────────────────────────────────────────

/**
 * Builds a fresh `CombatEncounterState`. Combatants are deep-cloned (mutations
 * stay inside the encounter). Dice are NOT rolled yet — the state opens in the
 * `reveal` phase with an opening hand drawn, mirroring Hazard's route-select →
 * rolling → playing flow. Call `rollEncounterDice` to advance.
 */
export function initializeCombatEncounter(
    player: Character,
    enemy: Enemy,
    playerDeck?: string[],
    seed?: number,
): CombatEncounterState {
    if (seed !== undefined) setSeed(seed);

    const clonedPlayer = deepClone(player);
    const clonedEnemy = deepClone(enemy);
    const deck = playerDeck && playerDeck.length > 0 ? playerDeck.slice() : buildCombatDeck(clonedPlayer);

    const threatPhases = getThreatSequence(clonedEnemy);
    const { dotThreshold, controlThreshold } = deriveGlobalThresholds(threatPhases);

    // Draw the opening hand (5) from a shuffled deck.
    const shuffled = shuffleCombatDeck(deck);
    const draw = drawCombatCards(shuffled, [], deck, COMBAT_HAND_SIZE);

    let uid = 0;
    const hand = draw.drawn.map(cardId => ({ uid: `c${++uid}`, cardId }));

    return {
        phase: 'reveal',
        enemy: clonedEnemy,
        player: clonedPlayer,
        dice: [],
        draftedDieId: null,
        turn: 0,
        conviction: 0,
        revealedStances: [],
        lastRead: 'none',
        archetype: playerArchetype(clonedPlayer),
        signatures: SIGNATURE_KITS[playerArchetype(clonedPlayer)],
        deck,
        drawPile: draw.drawPile,
        discard: draw.discard,
        hand,
        persistentZone: [],
        threatPhases,
        threatMarks: threatPhases.map(() => 'pending'),
        currentPhaseIndex: 0,
        pressureTracks: { dot: 0, control: 0, dotThreshold, controlThreshold },
        phaseProgress: { dot: 0, control: 0 },
        momentumCarry: { dot: 0, control: 0 },
        phaseResults: [],
        combatResources: { ...EMPTY_RESOURCES, ...seededResources(clonedPlayer) },
        round: 1,
        attribution: {},
        effectApplyCounts: {},
        carriedDie: null,
        directDamageDealt: 0,
        log: [],
        finalOutcome: null,
        seed,
    };
}

/** Seeds the Fallacy/Paradox bank from equipment carry, mirroring the legacy
 *  `initializeCombat` (so banked tokens from a prior won combat carry in). */
function seededResources(player: Character): Partial<CombatResources> {
    const carry = player.carriedResources ?? {};
    return { fallacy: carry.fallacy ?? 0, paradox: carry.paradox ?? 0 };
}

/**
 * Back-compat shim (Spec 25 public API): opens phase-play and starts the first
 * turn. The new granular path is `startTurn` → `draftStanceDie` → play → `endTurn`.
 */
export function rollEncounterDice(
    state: CombatEncounterState,
    rng: () => number = defaultRng,
): CombatTransition {
    if (state.phase !== 'reveal' && state.phase !== 'dice-roll') {
        // Already in play — just ensure the current turn has dice.
        if (state.phase === 'phase-play' && state.dice.length === 0) return startTurn(state, rng);
        return { state, events: [] };
    }
    const opened: CombatEncounterState = { ...state, phase: 'phase-play' };
    return startTurn(opened, rng);
}

/**
 * Spec 26b §1 — starts a turn: rolls THIS turn's 2-die draft pool. Clears any
 * prior draft. No-op unless in phase-play with no live dice/draft.
 */
export function startTurn(
    state: CombatEncounterState,
    rng: () => number = defaultRng,
): CombatTransition {
    if (state.phase !== 'phase-play') return { state, events: [] };
    if (state.draftedDieId !== null) return { state, events: [] }; // already drafted this turn
    const turn = state.turn + 1;
    let dice = rollTurnDice(turn, TURN_DICE_COUNT, rng);
    // Spec 26b tuning §3 — a carried (unspent) die from last turn isn't wasted:
    // it takes one slot in the new pool so a good die persists.
    let carriedDie = state.carriedDie;
    if (carriedDie) {
        dice = dice.slice();
        dice[0] = { id: `t${turn}-d0`, color: carriedDie, state: carriedDie === 'x' ? 'locked' : 'available', temporary: false };
        carriedDie = null;
    }
    const next: CombatEncounterState = { ...state, dice, draftedDieId: null, turn, lastRead: 'none', carriedDie };
    const events: CombatEvent[] = [
        { kind: 'turn-dice-rolled', turn, dice },
        // Mirror the legacy event so existing presenters keep working.
        { kind: 'dice-rolled', dice },
    ];
    return { state: withLog(next, events), events };
}

/**
 * Spec 26b §1 — drafts one of this turn's two dice as the STANCE. The unpicked
 * die converts to +1 Conviction; winning the hidden-stance read grants a bonus
 * Conviction and reveals the phase stance.
 */
export function draftStanceDie(state: CombatEncounterState, dieId: string): CombatTransition {
    if (state.phase !== 'phase-play') return { state, events: [] };
    if (state.draftedDieId !== null) return { state, events: [] };
    const drafted = state.dice.find(d => d.id === dieId);
    if (!drafted) return { state, events: [] };

    const events: CombatEvent[] = [];
    const enemyStance = currentPhaseStance(state);
    const read = resolveRead(drafted.color, enemyStance);

    // The drafted die becomes the single available power source; an X draft stays
    // locked (can't power). The unpicked die converts to Conviction.
    const dice = state.dice.map(d => {
        if (d.id === dieId) return { ...d, state: drafted.color === 'x' ? ('locked' as const) : ('available' as const) };
        return { ...d, state: 'spent' as const }; // unpicked → consumed for Conviction
    });

    let conviction = Math.min(CONVICTION_CAP, state.conviction + CONVICTION_PER_UNPICKED_DIE);
    events.push({ kind: 'die-drafted', dieId, color: drafted.color, read });
    events.push({ kind: 'conviction-gained', amount: CONVICTION_PER_UNPICKED_DIE, total: conviction, reason: 'unpicked-die' });
    if (read === 'advantage') {
        conviction = Math.min(CONVICTION_CAP, conviction + CONVICTION_READ_WIN_BONUS);
        events.push({ kind: 'conviction-gained', amount: CONVICTION_READ_WIN_BONUS, total: conviction, reason: 'read-win' });
    }

    // Reveal the phase's hidden stance on first contest.
    const idx = Math.min(state.currentPhaseIndex, state.threatPhases.length - 1);
    const revealedStances = state.revealedStances.includes(idx) ? state.revealedStances : [...state.revealedStances, idx];
    if (!state.revealedStances.includes(idx)) {
        events.push({ kind: 'stance-revealed', phaseIndex: idx, stance: enemyStance });
    }
    events.push({ kind: 'read-result', stance: drafted.color, enemyStance, result: read });

    const next: CombatEncounterState = {
        ...state, dice, draftedDieId: dieId, conviction, revealedStances, lastRead: read,
    };
    return { state: withLog(next, events), events };
}

/** Spec 26b §1 — ends the turn: clears the draft so the next turn can roll. An
 *  unspent (still-available, non-X) drafted die is carried into the next roll. */
export function endTurn(state: CombatEncounterState): CombatTransition {
    if (state.phase !== 'phase-play') return { state, events: [] };
    const d = draftedDie(state);
    const carriedDie = d && d.state === 'available' && d.color !== 'x' ? d.color : null;
    const next: CombatEncounterState = { ...state, dice: [], draftedDieId: null, lastRead: 'none', carriedDie };
    return { state: next, events: [] };
}

/** The drafted stance die for this turn (or null). */
function draftedDie(state: CombatEncounterState): CombatManaDie | null {
    if (!state.draftedDieId) return null;
    return state.dice.find(d => d.id === state.draftedDieId) ?? null;
}

function withLog(state: CombatEncounterState, events: CombatEvent[]): CombatEncounterState {
    return events.length ? { ...state, log: [...state.log, ...events] } : state;
}

// ── Card play (§9 playCombatCard) ────────────────────────────────────────────

/**
 * Plays one card from hand. `useBottom` powers the full effect (costs dice via
 * RPS scaling, executes the skill, drives pressure + the die-refresh loop); the
 * free top action contributes a weak flat pressure with no die.
 */
export function playCombatCard(
    state: CombatEncounterState,
    cardRef: { uid?: string; cardId?: string },
    useBottom: boolean,
    dieId?: string,
    rng: () => number = defaultRng,
): CombatTransition {
    if (state.phase !== 'phase-play') return { state, events: [] };

    const entry = cardRef.uid
        ? state.hand.find(h => h.uid === cardRef.uid)
        : state.hand.find(h => h.cardId === cardRef.cardId);
    if (!entry) return { state, events: [] };

    const card = getCard(entry.cardId);
    if (!card) return { state, events: [] };

    // Retreat is synthetic — handled before the skill path.
    if (card.verbClass === 'retreat') {
        return playRetreat(state, entry.uid, useBottom);
    }

    return useBottom
        ? playBottomAction(state, entry.uid, card, dieId, rng)
        : playTopAction(state, entry.uid, card, rng);
}

/**
 * Spec 26b — scrap a hand card for +1 Conviction. Turns a dead draw into resolve
 * toward a Signature Skill (the agency lever through a bad hand). Phase-play only.
 */
export function discardCombatCard(state: CombatEncounterState, uid: string): CombatTransition {
    if (state.phase !== 'phase-play') return { state, events: [] };
    const entry = state.hand.find(h => h.uid === uid);
    if (!entry) return { state, events: [] };
    const conviction = Math.min(CONVICTION_CAP, state.conviction + 1);
    const next: CombatEncounterState = {
        ...state,
        hand: state.hand.filter(h => h.uid !== uid),
        discard: [...state.discard, entry.cardId],
        conviction,
    };
    const events: CombatEvent[] = [{ kind: 'conviction-gained', amount: 1, total: conviction, reason: 'effect' }];
    return { state: withLog(next, events), events };
}

/** Removes a hand entry to the discard. */
function discardEntry(state: CombatEncounterState, uid: string): CombatEncounterState {
    const entry = state.hand.find(h => h.uid === uid);
    if (!entry) return state;
    return {
        ...state,
        hand: state.hand.filter(h => h.uid !== uid),
        discard: [...state.discard, entry.cardId],
    };
}

function playRetreat(state: CombatEncounterState, uid: string, useBottom: boolean): CombatTransition {
    if (useBottom) {
        // Flee: spend all available dice, end combat as retreat (§12 Q2).
        const dice = state.dice.map(d => (d.state === 'available' ? { ...d, state: 'spent' as const } : d));
        const ended: CombatEncounterState = {
            ...discardEntry({ ...state, dice }, uid),
            phase: 'complete',
            finalOutcome: 'retreat',
        };
        const events: CombatEvent[] = [{ kind: 'combat-ended', outcome: 'retreat' }];
        return { state: withLog(ended, events), events };
    }
    // Brace (top): refresh one spent die.
    const { dice, refreshedId } = refreshOneDie(state.dice, 'wild');
    const next = discardEntry({ ...state, dice }, uid);
    const events: CombatEvent[] = refreshedId
        ? [{ kind: 'die-refreshed', dieId: refreshedId, color: 'wild' }]
        : [];
    return { state: withLog(next, events), events };
}

/**
 * Free top action (§4.3): a weak, die-free contribution. Buff cards apply the
 * buff to self at intensity 1; every offensive card contributes a flat +1 to
 * its track (no persistent DoT spigot — real status pressure needs a die,
 * which is the whole design tension); pure-damage cards chip a sliver of HP.
 */
function playTopAction(
    state: CombatEncounterState,
    uid: string,
    card: CombatCard,
    _rng: () => number,
): CombatTransition {
    const events: CombatEvent[] = [];
    let player = state.player;
    let enemy = state.enemy;
    let tracks = state.pressureTracks;
    let phaseProgress = state.phaseProgress;
    let directDamage = state.directDamageDealt;
    const skill = card.skillId ? lookupSkill(card.skillId) : undefined;

    events.push({ kind: 'card-played', cardId: card.id, useBottom: false, dieId: null, advantage: 'neutral' });

    if (card.verbClass === 'buff-self' && skill) {
        // Apply the weak self-buff at intensity 1 (or a small heal when none).
        const selfEffect = (skill.combatEffects ?? []).find(e => e.appliedTo === 'self')
            ?? (skill.synergy?.applyEffectOnFire?.appliedTo === 'self' ? skill.synergy.applyEffectOnFire : undefined);
        if (selfEffect) {
            const def = lookupEffectDef(selfEffect.effectId);
            if (def) {
                const res = applyEffect(player.effects, def, state.round, { intensityDelta: 1, sourceId: player.id });
                player = { ...player, effects: res.activeEffects };
                if (res.result.activeEffect) {
                    events.push({
                        kind: 'effect-landed', cardId: card.id, effectId: def.id, target: 'self',
                        track: 'none', pressure: 0, intensity: res.result.activeEffect.intensity, effect: def,
                    });
                }
            }
        } else {
            const amount = Math.max(1, Math.floor(skill.basePower * 0.15));
            player = heal(player, amount);
            events.push({ kind: 'damage-dealt', cardId: card.id, target: 'self', amount: -amount });
        }
    } else if (card.verbClass === 'direct-damage' && skill) {
        const amount = Math.max(1, Math.floor(calculateSkillDamage(player, skill) * 0.15));
        enemy = applyDamage(enemy, amount);
        directDamage += amount;
        events.push({ kind: 'damage-dealt', cardId: card.id, target: 'enemy', amount });
    } else if (card.track === 'dot' || card.track === 'control') {
        // Flat +1 pressure to the card's natural track (Rule 4: never zero).
        const add = TOP_ACTION_PRESSURE;
        tracks = { ...tracks, [card.track]: tracks[card.track] + add };
        phaseProgress = { ...phaseProgress, [card.track]: phaseProgress[card.track] + add };
        events.push({ kind: 'pressure-updated', dot: tracks.dot, control: tracks.control });
    }

    let next: CombatEncounterState = {
        ...state, player, enemy, pressureTracks: tracks, phaseProgress, directDamageDealt: directDamage,
    };
    next = discardEntry(next, uid);
    next = withLog(next, events);
    return checkImmediateOutcome(next, events);
}

/**
 * Powered bottom action (§4.3, §4.7, §4.8): pays dice via RPS scaling, runs the
 * full skill through `executeSkill`, folds landed effects into the pressure
 * tracks + attribution, and refreshes a matching die when a status effect
 * meaningfully lands.
 */
function playBottomAction(
    state: CombatEncounterState,
    uid: string,
    card: CombatCard,
    _dieId: string | undefined,
    _rng: () => number,
): CombatTransition {
    const skill = card.skillId ? lookupSkill(card.skillId) : undefined;
    if (!skill) return { state, events: [] };

    // 1. A die must be drafted this turn, and it must be able to power a card.
    const drafted = draftedDie(state);
    if (!drafted) {
        const events: CombatEvent[] = [{ kind: 'effect-fizzled', cardId: card.id, effectId: '', message: 'draft a stance die first' }];
        return { state: withLog(state, events), events };
    }
    if (drafted.state !== 'available' || drafted.color === 'x') {
        const events: CombatEvent[] = [{ kind: 'effect-fizzled', cardId: card.id, effectId: '', message: 'the drafted die is spent or blocked — end the turn' }];
        return { state: withLog(state, events), events };
    }

    // 2. Resource affordability — stance granted by the drafted die; Fallacy/
    //    Paradox must be pre-banked (the Tier-3 gate, unchanged from Spec 25).
    const granted = grantStanceCost(state.combatResources, skill);
    if (!resourcesCover(granted, skill)) {
        const events: CombatEvent[] = [{ kind: 'effect-fizzled', cardId: card.id, effectId: '', message: 'need a banked Fallacy/Paradox token to power this card' }];
        return { state: withLog(state, events), events };
    }

    // 3. The read (drafted die vs hidden enemy stance) + color-match bonus (§1, §3).
    const read = state.lastRead;
    const mult = READ_PRESSURE_MULT[read];
    const colorMatch = drafted.color === 'wild' || drafted.color === card.stance;
    const advantage = readToAdvantage(read);

    const events: CombatEvent[] = [{ kind: 'card-played', cardId: card.id, useBottom: true, dieId: drafted.id, advantage, colorMatch }];

    // 4. Execute the skill (unchanged engine) against a shim.
    const before = intensityMap(state.enemy.effects);
    const shim: CombatState = { ...skillShim(state), combatResources: granted };
    const res = executeSkill(shim, skill.id, lookupSkill, 'player');

    let player = res.state.player as Character;
    let enemy = res.state.enemy as Enemy;
    const combatResources = res.state.combatResources;
    let tracks = state.pressureTracks;
    let phaseProgress = state.phaseProgress;
    let attribution = state.attribution;
    let applyCounts = state.effectApplyCounts;
    let directDamage = state.directDamageDealt;
    let landedOnEnemy = false;
    let landedOffensive = false;
    let mercyOpened = res.activateMercyChoice === true;
    // Diversity synergy is judged against the post-skill board (all of this
    // card's effects have landed by the time we fold events).
    const diverse = enemyHasDiverseStatus(enemy.effects);

    const addPressure = (track: 'dot' | 'control', base: number, landed: LandedEffect, def: Effect, intensity: number) => {
        const prior = applyCounts[def.id] ?? 0;
        const synergy = diverse ? SYNERGY_BONUS : 0;
        // Diminishing returns on spamming the SAME effect + read mult + synergy.
        const amount = marginalPressure(base, prior, mult, 0, synergy);
        tracks = { ...tracks, [track]: tracks[track] + amount };
        phaseProgress = { ...phaseProgress, [track]: phaseProgress[track] + amount };
        attribution = recordAttribution(attribution, card.id, card.name, landed, amount);
        applyCounts = { ...applyCounts, [def.id]: prior + 1 };
        events.push({ kind: 'effect-landed', cardId: card.id, effectId: def.id, target: 'enemy', track, pressure: amount, intensity, effect: def });
        landedOffensive = true;
    };

    // 5. Fold skill events into combat events + pressure (read-scaled).
    for (const ev of res.events) {
        if (ev.kind === 'damage' && ev.target === 'enemy') {
            directDamage += ev.amount;
            events.push({ kind: 'damage-dealt', cardId: card.id, target: 'enemy', amount: ev.amount });
        } else if (ev.kind === 'effect-applied') {
            const def = ev.effect;
            const target: 'self' | 'enemy' = ev.appliedTo;
            const sideEffects = target === 'enemy' ? enemy.effects : player.effects;
            const active = sideEffects.find(a => a.effectId === def.id);
            if (active && target === 'enemy') {
                const landed: LandedEffect = { effectId: def.id, effect: def, active, target };
                const { track, amount } = pressureForLanded(landed);
                if (track !== 'none' && amount > 0) addPressure(track, amount, landed, def, active.intensity);
                // Meaningful land = intensity increased over the snapshot (or new).
                if ((before[def.id] ?? 0) < active.intensity) landedOnEnemy = true;
            } else if (active) {
                events.push({ kind: 'effect-landed', cardId: card.id, effectId: def.id, target, track: 'none', pressure: 0, intensity: active.intensity, effect: def });
            }
        } else if (ev.kind === 'buff-fumbled') {
            events.push({ kind: 'effect-fizzled', cardId: card.id, effectId: ev.effect.id, message: ev.message });
        } else if (ev.kind === 'befriend-attempted' && ev.successful) {
            mercyOpened = true;
        }
    }

    // 6. Color-match bonus — a flat track bump when the drafted die matches the
    //    card's color (deckbuilding synergy, §3). Only on an offensive land.
    if (colorMatch && landedOffensive && card.track !== 'none') {
        const t = card.track;
        tracks = { ...tracks, [t]: tracks[t] + COLOR_MATCH_PRESSURE_BONUS };
        phaseProgress = { ...phaseProgress, [t]: phaseProgress[t] + COLOR_MATCH_PRESSURE_BONUS };
    }

    // 7. Befriend card lowers the Control Saturation threshold (§6 Q6).
    if (card.verbClass === 'befriend') {
        tracks = { ...tracks, controlThreshold: Math.max(1, tracks.controlThreshold - BEFRIEND_THRESHOLD_REDUCTION) };
        tracks = { ...tracks, control: tracks.control + TOP_ACTION_PRESSURE };
        phaseProgress = { ...phaseProgress, control: phaseProgress.control + TOP_ACTION_PRESSURE };
    }

    // 8. Status-combo loop (§1): a meaningful enemy land REFRESHES the drafted
    //    die so the player may chain another powered card this turn (no new roll
    //    → no new Conviction). A play that lands nothing SPENDS the drafted die.
    let dice = state.dice;
    if (landedOnEnemy) {
        events.push({ kind: 'die-refreshed', dieId: drafted.id, color: drafted.color });
    } else {
        dice = spendDice(state.dice, [drafted.id]);
        events.push({ kind: 'die-spent', dieId: drafted.id, color: drafted.color });
    }

    events.push({ kind: 'pressure-updated', dot: tracks.dot, control: tracks.control });

    let next: CombatEncounterState = {
        ...state, player, enemy, dice, combatResources,
        pressureTracks: tracks, phaseProgress, attribution, effectApplyCounts: applyCounts,
        directDamageDealt: directDamage,
    };
    next = discardEntry(next, uid);
    if (mercyOpened) {
        next = { ...next, mercyChoiceActive: true };
        events.push({ kind: 'mercy-opened', message: `${enemy.name} falters — spare or exploit?` });
    }
    next = withLog(next, events);
    return checkImmediateOutcome(next, events);
}

/** True when `resources` cover the skill's full cost (post stance-grant). */
function resourcesCover(resources: CombatResources, skill: Skill): boolean {
    const c = skill.resourceCost;
    return (resources.heart >= (c.heart ?? 0))
        && (resources.body >= (c.body ?? 0))
        && (resources.mind >= (c.mind ?? 0))
        && (resources.fallacy >= (c.fallacy ?? 0))
        && (resources.paradox >= (c.paradox ?? 0));
}

/** Checks for a global threshold crossing mid-phase (immediate outcome, §7.1). */
function checkImmediateOutcome(state: CombatEncounterState, events: CombatEvent[]): CombatTransition {
    if (state.finalOutcome) return { state, events };
    if (isDefeated(state.enemy)) return endCombat(state, 'victory', events);
    if (dotErosionReached(state.pressureTracks)) return endCombat(state, 'victory', events);
    if (controlSaturationReached(state.pressureTracks)) {
        const ended: CombatEncounterState = { ...state, phase: 'mercy-choice', finalOutcome: 'mercy', mercyChoiceActive: true };
        const ev: CombatEvent = { kind: 'mercy-opened', message: `${state.enemy.name} is overwhelmed — spare or exploit?` };
        return { state: withLog(ended, [ev]), events: [...events, ev] };
    }
    return { state, events };
}

function endCombat(state: CombatEncounterState, outcome: CombatEncounterState['finalOutcome'], events: CombatEvent[]): CombatTransition {
    const ev: CombatEvent = { kind: 'combat-ended', outcome: outcome! };
    const ended: CombatEncounterState = { ...state, phase: 'complete', finalOutcome: outcome };
    return { state: withLog(ended, [ev]), events: [...events, ev] };
}

// ── Phase resolution + between-phases (§4.4, §4.5, §9) ───────────────────────

/**
 * Ends the current threat phase: compares the phase's pressure contribution to
 * its thresholds, marks Clear / Overwhelmed, fires the threat action on an
 * Overwhelmed phase, then runs between-phases processing (unless combat ended).
 */
export function resolveThreatPhase(state: CombatEncounterState, rng: () => number = defaultRng): CombatTransition {
    if (state.phase === 'complete' || state.finalOutcome) return { state, events: [] };

    const idx = Math.min(state.currentPhaseIndex, state.threatPhases.length - 1);
    const phase = state.threatPhases[idx];
    const events: CombatEvent[] = [];

    const cleared = state.phaseProgress.dot >= phase.dotPressureRequired
        || state.phaseProgress.control >= phase.controlPressureRequired;

    let player = state.player;
    let enemy = state.enemy;
    const penaltiesApplied = [];

    if (!cleared) {
        // Overwhelmed — the threat action fires on the player (HARD-scaled, §6).
        for (const eff of phase.threatAction.effects) {
            if (eff.damage && eff.damage > 0) {
                player = applyDamage(player, Math.round(eff.damage * THREAT_DAMAGE_SCALE));
            }
            if (eff.effectId) {
                const def = lookupEffectDef(eff.effectId);
                if (def) {
                    const res = applyEffect(player.effects, def, state.round, {
                        intensityDelta: eff.intensity ?? 1,
                        durationMode: eff.duration ? 'additive' : 'reset',
                        durationDelta: eff.duration,
                        sourceId: enemy.id,
                    });
                    player = { ...player, effects: res.activeEffects };
                }
            }
            if (eff.enemyHeal && eff.enemyHeal > 0) {
                enemy = heal(enemy, eff.enemyHeal);
            }
            penaltiesApplied.push(eff);
        }
        events.push({ kind: 'threat-fired', phaseIndex: phase.index, description: phase.threatAction.description, effects: phase.threatAction.effects });
    }

    const mark: 'clear' | 'overwhelmed' = cleared ? 'clear' : 'overwhelmed';
    events.push({ kind: 'phase-resolved', phaseIndex: phase.index, mark });

    const result: CombatPhaseResult = {
        phaseIndex: phase.index,
        mark,
        dotContributed: state.phaseProgress.dot,
        controlContributed: state.phaseProgress.control,
        enemyActionFired: cleared ? '' : phase.threatAction.description,
        penaltiesApplied,
    };

    // Momentum carry from the surplus on the better track (§4.5).
    const dotSurplus = state.phaseProgress.dot - phase.dotPressureRequired;
    const controlSurplus = state.phaseProgress.control - phase.controlPressureRequired;
    const carry = { dot: momentumCarry(dotSurplus), control: momentumCarry(controlSurplus) };

    const threatMarks = state.threatMarks.slice();
    if (idx < threatMarks.length) threatMarks[idx] = mark;

    let next: CombatEncounterState = {
        ...state,
        player,
        enemy,
        phase: 'phase-resolve',
        threatMarks,
        phaseResults: [...state.phaseResults, result],
        momentumCarry: carry,
    };
    next = withLog(next, events);

    // Outcome checks after the threat action.
    const outcome = pendingOutcome(next);
    if (outcome) return endCombat(next, outcome, events);

    // Otherwise advance to between-phases.
    return processBetweenPhases(next, rng, events);
}

/** Returns a terminal outcome if one is pending, else null. */
function pendingOutcome(state: CombatEncounterState): CombatEncounterState['finalOutcome'] {
    if (isDefeated(state.player)) return 'defeat';
    if (isDefeated(state.enemy)) return 'victory';
    if (dotErosionReached(state.pressureTracks)) return 'victory';
    if (controlSaturationReached(state.pressureTracks)) return 'mercy';
    return null;
}

/**
 * Between-phases processing (§4.5): DoT ticks (start+end phase) on both sides,
 * effect durations tick, momentum carries into the next phase, and a fresh hand
 * of 5 is drawn. Advances the phase pointer (looping the final phase).
 */
export function processBetweenPhases(
    state: CombatEncounterState,
    rng: () => number = defaultRng,
    priorEvents: CombatEvent[] = [],
): CombatTransition {
    const events: CombatEvent[] = [];

    // 1. Per-effect DoT ticks (labeled, §7.5) — computed before processing.
    const enemyDotTicks = dotTickBreakdown(state.enemy.effects);
    const playerDotTicks = dotTickBreakdown(state.player.effects);

    // 2. Process a full round of effects on the enemy (DoT erodes enemy HP).
    const enemyStart = processRoundStartEffects(state.enemy);
    const enemyEnd = processRoundEndEffects(enemyStart.target);
    const enemy = enemyEnd.target as Enemy;
    const enemyDotTotal = enemyStart.dotDamage + enemyEnd.dotDamage;

    // 3. Process a full round of effects on the player (DoT / regen / drain).
    const playerStart = processRoundStartEffects(state.player);
    const playerEnd = processRoundEndEffects(playerStart.target);
    const player = playerEnd.target as Character;
    const playerDotTotal = playerStart.dotDamage + playerEnd.dotDamage;

    for (const t of enemyDotTicks) events.push({ kind: 'dot-tick', effectId: t.effectId, label: t.label, amount: t.amount, target: 'enemy' });
    for (const t of playerDotTicks) events.push({ kind: 'dot-tick', effectId: t.effectId, label: t.label, amount: t.amount, target: 'self' });

    // 4. Enemy DoT erosion feeds the dot track (real erosion progress).
    let tracks = state.pressureTracks;
    if (enemyDotTotal > 0) {
        tracks = { ...tracks, dot: tracks.dot + enemyDotTotal };
    }

    // 5. Momentum carry seeds the next phase's contribution; add enemy DoT to it.
    const phaseProgress = {
        dot: state.momentumCarry.dot + enemyDotTotal,
        control: state.momentumCarry.control,
    };
    if (state.momentumCarry.dot > 0 || state.momentumCarry.control > 0) {
        events.push({ kind: 'momentum-carried', dot: state.momentumCarry.dot, control: state.momentumCarry.control });
    }

    // 6. Advance the phase pointer — loop the final phase so combat resolves.
    const nextIndex = Math.min(state.currentPhaseIndex + 1, state.threatPhases.length - 1);

    // 7. Draw a fresh hand of 5 (discard the old hand — Hazard's "draw fresh").
    const discardedHand = state.hand.map(h => h.cardId);
    const draw = drawCombatCards(state.drawPile, [...state.discard, ...discardedHand], state.deck, COMBAT_HAND_SIZE, rng);
    let uid = state.round * 100;
    const hand = draw.drawn.map(cardId => ({ uid: `c${++uid}`, cardId }));
    events.push({ kind: 'hand-drawn', cards: draw.drawn });

    let next: CombatEncounterState = {
        ...state,
        player,
        enemy,
        pressureTracks: tracks,
        phaseProgress,
        currentPhaseIndex: nextIndex,
        drawPile: draw.drawPile,
        discard: draw.discard,
        hand,
        phase: 'phase-play',
        round: state.round + 1,
        // New phase → fresh turn; clear the draft so the next startTurn rolls.
        dice: [],
        draftedDieId: null,
        lastRead: 'none',
        carriedDie: null,
    };
    next = withLog(next, events);

    void playerDotTotal; // player DoT already applied to HP; tracked for parity.

    // 8. Outcome checks after ticks.
    const outcome = pendingOutcome(next);
    if (outcome) return endCombat(next, outcome, [...priorEvents, ...events]);

    // 9. Safety cap — a degenerate stalemate resolves as defeat (couldn't close).
    if (next.round > MAX_PHASES) return endCombat(next, 'defeat', [...priorEvents, ...events]);

    return { state: next, events: [...priorEvents, ...events] };
}

interface DotTick { effectId: string; label: string; amount: number; }
function dotTickBreakdown(effects: readonly ActiveEffect[]): DotTick[] {
    const out: DotTick[] = [];
    for (const ae of effects) {
        const def = lookupEffectDef(ae.effectId);
        const dot = def?.payload.damageOverTime;
        if (!def || !dot) continue;
        out.push({ effectId: ae.effectId, label: def.name, amount: dot.damagePerRound * ae.intensity });
    }
    return out;
}

// ── Batch entry point (§9 resolveCombatPhase) ────────────────────────────────

/**
 * Picks the best die to draft from this turn's pool for a card of `cardStance`
 * against `enemyStance`: prefer a die that wins the read (advantage), then a
 * color-match, then any usable die, else the first (an X draft just banks the
 * token). Used by the batch entry + sim to auto-play.
 */
export function chooseDraft(
    dice: readonly CombatManaDie[],
    cardStance: CombatDieColor,
    enemyStance: Stance,
): string | null {
    if (dice.length === 0) return null;
    const usable = dice.filter(d => d.state === 'available' && d.color !== 'x');
    if (usable.length === 0) return dice[0]?.id ?? null; // forced X — bank the token
    const advantage = usable.find(d => dieHasStance(d.color) && stanceBeats(d.color as Stance, enemyStance));
    if (advantage) return advantage.id;
    const match = usable.find(d => d.color === 'wild' || d.color === cardStance);
    if (match) return match.id;
    return usable[0].id;
}

/** Ensures a usable drafted die exists for a card (starts a turn + drafts if not). */
function ensureDraftForCard(
    state: CombatEncounterState,
    cardStance: CombatDieColor,
    rng: () => number,
): CombatTransition {
    const cur = draftedDie(state);
    if (cur && cur.state === 'available' && cur.color !== 'x') return { state, events: [] };
    let working = state;
    const events: CombatEvent[] = [];
    if (working.draftedDieId !== null) working = endTurn(working).state;
    const started = startTurn(working, rng);
    working = started.state; events.push(...started.events);
    const enemyStance = currentPhaseStance(working);
    const pick = chooseDraft(working.dice, cardStance, enemyStance);
    if (pick) {
        const drafted = draftStanceDie(working, pick);
        working = drafted.state; events.push(...drafted.events);
    }
    return { state: working, events };
}

/**
 * Applies a batch of card plays then resolves the current threat phase — the
 * top-level entry point. Bottom plays auto-manage turns (roll 2, draft the best
 * die) so callers can express a plan as a card list. Plays stop early if an
 * outcome fires mid-batch.
 */
export function resolveCombatPhase(
    state: CombatEncounterState,
    cardsPlayed: CardPlay[],
    rng: () => number = defaultRng,
): CombatTransition {
    let working = state;
    if (working.phase === 'reveal' || working.phase === 'dice-roll') {
        working = rollEncounterDice(working, rng).state;
    }
    const allEvents: CombatEvent[] = [];
    for (const play of cardsPlayed) {
        if (working.phase !== 'phase-play') break;
        if (play.useBottom) {
            const card = getCard(play.cardId);
            const drafted = ensureDraftForCard(working, card?.stance ?? 'wild', rng);
            working = drafted.state; allEvents.push(...drafted.events);
        }
        const res = playCombatCard(working, { uid: play.uid, cardId: play.cardId }, play.useBottom, play.dieId, rng);
        working = res.state;
        allEvents.push(...res.events);
        if (working.finalOutcome) return { state: working, events: allEvents };
    }
    if (working.phase !== 'phase-play') return { state: working, events: allEvents };
    const resolved = resolveThreatPhase(working, rng);
    return { state: resolved.state, events: [...allEvents, ...resolved.events] };
}

// ── Mercy choice (Phase 112 / §3) ────────────────────────────────────────────

/**
 * Resolves the spare/exploit mercy choice opened by Control Saturation or a
 * successful Befriend. `spare` confirms the friendship (mercy) end; `exploit`
 * trades the opening for a heavy strike that may finish the enemy.
 */
export function selectMercyChoice(
    state: CombatEncounterState,
    choice: 'spare' | 'exploit',
): CombatTransition {
    if (!state.mercyChoiceActive) return { state, events: [] };
    if (choice === 'spare') {
        const ended: CombatEncounterState = { ...state, phase: 'complete', finalOutcome: 'mercy', mercyChoiceActive: false };
        const ev: CombatEvent = { kind: 'combat-ended', outcome: 'mercy' };
        return { state: withLog(ended, [ev]), events: [ev] };
    }
    // Exploit — a free heavy strike (Phase 108). Resolve to victory if it kills.
    const strike = Math.max(10, Math.round(state.enemy.maxHealth * 0.5));
    const enemy = applyDamage(state.enemy, strike);
    const events: CombatEvent[] = [
        { kind: 'damage-dealt', cardId: 'mercy-exploit', target: 'enemy', amount: strike },
    ];
    let next: CombatEncounterState = { ...state, enemy, mercyChoiceActive: false, phase: 'phase-play' };
    if (isDefeated(enemy)) {
        return endCombat(withLog(next, events), 'victory', events);
    }
    // Survived the exploit — combat continues from phase-play.
    next = withLog(next, events);
    return { state: next, events };
}

// ── Signature Skills (Spec 26b §4) ───────────────────────────────────────────

/**
 * Casts a signature skill, spending Conviction (◆). Always available regardless
 * of the hand. Fizzles (no-op + event) when underfunded. Can trigger an
 * immediate outcome (e.g. Overwhelming Argument saturating the control track).
 */
export function playSignatureSkill(
    state: CombatEncounterState,
    skillId: string,
    rng: () => number = defaultRng,
): CombatTransition {
    if (state.phase !== 'phase-play') return { state, events: [] };
    const skill = getSignatureSkill(skillId);
    if (!skill) return { state, events: [] };
    if (state.conviction < skill.cost) {
        const events: CombatEvent[] = [{ kind: 'effect-fizzled', cardId: skill.id, effectId: '', message: `need ${skill.cost} ◆ Conviction (have ${state.conviction})` }];
        return { state: withLog(state, events), events };
    }

    const spent: CombatEncounterState = { ...state, conviction: state.conviction - skill.cost };
    const applied = applySignatureSkill(spent, skill, rng);
    const events: CombatEvent[] = [
        { kind: 'signature-cast', skillId: skill.id, name: skill.name, cost: skill.cost },
        ...applied.events,
    ];
    const next = withLog(applied.state, events);
    return checkImmediateOutcome(next, events);
}

/** The baseline signature kit (for the presenter / UI bar). */
export { SIGNATURE_SKILLS, SIGNATURE_SKILL_LIST, getSignatureSkill } from './combat.signature';

// ── Summary (§7.7) ───────────────────────────────────────────────────────────

export { buildCombatSummary } from './combat.pressure';

// ── Convenience selectors for the presenter ──────────────────────────────────

/** Cards in hand, projected to their views (for the UI hand display, §7.3). */
export function handCards(state: CombatEncounterState): Array<{ uid: string; card: CombatCard }> {
    return state.hand
        .map(h => ({ uid: h.uid, card: getCard(h.cardId) }))
        .filter((x): x is { uid: string; card: CombatCard } => x.card !== null);
}

/** Die-cost preview for a card against the current phase (RPS indicator, §7.3). */
export function cardDieCostPreview(state: CombatEncounterState, card: CombatCard): CardDieCost {
    return resolveCardDieCost(card.stance, currentPhaseStance(state));
}

/** Count of available (non-X) dice — surfaced for the dice board (§7.4). */
export function availableDice(state: CombatEncounterState): number {
    return availableDieCount(state.dice);
}

// ── Spec 26b — presenter selectors (the engine owns truth; the UI hides) ─────

/** The drafted stance die this turn (or null before a draft / between turns). */
export function getDraftedDie(state: CombatEncounterState): CombatManaDie | null {
    return draftedDie(state);
}

/** True when the player has revealed a given phase's hidden enemy stance (§2). */
export function isPhaseStanceRevealed(state: CombatEncounterState, phaseIndex: number): boolean {
    return state.revealedStances.includes(phaseIndex);
}

/** The current phase's enemy stance IF revealed, else null (drives the "?" UI). */
export function revealedCurrentStance(state: CombatEncounterState): Stance | null {
    const idx = Math.min(state.currentPhaseIndex, state.threatPhases.length - 1);
    return state.revealedStances.includes(idx) ? currentPhaseStance(state) : null;
}

/**
 * Read preview for a card if the player powers it with the currently drafted die
 * (advantage/neutral/disadvantage/none + whether the colors match). Null when no
 * die is drafted yet.
 */
export function cardReadPreview(state: CombatEncounterState, card: CombatCard): { read: CombatReadResult; colorMatch: boolean } | null {
    const d = draftedDie(state);
    if (!d) return null;
    return { read: state.lastRead, colorMatch: d.color === 'wild' || d.color === card.stance };
}

/**
 * Spec 26b UI §1 — projects the track + pressure a card would add if POWERed
 * RIGHT NOW with the currently drafted die: read multiplier, color-match bonus,
 * diminishing returns (the card's primary effect's prior count), and the
 * diversity synergy. Single-source with the live engine via `marginalPressure`.
 * If no die is drafted, previews at the neutral read.
 */
export function projectCardPressure(
    state: CombatEncounterState,
    card: CombatCard,
): { track: 'dot' | 'control' | 'none'; amount: number } {
    if (card.track === 'none') return { track: 'none', amount: 0 };
    const d = draftedDie(state);
    const read: CombatReadResult = d ? state.lastRead : 'neutral';
    const mult = READ_PRESSURE_MULT[read];
    const colorMatch = !!d && (d.color === 'wild' || d.color === card.stance);
    const prior = card.primaryEffectId ? (state.effectApplyCounts[card.primaryEffectId] ?? 0) : 0;
    const otherTrack: 'dot' | 'control' = card.track === 'dot' ? 'control' : 'dot';
    const wouldSynergize = state.enemy.effects.some(ae => {
        const def = lookupEffectDef(ae.effectId);
        return def && effectPressure(def, ae.intensity, ae.remainingDuration).track === otherTrack;
    });
    const synergy = wouldSynergize ? SYNERGY_BONUS : 0;
    const amount = marginalPressure(card.bottomPressurePreview, prior, mult, colorMatch ? COLOR_MATCH_PRESSURE_BONUS : 0, synergy);
    return { track: card.track, amount };
}

/** Re-export for presenters that need to check die affordability directly. */
export { combatDieCanPower, availableDiceFor, effectPressure, cardStanceColor };
