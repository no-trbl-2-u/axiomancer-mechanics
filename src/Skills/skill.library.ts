import type { Skill } from './types';

/**
 * Skill Library - A comprehensive collection of skills based on
 * logical fallacies and philosophical paradoxes.
 * 
 * Skills are organized by:
 * - Category: 'fallacy' (argumentative tactics) or 'paradox' (logical contradictions)
 * - Philosophical Aspect: 'body', 'mind', or 'heart' (determines scaling stat)
 * - Level: 1-5 (power tier and learning requirements)
 * 
 * Effect references correspond to IDs in buff.library.json and debuff.library.json
 */

// =============================================================================
// FALLACY SKILLS - Based on logical fallacies and argumentative tactics
// =============================================================================

/**
 * Body-aligned fallacy skills - Physical force, intimidation, and material arguments
 */
export const bodyFallacySkills: Skill[] = [
    // Level 1 - Basic Physical Fallacies
    {
        id: 'fallacy_ad_baculum',
        name: 'Argumentum ad Baculum',
        category: 'fallacy',
        philosophicalAspect: 'body',
        description: 'The Argument from the Club. Persuade through force, violence, or threats of violence. Your words carry the weight of a cudgel.',
        level: 1,
        manaCost: 8,
        damageCalculation: '1d8 + Body',
        effect: 'debuff_stun'
    },
    {
        id: 'fallacy_ableism',
        name: 'Ableist Strike',
        category: 'fallacy',
        philosophicalAspect: 'body',
        description: 'Exploit perceived weakness. Those less capable deserve less—including the right to stand against you.',
        level: 1,
        manaCost: 6,
        damageCalculation: '1d6 + Body',
        effect: 'debuff_body_attack_down'
    },
    {
        id: 'fallacy_bribery',
        name: 'Material Persuasion',
        category: 'fallacy',
        philosophicalAspect: 'body',
        description: 'The reverse of force—persuasion through gifts and favors. What cannot be taken can be bought.',
        level: 1,
        manaCost: 10,
        damageCalculation: '1d4 + Body',
        effect: 'buff_life_steal'
    },
    // Level 2 - Intermediate Physical Fallacies
    {
        id: 'fallacy_actions_consequences',
        name: 'Actions Have Consequences',
        category: 'fallacy',
        philosophicalAspect: 'body',
        description: 'Describe your punishment as cosmic inevitability. Your strikes become the consequences of their own existence.',
        level: 2,
        manaCost: 12,
        damageCalculation: '2d6 + Body',
        effect: 'debuff_wound',
        learningRequirement: {
            level: 3,
            statRequirementType: 'body',
            statRequirementValue: 12
        }
    },
    {
        id: 'fallacy_finish_the_job',
        name: 'Finish the Job',
        category: 'fallacy',
        philosophicalAspect: 'body',
        description: 'The job must be done—questions are meaningless. Strike with the unstoppable momentum of one who has internalized their purpose.',
        level: 2,
        manaCost: 14,
        damageCalculation: '2d8 + Body',
        effect: 'buff_body_attack_up',
        learningRequirement: {
            level: 4,
            statRequirementType: 'body',
            statRequirementValue: 14
        }
    },
    {
        id: 'fallacy_just_do_it',
        name: 'Just Do It',
        category: 'fallacy',
        philosophicalAspect: 'body',
        description: 'Wave aside moral objections. Accomplish the mission by any means necessary—fair or foul.',
        level: 2,
        manaCost: 16,
        damageCalculation: '2d8 + Body',
        effect: 'debuff_defense_down',
        learningRequirement: {
            level: 4,
            statRequirementType: 'body',
            statRequirementValue: 14
        }
    },
    // Level 3 - Advanced Physical Fallacies  
    {
        id: 'fallacy_appeasement',
        name: 'Assertive Demand',
        category: 'fallacy',
        philosophicalAspect: 'body',
        description: 'The squeaky wheel gets the grease. Make a stink so offensive they have no choice but to comply.',
        level: 3,
        manaCost: 20,
        damageCalculation: '3d6 + Body',
        effect: 'debuff_fear',
        learningRequirement: {
            level: 6,
            statRequirementType: 'body',
            statRequirementValue: 16,
            prerequisiteSkill: 'fallacy_ad_baculum'
        }
    },
    {
        id: 'fallacy_muscular_leadership',
        name: 'Muscular Leadership',
        category: 'fallacy',
        philosophicalAspect: 'body',
        description: 'Hard power incarnate. Resolution by force of arms—shock and awe made manifest in muscle and sinew.',
        level: 3,
        manaCost: 22,
        damageCalculation: '3d8 + Body',
        effect: 'buff_advantage_body',
        learningRequirement: {
            level: 7,
            statRequirementType: 'body',
            statRequirementValue: 18
        }
    },
    {
        id: 'fallacy_no_discussion',
        name: 'No Negotiation',
        category: 'fallacy',
        philosophicalAspect: 'body',
        description: 'Reject reasoned dialogue entirely. Offer only instant compliance or destruction as the two available options.',
        level: 3,
        manaCost: 24,
        damageCalculation: '3d10 + Body',
        effect: 'debuff_petrify',
        learningRequirement: {
            level: 8,
            statRequirementType: 'body',
            statRequirementValue: 18,
            prerequisiteSkill: 'fallacy_muscular_leadership'
        }
    },
    // Level 4 - Expert Physical Fallacies
    {
        id: 'fallacy_no_pain_no_gain',
        name: 'Mortification',
        category: 'fallacy',
        philosophicalAspect: 'body',
        description: 'Beat the flesh into submission. Transform pain into power, suffering into strength.',
        level: 4,
        manaCost: 28,
        damageCalculation: '4d6 + Body',
        effect: 'buff_critical_damage_up',
        learningRequirement: {
            level: 10,
            statRequirementType: 'body',
            statRequirementValue: 20
        }
    },
    {
        id: 'fallacy_blood_thicker',
        name: 'Blood is Thicker',
        category: 'fallacy',
        philosophicalAspect: 'body',
        description: 'Favoritism made visceral. Your blood boils with partisan fury—those who share it gain strength, those who don\'t face destruction.',
        level: 4,
        manaCost: 30,
        damageCalculation: '4d8 + Body',
        effect: 'buff_all_stats_up',
        learningRequirement: {
            level: 11,
            statRequirementType: 'body',
            statRequirementValue: 22
        }
    },
    // Level 5 - Master Physical Fallacies
    {
        id: 'fallacy_shock_and_awe',
        name: 'Shock and Awe',
        category: 'fallacy',
        philosophicalAspect: 'body',
        description: 'Overwhelming force made manifest. Your mere presence paralyzes as the weight of inevitable destruction crushes all resistance.',
        level: 5,
        manaCost: 40,
        damageCalculation: '5d10 + Body × 2',
        effect: 'debuff_petrify',
        learningRequirement: {
            level: 14,
            statRequirementType: 'body',
            statRequirementValue: 24,
            prerequisiteSkill: 'fallacy_no_discussion'
        }
    },
    {
        id: 'fallacy_waving_bloody_shirt',
        name: 'Wave the Bloody Shirt',
        category: 'fallacy',
        philosophicalAspect: 'body',
        description: 'Invoke the blood and sacrifice of martyrs. Your cause becomes unquestionable, your strikes sanctified by the fallen.',
        level: 5,
        manaCost: 45,
        damageCalculation: '5d12 + Body × 2',
        effect: 'buff_invincibility',
        learningRequirement: {
            level: 15,
            statRequirementType: 'body',
            statRequirementValue: 26,
            prerequisiteSkill: 'fallacy_blood_thicker'
        }
    }
];

/**
 * Mind-aligned fallacy skills - Logic manipulation, deception, and intellectual attacks
 */
export const mindFallacySkills: Skill[] = [
    // Level 1 - Basic Mental Fallacies
    {
        id: 'fallacy_a_priori',
        name: 'A Priori Argument',
        category: 'fallacy',
        philosophicalAspect: 'mind',
        description: 'Start with your conclusion, then rationalize backward. Your predetermined truth warps logic itself.',
        level: 1,
        manaCost: 6,
        damageCalculation: '1d6 + Mind',
        effect: 'debuff_daze'
    },
    {
        id: 'fallacy_circular_reasoning',
        name: 'Circular Reasoning',
        category: 'fallacy',
        philosophicalAspect: 'mind',
        description: 'A is because of B, and B is because of A. Trap your enemy in an endless loop of self-referential confusion.',
        level: 1,
        manaCost: 8,
        damageCalculation: '1d8 + Mind',
        effect: 'debuff_confusion'
    },
    {
        id: 'fallacy_equivocation',
        name: 'Equivocation',
        category: 'fallacy',
        philosophicalAspect: 'mind',
        description: 'Words mean what you need them to mean. Deliberately shift definitions mid-argument to confound your foe.',
        level: 1,
        manaCost: 7,
        damageCalculation: '1d6 + Mind',
        effect: 'debuff_mind_attack_down'
    },
    {
        id: 'fallacy_non_sequitur',
        name: 'Non Sequitur',
        category: 'fallacy',
        philosophicalAspect: 'mind',
        description: 'Offer evidence with no logical connection. The sheer wrongness of your reasoning breaks their mind.',
        level: 1,
        manaCost: 6,
        damageCalculation: '1d6 + Mind',
        effect: 'debuff_daze'
    },
    // Level 2 - Intermediate Mental Fallacies
    {
        id: 'fallacy_argument_from_ignorance',
        name: 'Argument from Ignorance',
        category: 'fallacy',
        philosophicalAspect: 'mind',
        description: 'What cannot be proven false must be true—or vice versa. Turn the absence of evidence into evidence itself.',
        level: 2,
        manaCost: 12,
        damageCalculation: '2d6 + Mind',
        effect: 'debuff_blind',
        learningRequirement: {
            level: 3,
            statRequirementType: 'mind',
            statRequirementValue: 12
        }
    },
    {
        id: 'fallacy_complex_question',
        name: 'Complex Question',
        category: 'fallacy',
        philosophicalAspect: 'mind',
        description: 'Demand a direct answer to an unanswerable question. "Yes or no—have you stopped cheating?" Either answer condemns.',
        level: 2,
        manaCost: 14,
        damageCalculation: '2d6 + Mind',
        effect: 'debuff_confusion',
        learningRequirement: {
            level: 4,
            statRequirementType: 'mind',
            statRequirementValue: 14
        }
    },
    {
        id: 'fallacy_false_dilemma',
        name: 'Either/Or Reasoning',
        category: 'fallacy',
        philosophicalAspect: 'mind',
        description: 'Present only two options when many exist. Binary thinking becomes a prison with no escape.',
        level: 2,
        manaCost: 14,
        damageCalculation: '2d8 + Mind',
        effect: 'debuff_root',
        learningRequirement: {
            level: 4,
            statRequirementType: 'mind',
            statRequirementValue: 14
        }
    },
    {
        id: 'fallacy_straw_man',
        name: 'Straw Man',
        category: 'fallacy',
        philosophicalAspect: 'mind',
        description: 'Attack a weaker version of their argument. Build them a straw man—then burn it down with them inside.',
        level: 2,
        manaCost: 16,
        damageCalculation: '2d8 + Mind',
        effect: 'debuff_vulnerability_mind',
        learningRequirement: {
            level: 5,
            statRequirementType: 'mind',
            statRequirementValue: 15
        }
    },
    // Level 3 - Advanced Mental Fallacies
    {
        id: 'fallacy_big_lie',
        name: 'The Big Lie Technique',
        category: 'fallacy',
        philosophicalAspect: 'mind',
        description: 'Repeat a lie until it becomes truth. The bolder and more outlandish, the more credible it seems.',
        level: 3,
        manaCost: 20,
        damageCalculation: '3d8 + Mind',
        effect: 'debuff_charm',
        learningRequirement: {
            level: 7,
            statRequirementType: 'mind',
            statRequirementValue: 18
        }
    },
    {
        id: 'fallacy_gaslighting',
        name: 'Gaslighting',
        category: 'fallacy',
        philosophicalAspect: 'mind',
        description: 'Deny and distort known facts until they doubt their own sanity. "Who are you going to believe—me, or your own eyes?"',
        level: 3,
        manaCost: 22,
        damageCalculation: '3d6 + Mind',
        effect: 'debuff_confusion',
        learningRequirement: {
            level: 8,
            statRequirementType: 'mind',
            statRequirementValue: 18,
            prerequisiteSkill: 'fallacy_big_lie'
        }
    },
    {
        id: 'fallacy_confirmation_bias',
        name: 'Confirmation Bias',
        category: 'fallacy',
        philosophicalAspect: 'mind',
        description: 'Make them see only what confirms their fears. Select and share evidence that builds the reality you choose.',
        level: 3,
        manaCost: 18,
        damageCalculation: '3d6 + Mind',
        effect: 'buff_accuracy_up',
        learningRequirement: {
            level: 7,
            statRequirementType: 'mind',
            statRequirementValue: 16
        }
    },
    {
        id: 'fallacy_false_analogy',
        name: 'False Analogy',
        category: 'fallacy',
        philosophicalAspect: 'mind',
        description: 'Compare incomparable things. Draw false conclusions from corrupted comparisons—confusion follows like night follows day.',
        level: 3,
        manaCost: 20,
        damageCalculation: '3d8 + Mind',
        effect: 'debuff_daze',
        learningRequirement: {
            level: 7,
            statRequirementType: 'mind',
            statRequirementValue: 17
        }
    },
    // Level 4 - Expert Mental Fallacies
    {
        id: 'fallacy_alternative_truth',
        name: 'Alternative Truth',
        category: 'fallacy',
        philosophicalAspect: 'mind',
        description: 'Facts and fiction blur into meaninglessness. In a world where truth doesn\'t exist, anything becomes possible.',
        level: 4,
        manaCost: 28,
        damageCalculation: '4d8 + Mind',
        effect: 'debuff_blind',
        learningRequirement: {
            level: 10,
            statRequirementType: 'mind',
            statRequirementValue: 20,
            prerequisiteSkill: 'fallacy_gaslighting'
        }
    },
    {
        id: 'fallacy_lying_with_statistics',
        name: 'Lying with Statistics',
        category: 'fallacy',
        philosophicalAspect: 'mind',
        description: 'True figures prove false claims. Weaponize mathematics against the mathematically vulnerable.',
        level: 4,
        manaCost: 26,
        damageCalculation: '4d6 + Mind',
        effect: 'debuff_accuracy_down',
        learningRequirement: {
            level: 10,
            statRequirementType: 'mind',
            statRequirementValue: 20
        }
    },
    {
        id: 'fallacy_dunning_kruger',
        name: 'Dunning-Kruger Effect',
        category: 'fallacy',
        philosophicalAspect: 'mind',
        description: 'Grant false confidence that conceals incompetence. They believe themselves masters—until reality shatters the illusion.',
        level: 4,
        manaCost: 30,
        damageCalculation: '4d10 + Mind',
        effect: 'debuff_berserk',
        learningRequirement: {
            level: 11,
            statRequirementType: 'mind',
            statRequirementValue: 22
        }
    },
    // Level 5 - Master Mental Fallacies
    {
        id: 'fallacy_brainwashing',
        name: 'Brainwashing',
        category: 'fallacy',
        philosophicalAspect: 'mind',
        description: 'Sophisticated psychological manipulation that rewrites the mind itself. When complete, they believe what you need them to believe.',
        level: 5,
        manaCost: 40,
        damageCalculation: '5d8 + Mind × 2',
        effect: 'debuff_charm',
        learningRequirement: {
            level: 14,
            statRequirementType: 'mind',
            statRequirementValue: 24,
            prerequisiteSkill: 'fallacy_alternative_truth'
        }
    },
    {
        id: 'fallacy_paralysis_of_analysis',
        name: 'Paralysis of Analysis',
        category: 'fallacy',
        philosophicalAspect: 'mind',
        description: 'Since all data is never in, no decision can ever be made. Freeze them in eternal procrastination as reality crumbles.',
        level: 5,
        manaCost: 45,
        damageCalculation: '5d10 + Mind × 2',
        effect: 'debuff_petrify',
        learningRequirement: {
            level: 15,
            statRequirementType: 'mind',
            statRequirementValue: 26,
            prerequisiteSkill: 'fallacy_dunning_kruger'
        }
    }
];

/**
 * Heart-aligned fallacy skills - Emotional manipulation, social attacks, and pathos
 */
export const heartFallacySkills: Skill[] = [
    // Level 1 - Basic Emotional Fallacies
    {
        id: 'fallacy_ad_hominem',
        name: 'Ad Hominem',
        category: 'fallacy',
        philosophicalAspect: 'heart',
        description: 'Attack the person, not the argument. Character assassination replaces reasoned debate.',
        level: 1,
        manaCost: 6,
        damageCalculation: '1d6 + Heart',
        effect: 'debuff_heart_attack_down'
    },
    {
        id: 'fallacy_appeal_to_pity',
        name: 'Appeal to Pity',
        category: 'fallacy',
        philosophicalAspect: 'heart',
        description: 'Root for the underdog regardless of truth. Weaponize sympathy to override rational thought.',
        level: 1,
        manaCost: 8,
        damageCalculation: '1d4 + Heart',
        effect: 'buff_regeneration'
    },
    {
        id: 'fallacy_affective',
        name: 'Affective Fallacy',
        category: 'fallacy',
        philosophicalAspect: 'heart',
        description: 'Emotions are self-validating and beyond challenge. "I feel it, therefore it must be true."',
        level: 1,
        manaCost: 7,
        damageCalculation: '1d6 + Heart',
        effect: 'buff_heart_attack_up'
    },
    {
        id: 'fallacy_bandwagon',
        name: 'Bandwagon Fallacy',
        category: 'fallacy',
        philosophicalAspect: 'heart',
        description: 'Everyone believes it, so it must be true. The momentum of the crowd sweeps away individual doubt.',
        level: 1,
        manaCost: 8,
        damageCalculation: '1d8 + Heart',
        effect: 'buff_all_stats_up'
    },
    // Level 2 - Intermediate Emotional Fallacies
    {
        id: 'fallacy_appeal_to_tradition',
        name: 'Appeal to Tradition',
        category: 'fallacy',
        philosophicalAspect: 'heart',
        description: 'It has always been this way. The weight of history becomes a weapon against change.',
        level: 2,
        manaCost: 12,
        damageCalculation: '2d6 + Heart',
        effect: 'buff_body_defense_up',
        learningRequirement: {
            level: 3,
            statRequirementType: 'heart',
            statRequirementValue: 12
        }
    },
    {
        id: 'fallacy_appeal_to_nature',
        name: 'Appeal to Nature',
        category: 'fallacy',
        philosophicalAspect: 'heart',
        description: 'If it\'s natural, it must be good. Mother Nature\'s blessing sanctifies your actions.',
        level: 2,
        manaCost: 14,
        damageCalculation: '2d8 + Heart',
        effect: 'buff_regeneration',
        learningRequirement: {
            level: 4,
            statRequirementType: 'heart',
            statRequirementValue: 14
        }
    },
    {
        id: 'fallacy_playing_on_emotion',
        name: 'Playing on Emotion',
        category: 'fallacy',
        philosophicalAspect: 'heart',
        description: 'The sob story incarnate. Pure argument from pathos—ignore facts, evoke emotion alone.',
        level: 2,
        manaCost: 16,
        damageCalculation: '2d8 + Heart',
        effect: 'debuff_fear',
        learningRequirement: {
            level: 5,
            statRequirementType: 'heart',
            statRequirementValue: 15
        }
    },
    {
        id: 'fallacy_guilt_by_association',
        name: 'Guilt by Association',
        category: 'fallacy',
        philosophicalAspect: 'heart',
        description: 'Judge them by the company they keep. The sins of associates become their own.',
        level: 2,
        manaCost: 14,
        damageCalculation: '2d6 + Heart',
        effect: 'debuff_curse',
        learningRequirement: {
            level: 4,
            statRequirementType: 'heart',
            statRequirementValue: 14
        }
    },
    // Level 3 - Advanced Emotional Fallacies
    {
        id: 'fallacy_appeal_to_heaven',
        name: 'Appeal to Heaven',
        category: 'fallacy',
        philosophicalAspect: 'heart',
        description: 'Claim divine mandate. God has ordained your victory—who dares oppose the will of Heaven?',
        level: 3,
        manaCost: 22,
        damageCalculation: '3d8 + Heart',
        effect: 'buff_invincibility',
        learningRequirement: {
            level: 7,
            statRequirementType: 'heart',
            statRequirementValue: 18
        }
    },
    {
        id: 'fallacy_moral_superiority',
        name: 'Moral Superiority',
        category: 'fallacy',
        philosophicalAspect: 'heart',
        description: 'Evil has no rights the Righteous must respect. Absolute moral certainty justifies any action against the Wicked.',
        level: 3,
        manaCost: 24,
        damageCalculation: '3d10 + Heart',
        effect: 'buff_critical_rate_up',
        learningRequirement: {
            level: 8,
            statRequirementType: 'heart',
            statRequirementValue: 18,
            prerequisiteSkill: 'fallacy_appeal_to_heaven'
        }
    },
    {
        id: 'fallacy_name_calling',
        name: 'Name-Calling',
        category: 'fallacy',
        philosophicalAspect: 'heart',
        description: 'Simply label them with a negative name. No argument needed when a single word can dismiss and demean.',
        level: 3,
        manaCost: 18,
        damageCalculation: '3d6 + Heart',
        effect: 'debuff_heart_attack_down',
        learningRequirement: {
            level: 6,
            statRequirementType: 'heart',
            statRequirementValue: 16,
            prerequisiteSkill: 'fallacy_ad_hominem'
        }
    },
    {
        id: 'fallacy_othering',
        name: 'Othering',
        category: 'fallacy',
        philosophicalAspect: 'heart',
        description: '"They\'re not like us." Disregard their humanity, their arguments, their very existence as meaningful.',
        level: 3,
        manaCost: 20,
        damageCalculation: '3d8 + Heart',
        effect: 'debuff_vulnerability_heart',
        learningRequirement: {
            level: 7,
            statRequirementType: 'heart',
            statRequirementValue: 17
        }
    },
    // Level 4 - Expert Emotional Fallacies
    {
        id: 'fallacy_identity',
        name: 'Identity Fallacy',
        category: 'fallacy',
        philosophicalAspect: 'heart',
        description: 'Your identity determines your truth. Those outside the group can never understand—their arguments are meaningless.',
        level: 4,
        manaCost: 28,
        damageCalculation: '4d8 + Heart',
        effect: 'debuff_silence',
        learningRequirement: {
            level: 10,
            statRequirementType: 'heart',
            statRequirementValue: 20,
            prerequisiteSkill: 'fallacy_othering'
        }
    },
    {
        id: 'fallacy_narrative',
        name: 'Narrative Fallacy',
        category: 'fallacy',
        philosophicalAspect: 'heart',
        description: 'Tell a heartwarming or horrifying story. Narratives persuade where logic fails—and they\'re virtually irrefutable.',
        level: 4,
        manaCost: 26,
        damageCalculation: '4d6 + Heart',
        effect: 'buff_status_chance_up',
        learningRequirement: {
            level: 10,
            statRequirementType: 'heart',
            statRequirementValue: 20
        }
    },
    {
        id: 'fallacy_dehumanization',
        name: 'Dehumanization',
        category: 'fallacy',
        philosophicalAspect: 'heart',
        description: 'They are mere cockroaches, rats, parasites—not human at all. Strip away their personhood until nothing remains.',
        level: 4,
        manaCost: 32,
        damageCalculation: '4d10 + Heart',
        effect: 'debuff_all_stats_down',
        learningRequirement: {
            level: 12,
            statRequirementType: 'heart',
            statRequirementValue: 22,
            prerequisiteSkill: 'fallacy_identity'
        }
    },
    // Level 5 - Master Emotional Fallacies
    {
        id: 'fallacy_blind_loyalty',
        name: 'Blind Loyalty',
        category: 'fallacy',
        philosophicalAspect: 'heart',
        description: 'Loyalty above truth, above reason, above conscience. "That\'s what I was told to do" becomes the only answer needed.',
        level: 5,
        manaCost: 40,
        damageCalculation: '5d8 + Heart × 2',
        effect: 'debuff_charm',
        learningRequirement: {
            level: 14,
            statRequirementType: 'heart',
            statRequirementValue: 24,
            prerequisiteSkill: 'fallacy_moral_superiority'
        }
    },
    {
        id: 'fallacy_dog_whistle',
        name: 'Dog-Whistle Politics',
        category: 'fallacy',
        philosophicalAspect: 'heart',
        description: 'A brief phrase that sends your audience into a feeding frenzy. Red meat for the faithful—incoherent to outsiders.',
        level: 5,
        manaCost: 45,
        damageCalculation: '5d10 + Heart × 2',
        effect: 'debuff_berserk',
        learningRequirement: {
            level: 15,
            statRequirementType: 'heart',
            statRequirementValue: 26,
            prerequisiteSkill: 'fallacy_dehumanization'
        }
    }
];

// =============================================================================
// PARADOX SKILLS - Based on philosophical and logical paradoxes
// =============================================================================

/**
 * Body-aligned paradox skills - Physical and cosmological paradoxes
 */
export const bodyParadoxSkills: Skill[] = [
    // Level 1 - Basic Physical Paradoxes
    {
        id: 'paradox_achilles_tortoise',
        name: 'Achilles and the Tortoise',
        category: 'paradox',
        philosophicalAspect: 'body',
        description: 'To catch your prey, you must first reach where they started. But they have moved. An infinite chase in finite time.',
        level: 1,
        manaCost: 8,
        damageCalculation: '1d8 + Body',
        effect: 'debuff_slow'
    },
    {
        id: 'paradox_arrow',
        name: 'Zeno\'s Arrow',
        category: 'paradox',
        philosophicalAspect: 'body',
        description: 'At any instant, the arrow is motionless. How then can motion exist? Freeze your enemy in the philosophy of stillness.',
        level: 1,
        manaCost: 10,
        damageCalculation: '1d6 + Body',
        effect: 'debuff_stun'
    },
    {
        id: 'paradox_ship_of_theseus',
        name: 'Ship of Theseus',
        category: 'paradox',
        philosophicalAspect: 'body',
        description: 'Replace every plank, every piece—is it still the same ship? Erode your enemy\'s physical form until nothing original remains.',
        level: 1,
        manaCost: 7,
        damageCalculation: '1d6 + Body',
        effect: 'debuff_bleed'
    },
    // Level 2 - Intermediate Physical Paradoxes
    {
        id: 'paradox_dichotomy',
        name: 'Dichotomy Paradox',
        category: 'paradox',
        philosophicalAspect: 'body',
        description: 'To travel any distance, you must first travel half. Then half again. Infinite steps in finite space—motion becomes impossible.',
        level: 2,
        manaCost: 14,
        damageCalculation: '2d6 + Body',
        effect: 'buff_damage_reduction',
        learningRequirement: {
            level: 4,
            statRequirementType: 'body',
            statRequirementValue: 14
        }
    },
    {
        id: 'paradox_pole_in_barn',
        name: 'Pole in Barn',
        category: 'paradox',
        philosophicalAspect: 'body',
        description: 'From your reference frame, they contract to fit within your defenses. Length is relative; harm is negotiable.',
        level: 2,
        manaCost: 12,
        damageCalculation: '2d6 + Body',
        effect: 'buff_resistance_body',
        learningRequirement: {
            level: 4,
            statRequirementType: 'body',
            statRequirementValue: 14
        }
    },
    {
        id: 'paradox_twins',
        name: 'Twins Paradox',
        category: 'paradox',
        philosophicalAspect: 'body',
        description: 'Travel at relativistic speeds—time dilates differently for you. While you move through moments, your enemy ages and slows.',
        level: 2,
        manaCost: 16,
        damageCalculation: '2d8 + Body',
        effect: 'buff_haste',
        learningRequirement: {
            level: 5,
            statRequirementType: 'body',
            statRequirementValue: 15
        }
    },
    // Level 3 - Advanced Physical Paradoxes
    {
        id: 'paradox_grandfather',
        name: 'Grandfather Paradox',
        category: 'paradox',
        philosophicalAspect: 'body',
        description: 'Prevent your enemy\'s past to unmake their present. If they were never born, they cannot fight you now.',
        level: 3,
        manaCost: 24,
        damageCalculation: '3d10 + Body',
        effect: 'debuff_fear',
        learningRequirement: {
            level: 8,
            statRequirementType: 'body',
            statRequirementValue: 18
        }
    },
    {
        id: 'paradox_bootstrap',
        name: 'Bootstrap Paradox',
        category: 'paradox',
        philosophicalAspect: 'body',
        description: 'Information from the future that created itself. Your power has no origin—it simply IS, in an eternal causal loop.',
        level: 3,
        manaCost: 20,
        damageCalculation: '3d8 + Body',
        effect: 'buff_heart_attack_up',
        learningRequirement: {
            level: 7,
            statRequirementType: 'body',
            statRequirementValue: 17
        }
    },
    {
        id: 'paradox_ehrenfest',
        name: 'Ehrenfest Paradox',
        category: 'paradox',
        philosophicalAspect: 'body',
        description: 'A spinning disk at relativistic speeds—circumference contracts but radius doesn\'t. Geometry warps around your rotating strike.',
        level: 3,
        manaCost: 22,
        damageCalculation: '3d8 + Body',
        effect: 'buff_critical_rate_up',
        learningRequirement: {
            level: 7,
            statRequirementType: 'body',
            statRequirementValue: 17
        }
    },
    // Level 4 - Expert Physical Paradoxes
    {
        id: 'paradox_banach_tarski',
        name: 'Banach-Tarski Paradox',
        category: 'paradox',
        philosophicalAspect: 'body',
        description: 'Decompose and reassemble—one becomes two, each identical to the original. Your strike duplicates, doubling in power.',
        level: 4,
        manaCost: 30,
        damageCalculation: '4d8 + Body × 1.5',
        effect: 'buff_critical_damage_up',
        learningRequirement: {
            level: 11,
            statRequirementType: 'body',
            statRequirementValue: 22
        }
    },
    {
        id: 'paradox_black_hole_information',
        name: 'Black Hole Information',
        category: 'paradox',
        philosophicalAspect: 'body',
        description: 'Information vanishes into the singularity. Their physical form collapses, identity evaporating like Hawking radiation.',
        level: 4,
        manaCost: 32,
        damageCalculation: '4d10 + Body',
        effect: 'debuff_hp_decay',
        learningRequirement: {
            level: 12,
            statRequirementType: 'body',
            statRequirementValue: 22
        }
    },
    // Level 5 - Master Physical Paradoxes
    {
        id: 'paradox_olbers',
        name: 'Olbers\' Paradox',
        category: 'paradox',
        philosophicalAspect: 'body',
        description: 'If infinite stars fill infinite space, why is the sky dark? Because all that light is coming NOW. Cosmic radiance incinerates.',
        level: 5,
        manaCost: 45,
        damageCalculation: '5d12 + Body × 2',
        effect: 'debuff_burn',
        learningRequirement: {
            level: 15,
            statRequirementType: 'body',
            statRequirementValue: 26,
            prerequisiteSkill: 'paradox_black_hole_information'
        }
    },
    {
        id: 'paradox_fermi',
        name: 'Fermi Paradox',
        category: 'paradox',
        philosophicalAspect: 'body',
        description: 'Where is everyone? The silence of the cosmos becomes your weapon—absolute, inevitable absence. You make them disappear.',
        level: 5,
        manaCost: 50,
        damageCalculation: '5d10 + Body × 2',
        effect: 'buff_stealth',
        learningRequirement: {
            level: 15,
            statRequirementType: 'body',
            statRequirementValue: 26
        }
    }
];

/**
 * Mind-aligned paradox skills - Logical and mathematical paradoxes
 */
export const mindParadoxSkills: Skill[] = [
    // Level 1 - Basic Logical Paradoxes
    {
        id: 'paradox_liar',
        name: 'The Liar Paradox',
        category: 'paradox',
        philosophicalAspect: 'mind',
        description: '"This statement is false." If true, it\'s false. If false, it\'s true. Crash their logic in an infinite loop.',
        level: 1,
        manaCost: 8,
        damageCalculation: '1d8 + Mind',
        effect: 'debuff_daze'
    },
    {
        id: 'paradox_russells',
        name: 'Russell\'s Paradox',
        category: 'paradox',
        philosophicalAspect: 'mind',
        description: 'The set of all sets that don\'t contain themselves—does it contain itself? Shatter the foundations of their logic.',
        level: 1,
        manaCost: 10,
        damageCalculation: '1d10 + Mind',
        effect: 'debuff_confusion'
    },
    {
        id: 'paradox_barber',
        name: 'Barber Paradox',
        category: 'paradox',
        philosophicalAspect: 'mind',
        description: 'The barber shaves all who don\'t shave themselves. Does he shave himself? Simple logic becomes impossible.',
        level: 1,
        manaCost: 7,
        damageCalculation: '1d6 + Mind',
        effect: 'debuff_mind_attack_down'
    },
    // Level 2 - Intermediate Logical Paradoxes
    {
        id: 'paradox_curry',
        name: 'Curry\'s Paradox',
        category: 'paradox',
        philosophicalAspect: 'mind',
        description: '"If this is true, then anything follows." Without negation, your logic poisons—any conclusion becomes inevitable.',
        level: 2,
        manaCost: 14,
        damageCalculation: '2d6 + Mind',
        effect: 'debuff_poison',
        learningRequirement: {
            level: 4,
            statRequirementType: 'mind',
            statRequirementValue: 14
        }
    },
    {
        id: 'paradox_sorites',
        name: 'Sorites Paradox',
        category: 'paradox',
        philosophicalAspect: 'mind',
        description: 'One grain isn\'t a heap. Adding one can\'t make a heap. Yet heaps exist. Blur their categories until nothing is certain.',
        level: 2,
        manaCost: 12,
        damageCalculation: '2d6 + Mind',
        effect: 'debuff_all_stats_down',
        learningRequirement: {
            level: 4,
            statRequirementType: 'mind',
            statRequirementValue: 14
        }
    },
    {
        id: 'paradox_berry',
        name: 'Berry Paradox',
        category: 'paradox',
        philosophicalAspect: 'mind',
        description: '"The smallest number not definable in under eleven words." Defined in ten. Definability becomes paradox.',
        level: 2,
        manaCost: 14,
        damageCalculation: '2d8 + Mind',
        effect: 'debuff_wound',
        learningRequirement: {
            level: 5,
            statRequirementType: 'mind',
            statRequirementValue: 15
        }
    },
    {
        id: 'paradox_crocodile',
        name: 'Crocodile Paradox',
        category: 'paradox',
        philosophicalAspect: 'mind',
        description: 'Promise to return what was taken if they guess correctly. If they guess you won\'t, you\'re trapped in logical impossibility.',
        level: 2,
        manaCost: 16,
        damageCalculation: '2d8 + Mind',
        effect: 'buff_taunt',
        learningRequirement: {
            level: 5,
            statRequirementType: 'mind',
            statRequirementValue: 15
        }
    },
    // Level 3 - Advanced Logical Paradoxes
    {
        id: 'paradox_unexpected_hanging',
        name: 'Unexpected Hanging',
        category: 'paradox',
        philosophicalAspect: 'mind',
        description: 'You will be struck on a day you cannot predict. Eliminate each day logically—yet the blow still surprises.',
        level: 3,
        manaCost: 22,
        damageCalculation: '3d8 + Mind',
        effect: 'buff_buff_duration_up',
        learningRequirement: {
            level: 7,
            statRequirementType: 'mind',
            statRequirementValue: 17
        }
    },
    {
        id: 'paradox_cantors',
        name: 'Cantor\'s Paradox',
        category: 'paradox',
        philosophicalAspect: 'mind',
        description: 'The set of all sets should contain its own power set—but the power set is always larger. Infinity devours itself.',
        level: 3,
        manaCost: 24,
        damageCalculation: '3d10 + Mind',
        effect: 'debuff_vulnerability_mind',
        learningRequirement: {
            level: 8,
            statRequirementType: 'mind',
            statRequirementValue: 18
        }
    },
    {
        id: 'paradox_hilberts_hotel',
        name: 'Hilbert\'s Hotel',
        category: 'paradox',
        philosophicalAspect: 'mind',
        description: 'A hotel with infinite rooms, all occupied—yet always room for more. Your defenses are infinite, accommodating any assault.',
        level: 3,
        manaCost: 20,
        damageCalculation: '3d6 + Mind',
        effect: 'buff_defend_up',
        learningRequirement: {
            level: 7,
            statRequirementType: 'mind',
            statRequirementValue: 17
        }
    },
    {
        id: 'paradox_grelling',
        name: 'Grelling-Nelson Paradox',
        category: 'paradox',
        philosophicalAspect: 'mind',
        description: 'Is "heterological" heterological? If it is, it isn\'t. If it isn\'t, it is. Self-reference corrupts their very words.',
        level: 3,
        manaCost: 22,
        damageCalculation: '3d8 + Mind',
        effect: 'debuff_curse',
        learningRequirement: {
            level: 8,
            statRequirementType: 'mind',
            statRequirementValue: 18
        }
    },
    // Level 4 - Expert Logical Paradoxes
    {
        id: 'paradox_yablo',
        name: 'Yablo\'s Paradox',
        category: 'paradox',
        philosophicalAspect: 'mind',
        description: 'An infinite sequence where each sentence says all following are false. No self-reference—yet contradiction propagates forever.',
        level: 4,
        manaCost: 30,
        damageCalculation: '4d8 + Mind',
        effect: 'debuff_strong_poison',
        learningRequirement: {
            level: 11,
            statRequirementType: 'mind',
            statRequirementValue: 22,
            prerequisiteSkill: 'paradox_curry'
        }
    },
    {
        id: 'paradox_richard',
        name: 'Richard\'s Paradox',
        category: 'paradox',
        philosophicalAspect: 'mind',
        description: 'List all definable numbers—then diagonalize to create one not on the list. Definition defeats itself.',
        level: 4,
        manaCost: 28,
        damageCalculation: '4d10 + Mind',
        effect: 'debuff_vulnerability_mind',
        learningRequirement: {
            level: 11,
            statRequirementType: 'mind',
            statRequirementValue: 22
        }
    },
    {
        id: 'paradox_skolem',
        name: 'Skolem\'s Paradox',
        category: 'paradox',
        philosophicalAspect: 'mind',
        description: 'Set theory proves uncountable sets exist—yet has countable models. Their infinite power becomes finite from without.',
        level: 4,
        manaCost: 32,
        damageCalculation: '4d10 + Mind',
        effect: 'debuff_dispel',
        learningRequirement: {
            level: 12,
            statRequirementType: 'mind',
            statRequirementValue: 24,
            prerequisiteSkill: 'paradox_cantors'
        }
    },
    // Level 5 - Master Logical Paradoxes
    {
        id: 'paradox_quine',
        name: 'Quine\'s Paradox',
        category: 'paradox',
        philosophicalAspect: 'mind',
        description: '"Yields falsehood when preceded by its quotation" yields falsehood when preceded by its quotation. Self-reference through indirection.',
        level: 5,
        manaCost: 45,
        damageCalculation: '5d10 + Mind × 2',
        effect: 'debuff_confusion',
        learningRequirement: {
            level: 15,
            statRequirementType: 'mind',
            statRequirementValue: 26,
            prerequisiteSkill: 'paradox_yablo'
        }
    },
    {
        id: 'paradox_burali_forti',
        name: 'Burali-Forti Paradox',
        category: 'paradox',
        philosophicalAspect: 'mind',
        description: 'The ordinal of all ordinals must exceed itself. Their power structure collapses under its own infinite weight.',
        level: 5,
        manaCost: 50,
        damageCalculation: '5d12 + Mind × 2',
        effect: 'debuff_vulnerability_heart',
        learningRequirement: {
            level: 15,
            statRequirementType: 'mind',
            statRequirementValue: 26,
            prerequisiteSkill: 'paradox_skolem'
        }
    }
];

/**
 * Heart-aligned paradox skills - Philosophical, ethical, and decision paradoxes
 */
export const heartParadoxSkills: Skill[] = [
    // Level 1 - Basic Philosophical Paradoxes
    {
        id: 'paradox_fiction',
        name: 'Paradox of Fiction',
        category: 'paradox',
        philosophicalAspect: 'heart',
        description: 'We feel real emotions for things we know aren\'t real. Make fiction wound as deeply as truth.',
        level: 1,
        manaCost: 8,
        damageCalculation: '1d8 + Heart',
        effect: 'debuff_fear'
    },
    {
        id: 'paradox_hedonism',
        name: 'Paradox of Hedonism',
        category: 'paradox',
        philosophicalAspect: 'heart',
        description: 'Directly pursuing happiness guarantees failure. Pursue something else—let joy come as a byproduct.',
        level: 1,
        manaCost: 10,
        damageCalculation: '1d6 + Heart',
        effect: 'buff_advantage_heart'
    },
    {
        id: 'paradox_tolerance',
        name: 'Paradox of Tolerance',
        category: 'paradox',
        philosophicalAspect: 'heart',
        description: 'Unlimited tolerance destroys itself. To preserve tolerance, you must be intolerant of intolerance.',
        level: 1,
        manaCost: 7,
        damageCalculation: '1d6 + Heart',
        effect: 'buff_heart_defense_up'
    },
    // Level 2 - Intermediate Philosophical Paradoxes
    {
        id: 'paradox_moral_learning',
        name: 'Paradox of Moral Learning',
        category: 'paradox',
        philosophicalAspect: 'heart',
        description: 'To learn right from wrong, you must already know. Strip away their moral compass until they cannot distinguish.',
        level: 2,
        manaCost: 14,
        damageCalculation: '2d6 + Heart',
        effect: 'debuff_moral_learning',
        learningRequirement: {
            level: 4,
            statRequirementType: 'heart',
            statRequirementValue: 14
        }
    },
    {
        id: 'paradox_buridans_ass',
        name: 'Buridan\'s Ass',
        category: 'paradox',
        philosophicalAspect: 'heart',
        description: 'Perfectly rational, equally distant from two identical options—the donkey starves. Paralyze them with perfect equivalence.',
        level: 2,
        manaCost: 14,
        damageCalculation: '2d6 + Heart',
        effect: 'debuff_stun',
        learningRequirement: {
            level: 4,
            statRequirementType: 'heart',
            statRequirementValue: 14
        }
    },
    {
        id: 'paradox_problem_of_evil',
        name: 'Problem of Evil',
        category: 'paradox',
        philosophicalAspect: 'heart',
        description: 'If omnipotent and good, why does evil exist? Weaponize theodicy—their faith in justice becomes their weakness.',
        level: 2,
        manaCost: 16,
        damageCalculation: '2d8 + Heart',
        effect: 'debuff_berserk',
        learningRequirement: {
            level: 5,
            statRequirementType: 'heart',
            statRequirementValue: 15
        }
    },
    {
        id: 'paradox_moore',
        name: 'Moore\'s Paradox',
        category: 'paradox',
        philosophicalAspect: 'heart',
        description: '"It\'s raining but I don\'t believe it\'s raining." Absurd yet possibly true. Break the connection between belief and assertion.',
        level: 2,
        manaCost: 12,
        damageCalculation: '2d6 + Heart',
        effect: 'debuff_silence',
        learningRequirement: {
            level: 4,
            statRequirementType: 'heart',
            statRequirementValue: 14
        }
    },
    // Level 3 - Advanced Philosophical Paradoxes
    {
        id: 'paradox_newcomb',
        name: 'Newcomb\'s Paradox',
        category: 'paradox',
        philosophicalAspect: 'heart',
        description: 'One box or two? Causal and evidential decision theory conflict. Whatever they choose, they\'re wrong.',
        level: 3,
        manaCost: 22,
        damageCalculation: '3d8 + Heart',
        effect: 'buff_counter',
        learningRequirement: {
            level: 7,
            statRequirementType: 'heart',
            statRequirementValue: 17
        }
    },
    {
        id: 'paradox_toxin',
        name: 'Toxin Puzzle',
        category: 'paradox',
        philosophicalAspect: 'heart',
        description: 'Intend to drink poison tomorrow and you\'re rewarded today—but knowing you won\'t drink it, can you truly intend to?',
        level: 3,
        manaCost: 24,
        damageCalculation: '3d6 + Heart',
        effect: 'debuff_heart_attack_down',
        learningRequirement: {
            level: 8,
            statRequirementType: 'heart',
            statRequirementValue: 18
        }
    },
    {
        id: 'paradox_transformative',
        name: 'Transformative Experience',
        category: 'paradox',
        philosophicalAspect: 'heart',
        description: 'You cannot know what you\'ll become until you become it. Force a decision with values they won\'t keep.',
        level: 3,
        manaCost: 20,
        damageCalculation: '3d8 + Heart',
        effect: 'debuff_transformative',
        learningRequirement: {
            level: 7,
            statRequirementType: 'heart',
            statRequirementValue: 17
        }
    },
    {
        id: 'paradox_rational_disagreement',
        name: 'Paradox of Rational Disagreement',
        category: 'paradox',
        philosophicalAspect: 'heart',
        description: 'Two equally rational minds reach opposite conclusions. Neither can claim superiority. Belief itself becomes suspect.',
        level: 3,
        manaCost: 22,
        damageCalculation: '3d8 + Heart',
        effect: 'debuff_rational_disagreement',
        learningRequirement: {
            level: 8,
            statRequirementType: 'heart',
            statRequirementValue: 18
        }
    },
    // Level 4 - Expert Philosophical Paradoxes
    {
        id: 'paradox_prisoners_dilemma',
        name: 'Prisoner\'s Dilemma',
        category: 'paradox',
        philosophicalAspect: 'heart',
        description: 'Individual rationality produces collective disaster. They betray themselves to avoid being betrayed.',
        level: 4,
        manaCost: 28,
        damageCalculation: '4d8 + Heart',
        effect: 'debuff_defense_down',
        learningRequirement: {
            level: 11,
            statRequirementType: 'heart',
            statRequirementValue: 22
        }
    },
    {
        id: 'paradox_sleeping_beauty',
        name: 'Sleeping Beauty Problem',
        category: 'paradox',
        philosophicalAspect: 'heart',
        description: 'She wakes uncertain if it\'s Monday or Tuesday. Indexical information warps probability. Credence becomes impossible.',
        level: 4,
        manaCost: 26,
        damageCalculation: '4d6 + Heart',
        effect: 'debuff_sleep',
        learningRequirement: {
            level: 10,
            statRequirementType: 'heart',
            statRequirementValue: 20
        }
    },
    {
        id: 'paradox_wigner_friend',
        name: 'Wigner\'s Friend',
        category: 'paradox',
        philosophicalAspect: 'heart',
        description: 'From inside, reality has collapsed. From outside, superposition persists. Neither perspective is wrong—both suffer.',
        level: 4,
        manaCost: 30,
        damageCalculation: '4d10 + Heart',
        effect: 'debuff_charm',
        learningRequirement: {
            level: 12,
            statRequirementType: 'heart',
            statRequirementValue: 22
        }
    },
    {
        id: 'paradox_causal_emergence',
        name: 'Causal Emergence',
        category: 'paradox',
        philosophicalAspect: 'heart',
        description: 'Consciousness should cause—but physics is causally closed. Their will becomes epiphenomenal, an illusion controlling nothing.',
        level: 4,
        manaCost: 32,
        damageCalculation: '4d8 + Heart',
        effect: 'debuff_causal_emergence',
        learningRequirement: {
            level: 12,
            statRequirementType: 'heart',
            statRequirementValue: 24
        }
    },
    // Level 5 - Master Philosophical Paradoxes
    {
        id: 'paradox_schrodinger',
        name: 'Schrödinger\'s Cat',
        category: 'paradox',
        philosophicalAspect: 'heart',
        description: 'Alive and dead until observed. Collapse their wavefunction into whichever state serves you best.',
        level: 5,
        manaCost: 45,
        damageCalculation: '5d10 + Heart × 2',
        effect: 'buff_critical_rate_up',
        learningRequirement: {
            level: 15,
            statRequirementType: 'heart',
            statRequirementValue: 26,
            prerequisiteSkill: 'paradox_wigner_friend'
        }
    },
    {
        id: 'paradox_epr',
        name: 'EPR Paradox',
        category: 'paradox',
        philosophicalAspect: 'heart',
        description: 'Spooky action at a distance. Measure here, affect there—instantly, regardless of separation. Quantum entanglement weaponized.',
        level: 5,
        manaCost: 50,
        damageCalculation: '5d12 + Heart × 2',
        effect: 'buff_invincibility',
        learningRequirement: {
            level: 15,
            statRequirementType: 'heart',
            statRequirementValue: 26,
            prerequisiteSkill: 'paradox_schrodinger'
        }
    }
];

// =============================================================================
// PROBABILITY & STATISTICS PARADOX SKILLS
// =============================================================================

export const probabilityParadoxSkills: Skill[] = [
    {
        id: 'paradox_monty_hall',
        name: 'Monty Hall Problem',
        category: 'paradox',
        philosophicalAspect: 'mind',
        description: 'Switch doors and double your chances. Counterintuitive probability becomes your ally—the obvious choice is wrong.',
        level: 2,
        manaCost: 14,
        damageCalculation: '2d8 + Mind',
        effect: 'buff_status_chance_up',
        learningRequirement: {
            level: 4,
            statRequirementType: 'mind',
            statRequirementValue: 14
        }
    },
    {
        id: 'paradox_simpson',
        name: 'Simpson\'s Paradox',
        category: 'paradox',
        philosophicalAspect: 'mind',
        description: 'A trend in groups reverses when combined. Aggregate their strengths into weakness—each part strong, the whole broken.',
        level: 3,
        manaCost: 20,
        damageCalculation: '3d6 + Mind',
        effect: 'debuff_daze',
        learningRequirement: {
            level: 7,
            statRequirementType: 'mind',
            statRequirementValue: 17
        }
    },
    {
        id: 'paradox_st_petersburg',
        name: 'St. Petersburg Paradox',
        category: 'paradox',
        philosophicalAspect: 'mind',
        description: 'Infinite expected value, yet no one would pay much to play. The gap between expectation and reality becomes your weapon.',
        level: 3,
        manaCost: 22,
        damageCalculation: '3d8 + Mind',
        effect: 'buff_critical_damage_up',
        learningRequirement: {
            level: 8,
            statRequirementType: 'mind',
            statRequirementValue: 18
        }
    },
    {
        id: 'paradox_two_envelopes',
        name: 'Two Envelopes Problem',
        category: 'paradox',
        philosophicalAspect: 'heart',
        description: 'The other envelope always seems better. Trap them in eternal switching—always certain changing helps, always wrong.',
        level: 2,
        manaCost: 14,
        damageCalculation: '2d6 + Heart',
        effect: 'debuff_confusion',
        learningRequirement: {
            level: 4,
            statRequirementType: 'heart',
            statRequirementValue: 14
        }
    },
    {
        id: 'paradox_birthday',
        name: 'Birthday Paradox',
        category: 'paradox',
        philosophicalAspect: 'mind',
        description: 'With only 23 people, two likely share a birthday. Combinatorial probability defies intuition—collisions are inevitable.',
        level: 2,
        manaCost: 12,
        damageCalculation: '2d6 + Mind',
        effect: 'buff_accuracy_up',
        learningRequirement: {
            level: 3,
            statRequirementType: 'mind',
            statRequirementValue: 12
        }
    },
    {
        id: 'paradox_ellsberg',
        name: 'Ellsberg Paradox',
        category: 'paradox',
        philosophicalAspect: 'heart',
        description: 'Unknown probabilities paralyze more than known risks. Inject ambiguity into their decisions—uncertainty breeds failure.',
        level: 3,
        manaCost: 18,
        damageCalculation: '3d6 + Heart',
        effect: 'debuff_accuracy_down',
        learningRequirement: {
            level: 7,
            statRequirementType: 'heart',
            statRequirementValue: 17
        }
    },
    {
        id: 'paradox_allais',
        name: 'Allais Paradox',
        category: 'paradox',
        philosophicalAspect: 'heart',
        description: 'Certainty is weighted more heavily than logic allows. Exploit their irrational fear of uncertainty.',
        level: 3,
        manaCost: 20,
        damageCalculation: '3d8 + Heart',
        effect: 'debuff_hex',
        learningRequirement: {
            level: 8,
            statRequirementType: 'heart',
            statRequirementValue: 18
        }
    },
    {
        id: 'paradox_bertrand',
        name: 'Bertrand Paradox',
        category: 'paradox',
        philosophicalAspect: 'mind',
        description: 'What does "random" mean? Different interpretations yield different answers. Choose the definition that serves you.',
        level: 2,
        manaCost: 14,
        damageCalculation: '2d6 + Mind',
        effect: 'buff_accuracy_up',
        learningRequirement: {
            level: 5,
            statRequirementType: 'mind',
            statRequirementValue: 15
        }
    },
    {
        id: 'paradox_braess',
        name: 'Braess\' Paradox',
        category: 'paradox',
        philosophicalAspect: 'body',
        description: 'Adding capacity reduces performance. More options create worse outcomes—their possibilities become their prison.',
        level: 3,
        manaCost: 18,
        damageCalculation: '3d6 + Body',
        effect: 'debuff_root',
        learningRequirement: {
            level: 7,
            statRequirementType: 'body',
            statRequirementValue: 17
        }
    },
    {
        id: 'paradox_inspection',
        name: 'Inspection Paradox',
        category: 'paradox',
        philosophicalAspect: 'mind',
        description: 'Sample any point—longer events are more likely sampled. Their conditions always last longer than expected.',
        level: 2,
        manaCost: 12,
        damageCalculation: '2d4 + Mind',
        effect: 'debuff_disease',
        learningRequirement: {
            level: 4,
            statRequirementType: 'mind',
            statRequirementValue: 14
        }
    }
];

// =============================================================================
// GAME THEORY PARADOX SKILLS
// =============================================================================

export const gameTheoryParadoxSkills: Skill[] = [
    {
        id: 'paradox_centipede',
        name: 'Centipede Game',
        category: 'paradox',
        philosophicalAspect: 'mind',
        description: 'Backward induction says take immediately—but that yields the worst outcome. Their rationality becomes self-defeating.',
        level: 4,
        manaCost: 26,
        damageCalculation: '4d6 + Mind',
        effect: 'debuff_hp_decay',
        learningRequirement: {
            level: 10,
            statRequirementType: 'mind',
            statRequirementValue: 20
        }
    },
    {
        id: 'paradox_travelers',
        name: 'Traveler\'s Dilemma',
        category: 'paradox',
        philosophicalAspect: 'heart',
        description: 'Game theory predicts the minimum, but everyone plays high. The gap between theory and practice wounds deeply.',
        level: 3,
        manaCost: 20,
        damageCalculation: '3d8 + Heart',
        effect: 'debuff_exhaustion',
        learningRequirement: {
            level: 7,
            statRequirementType: 'heart',
            statRequirementValue: 17
        }
    },
    {
        id: 'paradox_volunteer',
        name: 'Volunteer\'s Dilemma',
        category: 'paradox',
        philosophicalAspect: 'heart',
        description: 'Everyone prefers someone else act. If all reason thus, no one acts and all suffer. Collective paralysis from individual logic.',
        level: 3,
        manaCost: 22,
        damageCalculation: '3d6 + Heart',
        effect: 'debuff_fatigue',
        learningRequirement: {
            level: 8,
            statRequirementType: 'heart',
            statRequirementValue: 18
        }
    },
    {
        id: 'paradox_parrondo',
        name: 'Parrondo\'s Paradox',
        category: 'paradox',
        philosophicalAspect: 'mind',
        description: 'Two losing games combine into a winning strategy. Alternate between weaknesses—together they become strength.',
        level: 4,
        manaCost: 28,
        damageCalculation: '4d8 + Mind',
        effect: 'buff_all_stats_up',
        learningRequirement: {
            level: 11,
            statRequirementType: 'mind',
            statRequirementValue: 22
        }
    }
];

// =============================================================================
// QUANTUM PARADOX SKILLS
// =============================================================================

export const quantumParadoxSkills: Skill[] = [
    {
        id: 'paradox_quantum_eraser',
        name: 'Quantum Eraser',
        category: 'paradox',
        philosophicalAspect: 'mind',
        description: 'Erase which-path information—interference returns. The past changes based on future choices.',
        level: 4,
        manaCost: 30,
        damageCalculation: '4d8 + Mind',
        effect: 'debuff_blind',
        learningRequirement: {
            level: 11,
            statRequirementType: 'mind',
            statRequirementValue: 22
        }
    },
    {
        id: 'paradox_hardy',
        name: 'Hardy Paradox',
        category: 'paradox',
        philosophicalAspect: 'mind',
        description: 'Particles that should never meet—do. The impossible measurement occurs. Reality contradicts itself.',
        level: 3,
        manaCost: 22,
        damageCalculation: '3d8 + Mind',
        effect: 'debuff_shock',
        learningRequirement: {
            level: 8,
            statRequirementType: 'mind',
            statRequirementValue: 18
        }
    },
    {
        id: 'paradox_ghz',
        name: 'GHZ Paradox',
        category: 'paradox',
        philosophicalAspect: 'mind',
        description: 'Three entangled particles prove quantum mechanics in single measurements. No statistics needed—direct logical contradiction.',
        level: 4,
        manaCost: 28,
        damageCalculation: '4d10 + Mind',
        effect: 'debuff_mind_attack_down',
        learningRequirement: {
            level: 12,
            statRequirementType: 'mind',
            statRequirementValue: 24
        }
    },
    {
        id: 'paradox_quantum_suicide',
        name: 'Quantum Suicide',
        category: 'paradox',
        philosophicalAspect: 'heart',
        description: 'In many-worlds, you only experience survival. From your perspective, you cannot die—immortality through branching.',
        level: 5,
        manaCost: 50,
        damageCalculation: '5d12 + Heart × 2',
        effect: 'buff_invincibility',
        learningRequirement: {
            level: 15,
            statRequirementType: 'heart',
            statRequirementValue: 26
        }
    },
    {
        id: 'paradox_boltzmann_brain',
        name: 'Boltzmann Brain',
        category: 'paradox',
        philosophicalAspect: 'mind',
        description: 'Random fluctuations should produce more disembodied brains than real observers. Are your memories even real?',
        level: 4,
        manaCost: 32,
        damageCalculation: '4d8 + Mind',
        effect: 'debuff_frostbite',
        learningRequirement: {
            level: 12,
            statRequirementType: 'mind',
            statRequirementValue: 24
        }
    }
];

// =============================================================================
// INFINITY PARADOX SKILLS
// =============================================================================

export const infinityParadoxSkills: Skill[] = [
    {
        id: 'paradox_galileo',
        name: 'Galileo\'s Paradox',
        category: 'paradox',
        philosophicalAspect: 'mind',
        description: 'Perfect squares equal all natural numbers—yet are a proper subset. Parts can equal wholes in infinity.',
        level: 2,
        manaCost: 14,
        damageCalculation: '2d8 + Mind',
        effect: 'buff_max_hp_up',
        learningRequirement: {
            level: 5,
            statRequirementType: 'mind',
            statRequirementValue: 15
        }
    },
    {
        id: 'paradox_tristram_shandy',
        name: 'Tristram Shandy Paradox',
        category: 'paradox',
        philosophicalAspect: 'body',
        description: 'A year to write each day—yet given eternity, every day gets written. Healing works faster than wounds accumulate.',
        level: 2,
        manaCost: 12,
        damageCalculation: '2d4 + Body',
        effect: 'buff_regeneration',
        learningRequirement: {
            level: 4,
            statRequirementType: 'body',
            statRequirementValue: 14
        }
    },
    {
        id: 'paradox_ross_littlewood',
        name: 'Ross-Littlewood Paradox',
        category: 'paradox',
        philosophicalAspect: 'mind',
        description: 'Add ten balls, remove one, infinitely. At noon—how many? Infinitely many, or zero? Different counts, different answers.',
        level: 3,
        manaCost: 20,
        damageCalculation: '3d8 + Mind',
        effect: 'debuff_knockdown',
        learningRequirement: {
            level: 8,
            statRequirementType: 'mind',
            statRequirementValue: 18
        }
    },
    {
        id: 'paradox_dartboard',
        name: 'Dartboard Paradox',
        category: 'paradox',
        philosophicalAspect: 'body',
        description: 'Every point has zero probability—yet something is always hit. Probability zero doesn\'t mean impossible.',
        level: 3,
        manaCost: 18,
        damageCalculation: '3d6 + Body',
        effect: 'debuff_evasion_down',
        learningRequirement: {
            level: 7,
            statRequirementType: 'body',
            statRequirementValue: 17
        }
    },
    {
        id: 'paradox_gabriel_horn',
        name: 'Gabriel\'s Horn',
        category: 'paradox',
        philosophicalAspect: 'body',
        description: 'Infinite surface, finite volume. A shield that spreads any attack across endless area—force diluted to nothing.',
        level: 4,
        manaCost: 28,
        damageCalculation: '4d6 + Body',
        effect: 'buff_barrier',
        learningRequirement: {
            level: 10,
            statRequirementType: 'body',
            statRequirementValue: 20
        }
    }
];

// =============================================================================
// SEMANTIC PARADOX SKILLS
// =============================================================================

export const semanticParadoxSkills: Skill[] = [
    {
        id: 'paradox_analysis',
        name: 'Paradox of Analysis',
        category: 'paradox',
        philosophicalAspect: 'mind',
        description: 'Correct analysis is trivial; informative analysis is incorrect. Trap them between uselessness and falsehood.',
        level: 2,
        manaCost: 12,
        damageCalculation: '2d6 + Mind',
        effect: 'debuff_daze',
        learningRequirement: {
            level: 4,
            statRequirementType: 'mind',
            statRequirementValue: 14
        }
    },
    {
        id: 'paradox_knowability',
        name: 'Knowability Paradox',
        category: 'paradox',
        philosophicalAspect: 'mind',
        description: 'If all truths are knowable, all truths are already known. Collapse the distinction between potential and actual knowledge.',
        level: 3,
        manaCost: 20,
        damageCalculation: '3d8 + Mind',
        effect: 'buff_advantage_mind',
        learningRequirement: {
            level: 7,
            statRequirementType: 'mind',
            statRequirementValue: 17
        }
    },
    {
        id: 'paradox_preface',
        name: 'Preface Paradox',
        category: 'paradox',
        philosophicalAspect: 'heart',
        description: 'Believe each claim, yet believe some must be wrong. Rational inconsistency drains their certainty.',
        level: 2,
        manaCost: 14,
        damageCalculation: '2d6 + Heart',
        effect: 'debuff_fatigue',
        learningRequirement: {
            level: 5,
            statRequirementType: 'heart',
            statRequirementValue: 15
        }
    },
    {
        id: 'paradox_lottery',
        name: 'Lottery Paradox',
        category: 'paradox',
        philosophicalAspect: 'heart',
        description: 'Rationally believe each ticket loses, yet know one will win. Belief fails under conjunction—hope becomes impossible.',
        level: 3,
        manaCost: 18,
        damageCalculation: '3d6 + Heart',
        effect: 'debuff_exhaustion',
        learningRequirement: {
            level: 7,
            statRequirementType: 'heart',
            statRequirementValue: 17
        }
    },
    {
        id: 'paradox_raven',
        name: 'Raven Paradox',
        category: 'paradox',
        philosophicalAspect: 'mind',
        description: 'A green apple confirms "all ravens are black." Evidence works in mysterious ways—everything confirms you as the target.',
        level: 2,
        manaCost: 14,
        damageCalculation: '2d8 + Mind',
        effect: 'debuff_mark',
        learningRequirement: {
            level: 5,
            statRequirementType: 'mind',
            statRequirementValue: 15
        }
    },
    {
        id: 'paradox_omnipotence',
        name: 'Paradox of Omnipotence',
        category: 'paradox',
        philosophicalAspect: 'body',
        description: 'Can you create a weight too heavy to lift? Either answer proves limitation. Omnipotence undermines itself.',
        level: 3,
        manaCost: 20,
        damageCalculation: '3d8 + Body',
        effect: 'debuff_body_attack_down',
        learningRequirement: {
            level: 7,
            statRequirementType: 'body',
            statRequirementValue: 17
        }
    },
    {
        id: 'paradox_card',
        name: 'Card Paradox',
        category: 'paradox',
        philosophicalAspect: 'mind',
        description: 'One side says the other is true. The other says the first is false. Mutual reference creates mutual destruction.',
        level: 2,
        manaCost: 12,
        damageCalculation: '2d6 + Mind',
        effect: 'debuff_confusion',
        learningRequirement: {
            level: 4,
            statRequirementType: 'mind',
            statRequirementValue: 14
        }
    }
];

// =============================================================================
// SPECIAL/UTILITY SKILLS
// =============================================================================

export const utilitySkills: Skill[] = [
    // Cleanse/Dispel Skills
    {
        id: 'paradox_barbers_cleanse',
        name: 'Barber\'s Cleanse',
        category: 'paradox',
        philosophicalAspect: 'mind',
        description: 'Shave away only those effects that don\'t remove themselves. The logical impossibility resolves—all negativity vanishes.',
        level: 3,
        manaCost: 25,
        damageCalculation: '0',
        effect: 'buff_cleanse',
        learningRequirement: {
            level: 8,
            statRequirementType: 'mind',
            statRequirementValue: 16
        }
    },
    {
        id: 'fallacy_taboo',
        name: 'The Taboo',
        category: 'fallacy',
        philosophicalAspect: 'heart',
        description: 'Some things must never be questioned. Declare their attacks forbidden—the mere attempt becomes unthinkable.',
        level: 4,
        manaCost: 30,
        damageCalculation: '0',
        effect: 'buff_barrier',
        learningRequirement: {
            level: 10,
            statRequirementType: 'heart',
            statRequirementValue: 20
        }
    },
    // Reflection Skills
    {
        id: 'paradox_russells_mirror',
        name: 'Russell\'s Mirror',
        category: 'paradox',
        philosophicalAspect: 'mind',
        description: 'Become the set of all things that reflect themselves. Attacks contain themselves in impossible recursion—rebounding to sender.',
        level: 4,
        manaCost: 32,
        damageCalculation: '0',
        effect: 'buff_reflect',
        learningRequirement: {
            level: 11,
            statRequirementType: 'mind',
            statRequirementValue: 22
        }
    },
    // Healing Skills
    {
        id: 'paradox_maxwells_restoration',
        name: 'Maxwell\'s Restoration',
        category: 'paradox',
        philosophicalAspect: 'body',
        description: 'Like the demon sorting molecules, separate vitality from entropy. Fast energy stays; slow energy heals.',
        level: 3,
        manaCost: 20,
        damageCalculation: '0',
        effect: 'buff_life_steal',
        learningRequirement: {
            level: 7,
            statRequirementType: 'body',
            statRequirementValue: 16
        }
    },
    // Ultimate Skills
    {
        id: 'paradox_epistemic_closure',
        name: 'Epistemic Closure',
        category: 'paradox',
        philosophicalAspect: 'mind',
        description: 'To know that you know requires infinite meta-justification. Either knowledge requires the impossible, or knowing is incoherent.',
        level: 5,
        manaCost: 55,
        damageCalculation: '6d10 + Mind × 2',
        effect: 'debuff_blind',
        learningRequirement: {
            level: 16,
            statRequirementType: 'mind',
            statRequirementValue: 28
        }
    },
    {
        id: 'paradox_rational_self_deception',
        name: 'Rational Self-Deception',
        category: 'paradox',
        philosophicalAspect: 'heart',
        description: 'You cannot rationally believe P while believing your belief in P is irrational. Yet identifying irrational beliefs requires this.',
        level: 5,
        manaCost: 55,
        damageCalculation: '6d10 + Heart × 2',
        effect: 'debuff_confusion',
        learningRequirement: {
            level: 16,
            statRequirementType: 'heart',
            statRequirementValue: 28
        }
    },
    {
        id: 'fallacy_infotainment',
        name: 'Infotainment',
        category: 'fallacy',
        philosophicalAspect: 'heart',
        description: 'Stir facts, news, and lies with entertainment. The mixture becomes indistinguishable—truth itself becomes irrelevant.',
        level: 5,
        manaCost: 55,
        damageCalculation: '6d10 + Heart × 2',
        effect: 'debuff_charm',
        learningRequirement: {
            level: 16,
            statRequirementType: 'heart',
            statRequirementValue: 28
        }
    }
];

// =============================================================================
// COMBINED EXPORTS
// =============================================================================

/**
 * All fallacy-based skills organized by philosophical aspect
 */
export const allFallacySkills: Skill[] = [
    ...bodyFallacySkills,
    ...mindFallacySkills,
    ...heartFallacySkills
];

/**
 * All paradox-based skills organized by philosophical aspect and category
 */
export const allParadoxSkills: Skill[] = [
    ...bodyParadoxSkills,
    ...mindParadoxSkills,
    ...heartParadoxSkills,
    ...probabilityParadoxSkills,
    ...gameTheoryParadoxSkills,
    ...quantumParadoxSkills,
    ...infinityParadoxSkills,
    ...semanticParadoxSkills,
    ...utilitySkills
];

/**
 * Complete skill library - all fallacies and paradoxes combined
 */
export const skillLibrary: Skill[] = [
    ...allFallacySkills,
    ...allParadoxSkills
];

/**
 * Get all skills of a specific category
 */
export function getSkillsByCategory(category: 'fallacy' | 'paradox'): Skill[] {
    return skillLibrary.filter(skill => skill.category === category);
}

/**
 * Get all skills of a specific philosophical aspect
 */
export function getSkillsByAspect(aspect: 'body' | 'mind' | 'heart'): Skill[] {
    return skillLibrary.filter(skill => skill.philosophicalAspect === aspect);
}

/**
 * Get all skills of a specific level
 */
export function getSkillsByLevel(level: number): Skill[] {
    return skillLibrary.filter(skill => skill.level === level);
}

/**
 * Get a skill by its ID
 */
export function getSkillById(id: string): Skill | undefined {
    return skillLibrary.find(skill => skill.id === id);
}

/**
 * Get skills that can be learned at a given character level and stats
 */
export function getLearnableSkills(
    characterLevel: number,
    bodyValue: number,
    mindValue: number,
    heartValue: number,
    learnedSkills: string[]
): Skill[] {
    return skillLibrary.filter(skill => {
        // Check base level requirement
        if (skill.level > characterLevel) return false;
        
        // Check learning requirements if present
        if (skill.learningRequirement) {
            const req = skill.learningRequirement;
            
            // Level requirement
            if (req.level > characterLevel) return false;
            
            // Stat requirement
            if (req.statRequirementType && req.statRequirementValue) {
                const statValue = 
                    req.statRequirementType === 'body' ? bodyValue :
                    req.statRequirementType === 'mind' ? mindValue :
                    heartValue;
                if (statValue < req.statRequirementValue) return false;
            }
            
            // Prerequisite skill
            if (req.prerequisiteSkill && !learnedSkills.includes(req.prerequisiteSkill)) {
                return false;
            }
        }
        
        return true;
    });
}

/**
 * Get skill count statistics
 */
export function getSkillStats(): {
    total: number;
    byCategory: Record<string, number>;
    byAspect: Record<string, number>;
    byLevel: Record<number, number>;
} {
    const byCategory: Record<string, number> = { fallacy: 0, paradox: 0 };
    const byAspect: Record<string, number> = { body: 0, mind: 0, heart: 0 };
    const byLevel: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    
    for (const skill of skillLibrary) {
        byCategory[skill.category]++;
        byAspect[skill.philosophicalAspect]++;
        byLevel[skill.level]++;
    }
    
    return {
        total: skillLibrary.length,
        byCategory,
        byAspect,
        byLevel
    };
}

export default skillLibrary;
