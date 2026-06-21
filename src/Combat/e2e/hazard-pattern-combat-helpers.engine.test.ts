/**
 * Hermetic E2E — Spec 25 Hazard-Pattern Combat: helper-export coverage.
 *
 * The §11 acceptance suite (`hazard-pattern-combat.engine.test.ts`) drives the
 * engine end-to-end but pins many of the smaller public exports only indirectly.
 * This sibling suite gives each of those exports a direct contract test, with a
 * deliberate focus on the doctrine-critical surface:
 *
 *   - the two Pressure-Track win-condition predicates (`dotErosionReached` /
 *     `controlSaturationReached`) — these ARE the win conditions per the
 *     load-bearing doctrine (status effects are the main fun);
 *   - the self-reinforcing status-loop dice primitives (`combatDieCanPower` /
 *     `refreshOneDie` / `rollCombatDice`);
 *   - the Befriend mercy entry (`selectEncounterMercyChoice`);
 *   - the deck / threat / card-adapter / UI-preview helpers.
 *
 * Pure math + an explicit fixed RNG only; no disk / network / TTY.
 */

import { describe, it, expect } from 'vitest';

import { Player } from '../../Character/characters.mock';
import type { Character } from '../../Character/types';
import type { Enemy } from '../../Enemy/types';
import { TidepoolCrab } from '../../Enemy/enemy.library';
import { deepClone } from '../../Utils';
import { getSkillById } from '../../Skills/skill.library';
import { lookupEffect } from '../../Effects';

import {
    initializeCombatEncounter, rollEncounterDice,
    resolveCardDieCost, cardDieCostPreview, availableDice,
    selectMercyChoice as selectEncounterMercyChoice, getCard,
} from '../combat.engine';
import {
    rollCombatDice, combatDieCanPower, refreshOneDie, COMBAT_DICE_COUNT,
} from '../combat.dice';
import { buildCombatDeck, COMBAT_HAND_SIZE } from '../combat.deck';
import { classifyVerbClass, toCombatCard, projectDeck } from '../combat.cards';
import {
    momentumCarry, dotErosionReached, controlSaturationReached, MOMENTUM_CAP,
} from '../combat.pressure';
import {
    generateDefaultThreatSequence, deriveGlobalThresholds,
} from '../combat.threat';
import type { CombatManaDie, CombatPressureTracks, CombatEvent } from '../combat.encounter.types';

const DOT_BODY = 'slippery-slope';       // body, tier 2, DoT
const CONTROL_HEART = 'eternal-regress'; // heart, tier 2, control
const DAMAGE_BODY = 'achilles-gambit';   // body, tier 1, no status effect

const SEED = 12345;

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
    e.id = 'enemy-helper-dummy';
    e.health = hp;
    e.maxHealth = hp;
    e.effects = [];
    e.baseStats = {
        heart: stance === 'heart' ? 6 : 2,
        body: stance === 'body' ? 6 : 2,
        mind: stance === 'mind' ? 6 : 2,
    };
    return e;
}

function die(id: string, color: CombatManaDie['color'], state: CombatManaDie['state']): CombatManaDie {
    return { id, color, state, temporary: false };
}

function tracks(partial: Partial<CombatPressureTracks>): CombatPressureTracks {
    return { dot: 0, control: 0, dotThreshold: 10, controlThreshold: 10, ...partial };
}

/** A fixed-value RNG for the dice bag (deterministic, no Math.random spy). */
const fixed = (v: number) => (): number => v;

// ── Win-condition predicates (§5) — the doctrine-critical surface ────────────

describe('Spec 25 §5 — Pressure-Track win-condition predicates', () => {
    it('dotErosionReached fires exactly at the threshold (>=)', () => {
        expect(dotErosionReached(tracks({ dot: 9, dotThreshold: 10 }))).toBe(false);
        expect(dotErosionReached(tracks({ dot: 10, dotThreshold: 10 }))).toBe(true);
        expect(dotErosionReached(tracks({ dot: 11, dotThreshold: 10 }))).toBe(true);
    });

    it('controlSaturationReached fires exactly at the threshold (>=)', () => {
        expect(controlSaturationReached(tracks({ control: 7, controlThreshold: 8 }))).toBe(false);
        expect(controlSaturationReached(tracks({ control: 8, controlThreshold: 8 }))).toBe(true);
        expect(controlSaturationReached(tracks({ control: 99, controlThreshold: 8 }))).toBe(true);
    });

    it('the two tracks are independent — control filling does not trip DoT', () => {
        const t = tracks({ dot: 0, dotThreshold: 10, control: 50, controlThreshold: 8 });
        expect(controlSaturationReached(t)).toBe(true);
        expect(dotErosionReached(t)).toBe(false);
    });
});

// ── Momentum carry (§4.5) — pure ─────────────────────────────────────────────

describe('Spec 25 §4.5 — momentum carry', () => {
    it('carries ⌊surplus/2⌋', () => {
        expect(momentumCarry(0)).toBe(0);
        expect(momentumCarry(1)).toBe(0);
        expect(momentumCarry(2)).toBe(1);
        expect(momentumCarry(5)).toBe(2);
    });

    it('never goes negative and is capped at MOMENTUM_CAP', () => {
        expect(momentumCarry(-4)).toBe(0);
        expect(momentumCarry(100)).toBe(MOMENTUM_CAP);
    });
});

// ── Dice primitives (§4.2 / §4.7) — the self-reinforcing status loop ─────────

describe('Spec 25 §4.2 — rollCombatDice', () => {
    it('rolls COMBAT_DICE_COUNT dice with unique ids and bag-legal colors', () => {
        // The 6-face bag is [heart, body, mind, wild, x, x]; index 3 → wild.
        const dice = rollCombatDice(COMBAT_DICE_COUNT, fixed(3 / 6));
        expect(dice).toHaveLength(COMBAT_DICE_COUNT);
        expect(new Set(dice.map(d => d.id)).size).toBe(COMBAT_DICE_COUNT);
        for (const d of dice) {
            expect(d.color).toBe('wild');
            expect(d.state).toBe('available');
            expect(d.temporary).toBe(false);
        }
    });

    it('rolls X faces as locked (the 2/6 blocked outcome)', () => {
        const dice = rollCombatDice(2, fixed(5 / 6)); // index 5 → x
        expect(dice.every(d => d.color === 'x' && d.state === 'locked')).toBe(true);
    });
});

describe('Spec 25 §4.2 — combatDieCanPower', () => {
    it('a matching available colored die powers its card', () => {
        expect(combatDieCanPower(die('d', 'body', 'available'), 'body')).toBe(true);
    });

    it('a wild die powers any color; a colored die does not power a mismatch', () => {
        expect(combatDieCanPower(die('d', 'wild', 'available'), 'mind')).toBe(true);
        expect(combatDieCanPower(die('d', 'heart', 'available'), 'mind')).toBe(false);
    });

    it('spent / locked dice and X faces never power a card', () => {
        expect(combatDieCanPower(die('d', 'body', 'spent'), 'body')).toBe(false);
        expect(combatDieCanPower(die('d', 'x', 'available'), 'body')).toBe(false);
        expect(combatDieCanPower(die('d', 'body', 'locked'), 'body')).toBe(false);
    });
});

describe('Spec 25 §4.7 — refreshOneDie (status-loop reclaim)', () => {
    it('prefers an exact-color spent die', () => {
        const pool = [die('a', 'heart', 'spent'), die('b', 'wild', 'spent'), die('c', 'body', 'available')];
        const { dice, refreshedId } = refreshOneDie(pool, 'heart');
        expect(refreshedId).toBe('a');
        expect(dice.find(d => d.id === 'a')!.state).toBe('available');
        expect(dice.find(d => d.id === 'b')!.state).toBe('spent'); // wild untouched
    });

    it('falls back to a spent wild die when no exact color is spent', () => {
        const pool = [die('a', 'wild', 'spent'), die('b', 'body', 'available')];
        const { refreshedId, dice } = refreshOneDie(pool, 'heart');
        expect(refreshedId).toBe('a');
        expect(dice.find(d => d.id === 'a')!.state).toBe('available');
    });

    it('refreshes nothing (null) when no spent die matches', () => {
        const pool = [die('a', 'body', 'available'), die('b', 'mind', 'available')];
        const { dice, refreshedId } = refreshOneDie(pool, 'heart');
        expect(refreshedId).toBeNull();
        expect(dice.map(d => d.state)).toEqual(['available', 'available']);
    });
});

// ── Deck building (§4.3) ─────────────────────────────────────────────────────

describe('Spec 25 §4.3 — buildCombatDeck', () => {
    it('builds the deck from known skills + the synthetic Retreat baseline', () => {
        const deck = buildCombatDeck(makePlayer([DOT_BODY, CONTROL_HEART]));
        expect(deck).toContain(DOT_BODY);
        expect(deck).toContain(CONTROL_HEART);
        expect(deck).toContain('card-retreat'); // always-present escape baseline
    });

    it('de-dups known skills and preserves learn order', () => {
        const deck = buildCombatDeck(makePlayer([DOT_BODY, DOT_BODY, CONTROL_HEART]));
        expect(deck.filter(id => id === DOT_BODY)).toHaveLength(1);
        expect(deck.indexOf(DOT_BODY)).toBeLessThan(deck.indexOf(CONTROL_HEART));
    });

    it('still yields a playable deck (Retreat) for a player with no skills', () => {
        expect(buildCombatDeck(makePlayer([]))).toEqual(['card-retreat']);
    });
});

// ── Card adapters (§6) ───────────────────────────────────────────────────────

describe('Spec 25 §6 — card adapters', () => {
    it('classifyVerbClass routes a DoT skill to the dot track', () => {
        const { verbClass, track } = classifyVerbClass(getSkillById(DOT_BODY)!, lookupEffect);
        expect(verbClass).toBe('direct-dot');
        expect(track).toBe('dot');
    });

    it('classifyVerbClass routes a control skill to the control track', () => {
        const { verbClass, track } = classifyVerbClass(getSkillById(CONTROL_HEART)!, lookupEffect);
        expect(['direct-control', 'stat-debuff']).toContain(verbClass);
        expect(track).toBe('control');
    });

    it('classifyVerbClass marks a pure-damage skill as direct-damage / no track', () => {
        const { verbClass, track } = classifyVerbClass(getSkillById(DAMAGE_BODY)!, lookupEffect);
        expect(verbClass).toBe('direct-damage');
        expect(track).toBe('none');
    });

    it('toCombatCard projects a synthetic Retreat card without a skill lookup', () => {
        const card = toCombatCard('card-retreat', getSkillById, lookupEffect);
        expect(card).not.toBeNull();
        expect(card!.id).toBe('card-retreat');
    });

    it('toCombatCard returns null for an unknown card id', () => {
        expect(toCombatCard('not-a-real-skill', getSkillById, lookupEffect)).toBeNull();
    });

    it('projectDeck maps known ids and drops unknown ones', () => {
        const cards = projectDeck([DOT_BODY, 'not-a-real-skill', CONTROL_HEART], getSkillById, lookupEffect);
        expect(cards.map(c => c.id)).toEqual([DOT_BODY, CONTROL_HEART]);
    });
});

// ── Threat helpers (§10) ─────────────────────────────────────────────────────

describe('Spec 25 §10 — threat sequence helpers', () => {
    it('generateDefaultThreatSequence escalates per-phase requirements', () => {
        const seq = generateDefaultThreatSequence(makeEnemy(100, 'body'));
        expect(seq.length).toBeGreaterThanOrEqual(2);
        for (let i = 1; i < seq.length; i++) {
            expect(seq[i].index).toBe(i + 1);
            expect(seq[i].dotPressureRequired).toBeGreaterThanOrEqual(seq[i - 1].dotPressureRequired);
        }
        expect(seq[seq.length - 1].isFinalPhase).toBe(true);
    });

    it('deriveGlobalThresholds sums the per-phase requirements', () => {
        const seq = generateDefaultThreatSequence(makeEnemy(100));
        const { dotThreshold, controlThreshold } = deriveGlobalThresholds(seq);
        expect(dotThreshold).toBe(seq.reduce((s, p) => s + p.dotPressureRequired, 0));
        expect(controlThreshold).toBe(seq.reduce((s, p) => s + p.controlPressureRequired, 0));
    });
});

// ── UI previews (§7) ─────────────────────────────────────────────────────────

describe('Spec 25 §7 — presenter previews', () => {
    it('availableDice counts only spendable (non-X, available) dice', () => {
        let state = initializeCombatEncounter(makePlayer([DOT_BODY]), makeEnemy(80, 'mind'), undefined, SEED);
        state = rollEncounterDice(state).state;
        const expected = state.dice.filter(d => d.state === 'available' && d.color !== 'x').length;
        expect(availableDice(state)).toBe(expected);
    });

    it('cardDieCostPreview matches resolveCardDieCost against the current phase stance', () => {
        let state = initializeCombatEncounter(makePlayer([DOT_BODY]), makeEnemy(80, 'body'), undefined, SEED);
        state = rollEncounterDice(state).state;
        const cardId = state.hand[0]?.cardId ?? 'card-retreat';
        const card = getCard(cardId)!;
        const phaseStance = state.threatPhases[state.currentPhaseIndex].enemyStance;
        expect(cardDieCostPreview(state, card)).toEqual(resolveCardDieCost(card.stance, phaseStance));
    });
});

// ── Mercy choice (§7.6) — Befriend opening ──────────────────────────────────

describe('Spec 25 §7.6 — selectEncounterMercyChoice', () => {
    it('is a no-op when no mercy choice is active', () => {
        const state = initializeCombatEncounter(makePlayer([CONTROL_HEART]), makeEnemy(80), undefined, SEED);
        expect(state.mercyChoiceActive).toBeFalsy();
        const res = selectEncounterMercyChoice(state, 'spare');
        expect(res.state).toBe(state);
        expect(res.events).toEqual([]);
    });

    it('spare resolves the encounter to a mercy outcome when the choice is open', () => {
        const base = initializeCombatEncounter(makePlayer([CONTROL_HEART]), makeEnemy(80), undefined, SEED);
        const open = { ...base, mercyChoiceActive: true };
        const res = selectEncounterMercyChoice(open, 'spare');
        expect(res.state.finalOutcome).toBe('mercy');
        expect(res.state.phase).toBe('complete');
        expect(res.state.mercyChoiceActive).toBe(false);
        expect(res.events.some((e: CombatEvent) => e.kind === 'combat-ended')).toBe(true);
    });

    it('exploit deals a heavy strike and can resolve to victory on a kill', () => {
        const base = initializeCombatEncounter(makePlayer([CONTROL_HEART]), makeEnemy(1), undefined, SEED);
        const open = { ...base, mercyChoiceActive: true };
        const res = selectEncounterMercyChoice(open, 'exploit');
        expect(res.state.mercyChoiceActive).toBe(false);
        expect(res.events.some((e: CombatEvent) => e.kind === 'damage-dealt')).toBe(true);
        expect(res.state.finalOutcome).toBe('victory');
    });
});

// ── Constants ────────────────────────────────────────────────────────────────

describe('Spec 25 — constants', () => {
    it('COMBAT_HAND_SIZE is the draw cap', () => {
        expect(COMBAT_HAND_SIZE).toBeGreaterThan(0);
    });
});
