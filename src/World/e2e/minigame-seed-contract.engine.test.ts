/**
 * Mechanics minigame seed contract — hermetic reproducibility suite.
 *
 * These tests pin the shared seed semantics used by minigame engines,
 * CLIs, and playtest harnesses: string seeds are first-class, numeric
 * seeds keep legacy uint32 behavior, same seeds replay exactly, and
 * different seed labels produce different dealt state.
 */
import { describe, expect, it } from 'vitest';

import { createHazardSession } from '../Hazard/hazard.engine';
import { hazardStarterBag } from '../Hazard/hazard.deck-flags';
import { createGatheringSession } from '../Gathering/gathering.engine';
import { createRestSession } from '../Rest/rest.engine';
import { createLootCacheSession } from '../LootCache/lootcache.engine';
import { createQuestBoardSession } from '../QuestBoard/quest-board.engine';
import { minigameRunSeed, seedInputToUint32, type SeedInput } from '../seed';
import { runPlaytestScenario } from '../../Playtest/playtest.runner';
import type { PlaytestScenario } from '../../Playtest/types';
import { setRng, type Rng } from '../../Utils/rng';

const mathBackedRng: Rng = {
    random: () => Math.random(),
    getState: () => 0,
    setState: () => {},
};

function scrubSeed<T>(value: T): unknown {
    return JSON.parse(JSON.stringify(value, (key, val) => (key === 'seed' ? '<seed>' : val)));
}

function expectReplayable<T>(label: string, build: (seed: SeedInput) => T): void {
    const first = scrubSeed(build('mechanics-seed-contract'));
    const replay = scrubSeed(build('mechanics-seed-contract'));
    const different = scrubSeed(build('mechanics-seed-contract-alt'));

    expect(first, `${label} should replay exactly for the same string seed`).toEqual(replay);
    expect(first, `${label} should vary for a different string seed`).not.toEqual(different);
}

describe('shared minigame seed utility', () => {
    it('normalizes numeric and string seeds to deterministic uint32 values', () => {
        expect(seedInputToUint32(42)).toBe(42);
        expect(seedInputToUint32(-1)).toBe(0xffffffff);
        expect(seedInputToUint32('contract-alpha')).toBe(seedInputToUint32('contract-alpha'));
        expect(seedInputToUint32('contract-alpha')).not.toBe(seedInputToUint32('contract-beta'));
    });

    it('derives stable per-run seeds without collapsing adjacent runs', () => {
        expect(minigameRunSeed('contract-alpha', 0)).toBe(minigameRunSeed('contract-alpha', 0));
        expect(minigameRunSeed('contract-alpha', 0)).not.toBe(minigameRunSeed('contract-alpha', 1));
        expect(minigameRunSeed(123, 2)).toBe(((123 >>> 0) + 2) >>> 0);
    });
});

describe('minigame engine seed contract', () => {
    it('Hazard sessions accept string seeds and replay dealt state', () => {
        expectReplayable('Hazard', seed => createHazardSession(seed, hazardStarterBag(), 'cracked-cliff'));
    });

    it('Gathering sessions accept string seeds and replay dealt state', () => {
        expectReplayable('Gathering', seed => createGatheringSession(seed, 'mire-mint'));
    });

    it('Rest sessions accept string seeds and replay dealt state', () => {
        expectReplayable('Rest', seed => createRestSession(seed));
    });

    it('LootCache sessions accept string seeds and replay sealed trap fates', () => {
        expectReplayable('LootCache', seed => createLootCacheSession(seed, [{ uid: 'i1', name: 'Iron Charm' }], 6));
    });

    it('QuestBoard sessions accept string seeds and replay dealt charms/vows', () => {
        expectReplayable('QuestBoard', seed => createQuestBoardSession(seed, 'build-the-boat'));
    });
});

describe('playtest runner seed contract', () => {
    it('replays the same scenario report from the same scenario seed', () => {
        const scenario: PlaytestScenario = {
            id: 'seed-contract-playtest',
            description: 'Short deterministic playtest seed-contract witness.',
            preset: 'sage',
            enemy: 'coastal-tyrant',
            runs: 2,
            maxRounds: 4,
            seed: 'seed-contract-playtest',
            policies: ['aggressive', 'defensive'],
        };

        const first = runPlaytestScenario(scenario);
        const replay = runPlaytestScenario(scenario);

        expect(first).toEqual(replay);
        expect(first.runs.map(run => run.seed)).toEqual(['seed-contract-playtest:1', 'seed-contract-playtest:2']);
        setRng(mathBackedRng);
    });
});
