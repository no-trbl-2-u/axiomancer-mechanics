/**
 * Phase 99 — unlocked skill access migration test.
 * 
 * Verifies that legacy saves with equippedSkills get properly migrated
 * to merge those skills into knownSkills without losing progress.
 */

import { describe, test, expect } from 'vitest';
import { migrate } from '../game.migrate';
import { GAME_STATE_VERSION } from '../game.reducer';
import { createGameStore } from '../store';
import { createEventEmitter } from '../events';
import { nullAdapter } from '../persistence/null.adapter';
import { createCharacter } from '../../Character';
import { createStartingWorld } from '../../World';

describe('Phase 99 migration', () => {
    test('merges equippedSkills into knownSkills for v7 saves', () => {
        // Create a v7 save with separate equippedSkills and knownSkills
        const v7Save = {
            version: 7,
            runId: 'test-run-1234567',
            player: createCharacter({
                name: 'TestPlayer',
                level: 5,
                baseStats: { heart: 8, body: 6, mind: 7 },
                knownSkills: ['ad-hominem-strike', 'false-dilemma'],
                equippedSkills: ['ad-hominem-strike', 'appeal-to-pity'],
            }),
            world: createStartingWorld(),
            combat: null,
            quests: { activeQuests: [], completedQuests: [], flags: [] },
            flags: [],
            moralMeter: 0,
            rngState: 1234567890,
            philosophicalAlignment: {
                epistemology: 0,
                outlook: 0, 
                scope: 0,
            },
            codex: { unlockedEntries: [] },
        };

        // Migrate from v7 to v8
        const migrated = migrate(v7Save, 7, 8);

        // Verify the migration merged skills correctly
        expect(migrated.version).toBe(8);
        expect(migrated.player.knownSkills).toEqual(
            expect.arrayContaining(['ad-hominem-strike', 'false-dilemma', 'appeal-to-pity'])
        );
        expect(migrated.player.knownSkills).toHaveLength(3);
        
        // Verify equippedSkills is preserved for backward compatibility
        expect(migrated.player.equippedSkills).toEqual(['ad-hominem-strike', 'appeal-to-pity']);
    });

    test('handles v7 saves where equippedSkills is subset of knownSkills', () => {
        const v7Save = {
            version: 7,
            runId: 'test-run-abcdefgh',
            player: createCharacter({
                name: 'TestPlayer',
                level: 3,
                baseStats: { heart: 5, body: 5, mind: 5 },
                knownSkills: ['ad-hominem-strike', 'false-dilemma', 'appeal-to-pity'],
                equippedSkills: ['ad-hominem-strike', 'false-dilemma'],
            }),
            world: createStartingWorld(),
            combat: null,
            quests: { activeQuests: [], completedQuests: [], flags: [] },
            flags: [],
            moralMeter: 0,
            rngState: 1234567890,
            philosophicalAlignment: {
                epistemology: 0,
                outlook: 0,
                scope: 0,
            },
            codex: { unlockedEntries: [] },
        };

        const migrated = migrate(v7Save, 7, 8);

        // Should not add duplicates
        expect(migrated.player.knownSkills).toEqual(['ad-hominem-strike', 'false-dilemma', 'appeal-to-pity']);
        expect(migrated.player.knownSkills).toHaveLength(3);
    });

    test('handles v7 saves with empty equippedSkills', () => {
        const v7Save = {
            version: 7,
            runId: 'test-run-12345678',
            player: createCharacter({
                name: 'TestPlayer', 
                level: 1,
                baseStats: { heart: 5, body: 5, mind: 5 },
                knownSkills: ['ad-hominem-strike'],
                equippedSkills: [],
            }),
            world: createStartingWorld(),
            combat: null,
            quests: { activeQuests: [], completedQuests: [], flags: [] },
            flags: [],
            moralMeter: 0,
            rngState: 1234567890,
            philosophicalAlignment: {
                epistemology: 0,
                outlook: 0,
                scope: 0,
            },
            codex: { unlockedEntries: [] },
        };

        const migrated = migrate(v7Save, 7, 8);

        // Known skills should remain unchanged
        expect(migrated.player.knownSkills).toEqual(['ad-hominem-strike']);
        expect(migrated.player.equippedSkills).toEqual([]);
    });

    test('migrated saves can be loaded by game store', () => {
        const v7Save = {
            version: 7,
            runId: 'test-run-store123',
            player: createCharacter({
                name: 'TestPlayer',
                level: 2,
                baseStats: { heart: 6, body: 4, mind: 5 },
                knownSkills: ['false-dilemma'],
                equippedSkills: ['ad-hominem-strike'],
            }),
            world: createStartingWorld(),
            combat: null,
            quests: { activeQuests: [], completedQuests: [], flags: [] },
            flags: [],
            moralMeter: 0,
            rngState: 1234567890,
            philosophicalAlignment: {
                epistemology: 0,
                outlook: 0,
                scope: 0,
            },
            codex: { unlockedEntries: [] },
        };

        const migrated = migrate(v7Save, 7, GAME_STATE_VERSION);
        
        // Should be able to create store with migrated state
        const events = createEventEmitter();
        const store = createGameStore(nullAdapter, migrated, events);
        const state = store.getState();

        expect(state.version).toBe(GAME_STATE_VERSION);
        expect(state.player.knownSkills).toEqual(
            expect.arrayContaining(['false-dilemma', 'ad-hominem-strike'])
        );
        expect(state.player.knownSkills).toHaveLength(2);
    });
});