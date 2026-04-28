/**
 * Combat Effects Library
 *
 * Maps every (Stance × Action) pair to one or more Tier 2/3 effect triggers.
 * Each trigger has a base chance, a target, and crit/fumble overrides that
 * power the "natural 20 guarantees the strongest proc" and "natural 1 may
 * self-debuff" rules described in `docs/combat.md`.
 *
 * The matrix follows the design in `GAME-ROADMAP.md` Phase 2b:
 *
 *   Heart  + Attack → emotional debuff (fear, charm)
 *   Heart  + Defend → emotional buff (regen, resilience)
 *   Body   + Attack → physical debuff (bleed, wound, knockdown)
 *   Body   + Defend → physical buff (damage reduction, counter)
 *   Mind   + Attack → mental debuff (daze, silence, confusion)
 *   Mind   + Defend → mental buff (evasion, accuracy boost)
 *
 * Triggers are intentionally low-chance on a base hit — most rounds will
 * proc nothing. Crits unlock the "strongest" trigger in each list (the
 * first entry, by convention).
 */

import { Stance, Action, CombatEffectTrigger } from './types';

/** Convenient alias for the only two actions that can fire combat effects. */
export type CombatEffectAction = Extract<Action, 'attack' | 'defend'>;

/**
 * The full lookup table. Index it via:
 *   COMBAT_EFFECTS[stance][action]
 * to retrieve the ordered list of triggers (strongest first).
 */
export const COMBAT_EFFECTS: Record<Stance, Record<CombatEffectAction, CombatEffectTrigger[]>> = {
    body: {
        attack: [
            { effectId: 'debuff_wound',      chance: 0.10, target: 'opponent', critGuaranteed: true,  fumbleSelfTarget: true },
            { effectId: 'debuff_bleed',      chance: 0.20, target: 'opponent' },
            { effectId: 'debuff_knockdown',  chance: 0.10, target: 'opponent' },
        ],
        defend: [
            { effectId: 'buff_body_defense_up', chance: 0.20, target: 'self', critGuaranteed: true },
            { effectId: 'buff_damage_reduction',chance: 0.15, target: 'self' },
        ],
    },
    mind: {
        attack: [
            { effectId: 'debuff_silence',  chance: 0.10, target: 'opponent', critGuaranteed: true, fumbleSelfTarget: true },
            { effectId: 'debuff_daze',     chance: 0.20, target: 'opponent' },
            { effectId: 'debuff_confusion',chance: 0.10, target: 'opponent' },
        ],
        defend: [
            { effectId: 'buff_mind_defense_up', chance: 0.20, target: 'self', critGuaranteed: true },
            { effectId: 'buff_evasion_up',      chance: 0.15, target: 'self' },
            { effectId: 'buff_accuracy_up',     chance: 0.10, target: 'self' },
        ],
    },
    heart: {
        attack: [
            { effectId: 'debuff_charm', chance: 0.10, target: 'opponent', critGuaranteed: true, fumbleSelfTarget: true },
            { effectId: 'debuff_fear',  chance: 0.20, target: 'opponent' },
        ],
        defend: [
            { effectId: 'buff_heart_defense_up', chance: 0.20, target: 'self', critGuaranteed: true },
            { effectId: 'buff_regeneration',     chance: 0.15, target: 'self' },
        ],
    },
};

/**
 * Returns the ordered list of triggers for a given combat action.
 * Returns `[]` if the action is not 'attack' or 'defend'.
 */
export function getCombatEffectTriggers(stance: Stance, action: Action): CombatEffectTrigger[] {
    if (action !== 'attack' && action !== 'defend') return [];
    return COMBAT_EFFECTS[stance][action];
}
