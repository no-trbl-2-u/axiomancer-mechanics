export const COMBAT_ACTION = {
    ATTACK: "attack",
    DEFEND: "defend",
    SKILL: "skill",
    ITEM: "item",
    FLEE: "flee",
    BACK: "back",
} as const;

export type CombatActionType = typeof COMBAT_ACTION[keyof typeof COMBAT_ACTION];