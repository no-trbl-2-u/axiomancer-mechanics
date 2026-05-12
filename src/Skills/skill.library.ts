/**
 * Early-game skill library (Spec 04b).
 *
 * Twelve skills covering every philosophical-aspect × category × tier cell
 * the Spec 04 economy can produce in the opening hours of the game:
 *   - Tier 1 (6): single-stance cost, generates 1 philosophical token of
 *     the skill's own category.
 *   - Tier 2 (3): multi-key resonance cost, generates 1 token of category.
 *   - Tier 3 (3): philosophical-resource gated, generates 1 token of the
 *     OPPOSING category (Fallacy ↔ Paradox) to keep skill chains flowing in
 *     the late combat.
 *
 * Skill IDs follow kebab-case per `specs/04b-skills-library-and-e2e.md` Q1
 * (effect IDs in the library use snake_case; skills use kebab-case so the
 * two namespaces stay visually distinct).
 *
 * This file is data-only. All runtime behaviour lives in
 * `src/Skills/skill.engine.ts` and is driven by the discriminated unions
 * declared on `Skill` (`combatEffects`, `specialMechanics`).
 */

import { Skill } from './types';

// ─── Tier 1 — Single Stance Cost (6 skills) ──────────────────────────────────

const adHominemStrike: Skill = {
    id: 'ad-hominem-strike',
    name: 'Ad Hominem Strike',
    category: 'fallacy',
    philosophicalAspect: 'body',
    description:
        'You don\'t refute the argument — you refute the arguer. The blow lands ' +
        'where their composure was, scattering whatever fragile certainty they ' +
        'had built. Their stance crumbles before their muscles do.',
    tier: 1,
    resourceCost: { body: 3 },
    targetType: 'enemy',
    basePower: 8,
    scalingStat: 'body',
    specialMechanics: [{ kind: 'strip_random_buff', appliedTo: 'enemy' }],
};

const falseDilemma: Skill = {
    id: 'false-dilemma',
    name: 'False Dilemma',
    category: 'fallacy',
    philosophicalAspect: 'mind',
    description:
        'Two doors. Only two. Either-or, your fault, no third option — except ' +
        'every option is a door. The enemy hesitates between phantoms while you ' +
        'walk straight through.',
    tier: 1,
    resourceCost: { mind: 3 },
    targetType: 'enemy',
    basePower: 4,
    scalingStat: 'mind',
    combatEffects: [
        { effectId: 'debuff_confusion', appliedTo: 'opponent', duration: 2 },
    ],
};

const appealToPity: Skill = {
    id: 'appeal-to-pity',
    name: 'Appeal to Pity',
    category: 'fallacy',
    philosophicalAspect: 'heart',
    description:
        'You let the wound show. The argument was never the point — your pain ' +
        'is. Even your own body listens, and softens, and bends a little of ' +
        'itself back together.',
    tier: 1,
    resourceCost: { heart: 3 },
    targetType: 'self',
    basePower: 0,
    scalingStat: 'heart',
    // heal = 0 + heart × 0.5 × 4  →  heart × 2 (per Spec 04b Q2-companion).
    scalingMultiplier: 4,
};

const achillesGambit: Skill = {
    id: 'achilles-gambit',
    name: 'Achilles\' Gambit',
    category: 'paradox',
    philosophicalAspect: 'body',
    description:
        'You commit to the strike that should never land — the runner who can ' +
        'never catch the tortoise, the heel that must be exposed. Paradox ' +
        'collapses into a single, unanswerable blow.',
    tier: 1,
    resourceCost: { body: 3 },
    targetType: 'enemy',
    basePower: 12,
    scalingStat: 'body',
};

const liarsEcho: Skill = {
    id: 'liars-echo',
    name: 'Liar\'s Echo',
    category: 'paradox',
    philosophicalAspect: 'mind',
    description:
        '"This sentence is false." Their next thought catches on the loop, ' +
        'doubles back, and arrives more exposed than when it left. You read ' +
        'every tell twice.',
    tier: 1,
    resourceCost: { mind: 3 },
    targetType: 'enemy',
    basePower: 3,
    scalingStat: 'mind',
    combatEffects: [
        { effectId: 'tier1_mind_mark', appliedTo: 'opponent', intensity: 2, duration: 2 },
    ],
};

const shipOfTheseus: Skill = {
    id: 'ship-of-theseus',
    name: 'Ship of Theseus',
    category: 'paradox',
    philosophicalAspect: 'heart',
    description:
        'A plank of their resolve replaces a plank of yours. They are still ' +
        'themselves, technically; you are still yourself, technically. The ' +
        'borrowed buff settles around your shoulders.',
    tier: 1,
    resourceCost: { heart: 3 },
    targetType: 'enemy',
    basePower: 0,
    scalingStat: 'heart',
    specialMechanics: [{ kind: 'convert_enemy_buff_to_self' }],
};

// ─── Tier 2 — Resonance Required (3 skills) ──────────────────────────────────

const mobAppeal: Skill = {
    id: 'mob-appeal',
    name: 'Mob Appeal',
    category: 'fallacy',
    philosophicalAspect: 'body',
    description:
        'The crowd already believes you. So does the part of you that needed ' +
        'convincing. A simultaneous blow and a small, dishonest reassurance — ' +
        'and both work.',
    tier: 2,
    resourceCost: { body: 2, heart: 2 },
    targetType: 'enemy',
    basePower: 10,
    scalingStat: 'body',
    specialMechanics: [{ kind: 'secondary_heal_self', stat: 'heart', multiplier: 1 }],
};

const undistributedMiddle: Skill = {
    id: 'undistributed-middle',
    name: 'Undistributed Middle',
    category: 'paradox',
    philosophicalAspect: 'mind',
    description:
        'All philosophers are mortal. You are mortal. Therefore you are a ' +
        'philosopher — and your enemy is illegible. You watch them try to ' +
        'follow the syllogism into a corner they cannot leave.',
    tier: 2,
    resourceCost: { body: 2, mind: 2 },
    targetType: 'enemy',
    basePower: 8,
    scalingStat: 'mind',
    combatEffects: [
        { effectId: 'tier1_mind_mark', appliedTo: 'opponent', intensity: 3, duration: 3 },
    ],
};

const eternalRegress: Skill = {
    id: 'eternal-regress',
    name: 'Eternal Regress',
    category: 'fallacy',
    philosophicalAspect: 'heart',
    description:
        'Every answer they reach demands a previous answer; every previous ' +
        'answer demands one more. You watch their certainty unspool itself — ' +
        'and lay two distinct binds on the wreckage.',
    tier: 2,
    resourceCost: { heart: 2, mind: 2 },
    targetType: 'enemy',
    basePower: 6,
    scalingStat: 'heart',
    combatEffects: [
        { effectId: 'debuff_confusion', appliedTo: 'opponent' },
        { effectId: 'debuff_slow',      appliedTo: 'opponent' },
    ],
};

// ─── Tier 3 — Philosophical Resource Required (3 skills) ─────────────────────

const soritesCascade: Skill = {
    id: 'sorites-cascade',
    name: 'Sorites\' Cascade',
    category: 'paradox',
    philosophicalAspect: 'mind',
    description:
        'A grain. Another grain. At what point did the heap of small wounds ' +
        'become a mortal one? They cannot say. The bleeding stacks faster than ' +
        'their definition of "alive."',
    tier: 3,
    resourceCost: { mind: 2, paradox: 1 },
    targetType: 'enemy',
    basePower: 5,
    scalingStat: 'mind',
    combatEffects: [
        { effectId: 'debuff_bleed', appliedTo: 'opponent', intensity: 2, duration: 4 },
    ],
};

const strawGiant: Skill = {
    id: 'straw-giant',
    name: 'Straw Giant',
    category: 'fallacy',
    philosophicalAspect: 'body',
    description:
        'You build the version of them you can topple, then topple it — and the ' +
        'real one comes with. There is no defence against the argument you ' +
        'invented to win.',
    tier: 3,
    resourceCost: { body: 3, fallacy: 1 },
    targetType: 'enemy',
    basePower: 18,
    scalingStat: 'body',
    // Marker today; the engine already produces flat skill damage that does
    // not route through defence. Preserved so a future damage path can branch.
    specialMechanics: [{ kind: 'bypass_defense' }],
};

const bootstrapParadox: Skill = {
    id: 'bootstrap-paradox',
    name: 'Bootstrap Paradox',
    category: 'paradox',
    philosophicalAspect: 'heart',
    description:
        'The healing comes from the version of you that survived. The version ' +
        'of you that survived came from this healing. The loop is whole; the ' +
        'wound, less so.',
    tier: 3,
    resourceCost: { heart: 2, paradox: 1 },
    targetType: 'self',
    basePower: 0,
    scalingStat: 'heart',
    // Fallback per spec out-of-scope note: until `RoundEvent` exposes a
    // round-damage total, the heal is a flat heart × 0.5 × 4 → heart × 2.
    scalingMultiplier: 4,
};

// ─── Library Export ──────────────────────────────────────────────────────────

/**
 * The full early-game skill catalogue. Order is presentational only — the
 * resolver looks skills up by ID via `getSkillById`. Keep cells balanced
 * across `(philosophicalAspect × category × tier)` when adding entries here.
 */
export const skillLibrary: Skill[] = [
    // Tier 1
    adHominemStrike,
    falseDilemma,
    appealToPity,
    achillesGambit,
    liarsEcho,
    shipOfTheseus,
    // Tier 2
    mobAppeal,
    undistributedMiddle,
    eternalRegress,
    // Tier 3
    soritesCascade,
    strawGiant,
    bootstrapParadox,
];

const skillRegistry: ReadonlyMap<string, Skill> = new Map(
    skillLibrary.map(skill => [skill.id, skill]),
);

/**
 * O(1) lookup by skill ID. Returns `undefined` if no skill matches — callers
 * must handle that (the combat resolver emits a `skill-blocked` event with
 * `reason: 'unknown-skill'` rather than throwing).
 */
export function getSkillById(id: string): Skill | undefined {
    return skillRegistry.get(id);
}
