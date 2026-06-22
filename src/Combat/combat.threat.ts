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
import type {
    CombatIntentType, CombatThreatAction, CombatThreatEffect, CombatThreatPhase,
} from './combat.encounter.types';
import { AUTHORED_THREAT_SEQUENCES } from './combat.threat-sequences';

/**
 * Authored phase template — DESIGN INTENT. The resolver (`resolveAuthored`)
 * computes the numeric clear thresholds (level + difficulty) and the threat-action
 * damage (level/difficulty budget × `damageWeight`) so the whole roster retunes
 * from a handful of constants without re-authoring 60+ enemies. Authoring lives in
 * `combat.threat-sequences.ts`.
 */
export interface AuthoredThreatPhase {
    enemyStance: Stance;
    /**
     * RELATIVE DoT-clear multiplier for this phase (1.0 = neutral). Below 1 = the
     * enemy is WEAK to erosion on this phase (cheaper to clear via DoT); above 1 =
     * resistant. The absolute height comes from level + difficulty, not HP — see
     * `phaseThreshold`. A weak track should sit ~0.7; a resistant one ~1.25.
     */
    dotFactor: number;
    /** RELATIVE Control-clear multiplier for this phase (1.0 neutral; <1 weak / mercy-prone; >1 resistant). */
    controlFactor: number;
    /** Threat-action damage as a multiple of the level/difficulty budget (default 1.0). */
    damageWeight?: number;
    /** Optional player-debuff applied when this phase is Overwhelmed (telegraphed punish). */
    threatEffectId?: string;
    /** Intensity for `threatEffectId` (default 1). */
    threatIntensity?: number;
    /** Optional enemy self-heal on Overwhelm (a regenerating phase). */
    enemyHeal?: number;
    /** Threat description WITHOUT the damage number — the resolver appends "(+N damage[, Effect])". */
    actionText: string;
    isFinalPhase?: boolean;
    /** Spec 26b §2 — thematic tell implying this phase's hidden stance. */
    stanceHint?: string;
}

/**
 * Threshold model (hazard-combat enemy pass, 2026-06-21).
 *
 * Per-phase clear thresholds scale with enemy LEVEL and DIFFICULTY, *not* raw HP.
 * Rationale (measured by the balance sim): status pressure output is essentially
 * HP-independent — a poison ticks the same 4/round against a L1 crab or a L50
 * capstone — so the previous `factor × maxHP` model made thresholds explode
 * (~33 at L1 → ~890 at L50) while a committed status play still only moves a
 * track ~10-20. Every enemy above ~L12 became unwinnable on either track. Level +
 * difficulty scaling keeps each tier inside its authored 3-8 play window
 * (boss ~10) at every level, and the relative per-phase factors above set which
 * track each enemy is weak to (both win paths stay live across the roster).
 */
const PHASE_BASE = 20;           // baseline pressure to clear a phase at level 0
const PHASE_PER_LEVEL = 0.1;     // NEARLY FLAT. Two hard caps make per-phase
                                 // thresholds level-independent: (1) the learnable
                                 // skill pool caps status output at ~10-12
                                 // pressure/play at EVERY level; (2) a phase is
                                 // fought with ONE hand (`COMBAT_HAND_SIZE` cards) —
                                 // ~5-6 plays — so a threshold much above ~50 is
                                 // unclearable by anyone. An enemy's DIFFICULTY
                                 // therefore lives in its tier + authored pattern +
                                 // threat damage, not its level.

/** Default RELATIVE factors for unauthored enemies (neutral both tracks). */
const DEFAULT_DOT_FACTOR = 1.0;
const DEFAULT_CONTROL_FACTOR = 1.05;

/** Per-phase escalation by index — supports up to 5-phase bosses. Kept MILD:
 *  a one-hand phase can't absorb a steep wall, so later-phase danger should come
 *  from deadlier threat actions (authored), not a runaway clear threshold. */
const ESCALATION = [1.0, 1.1, 1.2, 1.3, 1.4];

/**
 * Per-DIFFICULTY height multiplier (the win-rate-band lever). Gives a boss real
 * bite a same-level normal lacks; `simple` foes resolve fast. Tuned vs the sim to
 * land normal 80-95% / elite 50-70% / boss 30-55% win rates.
 */
const DIFFICULTY_MULT: Record<string, number> = {
    simple: 0.7, normal: 0.92, elite: 1.08, boss: 1.25, unique: 1.2,
};

/** Per-phase clear FLOOR — even a trivial foe stays a 3-4 play exchange. */
const MIN_PHASE = 12;

/**
 * Per-phase HP share that caps the CONTROL (mercy) threshold. A win via Control
 * Saturation is a MERCY — it must be reachable BEFORE the enemy's HP is chipped to
 * zero (which resolves as a kill, not a spare). Control plays also deal incidental
 * HP damage, so on a LOW-HP foe a level-based control threshold can exceed the HP
 * and the enemy dies first — mercy never fires (the Spec 25 "both win paths live"
 * invariant breaks). Capping the control base at a fraction of HP guarantees mercy
 * out-races the kill on small foes; on big foes the level-based base binds instead
 * (the cap is non-binding), so high HP never makes mercy unreachable. The DoT path
 * is NOT capped — DoT erosion and an HP kill both resolve as victory, no conflict.
 */
const MERCY_HP_K = 0.42;

/** Resolves an enemy's per-difficulty height multiplier (neutral fallback). */
function difficultyMult(enemy: Enemy): number {
    const d = (enemy as Enemy & { difficulty?: string }).difficulty;
    return (d !== undefined && DIFFICULTY_MULT[d] !== undefined) ? DIFFICULTY_MULT[d] : 1.0;
}

/** Per-track threshold bases: DoT is purely level-based; Control is capped at a
 *  fraction of HP so the mercy path out-races the kill (see `MERCY_HP_K`). */
function thresholdBases(enemy: Enemy): { dotBase: number; controlBase: number } {
    const level = Math.max(1, enemy.level);
    const levelBase = PHASE_BASE + PHASE_PER_LEVEL * level;
    return { dotBase: levelBase, controlBase: Math.min(levelBase, Math.max(1, enemy.maxHealth) * MERCY_HP_K) };
}

/**
 * The per-phase clear threshold for one track: the track `base` sets the absolute
 * height; `escalation` lifts later phases; the relative `factor` says how
 * weak/resistant the enemy is on this track for this phase.
 */
function phaseThreshold(base: number, dMult: number, phaseIndex: number, factor: number): number {
    const esc = ESCALATION[Math.min(phaseIndex, ESCALATION.length - 1)];
    return Math.max(MIN_PHASE, Math.round(base * esc * dMult * factor));
}

// ── Spec 26 §2 — intent derivation (the telegraph; stance stays hidden) ──────

/** True when a threat effect debuffs the player (any applied effectId does). */
function effectIsDebuff(eff: CombatThreatEffect): boolean {
    return !!eff.effectId;
}

/**
 * Derives the enemy's INTENT type from a threat action's effects (Spec 26 §2.2).
 * Damage + a debuff, or damage + self-heal, etc. → `combo`. Pure.
 */
export function deriveIntentType(effects: readonly CombatThreatEffect[]): CombatIntentType {
    const hasDamage = effects.some(e => (e.damage ?? 0) > 0);
    const hasDebuff = effects.some(effectIsDebuff);
    const hasBuff = effects.some(e => (e.enemyHeal ?? 0) > 0);
    const active = [hasDamage, hasDebuff, hasBuff].filter(Boolean).length;
    if (active === 0) return 'pass';
    if (active >= 2) return 'combo';
    if (hasDamage) return 'damage';
    if (hasDebuff) return 'debuff';
    return 'buff';
}

/** Stamps the derived intent (unless an explicit override is present). */
function withIntent(phase: CombatThreatPhase): CombatThreatPhase {
    return phase.intentType ? phase : { ...phase, intentType: deriveIntentType(phase.threatAction.effects) };
}

/** A generic per-stance thematic tell for unauthored enemies. */
const DEFAULT_STANCE_HINTS: Record<Stance, string> = {
    heart: 'Something raw and feeling drives it — it answers from the heart.',
    body: 'It carries itself like a brawler — force is its first language.',
    mind: 'A cold calculation moves behind its eyes — it thinks before it strikes.',
};

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

/**
 * Threat-damage budget for an Overwhelmed phase (hazard-combat pass). Anchored to
 * LEVEL + DIFFICULTY, not the enemy's legacy attack stat — the old `atk × scale`
 * model produced ~180 dmg/phase at L50 (instant death) and ~4 at L2 (no bite),
 * because the legacy attack curve is far steeper than HP. As a consistent ~%-of-
 * player-HP punish it keeps a missed clear meaningful at every level. Authored
 * sequences set their own damage; this only backs the generator fallback.
 */
const THREAT_BASE = 4;
const THREAT_PER_LEVEL = 0.95;

/** Damage an Overwhelmed phase deals: a level/difficulty budget × the phase's
 *  authored `damageWeight`. Shared by authored sequences and the generator. */
function threatDamageBudget(level: number, dMult: number, phaseIndex: number, weight = 1): number {
    return Math.max(3, Math.round(
        (THREAT_BASE + THREAT_PER_LEVEL * Math.max(1, level)) * dMult * (1 + 0.2 * phaseIndex) * weight,
    ));
}

/** A short human label for a telegraphed debuff id (e.g. `debuff_fear` → "Fear"). */
function effectLabel(effectId: string): string {
    return effectId.replace(/^debuff_/, '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

/** Builds a `CombatThreatAction` from authored intent + the computed damage. */
function buildThreatAction(
    actionText: string, damage: number, effectId?: string, intensity?: number, enemyHeal?: number,
): CombatThreatAction {
    const effects: CombatThreatEffect[] = [];
    if (damage > 0) effects.push({ damage });
    if (effectId) effects.push({ effectId, intensity: intensity ?? 1 });
    if (enemyHeal && enemyHeal > 0) effects.push({ enemyHeal });
    const parts = [`+${damage} damage`];
    if (effectId) parts.push(effectLabel(effectId));
    if (enemyHeal && enemyHeal > 0) parts.push(`heals ${enemyHeal}`);
    return { description: `${actionText} (${parts.join(', ')}).`, effects };
}

/** A level/difficulty-scaled threat action for an unauthored enemy. */
function defaultThreatAction(enemy: Enemy, phaseIndex: number): CombatThreatAction {
    const damage = threatDamageBudget(enemy.level, difficultyMult(enemy), phaseIndex);
    const verb = phaseIndex === 0 ? 'presses the attack' : 'escalates';
    return buildThreatAction(`${enemy.name} ${verb}`, damage);
}

/** Ids that carry an authored threat sequence. */
export const AUTHORED_THREAT_ENEMY_IDS: readonly string[] = Object.freeze(Object.keys(AUTHORED_THREAT_SEQUENCES));

/** Enemy-level fallback tell (from the Enemy record), if authored. */
function enemyStanceHint(enemy: Enemy): string | undefined {
    return (enemy as Enemy & { stanceHint?: string }).stanceHint;
}

function resolveAuthored(enemy: Enemy, authored: AuthoredThreatPhase[]): CombatThreatPhase[] {
    const level = Math.max(1, enemy.level);
    const dMult = difficultyMult(enemy);
    const { dotBase, controlBase } = thresholdBases(enemy);
    return authored.map((p, i) => {
        const damage = threatDamageBudget(level, dMult, i, p.damageWeight ?? 1);
        return withIntent({
            index: i + 1,
            enemyStance: p.enemyStance,
            threatAction: buildThreatAction(p.actionText, damage, p.threatEffectId, p.threatIntensity, p.enemyHeal),
            dotPressureRequired: phaseThreshold(dotBase, dMult, i, p.dotFactor),
            controlPressureRequired: phaseThreshold(controlBase, dMult, i, p.controlFactor),
            isFinalPhase: p.isFinalPhase ?? i === authored.length - 1,
            stanceHint: p.stanceHint ?? enemyStanceHint(enemy) ?? DEFAULT_STANCE_HINTS[p.enemyStance],
        });
    });
}

/** Generates a default 3-phase escalating sequence for an unauthored enemy (§10). */
export function generateDefaultThreatSequence(enemy: Enemy): CombatThreatPhase[] {
    const dMult = difficultyMult(enemy);
    const { dotBase, controlBase } = thresholdBases(enemy);
    const base = dominantStance(enemy);
    const PHASES = 3;
    return Array.from({ length: PHASES }, (_unused, i) => {
        const enemyStance = rotateStance(base, i);
        return withIntent({
            index: i + 1,
            enemyStance,
            threatAction: defaultThreatAction(enemy, i),
            dotPressureRequired: phaseThreshold(dotBase, dMult, i, DEFAULT_DOT_FACTOR),
            controlPressureRequired: phaseThreshold(controlBase, dMult, i, DEFAULT_CONTROL_FACTOR),
            isFinalPhase: i === PHASES - 1,
            stanceHint: enemyStanceHint(enemy) ?? DEFAULT_STANCE_HINTS[enemyStance],
        });
    });
}

/**
 * Returns the enemy's threat sequence: an explicit `enemy.threatSequence` wins;
 * otherwise an authored sequence keyed by id; otherwise the generated default.
 */
export function getThreatSequence(enemy: Enemy): CombatThreatPhase[] {
    const explicit = (enemy as Enemy & { threatSequence?: CombatThreatPhase[] }).threatSequence;
    if (explicit && explicit.length > 0) {
        return explicit.map(p => withIntent({
            ...p,
            stanceHint: p.stanceHint ?? enemyStanceHint(enemy) ?? DEFAULT_STANCE_HINTS[p.enemyStance],
        }));
    }
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
