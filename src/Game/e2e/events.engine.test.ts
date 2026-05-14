import { describe, it, expect, beforeEach } from 'vitest';
import { createGameStore } from '../store';
import { nullAdapter } from '../persistence/null.adapter';
import { createEventEmitter } from '../events';
import { createCharacter } from '../../Character';
import { createEnemy } from '../../Enemy';
import { 
    isCombatStartedEvent,
    isCombatEndedEvent,
    isLevelUpEvent,
    isInventoryChangedEvent 
} from '../events.utils';

describe('Events engine', () => {
    let events: ReturnType<typeof createEventEmitter>;
    let capturedEvents: any[];

    beforeEach(() => {
        events = createEventEmitter();
        capturedEvents = [];
        
        // Capture all events for testing
        events.onAny((event) => {
            capturedEvents.push(event);
        });
    });

    it('emits combat events in correct sequence', () => {
        const store = createGameStore(nullAdapter, undefined, events);
        const enemy = createEnemy({ name: 'Test Enemy', difficulty: 'easy' });

        // Start combat
        store.startCombat(enemy);

        // Should emit combat:started event
        expect(capturedEvents).toHaveLength(1);
        expect(capturedEvents[0]!.type).toBe('combat:started');
        expect(isCombatStartedEvent(capturedEvents[0]!)).toBe(true);

        capturedEvents.length = 0; // Clear events

        // End combat  
        const result = store.endCombat();

        // Should emit combat:ended event
        expect(capturedEvents.length).toBeGreaterThan(0);
        const endEvent = capturedEvents.find(e => e.type === 'combat:ended');
        expect(endEvent).toBeDefined();
        expect(isCombatEndedEvent(endEvent!)).toBe(true);
    });

    it('provides typed event payloads with rich data', () => {
        const store = createGameStore(nullAdapter, undefined, events);
        const enemy = createEnemy({ name: 'Sophist', difficulty: 'easy' });

        store.startCombat(enemy);

        const startEvent = capturedEvents.find(e => e.type === 'combat:started');
        expect(startEvent).toBeDefined();
        
        if (isCombatStartedEvent(startEvent!)) {
            // Type narrowing should work
            expect(startEvent.payload).toBeDefined();
            expect(typeof startEvent.payload).toBe('object');
        }
    });

    it('allows multiple event subscribers', () => {
        const store = createGameStore(nullAdapter, undefined, events);
        
        const combatEvents: any[] = [];
        const allEvents: any[] = [];

        events.on('combat:started', (event) => combatEvents.push(event));
        events.onAny((event) => allEvents.push(event));

        const enemy = createEnemy({ name: 'Test Enemy', difficulty: 'easy' });
        store.startCombat(enemy);

        expect(combatEvents).toHaveLength(1);
        expect(allEvents.length).toBeGreaterThan(0);
        expect(combatEvents[0]!.type).toBe('combat:started');
    });

    it('supports unsubscribing from events', () => {
        const store = createGameStore(nullAdapter, undefined, events);
        
        const testEvents: any[] = [];
        const unsubscribe = events.on('combat:started', (event) => testEvents.push(event));

        const enemy = createEnemy({ name: 'Test Enemy', difficulty: 'easy' });
        store.startCombat(enemy);
        expect(testEvents).toHaveLength(1);

        unsubscribe();
        testEvents.length = 0;

        // Start another combat - should not receive event
        const enemy2 = createEnemy({ name: 'Test Enemy 2', difficulty: 'easy' });
        store.startCombat(enemy2);
        expect(testEvents).toHaveLength(0);
    });

    it('works with game store without event emitter', () => {
        // Should not crash when no emitter provided
        const store = createGameStore(nullAdapter);
        const enemy = createEnemy({ name: 'Test Enemy', difficulty: 'easy' });

        expect(() => {
            store.startCombat(enemy);
            store.endCombat();
        }).not.toThrow();
    });
});