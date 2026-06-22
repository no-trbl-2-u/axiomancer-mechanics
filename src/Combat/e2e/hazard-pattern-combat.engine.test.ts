/**
 * Hermetic E2E — Hazard-Pattern Combat (Spec 25 + Spec 26b stance-draft redesign).
 *
 * Covers the new turn model end to end with seeded / stubbed RNG:
 *   - per-turn 2-die draft; the unpicked die → +1 Conviction
 *   - the hidden-stance read (advantage / disadvantage) scales pressure and a
 *     read-win grants bonus Conviction; first draft reveals the phase stance
 *   - cards keep colors → a color-match bonus on an offensive land
 *   - direct-damage cards still contribute 0 pressure
 *   - the status-combo loop refreshes the drafted die for a chain
 *   - between-phases fires DoT ticks + ticks durations + draws a fresh hand
 *   - Signature Skills spend Conviction (scout / DoT / pressure) regardless of hand
 *   - victory via DoT Erosion using only skill cards; post-combat attribution
 *   - the Monte-Carlo sim reports per-phase Clear rates
 *
 * The effects + skill engines are unchanged, so their suites (run separately)
 * are the witness that this driver did not perturb them.
 */

import { describe, it, expect, afterEach, vi } from 'vitest';

import { Player } from '../../Character/characters.mock';
import type { Character } from '../../Character/types';
import type { Enemy } from '../../Enemy/types';
import { TidepoolCrab } from '../../Enemy/enemy.library';
import { deepClone } from '../../Utils';
import { mockSequentialRng } from '../../test-utils/rng';
import {
    initializeCombatEncounter, rollEncounterDice, playCombatCard,
    resolveCombatPhase, processBetweenPhases,
    resolveCardDieCost, resolveRead, getCard, buildCombatSummary,
    draftStanceDie, getDraftedDie, isPhaseStanceRevealed,
    playSignatureSkill, discardCombatCard, projectCardPressure, startTurn, endTurn,
} from '../combat.engine';
import { diminishFactor, marginalPressure } from '../combat.pressure';
import { SIGNATURE_KITS, playerArchetype } from '../combat.signature';
import { rollCombatCardRewards, addRewardCard, unlockSkillViaDilemma, COMBAT_REWARD_POOL } from '../combat.rewards';
import { buildCombatDeck, COMBAT_HAND_SIZE } from '../combat.deck';
import { getSkillById } from '../../Skills/skill.library';
import { simulateHazardPatternCombat } from '../combat.encounter.sim';
import { getThreatSequence, deriveGlobalThresholds, deriveIntentType } from '../combat.threat';
import type { CombatDieColor, CombatEncounterState } from '../combat.encounter.types';

afterEach(() => {
    vi.restoreAllMocks();
});

// ── Fixtures ─────────────────────────────────────────────────────────────────

const DOT_BODY = 'slippery-slope';       // body, tier 2, applies debuff_bleed (DoT)
const CONTROL_HEART = 'eternal-regress'; // heart, tier 2, confusion + slow (control)
const DAMAGE_BODY = 'achilles-gambit';   // body, tier 1, basePower 12, no status effect
const BEFRIEND = 'befriend';             // heart, tier 1

function makePlayer(skills: string[]): Character {
    const p = deepClone(Player);
    p.knownSkills = skills.slice();
    p.baseStats = { heart: 8, body: 8, mind: 8 };
    p.health = 200;
    p.maxHealth = 200;
    return p;
}

function makeEnemy(hp: number, stance: 'heart' | 'body' | 'mind' = 'heart'): Enemy {
    const e = deepClone(TidepoolCrab);
    e.id = 'enemy-test-dummy';
    e.health = hp;
    e.maxHealth = hp;
    e.effects = [];
    e.baseStats = { heart: stance === 'heart' ? 6 : 2, body: stance === 'body' ? 6 : 2, mind: stance === 'mind' ? 6 : 2 };
    return e;
}

/** Forces this turn's draft pool to known colors (deterministic reads). */
function setDice(state: CombatEncounterState, colors: CombatDieColor[]): CombatEncounterState {
    const turn = state.turn || 1;
    const dice = colors.map((c, i) => ({
        id: `t${turn}-d${i}`, color: c,
        state: c === 'x' ? ('locked' as const) : ('available' as const), temporary: false,
    }));
    return { ...state, dice, draftedDieId: null, turn };
}

/** Drafts dice index 0 and plays `skillId`'s bottom action. */
function draftAndPlay(state: CombatEncounterState, skillId: string, dieIndex = 0) {
    let s = draftStanceDie(state, state.dice[dieIndex].id).state;
    const entry = s.hand.find(h => h.cardId === skillId);
    if (!entry) return { state: s, played: false } as const;
    const res = playCombatCard(s, { uid: entry.uid }, true);
    return { state: res.state, events: res.events, played: res.state !== s } as const;
}

// ── RPS read (§1) — pure, no RNG ─────────────────────────────────────────────

describe('Spec 26b §1 — the hidden-stance read', () => {
    it('a die whose stance beats the enemy stance is an advantage read', () => {
        expect(resolveRead('heart', 'body')).toBe('advantage');
        expect(resolveRead('body', 'mind')).toBe('advantage');
        expect(resolveRead('mind', 'heart')).toBe('advantage');
    });
    it('a die whose stance loses to the enemy stance is a disadvantage read', () => {
        expect(resolveRead('body', 'heart')).toBe('disadvantage');
        expect(resolveRead('mind', 'body')).toBe('disadvantage');
        expect(resolveRead('heart', 'mind')).toBe('disadvantage');
    });
    it('a same-stance die is neutral; a wild/x die has no contest', () => {
        expect(resolveRead('heart', 'heart')).toBe('neutral');
        expect(resolveRead('wild', 'mind')).toBe('none');
        expect(resolveRead('x', 'mind')).toBe('none');
    });
    it('legacy resolveCardDieCost still classifies advantage/neutral/disadvantage', () => {
        expect(resolveCardDieCost('heart', 'body').advantage).toBe('advantage');
        expect(resolveCardDieCost('body', 'heart').advantage).toBe('disadvantage');
        expect(resolveCardDieCost('heart', 'heart').advantage).toBe('neutral');
    });
});

// ── Intent derivation (Spec 26 §2) ───────────────────────────────────────────

describe('Spec 26 §2 — intent derivation', () => {
    it('classifies damage / debuff / buff / combo / pass', () => {
        expect(deriveIntentType([{ damage: 5 }])).toBe('damage');
        expect(deriveIntentType([{ effectId: 'debuff_fear' }])).toBe('debuff');
        expect(deriveIntentType([{ enemyHeal: 6 }])).toBe('buff');
        expect(deriveIntentType([{ damage: 5, effectId: 'debuff_fear' }])).toBe('combo');
        expect(deriveIntentType([{}])).toBe('pass');
    });
    it('stamps an intentType on every resolved threat phase', () => {
        const seq = getThreatSequence(makeEnemy(60));
        for (const p of seq) expect(p.intentType).toBeDefined();
    });
    it('authored phases carry a thematic stance tell', () => {
        const tyrant = deepClone(TidepoolCrab); tyrant.id = 'enemy-coastal-tyrant';
        const seq = getThreatSequence(tyrant);
        expect(seq[0].stanceHint && seq[0].stanceHint.length).toBeGreaterThan(0);
    });
});

// ── Card classification (§6) — pure ──────────────────────────────────────────

describe('Spec 25 §6 — card classification', () => {
    it('a DoT skill is a direct-dot card on the dot track', () => {
        const card = getCard(DOT_BODY)!;
        expect(card.verbClass).toBe('direct-dot');
        expect(card.track).toBe('dot');
        expect(card.stance).toBe('body');
        expect(card.bottomPressurePreview).toBeGreaterThan(0);
    });
    it('a control skill is a direct-control card on the control track', () => {
        const card = getCard(CONTROL_HEART)!;
        expect(card.track).toBe('control');
        expect(['direct-control', 'stat-debuff']).toContain(card.verbClass);
    });
    it('a pure-damage skill is direct-damage with 0 pressure preview', () => {
        const card = getCard(DAMAGE_BODY)!;
        expect(card.verbClass).toBe('direct-damage');
        expect(card.track).toBe('none');
        expect(card.bottomPressurePreview).toBe(0);
    });
});

// ── Initialization + the 2-die draft (§1) ────────────────────────────────────

describe('Spec 26b §1 — initialization + draft', () => {
    it('opens in reveal, draws 5, then rolls a 2-die turn pool', () => {
        mockSequentialRng(0.5);
        let state = initializeCombatEncounter(makePlayer([DOT_BODY, CONTROL_HEART, DAMAGE_BODY]), makeEnemy(30), undefined, 42);
        expect(state.phase).toBe('reveal');
        expect(state.hand.length).toBe(COMBAT_HAND_SIZE);
        state = rollEncounterDice(state).state;
        expect(state.phase).toBe('phase-play');
        expect(state.dice.length).toBe(2);
        expect(state.draftedDieId).toBeNull();
    });

    it('drafting consumes the unpicked die for +1 Conviction and reveals the stance', () => {
        mockSequentialRng(0.5);
        let state = initializeCombatEncounter(makePlayer([DOT_BODY]), makeEnemy(40, 'mind'), [DOT_BODY], 1);
        state = rollEncounterDice(state).state;
        state = setDice(state, ['body', 'heart']); // body beats mind → advantage read
        expect(isPhaseStanceRevealed(state, 0)).toBe(false);
        const before = state.conviction;
        state = draftStanceDie(state, state.dice[0].id).state;
        expect(getDraftedDie(state)?.color).toBe('body');
        // +1 from the unpicked die, +1 read-win bonus (advantage) = +2.
        expect(state.conviction).toBe(before + 2);
        expect(state.lastRead).toBe('advantage');
        expect(isPhaseStanceRevealed(state, 0)).toBe(true);
    });

    it('a neutral/disadvantage draft grants only the unpicked-die Conviction', () => {
        mockSequentialRng(0.5);
        let state = initializeCombatEncounter(makePlayer([DOT_BODY]), makeEnemy(40, 'mind'), [DOT_BODY], 1);
        state = rollEncounterDice(state).state;
        state = setDice(state, ['heart', 'wild']); // heart loses to mind → disadvantage
        const before = state.conviction;
        state = draftStanceDie(state, state.dice[0].id).state;
        expect(state.conviction).toBe(before + 1);
        expect(state.lastRead).toBe('disadvantage');
    });

    it('derives global thresholds as the sum of per-phase requirements (§5.3)', () => {
        const enemy = makeEnemy(50);
        const seq = getThreatSequence(enemy);
        const { dotThreshold, controlThreshold } = deriveGlobalThresholds(seq);
        expect(dotThreshold).toBe(seq.reduce((s, p) => s + p.dotPressureRequired, 0));
        expect(controlThreshold).toBe(seq.reduce((s, p) => s + p.controlPressureRequired, 0));
    });
});

// ── Direct-damage contributes 0 pressure (§6 Rule 2) ─────────────────────────

describe('Spec 25 §6 Rule 2 — direct damage contributes 0 pressure', () => {
    it('a pure-damage bottom leaves both tracks at 0 but damages HP and spends the die', () => {
        mockSequentialRng(0.05);
        let state = initializeCombatEncounter(makePlayer([DAMAGE_BODY]), makeEnemy(80, 'mind'), [DAMAGE_BODY], 7);
        state = rollEncounterDice(state).state;
        state = setDice(state, ['body', 'heart']);
        const hpBefore = state.enemy.health;
        const r = draftAndPlay(state, DAMAGE_BODY);
        expect(r.played).toBe(true);
        expect(r.state.pressureTracks.dot).toBe(0);
        expect(r.state.pressureTracks.control).toBe(0);
        expect(r.state.enemy.health).toBeLessThan(hpBefore);
        expect(r.state.directDamageDealt).toBeGreaterThan(0);
        // No status landed → the drafted die is spent (no chain).
        expect(getDraftedDie(r.state)?.state).toBe('spent');
    });
});

// ── Status combo loop (§1) ───────────────────────────────────────────────────

describe('Spec 26b §1 — status-combo loop', () => {
    it('a landed DoT accrues dot pressure and refreshes the drafted die for a chain', () => {
        mockSequentialRng(0.05); // low rolls → enemy fails to resist → effect lands
        let state = initializeCombatEncounter(makePlayer([DOT_BODY]), makeEnemy(60, 'mind'), [DOT_BODY], 3);
        state = rollEncounterDice(state).state;
        state = setDice(state, ['body', 'heart']); // body vs mind → advantage
        const r = draftAndPlay(state, DOT_BODY);
        expect(r.played).toBe(true);
        expect(r.state.pressureTracks.dot).toBeGreaterThan(0);
        const landed = r.events!.some(e => e.kind === 'effect-landed' && e.target === 'enemy');
        expect(landed).toBe(true);
        // The drafted die refreshed (still available) so the player can chain.
        const refreshed = r.events!.some(e => e.kind === 'die-refreshed');
        expect(refreshed).toBe(true);
        expect(getDraftedDie(r.state)?.state).toBe('available');
    });

    it('a color-matched advantaged DoT out-pressures a disadvantaged off-color one', () => {
        mockSequentialRng(0.05);
        const base = () => {
            let s = initializeCombatEncounter(makePlayer([DOT_BODY]), makeEnemy(120, 'mind'), [DOT_BODY], 21);
            return rollEncounterDice(s).state;
        };
        const adv = draftAndPlay(setDice(base(), ['body', 'heart']), DOT_BODY); // match + advantage
        const dis = draftAndPlay(setDice(base(), ['mind', 'wild']), DOT_BODY); // off-color + disadvantage
        expect(adv.state.pressureTracks.dot).toBeGreaterThan(dis.state.pressureTracks.dot);
    });
});

// ── Between-phases: DoT ticks + duration tick + fresh hand (§4.5) ─────────────

describe('Spec 25 §4.5 — between-phases processing', () => {
    it('fires enemy DoT ticks (erodes HP), ticks effect durations, draws a fresh hand', () => {
        mockSequentialRng(0.05);
        let state = initializeCombatEncounter(makePlayer([DOT_BODY]), makeEnemy(80, 'mind'), [DOT_BODY], 5);
        state = rollEncounterDice(state).state;
        state = setDice(state, ['body', 'heart']);
        state = draftAndPlay(state, DOT_BODY).state;
        const dotBefore = state.enemy.effects.find(e => e.effectId === 'debuff_bleed');
        expect(dotBefore).toBeDefined();
        const hpBefore = state.enemy.health;
        const durBefore = dotBefore!.remainingDuration;

        const bp = processBetweenPhases(state);
        const after = bp.state;
        expect(after.enemy.health).toBeLessThan(hpBefore);
        expect(bp.events.some(e => e.kind === 'dot-tick' && e.target === 'enemy')).toBe(true);
        const dotAfter = after.enemy.effects.find(e => e.effectId === 'debuff_bleed');
        if (dotAfter) expect(dotAfter.remainingDuration).toBeLessThan(durBefore);
        expect(after.hand.length).toBe(COMBAT_HAND_SIZE);
        // A new phase resets the draft so the next turn rolls fresh.
        expect(after.draftedDieId).toBeNull();
        expect(after.dice.length).toBe(0);
    });
});

// ── Signature Skills (§4) ────────────────────────────────────────────────────

describe('Spec 26b §4 — Signature Skills (Conviction-funded)', () => {
    it('Read the Opponent reveals the current + next phase stance', () => {
        mockSequentialRng(0.5);
        let state = initializeCombatEncounter(makePlayer([DOT_BODY]), makeEnemy(60, 'mind'), [DOT_BODY], 2);
        state = rollEncounterDice(state).state;
        state = { ...state, conviction: 5 };
        const r = playSignatureSkill(state, 'sig-read-opponent');
        expect(r.state.conviction).toBe(4); // cost 1
        expect(isPhaseStanceRevealed(r.state, 0)).toBe(true);
        if (r.state.threatPhases.length > 1) expect(isPhaseStanceRevealed(r.state, 1)).toBe(true);
        expect(r.events.some(e => e.kind === 'signature-cast')).toBe(true);
    });

    it('Conviction Strike applies a guaranteed DoT and surges the dot track', () => {
        mockSequentialRng(0.5);
        let state = initializeCombatEncounter(makePlayer([DOT_BODY]), makeEnemy(90, 'mind'), [DOT_BODY], 4);
        state = rollEncounterDice(state).state;
        state = { ...state, conviction: 9 };
        const dotBefore = state.pressureTracks.dot;
        const r = playSignatureSkill(state, 'sig-conviction-strike');
        expect(r.state.conviction).toBe(2); // cost 7
        expect(r.state.pressureTracks.dot).toBeGreaterThan(dotBefore);
        expect(r.state.enemy.effects.some(e => e.effectId === 'debuff_poison')).toBe(true);
    });

    it('scrapping a hand card grants +1 Conviction and discards it', () => {
        mockSequentialRng(0.5);
        let state = initializeCombatEncounter(makePlayer([DOT_BODY, CONTROL_HEART]), makeEnemy(60), [DOT_BODY, CONTROL_HEART], 6);
        state = rollEncounterDice(state).state;
        const uid = state.hand[0].uid;
        const before = state.conviction;
        const r = discardCombatCard(state, uid);
        expect(r.state.conviction).toBe(before + 1);
        expect(r.state.hand.find(h => h.uid === uid)).toBeUndefined();
    });

    it('a signature skill fizzles (no-op) when underfunded', () => {
        mockSequentialRng(0.5);
        let state = initializeCombatEncounter(makePlayer([DOT_BODY]), makeEnemy(60), [DOT_BODY], 8);
        state = rollEncounterDice(state).state;
        state = { ...state, conviction: 1 };
        const r = playSignatureSkill(state, 'sig-overwhelming-argument'); // cost 5
        expect(r.state.conviction).toBe(1);
        expect(r.events.some(e => e.kind === 'effect-fizzled')).toBe(true);
    });
});

// ── Tuning pass 2: anti-spam, control, read-loop (Spec 26b §2/§3) ────────────

describe('Spec 26b tuning — diminishing returns + projection + carry', () => {
    it('diminishFactor falls off then floors; marginalPressure honours it', () => {
        // Eased diminishing returns (DIMINISH_STEP 0.2, floor 0.55) so a focused
        // deck that must reuse its few status cards still sustains late-phase pressure.
        expect(diminishFactor(0)).toBe(1);
        expect(diminishFactor(1)).toBeCloseTo(0.8);
        expect(diminishFactor(3)).toBe(0.55); // floored
        // 10 base, neutral read, no bonuses: 1st full, 2nd reduced.
        expect(marginalPressure(10, 0, 1, 0, 0)).toBe(10);
        expect(marginalPressure(10, 1, 1, 0, 0)).toBe(8);
    });

    it('projectCardPressure previews less for a repeatedly-applied effect', () => {
        mockSequentialRng(0.5);
        let state = initializeCombatEncounter(makePlayer([DOT_BODY]), makeEnemy(120, 'mind'), [DOT_BODY], 1);
        state = rollEncounterDice(state).state;
        state = setDice(state, ['body', 'heart']);
        state = draftStanceDie(state, state.dice[0].id).state;
        const card = getCard(DOT_BODY)!;
        const fresh = projectCardPressure(state, card);
        expect(fresh.track).toBe('dot');
        expect(fresh.amount).toBeGreaterThan(0);
        // Simulate the same effect already applied 3× → preview should drop.
        const spammed = { ...state, effectApplyCounts: { [card.primaryEffectId!]: 3 } };
        const after = projectCardPressure(spammed, card);
        expect(after.amount).toBeLessThan(fresh.amount);
    });

    it('an unspent drafted die carries into the next turn', () => {
        mockSequentialRng(0.5);
        let state = initializeCombatEncounter(makePlayer([DOT_BODY]), makeEnemy(60, 'mind'), [DOT_BODY], 1);
        state = rollEncounterDice(state).state;
        state = setDice(state, ['heart', 'body']);
        state = draftStanceDie(state, state.dice[0].id).state; // draft heart, don't spend
        expect(getDraftedDie(state)?.color).toBe('heart');
        state = endTurn(state).state;
        expect(state.carriedDie).toBe('heart');
        state = startTurn(state).state;
        // The carried heart die is present in the fresh pool.
        expect(state.dice.some(d => d.color === 'heart')).toBe(true);
        expect(state.carriedDie).toBeNull();
    });

    it('every turn roll offers at least one stance-bearing die', () => {
        for (let seed = 1; seed <= 30; seed++) {
            let s = initializeCombatEncounter(makePlayer([DOT_BODY]), makeEnemy(60), [DOT_BODY], seed);
            s = rollEncounterDice(s).state;
            expect(s.dice.some(d => d.color === 'heart' || d.color === 'body' || d.color === 'mind')).toBe(true);
        }
    });
});

// ── Tuning pass 3: archetype signatures, deckbuilder, unlock hook, floors ────

describe('Spec 26b §B/§C/§D — archetype kit, rewards, unlock, difficulty floor', () => {
    it('the signature kit is the player archetype kit (dominant base stat)', () => {
        expect(playerArchetype({ baseStats: { heart: 2, body: 9, mind: 2 } })).toBe('body');
        const bodyPlayer = makePlayer([DOT_BODY]); bodyPlayer.baseStats = { heart: 2, body: 9, mind: 2 };
        const s = initializeCombatEncounter(bodyPlayer, makeEnemy(60), [DOT_BODY], 1);
        expect(s.archetype).toBe('body');
        expect(s.signatures).toEqual(SIGNATURE_KITS.body);
        expect(s.signatures).toContain('sig-rallying-blow'); // body exclusive
    });

    it('Rallying Blow (body strike) refreshes the drafted die for a chain', () => {
        mockSequentialRng(0.5);
        let state = initializeCombatEncounter(makePlayer([DOT_BODY]), makeEnemy(120, 'mind'), [DOT_BODY], 1);
        state = rollEncounterDice(state).state;
        state = setDice(state, ['body', 'heart']);
        state = draftStanceDie(state, state.dice[0].id).state;
        // spend the die on a non-landing play would set it spent; instead just force spent.
        state = { ...state, conviction: 8, dice: state.dice.map(d => d.id === state.draftedDieId ? { ...d, state: 'spent' as const } : d) };
        const r = playSignatureSkill(state, 'sig-rallying-blow');
        expect(getDraftedDie(r.state)?.state).toBe('available'); // refreshed
        expect(r.state.enemy.effects.some(e => e.effectId === 'debuff_bleed')).toBe(true);
    });

    it('Disarming Plea (heart mercy) lowers the Control Saturation threshold', () => {
        mockSequentialRng(0.5);
        let state = initializeCombatEncounter(makePlayer([CONTROL_HEART]), makeEnemy(120, 'body'), [CONTROL_HEART], 1);
        state = rollEncounterDice(state).state;
        state = { ...state, conviction: 8 };
        const before = state.pressureTracks.controlThreshold;
        const r = playSignatureSkill(state, 'sig-disarming-plea');
        expect(r.state.pressureTracks.controlThreshold).toBeLessThan(before);
        expect(r.state.pressureTracks.control).toBeGreaterThan(0);
    });

    it('rollCombatCardRewards offers valid distinct skill cards, biased to archetype', () => {
        const player = makePlayer([DOT_BODY]); player.baseStats = { heart: 2, body: 9, mind: 2 };
        let i = 0; const rng = () => [0.1, 0.5, 0.9, 0.3, 0.7][i++ % 5];
        const offers = rollCombatCardRewards(player, rng, 3);
        expect(offers.length).toBe(3);
        expect(new Set(offers).size).toBe(3); // distinct
        for (const id of offers) { expect(getSkillById(id)).toBeTruthy(); expect(COMBAT_REWARD_POOL).toContain(id); }
    });

    it('a reward card stacks onto the deck as an extra copy', () => {
        const player = makePlayer([DOT_BODY]);
        const before = buildCombatDeck(player).filter(id => id === DOT_BODY).length;
        const rewarded = addRewardCard(player, DOT_BODY);
        const after = buildCombatDeck(rewarded).filter(id => id === DOT_BODY).length;
        expect(after).toBe(before + 1);
    });

    it('unlockSkillViaDilemma adds a new skill, bypassing gates; no-op if known', () => {
        const player = makePlayer([DOT_BODY]);
        const newId = COMBAT_REWARD_POOL.find(id => id !== DOT_BODY && getSkillById(id))!;
        const unlocked = unlockSkillViaDilemma(player, newId);
        expect(unlocked.knownSkills).toContain(newId);
        expect(unlockSkillViaDilemma(unlocked, newId)).toBe(unlocked); // already known → same ref
    });

    it('difficulty floor keeps tiny enemies from being one-shot', () => {
        const seq = getThreatSequence(makeEnemy(20)); // very low HP
        for (const p of seq) {
            expect(p.dotPressureRequired).toBeGreaterThanOrEqual(11);
            expect(p.controlPressureRequired).toBeGreaterThanOrEqual(11);
        }
    });
});

// ── Full victory via DoT Erosion (skill cards only) (§11) ────────────────────

describe('Spec 25 §11 — victory via DoT Erosion, skill cards only', () => {
    it('a small enemy is destroyed by stacked DoT pressure with no attack/defend', () => {
        mockSequentialRng(0.05);
        const player = makePlayer([DOT_BODY]);
        const enemy = makeEnemy(24, 'mind');
        let state = initializeCombatEncounter(player, enemy, [DOT_BODY, DOT_BODY, DOT_BODY], 9);

        let guard = 0;
        while (state.phase !== 'complete' && state.phase !== 'mercy-choice' && guard < 40) {
            guard++;
            // Batch entry auto-manages the per-turn draft for each play.
            const res = resolveCombatPhase(state, [
                { cardId: DOT_BODY, useBottom: true },
                { cardId: DOT_BODY, useBottom: true },
            ]);
            state = res.state;
            if (state.finalOutcome) break;
        }
        expect(state.finalOutcome).toBe('victory');

        const summary = buildCombatSummary(state);
        expect(summary.outcome).toBe('victory');
        expect(summary.headline).toMatch(/DoT Erosion/);
        expect(summary.rows.length).toBeGreaterThan(0);
        expect(summary.bestCard.length).toBeGreaterThan(0);
        expect(summary.totalDotDamage).toBeGreaterThan(0);
    });
});

// ── resolveCombatPhase batch (§9) ────────────────────────────────────────────

describe('Spec 25 §9 — resolveCombatPhase batch entry point', () => {
    it('applies a batch of plays (auto-drafting) then resolves the phase', () => {
        mockSequentialRng(0.05);
        const state = initializeCombatEncounter(makePlayer([DOT_BODY]), makeEnemy(60, 'mind'), [DOT_BODY, DOT_BODY], 13);
        const res = resolveCombatPhase(state, [{ cardId: DOT_BODY, useBottom: true }]);
        expect(res.state.phaseResults.length + (res.state.finalOutcome ? 1 : 0)).toBeGreaterThan(0);
    });
});

// ── Monte-Carlo sim (§11 acceptance) ─────────────────────────────────────────

describe('Spec 26b §6 — Monte-Carlo sim (HARD band)', () => {
    it('runs 300 seeded combats and reports per-phase Clear rates', () => {
        const player = makePlayer([DOT_BODY, CONTROL_HEART, DAMAGE_BODY, BEFRIEND]);
        const enemy = makeEnemy(40);
        const stats = simulateHazardPatternCombat(player, enemy, 300, 1);
        expect(stats.runs).toBe(300);
        expect(stats.victories + stats.mercies + stats.defeats + stats.retreats).toBe(300);
        expect(stats.clearRateByPhase.length).toBeGreaterThan(0);
        for (const rate of stats.clearRateByPhase) {
            expect(rate).toBeGreaterThanOrEqual(0);
            expect(rate).toBeLessThanOrEqual(1);
        }
        expect(stats.winRate).toBeGreaterThan(0);
        expect(stats.statusEngagement).toBeGreaterThan(0);
    });
});
