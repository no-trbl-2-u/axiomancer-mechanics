/**
 * Spec 25 — Hazard-Pattern Combat: skill-card adapter (§4.3, §6).
 *
 * Projects a learned `Skill` into a `CombatCard` view: stance color, verb
 * class, pressure track, and top/bottom action text. The projection is pure —
 * it reads the skill + effect libraries and never mutates. The engine executes
 * a card's bottom action through the *unchanged* `executeSkill`; this module
 * only classifies and previews.
 *
 * Classification (§6 Rules 1-3) decides which Pressure Track a card feeds:
 *   - applies a DoT debuff to the enemy   → `direct-dot`     → dot track
 *   - applies a control debuff            → `direct-control` → control track
 *   - applies a stat-reduction debuff     → `stat-debuff`    → control track (smaller)
 *   - buffs the player                    → `buff-self`      → 0 pressure (utility)
 *   - raw HP damage, no status effect     → `direct-damage`  → 0 pressure
 *   - Befriend / Retreat                  → special handling
 */

import { MAX_EFFECT_INTENSITY } from '../Game/game-mechanics.constants';
import type { Effect } from '../Effects/types';
import type { Skill, SkillCombatEffects } from '../Skills/types';
import type {
    CombatCard, CombatDieColor, CombatVerbClass, PressureTrackKey,
} from './combat.encounter.types';

export type EffectLookup = (effectId: string) => Effect | undefined;
export type SkillLookup = (skillId: string) => Skill | undefined;

/** Synthetic (non-skill) card ids always present in a combat deck. */
export const SYNTHETIC_CARD_IDS: readonly string[] = Object.freeze(['card-retreat']);

const SYNTHETIC_CARDS: Record<string, CombatCard> = {
    'card-retreat': {
        id: 'card-retreat',
        skillId: null,
        name: 'Retreat',
        stance: 'wild',
        verbClass: 'retreat',
        track: 'none',
        tier: 1,
        category: null,
        topActionText: 'Brace — refresh 1 spent die.',
        bottomActionText: 'Flee combat. Costs all remaining available dice (§12 Q2).',
        bottomPressurePreview: 0,
        primaryEffectId: null,
    },
};

/** True when the id names a synthetic (non-skill) card. */
export function isSyntheticCard(cardId: string): boolean {
    return cardId in SYNTHETIC_CARDS;
}

/** Enemy-targeted effect payloads on a skill (`appliedTo: 'opponent'`). */
function enemyEffects(skill: Skill): SkillCombatEffects[] {
    return (skill.combatEffects ?? []).filter(e => e.appliedTo === 'opponent');
}

/** True if the effect is a DoT (ticks HP damage). */
function isDot(effect: Effect): boolean {
    return effect.payload.damageOverTime !== undefined;
}

/** True if the effect restricts the bearer's actions (control). */
function isControl(effect: Effect): boolean {
    if (effect.category === 'control') return true;
    const r = effect.payload.actionRestriction;
    return !!r && (r.skipTurn === true || r.forcedStance !== undefined || (r.blockedStances?.length ?? 0) > 0);
}

/** True if the effect is a stat-reduction debuff. */
function isStatDebuff(effect: Effect): boolean {
    if (effect.type !== 'debuff') return false;
    const mods = effect.payload.statModifiers ?? [];
    return mods.some(m => m.value < 0)
        || (effect.payload.rollModifier ?? 0) < 0
        || (effect.payload.defenseModifier ?? 0) < 0;
}

/**
 * Pressure a single enemy-targeted effect contributes when it lands, given the
 * intensity/duration the skill applies it at. Mirrors the Phase 125 resolution
 * math so the tracks are a faithful *leading indicator* of DoT-Erosion /
 * Control-Saturation (§5).
 *
 * Spec 26b tuning pass 2: Control was far weaker than DoT in playtest (control
 * plays moved the track +2-4 vs DoT's +9-20), so the Control Saturation / mercy
 * path never fired. Control contributions are scaled up here so racing Control
 * is a genuine alternative — `CONTROL_HARD`/`CONTROL_SOFT` multipliers tuned
 * against the balance sim.
 */
export const CONTROL_HARD_MULT = 6;   // hard control (stun/fear/silence/forced-stance…)
export const CONTROL_SOFT_MULT = 4;   // stat-debuffs + soft control
export const DOT_PERROUND_WEIGHT = 1; // DoT keeps its raw perRound×intensity
/**
 * Spec 26b tuning §3 — intensity credited toward PRESSURE is capped here. Effects
 * stack intensity up to MAX_EFFECT_INTENSITY (10), and pressure was raw
 * `perRound × intensity`, so re-applying ONE DoT card ramped its base pressure
 * (3×2 → 3×10 = 30) faster than diminishing returns could claw back — a single
 * spammed card outran every anti-spam lever. Capping the pressure-credited
 * intensity means stacking the SAME effect past the cap adds no more track
 * pressure, so the per-application diminishing actually bites and a VARIED kit
 * (distinct effects, each fresh) decisively out-paces mono-spam. The effect's
 * real intensity (and its HP erosion) is untouched — only its track credit caps.
 */
export const PRESSURE_INTENSITY_CAP = 3;

export function effectPressure(
    effect: Effect,
    intensity: number,
    duration: number,
): { track: PressureTrackKey; amount: number } {
    const i = Math.min(Math.max(1, intensity), PRESSURE_INTENSITY_CAP);
    if (isDot(effect)) {
        const perRound = effect.payload.damageOverTime!.damagePerRound;
        return { track: 'dot', amount: DOT_PERROUND_WEIGHT * perRound * i };
    }
    if (isControl(effect)) {
        const r = effect.payload.actionRestriction;
        const restricts = !!r && (r.skipTurn === true || r.forcedStance !== undefined || (r.blockedStances?.length ?? 0) > 0);
        const durationCredit = Math.min(Math.max(0, duration), 3);
        return { track: 'control', amount: i * CONTROL_HARD_MULT + (restricts ? durationCredit : 0) };
    }
    if (isStatDebuff(effect)) {
        // Soft control — still a meaningful chunk of the Control track (pass 2).
        return { track: 'control', amount: i * CONTROL_SOFT_MULT };
    }
    return { track: 'none', amount: 0 };
}

/** Stance color for a skill card — its philosophical aspect (§4.3). */
export function cardStanceColor(skill: Skill): CombatDieColor {
    return skill.philosophicalAspect;
}

/**
 * Classifies a skill into a verb class + the pressure track its bottom action
 * advances. Priority: DoT > control > stat-debuff > buff > direct-damage.
 */
export function classifyVerbClass(
    skill: Skill,
    lookupEffect: EffectLookup,
): { verbClass: CombatVerbClass; track: PressureTrackKey } {
    if ((skill.specialMechanics ?? []).some(m => m.kind === 'befriend_attempt')) {
        return { verbClass: 'befriend', track: 'control' };
    }
    // A defense card grants the player GUARD (a shield) — no enemy pressure.
    if ((skill.specialMechanics ?? []).some(m => m.kind === 'guard')) {
        return { verbClass: 'defend', track: 'none' };
    }

    const enemy = enemyEffects(skill);
    const defs = enemy.map(e => lookupEffect(e.effectId)).filter((e): e is Effect => !!e);

    if (defs.some(isDot)) return { verbClass: 'direct-dot', track: 'dot' };
    if (defs.some(isControl)) return { verbClass: 'direct-control', track: 'control' };
    if (defs.some(isStatDebuff)) return { verbClass: 'stat-debuff', track: 'control' };

    // No enemy debuff → either a self-buff or pure damage.
    const hasSelfBuff = (skill.combatEffects ?? []).some(e => e.appliedTo === 'self')
        || (skill.synergy?.applyEffectOnFire?.appliedTo === 'self')
        || skill.targetType === 'self';
    if (hasSelfBuff && skill.basePower <= 0) return { verbClass: 'buff-self', track: 'none' };
    return { verbClass: 'direct-damage', track: 'none' };
}

/** Total projected bottom-action pressure for a skill card (preview; §7.3). */
export function bottomPressurePreview(skill: Skill, lookupEffect: EffectLookup): number {
    let total = 0;
    for (const ce of enemyEffects(skill)) {
        const def = lookupEffect(ce.effectId);
        if (!def) continue;
        const intensity = Math.min(ce.intensity ?? 1, MAX_EFFECT_INTENSITY);
        const duration = ce.duration ?? def.duration;
        total += effectPressure(def, intensity, duration).amount;
    }
    return total;
}

/** The primary enemy effect id a card applies (first that contributes pressure),
 *  for the UI projection's diminishing-returns lookup. */
export function primaryEnemyEffectId(skill: Skill, lookupEffect: EffectLookup): string | null {
    for (const ce of enemyEffects(skill)) {
        const def = lookupEffect(ce.effectId);
        if (def && effectPressure(def, ce.intensity ?? 1, ce.duration ?? def.duration).track !== 'none') {
            return def.id;
        }
    }
    return null;
}

function tierLabel(tier: 1 | 2 | 3): string {
    return tier === 3 ? 'Tier 3' : tier === 2 ? 'Tier 2' : 'Tier 1';
}

/** Projects a learned skill (or synthetic card) into a `CombatCard` view. */
export function toCombatCard(cardId: string, lookupSkill: SkillLookup, lookupEffect: EffectLookup): CombatCard | null {
    if (isSyntheticCard(cardId)) return SYNTHETIC_CARDS[cardId];

    const skill = lookupSkill(cardId);
    if (!skill) return null;

    const { verbClass, track } = classifyVerbClass(skill, lookupEffect);
    const preview = bottomPressurePreview(skill, lookupEffect);

    const guardN = ((skill.specialMechanics ?? []).find(m => m.kind === 'guard') as { amount: number } | undefined)?.amount ?? 0;

    const topActionText = verbClass === 'defend'
        ? 'Brace — gain a little Guard (absorbs the next threat), no die.'
        : verbClass === 'direct-damage'
            ? 'Chip the enemy for a sliver of HP (0 pressure).'
            : verbClass === 'buff-self'
                ? 'Apply a weak version of the buff to yourself.'
                : `Apply a weak version — +1 ${track} pressure, no die.`;

    const bottomActionText = verbClass === 'defend'
        ? `Gain ${guardN} Guard — absorbs the enemy's next threat. Costs 1 die.`
        : verbClass === 'direct-damage'
            ? `Full strike (HP damage only — 0 pressure).`
            : verbClass === 'buff-self'
                ? 'Full buff to yourself. Costs 1 die.'
                : `Full effect — +${preview} ${track} pressure. Costs 1 ${cardStanceColor(skill)} die${skill.tier === 3 ? ' + 1 banked token' : ''}.`;

    return {
        id: skill.id,
        skillId: skill.id,
        name: skill.name,
        stance: cardStanceColor(skill),
        verbClass,
        track,
        tier: skill.tier,
        category: skill.category,
        topActionText: `${topActionText} (${tierLabel(skill.tier)})`,
        bottomActionText,
        bottomPressurePreview: preview,
        primaryEffectId: primaryEnemyEffectId(skill, lookupEffect),
    };
}

/** Projects an entire deck (card ids) into card views, dropping unknown ids. */
export function projectDeck(
    cardIds: readonly string[],
    lookupSkill: SkillLookup,
    lookupEffect: EffectLookup,
): CombatCard[] {
    return cardIds
        .map(id => toCombatCard(id, lookupSkill, lookupEffect))
        .filter((c): c is CombatCard => c !== null);
}
