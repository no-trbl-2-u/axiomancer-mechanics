/**
 * Hermetic E2E — the whole first level, played through the Game store.
 *
 * Capstone for the "experience the whole first level" arc (contracts D1–D9):
 * from a fresh `createGameStore(nullAdapter)` a player can walk EVERY one of
 * fishing-village's 25 nodes in a legal adjacency order, resolve each node's
 * authored MapEvent (`resolveMapEvent`), accept Old Marrow's starting quest
 * at the fv-4 village (via `applyDialogueChoice`, folded back exactly the way
 * the CLI dialogue loop does), defeat the fv-6 Coastal Tyrant, watch the
 * quest complete through `endCombat`'s killObjectives, see the D4 boss
 * progression complete the map and unlock northern-forest, and travel there
 * with the `travelToMap` verb.
 *
 * Also covered: the mercy ending (befriending the tyrant completes the level
 * too — first-class per VISION.md), the defeat non-ending, and the D1
 * `deferMinigames` mode leaving the walk completable with the player
 * untouched (the CLI applies real minigame outcomes separately).
 *
 * Hermetic = self-contained + deterministic + isolated (docs/testing.md).
 * RNG is seeded through the engine singleton (`setSeed`); no disk, no
 * subprocess, no CLI imports.
 */

import { describe, it, expect, vi, afterEach } from 'vitest';

import { createGameStore } from '../store';
import { nullAdapter } from '../persistence/null.adapter';
import {
    resolveMapEvent, applyDialogueChoice, getMapDefinition, IllegalTravelError,
} from '../../World';
import type {
    MapEventKind, ResolvedEvent, ApplyDialogueChoiceResult,
} from '../../World';
import { setSeed } from '../../Utils/rng';

afterEach(() => vi.restoreAllMocks());

type Store = ReturnType<typeof createGameStore>;

/** Fresh store + deterministic engine RNG (single seed, no Monte Carlo). */
function freshStore(seed: string): Store {
    const store = createGameStore(nullAdapter);
    setSeed(seed);
    return store;
}

/**
 * Resolves the event at the CURRENT node and folds the result back into the
 * store with the same slice-wise `setState` the CLI map tab uses after
 * `resolveMapEvent` (game.cli.ts: player / world / quests / flags).
 */
function resolveHere(store: Store, options?: { deferMinigames?: boolean }): ResolvedEvent {
    const result = resolveMapEvent(store.getState(), options);
    store.setState({
        player: result.state.player,
        world: result.state.world,
        quests: result.state.quests,
        flags: result.state.flags,
    });
    return result.event;
}

/** Dialogue fold-back — the exact slice `src/CLI/dialogue.loop.ts` writes. */
function foldDialogue(store: Store, result: ApplyDialogueChoiceResult): void {
    store.setState({
        player: result.gameState.player,
        quests: result.gameState.quests,
        flags: result.gameState.flags,
        moralMeter: result.gameState.moralMeter,
        philosophicalAlignment: result.gameState.philosophicalAlignment,
        lastSeenAlignmentCells: result.gameState.lastSeenAlignmentCells,
    });
}

/**
 * Walks Old Marrow's tree from the map DEFINITION's npcs (the same lookup the
 * CLI village `talk` action performs) and accepts 'starting-quest':
 * root → "offer" branch → the plain accept choice (`effect.startQuest`).
 */
function acceptOldMarrowQuest(store: Store): void {
    const def = getMapDefinition('coastal-continent', 'fishing-village');
    const marrow = def.npcs?.find(n => n.name === 'Old Marrow');
    expect(marrow?.dialogueTree).toBeDefined();
    const tree = marrow!.dialogueTree!;

    const root = tree.nodes[tree.rootId];
    const offer = root.choices!.find(c => c.nextNodeId === 'offer')!;
    const step1 = applyDialogueChoice(store.getState(), tree, offer);
    foldDialogue(store, step1);

    const accept = step1.nextNode!.choices!.find(
        c => c.effect?.startQuest === 'starting-quest',
    )!;
    const step2 = applyDialogueChoice(store.getState(), tree, accept);
    foldDialogue(store, step2);
    expect(step2.effects.startedQuest).toBe('starting-quest');
}

/** startCombat/endCombat('victory') round-trip for an encounter event. */
function winEncounter(store: Store, event: ResolvedEvent): void {
    if (event.kind !== 'encounter') throw new Error(`expected encounter, got '${event.kind}'`);
    store.getState().startCombat(event.encounter);
    const report = store.getState().endCombat('victory');
    expect(report.outcome).toBe('victory');
}

/** All 25 fishing-village node ids. */
const ALL_FV_NODES: readonly string[] = Array.from({ length: 25 }, (_, i) => `fv-${i + 1}`);

/**
 * Authored kind per node (src/World/MapEvents/content.ts — the new-player
 * fishing-village override). Every pool has exactly one entry, so the roll
 * is deterministic; the seed pins it regardless.
 */
const EXPECTED_KIND: Readonly<Record<string, MapEventKind>> = {
    'fv-1': 'encounter',  'fv-2': 'loot-cache', 'fv-3': 'rest',       'fv-4': 'village',
    'fv-5': 'gathering',  'fv-6': 'encounter',  'fv-7': 'encounter',  'fv-8': 'gathering',
    'fv-9': 'rest',       'fv-10': 'hazard',    'fv-11': 'loot-cache','fv-12': 'encounter',
    'fv-13': 'gathering', 'fv-14': 'narration', 'fv-15': 'quest',     'fv-16': 'encounter',
    'fv-17': 'loot-cache','fv-18': 'hazard',    'fv-19': 'interaction','fv-20': 'rest',
    'fv-21': 'encounter', 'fv-22': 'gathering', 'fv-23': 'hazard',    'fv-24': 'encounter',
    'fv-25': 'rest',
};

/**
 * A legal directed walk over ALL 25 nodes, starting on fv-1 (resolved before
 * the walk begins). Adjacency is the AUTHORED `connectedNodes` lists in
 * src/World/Continents/Coastal-Village/maps.ts:346-379 — note the spine
 * (fv-1..fv-10) is one-way west→east while the sub-areas carry back-links,
 * so dead-ends (fv-15, fv-20, fv-25) are exited by re-crossing already
 * consumed (but never `completed`) nodes; `revisit: true` marks those legs
 * and expects the one-shot `{ kind: 'none' }` re-resolution.
 *
 *   harbor loop:  fv-1 → fv-2 → fv-12 → fv-11 → fv-14 → fv-15 ⤺ fv-13 → fv-3
 *   inland loop:  fv-3 → fv-16 → fv-17 → fv-19 → fv-20 ⤺ fv-18 ⤺ fv-4
 *   spine climax: fv-4 → fv-5 → fv-6 (boss) → fv-7
 *   cliff loop:   fv-7 → fv-21 → fv-24 → fv-25 ⤺ fv-23 → fv-22 → fv-8
 *   tail:         fv-8 → fv-9 → fv-10 (terminal — no exits)
 */
const FULL_WALK: ReadonlyArray<{ node: string; revisit?: true }> = [
    // ── Harbor district ──────────────────────────────────────────────
    { node: 'fv-2' },                   // loot-cache
    { node: 'fv-12' },                  // encounter
    { node: 'fv-11' },                  // loot-cache
    { node: 'fv-14' },                  // narration
    { node: 'fv-15' },                  // quest board (dead-end)
    { node: 'fv-14', revisit: true },   // back out of the dead-end
    { node: 'fv-11', revisit: true },
    { node: 'fv-12', revisit: true },
    { node: 'fv-13' },                  // gathering
    { node: 'fv-3' },                   // rest (spine re-entry)
    // ── Inland streets ───────────────────────────────────────────────
    { node: 'fv-16' },                  // encounter
    { node: 'fv-17' },                  // loot-cache
    { node: 'fv-19' },                  // interaction (Weathered Fisher)
    { node: 'fv-20' },                  // rest (dead-end)
    { node: 'fv-19', revisit: true },   // back out of the dead-end
    { node: 'fv-18' },                  // hazard
    { node: 'fv-17', revisit: true },
    // ── Spine climax ─────────────────────────────────────────────────
    { node: 'fv-4' },                   // village (Wharfside Market + Old Marrow)
    { node: 'fv-5' },                   // gathering
    { node: 'fv-6' },                   // BOSS — the Coastal Tyrant
    { node: 'fv-7' },                   // encounter
    // ── Cliff path ───────────────────────────────────────────────────
    { node: 'fv-21' },                  // encounter
    { node: 'fv-24' },                  // encounter
    { node: 'fv-25' },                  // rest (dead-end)
    { node: 'fv-24', revisit: true },   // back out of the dead-end
    { node: 'fv-23' },                  // hazard
    { node: 'fv-22' },                  // gathering
    // ── Tail ─────────────────────────────────────────────────────────
    { node: 'fv-8' },                   // gathering
    { node: 'fv-9' },                   // rest
    { node: 'fv-10' },                  // hazard (terminal node)
];

describe('first-map completability — the whole first level through the store', () => {
    it('the whole first map is completable', () => {
        const store = freshStore('first-map-full-walk');
        expect(store.getState().world.currentMap.name).toBe('fishing-village');
        expect(store.getState().world.currentMap.currentNode).toBe('fv-1');
        expect(store.getState().world.currentContinent.lockedMaps).toContain('northern-forest');

        // Kind coverage ledger — every authored MapEventKind must be seen at
        // its authored node.
        const seen: Record<string, ResolvedEvent['kind']> = {};

        // The player STARTS on fv-1; resolve it before walking.
        const first = resolveHere(store);
        seen['fv-1'] = first.kind;
        winEncounter(store, first);

        for (const step of FULL_WALK) {
            const before = store.getState().player;
            store.getState().moveToNode(step.node);
            expect(store.getState().world.currentMap.currentNode).toBe(step.node);

            const event = resolveHere(store);
            if (step.revisit) {
                // One-shot contract: a consumed node never resolves again.
                expect(event.kind).toBe('none');
                continue;
            }
            seen[step.node] = event.kind;

            switch (event.kind) {
                case 'encounter': {
                    if (step.node === 'fv-6') {
                        // The region climax — pinned to L3 so a fresh player can win.
                        expect(event.isBoss).toBe(true);
                        expect(event.encounter.enemies[0].name).toBe('The Coastal Tyrant');
                        expect(event.encounter.enemies[0].level).toBe(3);
                        // The quest is active (accepted at fv-4) but not yet done.
                        expect(store.getState().quests.active.some(q => q.name === 'starting-quest')).toBe(true);
                        expect(store.getState().quests.completed).not.toContain('starting-quest');

                        winEncounter(store, event);

                        // killObjectives completed the quest through endCombat…
                        expect(store.getState().quests.completed).toContain('starting-quest');
                        // …and D4 boss progression completed the map + unlocked
                        // the next region (map:completed effects).
                        const continent = store.getState().world.currentContinent;
                        expect(continent.completedMaps).toContain('fishing-village');
                        expect(continent.availableMaps).toContain('northern-forest');
                        expect(continent.lockedMaps).not.toContain('northern-forest');
                    } else {
                        expect(event.isBoss).toBe(false);
                        winEncounter(store, event);
                    }
                    break;
                }
                case 'village': {
                    expect(step.node).toBe('fv-4');
                    expect(event.villageName).toBe('Wharfside Market');
                    expect(event.shop).toBeDefined();
                    // Talk to Old Marrow (map-def NPC) and accept the quest.
                    acceptOldMarrowQuest(store);
                    expect(store.getState().quests.active.some(q => q.name === 'starting-quest')).toBe(true);
                    break;
                }
                case 'loot-cache': {
                    // Baseline (non-deferred) mode grants the coins immediately.
                    expect(store.getState().player.currency).toBe(before.currency + event.currency);
                    break;
                }
                case 'gathering': {
                    expect(event.items.length).toBeGreaterThan(0);
                    for (const item of event.items) {
                        expect(store.getState().player.inventory.some(i => i.id === item.id)).toBe(true);
                    }
                    break;
                }
                case 'rest': {
                    expect(event.healFraction).toBe(1);
                    expect(store.getState().player.health).toBe(store.getState().player.maxHealth);
                    break;
                }
                case 'hazard': {
                    expect(event.damage).toBeGreaterThan(0);
                    expect(store.getState().player.health).toBe(before.health - event.damage);
                    expect(store.getState().player.health).toBeGreaterThan(0);
                    break;
                }
                case 'interaction': {
                    expect(step.node).toBe('fv-19');
                    // The Weathered Fisher is authored on the node, not the
                    // map's npcs list — no dialogue tree rides along.
                    expect(event.npcName).toBe('Weathered Fisher');
                    expect(event.dialogue).toBeUndefined();
                    break;
                }
                case 'narration': {
                    expect(step.node).toBe('fv-14');
                    expect(event.dialogue.rootId).toBe('line-1');
                    break;
                }
                case 'quest': {
                    expect(step.node).toBe('fv-15');
                    expect(event.boardId).toBe('build-the-boat');
                    break;
                }
                default:
                    throw new Error(`unexpected event kind '${event.kind}' at ${step.node}`);
            }
        }

        // Every node resolved to its authored kind.
        expect(seen).toEqual(EXPECTED_KIND);

        // All 25 nodes consumed + discovered on the map state.
        const map = store.getState().world.currentMap;
        expect([...map.consumedNodes].sort()).toEqual([...ALL_FV_NODES].sort());
        expect([...map.discoveredNodes].sort()).toEqual([...ALL_FV_NODES].sort());

        // And the road north is open: travelToMap switches the current map.
        store.getState().travelToMap('northern-forest');
        expect(store.getState().world.currentMap.name).toBe('northern-forest');
        expect(store.getState().world.currentMap.currentNode).toBe('nf-1');
    }, 30_000);

    it('mercy also completes the level — befriending the tyrant is a first-class ending', () => {
        const store = freshStore('first-map-mercy');

        // Straight legal spine walk to the boss: fv-1 → … → fv-6. Each node's
        // resolution unlocks the next spine node; no fights are needed on the
        // way (encounters resolve to a staged fight the player may decline).
        resolveHere(store); // fv-1
        for (const node of ['fv-2', 'fv-3', 'fv-4', 'fv-5'] as const) {
            store.getState().moveToNode(node);
            const event = resolveHere(store);
            expect(event.kind).toBe(EXPECTED_KIND[node]);
        }

        store.getState().moveToNode('fv-6');
        const boss = resolveHere(store);
        if (boss.kind !== 'encounter') throw new Error('expected the fv-6 boss encounter');
        expect(boss.isBoss).toBe(true);

        store.getState().startCombat(boss.encounter);
        const report = store.getState().endCombat('friendship');
        expect(report.outcome).toBe('friendship');

        const continent = store.getState().world.currentContinent;
        expect(continent.completedMaps).toContain('fishing-village');
        expect(continent.availableMaps).toContain('northern-forest');
        expect(continent.lockedMaps).not.toContain('northern-forest');

        store.getState().travelToMap('northern-forest');
        expect(store.getState().world.currentMap.name).toBe('northern-forest');
    });

    it('defeat does not — losing to the boss leaves northern-forest locked', () => {
        const store = freshStore('first-map-defeat');

        resolveHere(store); // fv-1
        for (const node of ['fv-2', 'fv-3', 'fv-4', 'fv-5'] as const) {
            store.getState().moveToNode(node);
            resolveHere(store);
        }
        store.getState().moveToNode('fv-6');
        const boss = resolveHere(store);
        if (boss.kind !== 'encounter') throw new Error('expected the fv-6 boss encounter');

        store.getState().startCombat(boss.encounter);
        const report = store.getState().endCombat('defeat');
        expect(report.outcome).toBe('defeat');

        const continent = store.getState().world.currentContinent;
        expect(continent.completedMaps).not.toContain('fishing-village');
        expect(continent.lockedMaps).toContain('northern-forest');
        expect(continent.availableMaps).not.toContain('northern-forest');
        expect(() => store.getState().travelToMap('northern-forest')).toThrow(IllegalTravelError);
    });

    it('deferred minigames leave the walk completable — nodes consume and unlock, player untouched', () => {
        const store = freshStore('first-map-defer');
        const playerSnapshot = JSON.parse(JSON.stringify(store.getState().player));

        // fv-1 (encounter — deferral doesn't apply; the fight is not taken).
        const first = resolveHere(store, { deferMinigames: true });
        expect(first.kind).toBe('encounter');

        // fv-2 loot-cache — deferred: config rides along, nothing granted.
        store.getState().moveToNode('fv-2');
        const loot = resolveHere(store, { deferMinigames: true });
        if (loot.kind !== 'loot-cache') throw new Error('expected loot-cache at fv-2');
        expect(loot.deferred).toBe(true);
        expect(loot.currency).toBe(8); // authored fv-2 cache — Reliquary seed
        expect(store.getState().player.currency).toBe(playerSnapshot.currency);

        // fv-3 rest — deferred: no heal applied, baseline fraction carried.
        store.getState().moveToNode('fv-3');
        const rest = resolveHere(store, { deferMinigames: true });
        if (rest.kind !== 'rest') throw new Error('expected rest at fv-3');
        expect(rest.deferred).toBe(true);
        expect(rest.healed).toBe(0);
        expect(rest.healFraction).toBe(1); // Night Watch baseline

        // fv-4 village — not a minigame kind; resolves normally under defer.
        store.getState().moveToNode('fv-4');
        const village = resolveHere(store, { deferMinigames: true });
        expect(village.kind).toBe('village');

        // fv-5 gathering — deferred: authored items carried, none granted.
        store.getState().moveToNode('fv-5');
        const gather = resolveHere(store, { deferMinigames: true });
        if (gather.kind !== 'gathering') throw new Error('expected gathering at fv-5');
        expect(gather.deferred).toBe(true);
        expect(gather.items.map(i => i.id)).toEqual(['driftwood']); // Gleaning seed
        expect(store.getState().player.inventory.some(i => i.id === 'driftwood')).toBe(false);

        // The player was never touched — the CLI applies real minigame
        // outcomes separately via minigame-outcomes.ts.
        expect(store.getState().player).toEqual(playerSnapshot);

        // The walk still consumes nodes and unlocks their adjacents.
        const map = store.getState().world.currentMap;
        expect(map.consumedNodes).toEqual(
            expect.arrayContaining(['fv-1', 'fv-2', 'fv-3', 'fv-4', 'fv-5']),
        );
        expect(map.availableNodes).toContain('fv-6');  // boss road open
        expect(map.availableNodes).toContain('fv-18'); // fv-5's inland adjacent
    });
});
