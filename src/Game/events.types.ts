/**
 * Extended event payloads for rich UI consumption.
 * These extend the existing GameEvent system with detailed typed payloads.
 */

import { GameEvent } from './events';

// Combat event payloads
export interface CombatStartedPayload {
    enemy: string; // enemy name
    playerStance: string;
}

export interface CombatEndedPayload {
    result: 'victory' | 'defeat' | 'friendship';
    xpGained?: number;
}

export interface CombatRoundPayload {
    round: number;
    playerAction: string;
    enemyAction: string;
    playerDamage: number;
    enemyDamage: number;
    events: CombatSubEvent[];
}

// Sub-events within a combat round
export interface CombatSubEvent {
    type: 'damage-dealt' | 'healed' | 'critical-hit' | 'effect-applied';
    target: 'player' | 'enemy';
    amount?: number;
    isCritical?: boolean;
    effectId?: string;
}

// Progression event payloads
export interface LevelUpPayload {
    newLevel: number;
    statGains: Record<string, number>;
}

export interface InventoryChangedPayload {
    action: 'added' | 'removed' | 'used' | 'equipped' | 'unequipped';
    item: {
        id: string;
        name: string;
        type: string;
    };
    xpGained?: number; // For item usage that grants XP
}

// World event payloads
export interface WorldMovedPayload {
    fromNode?: string;
    toNode: string;
    mapName: string;
}

export interface WorldProcessedPayload {
    nodeId: string;
    nodeType: 'combat' | 'event' | 'shop' | 'rest';
    outcome?: 'success' | 'failure' | 'neutral';
}

// Typed event interfaces for consumer convenience
export interface TypedCombatStartedEvent extends GameEvent {
    type: 'combat:started';
    payload: CombatStartedPayload;
}

export interface TypedCombatRoundEvent extends GameEvent {
    type: 'combat:round';
    payload: CombatRoundPayload;
}

export interface TypedCombatEndedEvent extends GameEvent {
    type: 'combat:ended';
    payload: CombatEndedPayload;
}

export interface TypedLevelUpEvent extends GameEvent {
    type: 'character:levelup';
    payload: LevelUpPayload;
}

export interface TypedInventoryChangedEvent extends GameEvent {
    type: 'inventory:changed';
    payload: InventoryChangedPayload;
}

export interface TypedWorldMovedEvent extends GameEvent {
    type: 'world:moved';
    payload: WorldMovedPayload;
}

export interface TypedWorldProcessedEvent extends GameEvent {
    type: 'world:processed';
    payload: WorldProcessedPayload;
}

// Union of all typed events
export type TypedGameEvent = 
    | TypedCombatStartedEvent 
    | TypedCombatRoundEvent
    | TypedCombatEndedEvent
    | TypedLevelUpEvent
    | TypedInventoryChangedEvent
    | TypedWorldMovedEvent
    | TypedWorldProcessedEvent;