/**
 * Combat action constants
 * Use const assertion for type inference
 */
export const COMBAT_ACTION = {
    ATTACK: "attack",
    DEFEND: "defend",
    SKILL: "skill",
    ITEM: "item",
    FLEE: "flee",
    BACK: "back",
} as const;

/**
 * Type derived from COMBAT_ACTION values
 */
export type CombatActionType = typeof COMBAT_ACTION[keyof typeof COMBAT_ACTION];