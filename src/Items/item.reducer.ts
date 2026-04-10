/**
 * Item Reducer
 *
 * Pure functions that modify GameState related to items.
 * Every function returns a new GameState — nothing is mutated.
 */

import { GameState } from '../Game/types';
import { DerivedStats } from '../Character/types';
import { clamp } from '../Utils';
import {
    Item,
    Equipment,
    Consumable,
    EquipmentSlot,
    EquippedItems,
    ConsumableEffect,
    isConsumable,
    isEquipment,
    isStackable,
} from './types';

// ============================================================================
// INVENTORY — ADD / REMOVE / STACK
// ============================================================================

/**
 * Adds an item to the player's inventory.
 * If the item is stackable and already exists, merges quantities instead.
 */
export function addItemToInventory(state: GameState, item: Item): GameState {
    if (isStackable(item)) {
        const existing = state.player.inventory.find(i => i.id === item.id);
        if (existing && isStackable(existing)) {
            return stackItem(state, item.id, item.quantity);
        }
    }
    return {
        ...state,
        player: {
            ...state.player,
            inventory: [...state.player.inventory, item],
        },
    };
}

/**
 * Removes an item from the player's inventory by ID.
 * If the item is currently equipped, it is also unequipped.
 */
export function removeItemFromInventory(state: GameState, itemId: string): GameState {
    const item = state.player.inventory.find(i => i.id === itemId);
    let result = state;

    if (item && isEquipment(item)) {
        const equipped = state.player.equippedItems;
        const isEquipped = Object.values(equipped).some(e => e?.id === itemId);
        if (isEquipped) {
            result = unequipItem(result, item.slot);
        }
    }

    return {
        ...result,
        player: {
            ...result.player,
            inventory: result.player.inventory.filter(i => i.id !== itemId),
        },
    };
}

/**
 * Increases the quantity of a stackable item already in inventory.
 */
export function stackItem(state: GameState, itemId: string, amount: number): GameState {
    return {
        ...state,
        player: {
            ...state.player,
            inventory: state.player.inventory.map(item => {
                if (item.id === itemId && isStackable(item)) {
                    return { ...item, quantity: item.quantity + amount };
                }
                return item;
            }),
        },
    };
}

/**
 * Attempts to merge a stackable item into existing inventory.
 * If the item already exists, stacks. Otherwise adds as new.
 */
export function mergeStackableItem(state: GameState, item: Consumable): GameState {
    const existing = state.player.inventory.find(i => i.id === item.id);
    if (existing && isStackable(existing)) {
        return stackItem(state, item.id, item.quantity);
    }
    return addItemToInventory(state, item);
}

// ============================================================================
// CONSUMABLE — USE
// ============================================================================

/**
 * Uses a consumable item, applying its effect to the player and
 * decrementing quantity (removing at zero).
 */
export function useConsumable(state: GameState, itemId: string): GameState {
    const item = state.player.inventory.find(i => i.id === itemId);
    if (!item || !isConsumable(item)) return state;

    let result = applyConsumableEffect(state, item);

    if (item.quantity <= 1) {
        result = {
            ...result,
            player: {
                ...result.player,
                inventory: result.player.inventory.filter(i => i.id !== itemId),
            },
        };
    } else {
        result = {
            ...result,
            player: {
                ...result.player,
                inventory: result.player.inventory.map(i =>
                    i.id === itemId && isConsumable(i)
                        ? { ...i, quantity: i.quantity - 1 }
                        : i
                ),
            },
        };
    }

    return result;
}

/**
 * Core consumable effect resolver.
 * Applies the effect described by a Consumable to the player inside GameState.
 */
function applyConsumableEffect(state: GameState, consumable: Consumable): GameState {
    const { effect, potency } = consumable;
    const player = state.player;

    const handlers: Record<ConsumableEffect, () => GameState> = {
        'heal': () => ({
            ...state,
            player: {
                ...player,
                health: clamp(player.health + potency, 0, player.maxHealth),
            },
        }),
        'heal-large': () => ({
            ...state,
            player: {
                ...player,
                health: clamp(player.health + potency, 0, player.maxHealth),
            },
        }),
        'heal-full': () => ({
            ...state,
            player: { ...player, health: player.maxHealth },
        }),
        'restore-mana': () => ({
            ...state,
            player: {
                ...player,
                mana: clamp(player.mana + potency, 0, player.maxMana),
            },
        }),
        'restore-mana-large': () => ({
            ...state,
            player: {
                ...player,
                mana: clamp(player.mana + potency, 0, player.maxMana),
            },
        }),
        'restore-mana-full': () => ({
            ...state,
            player: { ...player, mana: player.maxMana },
        }),
        'restore-all': () => ({
            ...state,
            player: {
                ...player,
                health: clamp(player.health + potency, 0, player.maxHealth),
                mana:   clamp(player.mana   + potency, 0, player.maxMana),
            },
        }),
        'buff-body': () => applyTemporaryStatBuff(state, {
            physicalAttack:  potency,
            physicalSkill:   potency,
            physicalDefense: potency,
        }),
        'buff-mind': () => applyTemporaryStatBuff(state, {
            mentalAttack:  potency,
            mentalSkill:   potency,
            mentalDefense: potency,
        }),
        'buff-heart': () => applyTemporaryStatBuff(state, {
            emotionalAttack:  potency,
            emotionalSkill:   potency,
            emotionalDefense: potency,
        }),
        'buff-all-stats': () => applyTemporaryStatBuff(state, {
            physicalAttack: potency, physicalSkill: potency, physicalDefense: potency,
            mentalAttack:   potency, mentalSkill:   potency, mentalDefense:   potency,
            emotionalAttack: potency, emotionalSkill: potency, emotionalDefense: potency,
            luck: potency,
        }),
        'buff-defense': () => applyTemporaryStatBuff(state, {
            physicalDefense:  potency,
            mentalDefense:    potency,
            emotionalDefense: potency,
        }),
        'buff-attack': () => applyTemporaryStatBuff(state, {
            physicalAttack:  potency,
            mentalAttack:    potency,
            emotionalAttack: potency,
        }),
        'cure-debuff': () => ({
            ...state,
            player: {
                ...player,
                currentActiveEffects: player.currentActiveEffects.filter(
                    ae => !ae.effectId.startsWith('debuff')
                ),
            },
        }),
        'damage-bomb': () => state,
        'damage-poison': () => state,
        'damage-fire': () => state,
        'revive': () => ({
            ...state,
            player: {
                ...player,
                health: player.health <= 0
                    ? clamp(potency, 1, player.maxHealth)
                    : player.health,
            },
        }),
    };

    return handlers[effect]();
}

/**
 * Applies a flat derived-stat bonus to the player's current derivedStats.
 * Used by buff consumables. In a full implementation this would create an
 * ActiveEffect with a duration; for now it directly modifies stats.
 */
function applyTemporaryStatBuff(
    state: GameState,
    bonuses: Partial<DerivedStats>,
): GameState {
    const current = state.player.derivedStats;
    const updated = { ...current };
    const currentRec = current as unknown as Record<string, number>;
    const updatedRec = updated as unknown as Record<string, number>;

    for (const [key, value] of Object.entries(bonuses)) {
        if (value !== undefined) {
            updatedRec[key] = (currentRec[key] ?? 0) + value;
        }
    }

    return {
        ...state,
        player: {
            ...state.player,
            derivedStats: updated,
        },
    };
}

// ============================================================================
// EQUIPMENT — EQUIP / UNEQUIP
// ============================================================================

/**
 * Equips an item from the player's inventory into the appropriate slot.
 * If the slot is already occupied, the previous item is unequipped first.
 * The newly equipped item's stat modifiers are applied to derivedStats.
 *
 * Returns the original state if the item is not in inventory or is not equipment.
 */
export function equipItem(state: GameState, itemId: string): GameState {
    const item = state.player.inventory.find(i => i.id === itemId);
    if (!item || !isEquipment(item)) return state;

    const slot = item.slot;
    let result = state;

    const currentlyEquipped = result.player.equippedItems[slot];
    if (currentlyEquipped) {
        result = unequipItem(result, slot);
    }

    const bonuses = item.statModifiers;
    const current = result.player.derivedStats;
    const updated = addStatModifiers(current, bonuses);

    return {
        ...result,
        player: {
            ...result.player,
            derivedStats: updated,
            equippedItems: {
                ...result.player.equippedItems,
                [slot]: item,
            },
        },
    };
}

/**
 * Unequips whatever is in the given slot, removing its stat bonuses.
 * The item remains in inventory.
 */
export function unequipItem(state: GameState, slot: EquipmentSlot): GameState {
    const equipped = state.player.equippedItems[slot];
    if (!equipped) return state;

    const bonuses = equipped.statModifiers;
    const current = state.player.derivedStats;
    const updated = removeStatModifiers(current, bonuses);

    const newEquipped: EquippedItems = { ...state.player.equippedItems };
    delete newEquipped[slot];

    return {
        ...state,
        player: {
            ...state.player,
            derivedStats: updated,
            equippedItems: newEquipped,
        },
    };
}

// ============================================================================
// EQUIPMENT — STAT HELPERS
// ============================================================================

/**
 * Sums all stat bonuses from currently equipped items.
 * Useful for UI display and effect DR calculations.
 */
export function getEquipmentStatBonuses(equippedItems: EquippedItems): Partial<DerivedStats> {
    const totals: Partial<DerivedStats> = {};
    for (const equipment of Object.values(equippedItems)) {
        if (!equipment) continue;
        for (const [key, value] of Object.entries(equipment.statModifiers)) {
            if (value !== undefined) {
                (totals as Record<string, number>)[key] =
                    ((totals as Record<string, number>)[key] ?? 0) + value;
            }
        }
    }
    return totals;
}

function addStatModifiers(
    current: DerivedStats,
    modifiers: Partial<DerivedStats>,
): DerivedStats {
    const result = { ...current };
    const currentRec = current as unknown as Record<string, number>;
    const resultRec  = result  as unknown as Record<string, number>;

    for (const [key, value] of Object.entries(modifiers)) {
        if (value !== undefined) {
            resultRec[key] = (currentRec[key] ?? 0) + value;
        }
    }
    return result;
}

function removeStatModifiers(
    current: DerivedStats,
    modifiers: Partial<DerivedStats>,
): DerivedStats {
    const result = { ...current };
    const currentRec = current as unknown as Record<string, number>;
    const resultRec  = result  as unknown as Record<string, number>;

    for (const [key, value] of Object.entries(modifiers)) {
        if (value !== undefined) {
            resultRec[key] = (currentRec[key] ?? 0) - value;
        }
    }
    return result;
}

// ============================================================================
// INVENTORY — QUERY HELPERS
// ============================================================================

/**
 * Finds an item in the player's inventory by ID.
 */
export function findInventoryItem(state: GameState, itemId: string): Item | undefined {
    return state.player.inventory.find(i => i.id === itemId);
}

/**
 * Returns all inventory items matching a given category.
 */
export function getInventoryByCategory(state: GameState, category: Item['category']): Item[] {
    return state.player.inventory.filter(i => i.category === category);
}
