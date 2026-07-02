/**
 * Hermetic e2e — game CLI wiring (`src/CLI/game.cli.ts`, 2026-07 D5–D7).
 *
 * Drives `runGameCli` end-to-end in script mode with `--auto-minigames`:
 * REAL store, REAL map events (defer mode), REAL minigame sessions and
 * outcome appliers, REAL dialogue loop. ONLY the Hazard-Pattern combat
 * driver (`runHazardCombatCliEncounter`) is mocked — the fv-6 boss is not
 * currently beatable by the CLI auto-combat policies (see the Phase-2
 * report), and this suite verifies the CLI's fold-back wiring, not combat
 * balance.
 *
 * Coverage:
 *   1. Victory at the fv-6 boss folds back through startCombat/endCombat:
 *      map:completed fires with northern-forest unlocked, the road line is
 *      logged, `travel:northern-forest` works from the map tab, northern-
 *      forest interactions run the dialogue loop (Chronicler flag set), and
 *      the nf-8 village shop's `talk` action reaches an NPC tree.
 *   2. Defeat at the boss does NOT complete the map, and the engine defeat
 *      semantics are mirrored (player synced to 0 HP, no floor-to-1 clamp).
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { randomUUID } from 'crypto';

import { setIoMode, setOutputMode, setStateLogPath } from '../io';
import { setSeed } from '../../Utils/rng';

// Mock ONLY the combat driver; every other export stays real.
vi.mock('../combat.cli', async (importOriginal) => {
    const mod = await importOriginal<typeof import('../combat.cli')>();
    return { ...mod, runHazardCombatCliEncounter: vi.fn() };
});

import { runHazardCombatCliEncounter } from '../combat.cli';
import { runGameCli } from '../game.cli';

const mockedCombat = vi.mocked(runHazardCombatCliEncounter);

/** Builds the minimal combat-driver result shape game.cli.ts consumes. */
function combatResult(outcome: 'victory' | 'mercy' | 'defeat' | 'retreat', playerHealth: number) {
    return {
        state: { player: { health: playerHealth } },
        outcome,
        summary: null,
    } as unknown as Awaited<ReturnType<typeof runHazardCombatCliEncounter>>;
}

// ─── io harness ───────────────────────────────────────────────────────────────

const tmpFiles: string[] = [];
function tmpPath(suffix: string): string {
    const p = path.join(os.tmpdir(), `axiomancer-game-cli-${randomUUID()}${suffix}`);
    tmpFiles.push(p);
    return p;
}

let stdoutLines: string[];
let stderrLines: string[];

function jsonEvents(): Array<{ type: string; payload?: Record<string, unknown> }> {
    return stdoutLines
        .flatMap(chunk => chunk.split('\n'))
        .filter(l => l.trim().startsWith('{'))
        .map(l => JSON.parse(l) as { type: string; payload?: Record<string, unknown> });
}

interface StateLogRecord {
    action: string;
    before: { player?: { health: number }; world?: WorldSlice } | null;
    after: { player: { health: number; experience: number }; world: WorldSlice; flags: string[] };
    event?: Record<string, unknown>;
}
interface WorldSlice {
    currentMap: { name: string };
    currentContinent: { completedMaps: string[]; availableMaps: string[]; lockedMaps: string[] };
}

function readStateLog(p: string): StateLogRecord[] {
    return fs.readFileSync(p, 'utf-8')
        .split('\n')
        .filter(Boolean)
        .map(l => JSON.parse(l) as StateLogRecord);
}

async function runScripted(answers: object[], stateLog: string): Promise<void> {
    const script = tmpPath('.json');
    fs.writeFileSync(script, JSON.stringify(answers), 'utf-8');
    await runGameCli([
        '--script', script,
        '--json-events',
        '--auto-minigames',
        '--seed', '9',
        '--state-log', stateLog,
    ]);
}

beforeEach(() => {
    setSeed('game-cli-wiring-e2e');
    stdoutLines = [];
    stderrLines = [];
    vi.spyOn(process.stdout, 'write').mockImplementation((chunk) => {
        stdoutLines.push(typeof chunk === 'string' ? chunk : String(chunk));
        return true;
    });
    vi.spyOn(process.stderr, 'write').mockImplementation((chunk) => {
        stderrLines.push(typeof chunk === 'string' ? chunk : String(chunk));
        return true;
    });
    mockedCombat.mockReset();
});

afterEach(() => {
    vi.restoreAllMocks();
    setIoMode({ kind: 'tty' });
    setOutputMode('human');
    setStateLogPath(null);
    while (tmpFiles.length > 0) {
        const p = tmpFiles.pop()!;
        try { fs.unlinkSync(p); } catch { /* ignore */ }
    }
});

// ─── 1. Victory path: progression + travel + dialogue + village talk ─────────

describe('game CLI wiring — boss victory, travel, dialogue, village talk', () => {
    it('folds combat victories back, completes the map, travels, and talks', async () => {
        mockedCombat.mockImplementation(async () => combatResult('victory', 40));

        const stateLog = tmpPath('.jsonl');
        await runScripted([
            // fishing-village spine: loot-cache, rest, VILLAGE (Wharfside
            // Market — leave the shop straight away), gathering, BOSS.
            { tab: 'map' }, { target: 'fv-2' },
            { tab: 'map' }, { target: 'fv-3' },
            { tab: 'map' }, { target: 'fv-4' }, { action: 'leave' },
            { tab: 'map' }, { target: 'fv-5' },
            { tab: 'map' }, { target: 'fv-6' },
            // Boss victory completed the map — travel unlocked.
            { tab: 'map' }, { target: 'travel:northern-forest' },
            // nf-3: Shrine Keeper interaction — leave the dialogue immediately.
            { tab: 'map' }, { target: 'nf-3' },
            { choice: -1 },
            // nf-5: Chronicler interaction — pick "I've seen strange things"
            // (sets the 'chronicler_met' flag), then leave at the next node.
            { tab: 'map' }, { target: 'nf-5' },
            { choice: 1 },
            { choice: -1 },
            // nf-6: encounter (mocked victory); nf-7: Forest Hermit
            // interaction with NO authored tree — consumes no answers.
            { tab: 'map' }, { target: 'nf-6' },
            { tab: 'map' }, { target: 'nf-7' },
            // nf-8: Glen Market village — shop loop with the new talk action.
            { tab: 'map' }, { target: 'nf-8' },
            { action: 'talk' }, { npc: 'Shrine Keeper' }, { choice: -1 },
            { action: 'leave' },
            { tab: 'journal' },
            { tab: 'quit' },
        ], stateLog);

        // Two encounters ran through the (mocked) combat driver (fv-6 + nf-6;
        // fv-4 is the Wharfside Market village since 2026-07, not a fight).
        expect(mockedCombat).toHaveBeenCalledTimes(2);

        // Boss progression surfaced: map:completed with the unlock payload.
        const events = jsonEvents();
        const completed = events.find(e => e.type === 'map:completed');
        expect(completed).toBeDefined();
        expect(completed!.payload).toMatchObject({
            map: 'fishing-village',
            unlocked: ['northern-forest'],
        });
        // ...and the road line was logged (json mode logs go to stderr).
        expect(stderrLines.join('')).toContain(
            'The Coastal Tyrant is dealt with. The road to the northern forest is open.',
        );

        // Deferred minigames ran and reported per kind.
        const minigames = events.filter(e => e.type === 'minigame:end')
            .map(e => `${e.payload!.minigame}@${e.payload!.node}`);
        expect(minigames).toEqual(expect.arrayContaining([
            'loot-cache@fv-2', 'rest@fv-3', 'gathering@fv-5',
        ]));

        const records = readStateLog(stateLog);

        // endCombat fold-back: victory recorded, XP granted, map completed.
        const bossEnd = records.filter(r => r.action === 'endCombat')
            .find(r => r.after.world.currentContinent.completedMaps.includes('fishing-village'));
        expect(bossEnd).toBeDefined();
        expect(bossEnd!.event).toMatchObject({ outcome: 'victory' });
        expect(bossEnd!.after.player.experience).toBeGreaterThan(0);
        // HP synced from the combat result (clamped into [0, maxHealth]).
        expect(bossEnd!.after.player.health).toBe(40);

        // travelToMap actually switched the current map.
        const travel = records.find(r => r.action === 'travelToMap');
        expect(travel).toBeDefined();
        expect(travel!.after.world.currentMap.name).toBe('northern-forest');

        // Interaction dialogue folded back: Chronicler flag set on the store.
        const talk = records.find(r => r.action === 'villageTalk');
        expect(talk).toBeDefined();
        expect(talk!.event).toMatchObject({ npc: 'Shrine Keeper' });
        expect(talk!.after.flags).toContain('chronicler_met');

        // Clean exit.
        expect(events.some(e => e.type === 'cli:exit'
            && (e.payload as { reason?: string }).reason === 'quit')).toBe(true);
    });
});

// ─── 2. Defeat path: no progression, engine defeat semantics mirrored ────────

describe('game CLI wiring — boss defeat', () => {
    it('does NOT complete the map and syncs the player to 0 HP', async () => {
        mockedCombat.mockImplementation(async () => combatResult('defeat', 0));

        const stateLog = tmpPath('.jsonl');
        await runScripted([
            { tab: 'map' }, { target: 'fv-2' },
            { tab: 'map' }, { target: 'fv-3' },
            { tab: 'map' }, { target: 'fv-4' }, { action: 'leave' },
            { tab: 'map' }, { target: 'fv-5' },
            { tab: 'map' }, { target: 'fv-6' },
            { tab: 'quit' },
        ], stateLog);

        const events = jsonEvents();
        expect(events.some(e => e.type === 'map:completed')).toBe(false);

        const records = readStateLog(stateLog);
        const ends = records.filter(r => r.action === 'endCombat');
        expect(ends.length).toBe(1); // fv-6 (fv-4 is the village since 2026-07)
        for (const r of ends) {
            expect(r.event).toMatchObject({ outcome: 'defeat' });
            expect(r.after.world.currentContinent.completedMaps).toEqual([]);
            expect(r.after.world.currentContinent.lockedMaps).toContain('northern-forest');
            // Engine defeat semantics: finalPlayer promoted as-is — 0 HP,
            // no floor-to-1 clamp.
            expect(r.after.player.health).toBe(0);
        }
    });
});
