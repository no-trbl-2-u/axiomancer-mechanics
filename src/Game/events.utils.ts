import { GameEvent } from './events';
import { 
    CombatStartedPayload,
    CombatEndedPayload,
    CombatRoundPayload,
    LevelUpPayload,
    InventoryChangedPayload,
    WorldMovedPayload,
    WorldProcessedPayload,
    TypedCombatStartedEvent,
    TypedCombatEndedEvent,
    TypedCombatRoundEvent,
    TypedLevelUpEvent,
    TypedInventoryChangedEvent,
    TypedWorldMovedEvent,
    TypedWorldProcessedEvent,
} from './events.types';

/**
 * Utility functions for creating rich typed game events.
 * These work with the existing GameEvent system but provide better typing.
 */

export function createCombatStartedEvent(enemy: string, playerStance: string): TypedCombatStartedEvent {
    return {
        type: 'combat:started',
        payload: { enemy, playerStance } as CombatStartedPayload,
    };
}

export function createCombatEndedEvent(
    result: 'victory' | 'defeat' | 'friendship', 
    xpGained?: number
): TypedCombatEndedEvent {
    return {
        type: 'combat:ended',
        payload: { result, xpGained } as CombatEndedPayload,
    };
}

export function createCombatRoundEvent(
    round: number, 
    playerAction: string, 
    enemyAction: string,
    playerDamage: number,
    enemyDamage: number,
    events: CombatRoundPayload['events'] = []
): TypedCombatRoundEvent {
    return {
        type: 'combat:round',
        payload: { 
            round, 
            playerAction, 
            enemyAction, 
            playerDamage, 
            enemyDamage,
            events 
        } as CombatRoundPayload,
    };
}

export function createLevelUpEvent(newLevel: number, statGains: Record<string, number>): TypedLevelUpEvent {
    return {
        type: 'character:levelup',
        payload: { newLevel, statGains } as LevelUpPayload,
    };
}

export function createInventoryChangedEvent(
    action: InventoryChangedPayload['action'],
    item: InventoryChangedPayload['item'],
    xpGained?: number
): TypedInventoryChangedEvent {
    return {
        type: 'inventory:changed',
        payload: { action, item, xpGained } as InventoryChangedPayload,
    };
}

export function createWorldMovedEvent(toNode: string, mapName: string, fromNode?: string): TypedWorldMovedEvent {
    return {
        type: 'world:moved',
        payload: { toNode, mapName, fromNode } as WorldMovedPayload,
    };
}

export function createWorldProcessedEvent(
    nodeId: string, 
    nodeType: WorldProcessedPayload['nodeType'],
    outcome?: WorldProcessedPayload['outcome']
): TypedWorldProcessedEvent {
    return {
        type: 'world:processed',
        payload: { nodeId, nodeType, outcome } as WorldProcessedPayload,
    };
}

/**
 * Type guards for narrowing GameEvent payloads
 */
export function isCombatStartedEvent(event: GameEvent): event is TypedCombatStartedEvent {
    return event.type === 'combat:started';
}

export function isCombatEndedEvent(event: GameEvent): event is TypedCombatEndedEvent {
    return event.type === 'combat:ended';
}

export function isCombatRoundEvent(event: GameEvent): event is TypedCombatRoundEvent {
    return event.type === 'combat:round';
}

export function isLevelUpEvent(event: GameEvent): event is TypedLevelUpEvent {
    return event.type === 'character:levelup';
}

export function isInventoryChangedEvent(event: GameEvent): event is TypedInventoryChangedEvent {
    return event.type === 'inventory:changed';
}

export function isWorldMovedEvent(event: GameEvent): event is TypedWorldMovedEvent {
    return event.type === 'world:moved';
}

export function isWorldProcessedEvent(event: GameEvent): event is TypedWorldProcessedEvent {
    return event.type === 'world:processed';
}