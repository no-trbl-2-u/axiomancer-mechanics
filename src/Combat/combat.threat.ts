/**
 * Spec 25 — Hazard-Pattern Combat: enemy threat sequences (§4.4, §10).
 *
 * Each enemy fights as an authored *threat sequence* — 2-5 phases, revealed in
 * full at combat start (Hazard's full-information doctrine). A phase is Cleared
 * when the player's pressure meets its threshold; otherwise it is Overwhelmed
 * and the threat action fires on the player.
 *
 * Authoring is HP-independent: an authored phase specifies the enemy's stance,
 * a threat action, and *factors* (× enemy HP) that say whether the enemy is
 * weak to DoT or to control. `getThreatSequence` resolves the numeric
 * thresholds from the live enemy HP, so the autonomous balance-tuning loop can
 * still move enemy stats without invalidating the sequences.
 */

import type { Enemy } from '../Enemy/types';
import type { Stance } from './types';
import type { CombatThreatAction, CombatThreatPhase } from './combat.encounter.types';

/** Authored phase template — resolved against live HP by `getThreatSequence`. */
interface AuthoredThreatPhase {
    enemyStance: Stance;
    /** DoT pressure to clear, as a fraction of the enemy's max HP. */
    dotFactor: number;
    /** Control pressure to clear, as a fraction of the enemy's max HP. */
    controlFactor: number;
    threatAction: CombatThreatAction;
    isFinalPhase?: boolean;
}

/** Default escalation per phase index for unauthored enemies (§10). */
const DEFAULT_DOT_FACTOR = 0.14;
const DEFAULT_CONTROL_FACTOR = 0.18;
const ESCALATION = [1.0, 1.2, 1.4];

/** Picks an enemy's dominant base stat as its phase-1 stance (deterministic). */
function dominantStance(enemy: Enemy): Stance {
    const { heart, body, mind } = enemy.baseStats;
    if (body >= heart && body >= mind) return 'body';
    if (mind >= heart && mind >= body) return 'mind';
    return 'heart';
}

/** Rotates heart → body → mind so each phase reads a different stance. */
const STANCE_CYCLE: Stance[] = ['heart', 'body', 'mind'];
function rotateStance(from: Stance, steps: number): Stance {
    const i = STANCE_CYCLE.indexOf(from);
    return STANCE_CYCLE[(i + steps) % STANCE_CYCLE.length];
}

/** A modest scaling threat action from the enemy's offensive derived stats. */
function defaultThreatAction(enemy: Enemy, phaseIndex: number): CombatThreatAction {
    const atk = Math.max(
        enemy.derivedStats.physicalAttack,
        enemy.derivedStats.mentalAttack,
        enemy.derivedStats.emotionalAttack,
    );
    // Phase escalation lifts the bite of a sustained, uncontrolled enemy.
    const damage = Math.max(2, Math.round(atk * (0.5 + 0.2 * phaseIndex)));
    return {
        description: phaseIndex === 0
            ? `${enemy.name} presses the attack (+${damage} damage).`
            : `${enemy.name} escalates (+${damage} damage).`,
        effects: [{ damage }],
    };
}

/**
 * Authored threat sequences for the befriendable / signature enemies (§10).
 * Keyed by enemy id. Each is HP-independent (factors, not raw thresholds).
 */
const AUTHORED_THREAT_SEQUENCES: Record<string, AuthoredThreatPhase[]> = {
    // The fishing-village boss (memory: coastal-tyrant, pinned to L3). Weak to
    // control on the parley path — a coastal bully who can be talked down.
    'enemy-coastal-tyrant': [
        {
            enemyStance: 'body', dotFactor: 0.16, controlFactor: 0.12,
            threatAction: { description: 'The Tyrant lashes out with a brine-soaked fist (+6 damage).', effects: [{ damage: 6 }] },
        },
        {
            enemyStance: 'heart', dotFactor: 0.18, controlFactor: 0.13,
            threatAction: { description: 'The Tyrant bellows, rattling your resolve (+5 damage, Fear).', effects: [{ damage: 5, effectId: 'debuff_fear' }] },
        },
        {
            enemyStance: 'mind', dotFactor: 0.20, controlFactor: 0.14, isFinalPhase: true,
            threatAction: { description: 'The Tyrant makes a final, desperate surge (+8 damage).', effects: [{ damage: 8 }] },
        },
    ],
    // MournfulGull — a grieving creature; very open to the mercy/control path.
    'enemy-mournful-gull': [
        {
            enemyStance: 'heart', dotFactor: 0.18, controlFactor: 0.10,
            threatAction: { description: 'The Gull keens, a sound that aches (+3 damage).', effects: [{ damage: 3 }] },
        },
        {
            enemyStance: 'mind', dotFactor: 0.20, controlFactor: 0.11, isFinalPhase: true,
            threatAction: { description: 'The Gull dives in despair (+5 damage).', effects: [{ damage: 5 }] },
        },
    ],
    // HollowEyedBeggar — frail but desperate; weak to DoT, hard to control.
    'enemy-hollow-eyed-beggar': [
        {
            enemyStance: 'mind', dotFactor: 0.12, controlFactor: 0.20,
            threatAction: { description: 'The Beggar claws with ragged nails (+3 damage).', effects: [{ damage: 3 }] },
        },
        {
            enemyStance: 'body', dotFactor: 0.14, controlFactor: 0.22, isFinalPhase: true,
            threatAction: { description: 'The Beggar lunges, all bones and need (+5 damage).', effects: [{ damage: 5 }] },
        },
    ],
    // TideflukeReaver — a raider; trades blows, weak to neither cleanly.
    'enemy-tidefluke-reaver': [
        {
            enemyStance: 'body', dotFactor: 0.15, controlFactor: 0.16,
            threatAction: { description: 'The Reaver hooks low (+5 damage).', effects: [{ damage: 5 }] },
        },
        {
            enemyStance: 'heart', dotFactor: 0.17, controlFactor: 0.17,
            threatAction: { description: 'The Reaver presses the advantage (+6 damage, Vulnerability).', effects: [{ damage: 6, effectId: 'debuff_vulnerability_body' }] },
        },
        {
            enemyStance: 'mind', dotFactor: 0.19, controlFactor: 0.18, isFinalPhase: true,
            threatAction: { description: 'The Reaver goes for the kill (+8 damage).', effects: [{ damage: 8 }] },
        },
    ],
    // HushWraith — a silencing spirit; resists control, succumbs to erosion.
    'enemy-hush-wraith': [
        {
            enemyStance: 'mind', dotFactor: 0.12, controlFactor: 0.22,
            threatAction: { description: 'The Wraith smothers your voice (+4 damage, Silence).', effects: [{ damage: 4, effectId: 'debuff_stun' }] },
        },
        {
            enemyStance: 'heart', dotFactor: 0.14, controlFactor: 0.24, isFinalPhase: true,
            threatAction: { description: 'The Wraith drains the warmth from the air (+6 damage).', effects: [{ damage: 6 }] },
        },
    ],
    // HollowSaint — a hollowed zealot; the parley path is the kinder one.
    'enemy-hollow-saint': [
        {
            enemyStance: 'heart', dotFactor: 0.17, controlFactor: 0.12,
            threatAction: { description: 'The Saint intones a broken hymn (+4 damage).', effects: [{ damage: 4 }] },
        },
        {
            enemyStance: 'body', dotFactor: 0.18, controlFactor: 0.13,
            threatAction: { description: 'The Saint smites in misguided fervor (+6 damage).', effects: [{ damage: 6 }] },
        },
        {
            enemyStance: 'mind', dotFactor: 0.20, controlFactor: 0.14, isFinalPhase: true,
            threatAction: { description: 'The Saint calls down a final judgment (+8 damage).', effects: [{ damage: 8 }] },
        },
    ],
    // TheDisagreement — an argumentative elemental; weak to being out-reasoned (control).
    'enemy-the-disagreement': [
        {
            enemyStance: 'mind', dotFactor: 0.18, controlFactor: 0.13,
            threatAction: { description: 'The Disagreement contradicts your every move (+5 damage).', effects: [{ damage: 5 }] },
        },
        {
            enemyStance: 'heart', dotFactor: 0.19, controlFactor: 0.14,
            threatAction: { description: 'The Disagreement sows doubt (+5 damage, Confusion).', effects: [{ damage: 5, effectId: 'debuff_confusion' }] },
        },
        {
            enemyStance: 'body', dotFactor: 0.21, controlFactor: 0.15, isFinalPhase: true,
            threatAction: { description: 'The Disagreement digs in (+7 damage).', effects: [{ damage: 7 }] },
        },
    ],
};

/** Ids that carry an authored threat sequence (the §10 set). */
export const AUTHORED_THREAT_ENEMY_IDS: readonly string[] = Object.freeze(Object.keys(AUTHORED_THREAT_SEQUENCES));

function resolveAuthored(enemy: Enemy, authored: AuthoredThreatPhase[]): CombatThreatPhase[] {
    const hp = Math.max(1, enemy.maxHealth);
    return authored.map((p, i) => ({
        index: i + 1,
        enemyStance: p.enemyStance,
        threatAction: p.threatAction,
        dotPressureRequired: Math.max(1, Math.ceil(hp * p.dotFactor)),
        controlPressureRequired: Math.max(1, Math.ceil(hp * p.controlFactor)),
        isFinalPhase: p.isFinalPhase ?? i === authored.length - 1,
    }));
}

/** Generates a default 3-phase escalating sequence for an unauthored enemy (§10). */
export function generateDefaultThreatSequence(enemy: Enemy): CombatThreatPhase[] {
    const hp = Math.max(1, enemy.maxHealth);
    const base = dominantStance(enemy);
    return ESCALATION.map((mult, i) => ({
        index: i + 1,
        enemyStance: rotateStance(base, i),
        threatAction: defaultThreatAction(enemy, i),
        dotPressureRequired: Math.max(1, Math.ceil(hp * DEFAULT_DOT_FACTOR * mult)),
        controlPressureRequired: Math.max(1, Math.ceil(hp * DEFAULT_CONTROL_FACTOR * mult)),
        isFinalPhase: i === ESCALATION.length - 1,
    }));
}

/**
 * Returns the enemy's threat sequence: an explicit `enemy.threatSequence` wins;
 * otherwise an authored sequence keyed by id; otherwise the generated default.
 */
export function getThreatSequence(enemy: Enemy): CombatThreatPhase[] {
    const explicit = (enemy as Enemy & { threatSequence?: CombatThreatPhase[] }).threatSequence;
    if (explicit && explicit.length > 0) return explicit;
    const authored = AUTHORED_THREAT_SEQUENCES[enemy.id];
    if (authored) return resolveAuthored(enemy, authored);
    return generateDefaultThreatSequence(enemy);
}

/** Global win thresholds = sum of per-phase requirements across the sequence (§5.3). */
export function deriveGlobalThresholds(sequence: readonly CombatThreatPhase[]): {
    dotThreshold: number; controlThreshold: number;
} {
    return {
        dotThreshold: sequence.reduce((s, p) => s + p.dotPressureRequired, 0),
        controlThreshold: sequence.reduce((s, p) => s + p.controlPressureRequired, 0),
    };
}
