/**
 * Skill Library
 *
 * 18 philosophically-themed skills (3 per stat × 2 categories).
 * Each skill is named after a logical fallacy (`fallacy` category) or a
 * philosophical paradox (`paradox` category) and references effects from
 * the existing buffs / debuffs libraries via `combatEffects`.
 *
 * Conventions:
 *   - Tier 1 skills: no resist roll, low power, low mana cost
 *   - Tier 2 skills: target may resist via the resist DR machinery
 *   - Tier 3 skills: nigh-inescapable; high mana, gated behind level requirements
 *
 * Damage scales as:
 *   damage = basePower + scalingStat + advantage modifier (per advantageInteraction)
 *
 * `combatEffects` here use the existing trigger format from
 * `Combat/types.ts` so skills go through the same `applyCombatEffects`
 * pipeline as on-hit procs.
 */

import { Skill } from './types';

export const skillLibrary: Skill[] = [
    // ── Body / Fallacies ────────────────────────────────────────────────
    {
        id: 'skill_appeal_to_force',
        name: 'Appeal to Force',
        description: 'You don\'t argue — you intimidate. The threat lands harder than any premise.',
        category: 'fallacy',
        philosophicalAspect: 'body',
        level: 1,
        manaCost: 4,
        targetType: 'enemy',
        basePower: 2,
        scalingStat: 'physicalAttack',
        advantageInteraction: 'standard',
        teir: 'Teir 1',
        combatEffects: [
            { effectId: 'debuff_fear', chance: 0.30, target: 'opponent' },
        ],
    },
    {
        id: 'skill_ad_baculum_strike',
        name: 'Ad Baculum Strike',
        description: 'Your conviction lands physical — every blow reinforces the next.',
        category: 'fallacy',
        philosophicalAspect: 'body',
        level: 3,
        manaCost: 6,
        targetType: 'enemy',
        basePower: 4,
        scalingStat: 'physicalAttack',
        advantageInteraction: 'amplify',
        teir: 'Teir 2',
        combatEffects: [
            { effectId: 'buff_body_attack_up', chance: 0.50, target: 'self', critGuaranteed: true },
        ],
        learningRequirement: { level: 3, statRequirementType: 'body', statRequirementValue: 4 },
    },
    {
        id: 'skill_strawman_smash',
        name: 'Strawman Smash',
        description: 'You build the easiest version of their argument and crush it. The kinetic shock travels back.',
        category: 'fallacy',
        philosophicalAspect: 'body',
        level: 5,
        manaCost: 9,
        targetType: 'enemy',
        basePower: 6,
        scalingStat: 'physicalAttack',
        advantageInteraction: 'standard',
        teir: 'Teir 3',
        combatEffects: [
            { effectId: 'debuff_wound', chance: 0.40, target: 'opponent', critGuaranteed: true },
        ],
        learningRequirement: { level: 5, statRequirementType: 'body', statRequirementValue: 6 },
    },

    // ── Body / Paradoxes ────────────────────────────────────────────────
    {
        id: 'skill_ship_of_theseus',
        name: 'Ship of Theseus',
        description: 'You replace plank by plank — the wound never quite finishes forming.',
        category: 'paradox',
        philosophicalAspect: 'body',
        level: 1,
        manaCost: 5,
        targetType: 'self',
        basePower: 3,
        scalingStat: 'physicalDefense',
        advantageInteraction: 'ignore',
        teir: 'Teir 1',
        combatEffects: [
            { effectId: 'buff_regeneration', chance: 1.0, target: 'self' },
        ],
    },
    {
        id: 'skill_sorites_pile',
        name: 'Sorites Pile',
        description: 'One grain at a time. None of them matter, yet a heap forms — and falls on them.',
        category: 'paradox',
        philosophicalAspect: 'body',
        level: 4,
        manaCost: 7,
        targetType: 'enemy',
        basePower: 3,
        scalingStat: 'physicalAttack',
        advantageInteraction: 'standard',
        teir: 'Teir 2',
        combatEffects: [
            { effectId: 'debuff_bleed', chance: 0.50, target: 'opponent' },
        ],
        learningRequirement: { level: 4 },
    },
    {
        id: 'skill_zenos_arrow',
        name: 'Zeno\'s Arrow',
        description: 'The arrow never arrives. It is always halfway. You strike at every halfway point at once.',
        category: 'paradox',
        philosophicalAspect: 'body',
        level: 6,
        manaCost: 12,
        targetType: 'enemy',
        basePower: 8,
        scalingStat: 'physicalAttack',
        advantageInteraction: 'amplify',
        teir: 'Teir 3',
        combatEffects: [
            { effectId: 'debuff_knockdown', chance: 0.60, target: 'opponent', critGuaranteed: true },
        ],
        learningRequirement: { level: 6, statRequirementType: 'body', statRequirementValue: 7 },
    },

    // ── Mind / Fallacies ────────────────────────────────────────────────
    {
        id: 'skill_red_herring',
        name: 'Red Herring',
        description: 'You drag the conversation off-track. Their next thought lands on a different problem entirely.',
        category: 'fallacy',
        philosophicalAspect: 'mind',
        level: 1,
        manaCost: 3,
        targetType: 'enemy',
        basePower: 1,
        scalingStat: 'mentalAttack',
        advantageInteraction: 'standard',
        teir: 'Teir 1',
        combatEffects: [
            { effectId: 'debuff_confusion', chance: 0.40, target: 'opponent' },
        ],
    },
    {
        id: 'skill_argument_from_authority',
        name: 'Argument from Authority',
        description: 'Someone respected said it. They feel themselves agreeing before they realise why.',
        category: 'fallacy',
        philosophicalAspect: 'mind',
        level: 3,
        manaCost: 6,
        targetType: 'enemy',
        basePower: 3,
        scalingStat: 'mentalAttack',
        advantageInteraction: 'standard',
        teir: 'Teir 2',
        combatEffects: [
            { effectId: 'debuff_silence', chance: 0.40, target: 'opponent' },
        ],
        learningRequirement: { level: 3, statRequirementType: 'mind', statRequirementValue: 4 },
    },
    {
        id: 'skill_circular_reasoning',
        name: 'Circular Reasoning',
        description: 'Because the conclusion is the premise. They follow the loop until they forget which direction they were going.',
        category: 'fallacy',
        philosophicalAspect: 'mind',
        level: 5,
        manaCost: 10,
        targetType: 'enemy',
        basePower: 7,
        scalingStat: 'mentalAttack',
        advantageInteraction: 'amplify',
        teir: 'Teir 3',
        combatEffects: [
            { effectId: 'debuff_daze', chance: 0.50, target: 'opponent', critGuaranteed: true },
        ],
        learningRequirement: { level: 5, statRequirementType: 'mind', statRequirementValue: 6 },
    },

    // ── Mind / Paradoxes ────────────────────────────────────────────────
    {
        id: 'skill_liar_paradox',
        name: 'Liar\'s Paradox',
        description: '"This sentence is false." Your strike hits if and only if it does not.',
        category: 'paradox',
        philosophicalAspect: 'mind',
        level: 2,
        manaCost: 5,
        targetType: 'enemy',
        basePower: 2,
        scalingStat: 'mentalSkill',
        advantageInteraction: 'reverse',
        teir: 'Teir 1',
        combatEffects: [
            { effectId: 'debuff_silence', chance: 0.30, target: 'opponent' },
        ],
    },
    {
        id: 'skill_grandfather_paradox',
        name: 'Grandfather Paradox',
        description: 'You attack the conclusion of their argument before its premises arrive. Causality buckles.',
        category: 'paradox',
        philosophicalAspect: 'mind',
        level: 4,
        manaCost: 8,
        targetType: 'enemy',
        basePower: 4,
        scalingStat: 'mentalSkill',
        advantageInteraction: 'standard',
        teir: 'Teir 2',
        combatEffects: [
            { effectId: 'debuff_fear', chance: 0.40, target: 'opponent' },
        ],
        learningRequirement: { level: 4, statRequirementType: 'mind', statRequirementValue: 5 },
    },
    {
        id: 'skill_unexpected_hanging',
        name: 'Unexpected Hanging',
        description: 'They knew the strike was coming, which is exactly why it surprises them.',
        category: 'paradox',
        philosophicalAspect: 'mind',
        level: 6,
        manaCost: 12,
        targetType: 'enemy',
        basePower: 8,
        scalingStat: 'mentalSkill',
        advantageInteraction: 'amplify',
        teir: 'Teir 3',
        combatEffects: [
            { effectId: 'debuff_daze', chance: 0.55, target: 'opponent', critGuaranteed: true },
        ],
        learningRequirement: { level: 6, statRequirementType: 'mind', statRequirementValue: 7 },
    },

    // ── Heart / Fallacies ───────────────────────────────────────────────
    {
        id: 'skill_appeal_to_emotion',
        name: 'Appeal to Emotion',
        description: 'Forget the facts. Make them feel it. Their resolve cracks.',
        category: 'fallacy',
        philosophicalAspect: 'heart',
        level: 1,
        manaCost: 4,
        targetType: 'enemy',
        basePower: 2,
        scalingStat: 'emotionalAttack',
        advantageInteraction: 'standard',
        teir: 'Teir 1',
        combatEffects: [
            { effectId: 'debuff_fear', chance: 0.35, target: 'opponent' },
        ],
    },
    {
        id: 'skill_ad_hominem',
        name: 'Ad Hominem',
        description: 'You strike at the person, not the position. The wound is personal.',
        category: 'fallacy',
        philosophicalAspect: 'heart',
        level: 3,
        manaCost: 6,
        targetType: 'enemy',
        basePower: 3,
        scalingStat: 'emotionalAttack',
        advantageInteraction: 'standard',
        teir: 'Teir 2',
        combatEffects: [
            { effectId: 'debuff_charm', chance: 0.30, target: 'opponent' },
        ],
        learningRequirement: { level: 3, statRequirementType: 'heart', statRequirementValue: 4 },
    },
    {
        id: 'skill_tu_quoque',
        name: 'Tu Quoque',
        description: '"You\'ve done it too." The hypocrisy lands like a blade between the ribs of their conviction.',
        category: 'fallacy',
        philosophicalAspect: 'heart',
        level: 5,
        manaCost: 10,
        targetType: 'enemy',
        basePower: 6,
        scalingStat: 'emotionalAttack',
        advantageInteraction: 'amplify',
        teir: 'Teir 3',
        combatEffects: [
            { effectId: 'debuff_charm', chance: 0.55, target: 'opponent', critGuaranteed: true },
        ],
        learningRequirement: { level: 5, statRequirementType: 'heart', statRequirementValue: 6 },
    },

    // ── Heart / Paradoxes ───────────────────────────────────────────────
    {
        id: 'skill_paradox_of_tolerance',
        name: 'Paradox of Tolerance',
        description: 'To preserve compassion, you reject the cruelty in front of you. You strengthen.',
        category: 'paradox',
        philosophicalAspect: 'heart',
        level: 1,
        manaCost: 4,
        targetType: 'self',
        basePower: 2,
        scalingStat: 'emotionalDefense',
        advantageInteraction: 'ignore',
        teir: 'Teir 1',
        combatEffects: [
            { effectId: 'buff_heart_defense_up', chance: 0.80, target: 'self' },
        ],
    },
    {
        id: 'skill_buridans_devotion',
        name: 'Buridan\'s Devotion',
        description: 'Two equal goods, no reason to choose. Your resolve becomes the choice itself.',
        category: 'paradox',
        philosophicalAspect: 'heart',
        level: 4,
        manaCost: 8,
        targetType: 'self',
        basePower: 4,
        scalingStat: 'emotionalSkill',
        advantageInteraction: 'ignore',
        teir: 'Teir 2',
        combatEffects: [
            { effectId: 'buff_heart_attack_up', chance: 0.70, target: 'self' },
        ],
        learningRequirement: { level: 4, statRequirementType: 'heart', statRequirementValue: 5 },
    },
    {
        id: 'skill_omnipotence_paradox',
        name: 'Omnipotence Paradox',
        description: 'A blow you cannot stop, against a will that cannot break. Both true. Both false. Theirs cracks first.',
        category: 'paradox',
        philosophicalAspect: 'heart',
        level: 6,
        manaCost: 14,
        targetType: 'enemy',
        basePower: 8,
        scalingStat: 'emotionalAttack',
        advantageInteraction: 'amplify',
        teir: 'Teir 3',
        combatEffects: [
            { effectId: 'debuff_charm', chance: 0.50, target: 'opponent', critGuaranteed: true },
        ],
        learningRequirement: { level: 6, statRequirementType: 'heart', statRequirementValue: 7 },
    },
];

const skillRegistry = new Map<string, Skill>();
for (const s of skillLibrary) skillRegistry.set(s.id, s);

/** O(1) lookup by skill ID. */
export const lookupSkill = (id: string): Skill | undefined => skillRegistry.get(id);

/** Returns every skill in the library. */
export const getAllSkills = (): Skill[] => [...skillLibrary];

/** Returns every skill of the given category. */
export const getSkillsByCategory = (category: Skill['category']): Skill[] =>
    skillLibrary.filter(s => s.category === category);

/** Returns every skill aligned with the given stat. */
export const getSkillsByAspect = (aspect: Skill['philosophicalAspect']): Skill[] =>
    skillLibrary.filter(s => s.philosophicalAspect === aspect);
