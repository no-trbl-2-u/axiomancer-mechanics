import { Character } from "../character/types";
import { Enemy } from "../enemy/types";
import { Stance } from "../combat/types";

/**
 * Gets the resist-stat value of a target when resisting an effect.
 *
 * Effects declare which Stance they're resisted by; this helper maps that
 * Stance to the corresponding derived defense stat on the target.
 *
 * Lives in `effects/` rather than `character/` because it's an effect-resistance
 * lookup, not character logic — see REORG-PROPOSAL §7.
 *
 * @param target     - The character or enemy resisting the effect.
 * @param resistedBy - Which stance the effect is resisted by.
 * @returns The derived-defense stat value, or `luck` as a fallback.
 */
export const getResistStatFromResistedBy = (target: Character | Enemy, resistedBy: Stance): number => {
    switch (resistedBy) {
        case 'body':  return target.derivedStats.physicalDefense;
        case 'mind':  return target.derivedStats.mentalDefense;
        case 'heart': return target.derivedStats.emotionalDefense;
        default:      return target.derivedStats.luck;
    }
};
