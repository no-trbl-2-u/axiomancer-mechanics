/**
 * `resolveMapEvent` — the Spec 23 dispatcher.
 *
 * Walks the contract:
 *   1. Look up the active node on the current map.
 *   2. If the node is already in `consumedNodes`, return
 *      `{ kind: 'none' }` immediately (one-shot enforcement).
 *   3. Roll one entry from the node's event pool. Pool resolution
 *      prefers `MapDefinition.nodeEventPools[nodeId]` over
 *      `MapDefinition.defaultEventPool`. Missing pool → `{ kind: 'none' }`.
 *   4. Hand the rolled payload off to the matching handler from
 *      `handlers.ts`.
 *   5. Add the node to `consumedNodes` and reveal its adjacents.
 *   6. Return the handler's `{ state, event }` with the discovery /
 *      consumption updates folded in.
 *
 * Pure when `rng` is deterministic.
 */

import type { GameState } from '../../Game/types';
import { revealAdjacent, markNodeConsumed, unlockAdjacent } from '../world.reducer';
import { getRng } from '../../Utils/rng';
import { applyPayload } from './handlers';
import { reachableObjectives, progressQuest } from '../quest.engine';
import type { QuestLog, NodeId } from '../types';
import type {
    MapEventPool, MapEventPoolEntry, ResolveMapEventResult, ResolvedEvent,
} from './types';

/**
 * Advances any active `reach`-type quest objectives that target `nodeId`.
 * Restores the auto-advance behaviour the deleted `process-node.ts` provided
 * before Phase 25. Pure — re-entering a node whose reach objective already
 * completed is a silent no-op via `reachableObjectives`' `currentCount <
 * requiredCount` filter.
 */
function advanceReachObjectives(quests: QuestLog, nodeId: NodeId): QuestLog {
    const reaches = reachableObjectives(quests, nodeId);
    let log = quests;
    for (const r of reaches) {
        log = progressQuest(log, r.questName, r.objectiveId).log;
    }
    return log;
}

/**
 * Map-level extension surface for Phase 23. We attach pools via a side
 * registry rather than mutating `MapDefinition` directly — that keeps
 * the existing Spec 08 surface unchanged for the duration of Phase 23.
 * Phase 24 will fold pools onto `MapDefinition` proper and migrate
 * content.
 */
const poolRegistry = new Map<string, MapEventPool>();
const defaultPoolByMap = new Map<string, string>();
const nodePoolOverrides = new Map<string, string>();

function poolKey(continent: string, mapName: string, nodeId?: string): string {
    return nodeId ? `${continent}:${mapName}:${nodeId}` : `${continent}:${mapName}`;
}

export function registerMapEventPool(pool: MapEventPool): void {
    poolRegistry.set(pool.id, pool);
}

export function setDefaultMapEventPool(
    continent: string,
    mapName: string,
    poolId: string,
): void {
    defaultPoolByMap.set(poolKey(continent, mapName), poolId);
}

export function setNodeEventPoolOverride(
    continent: string,
    mapName: string,
    nodeId: string,
    poolId: string,
): void {
    nodePoolOverrides.set(poolKey(continent, mapName, nodeId), poolId);
}

/** Test-only: clear every pool registration. Used by hermetic tests. */
export function _clearMapEventPoolRegistry(): void {
    poolRegistry.clear();
    defaultPoolByMap.clear();
    nodePoolOverrides.clear();
}

function lookupPool(
    continent: string,
    mapName: string,
    nodeId: string,
): MapEventPool | undefined {
    const overrideId = nodePoolOverrides.get(poolKey(continent, mapName, nodeId));
    const poolId = overrideId ?? defaultPoolByMap.get(poolKey(continent, mapName));
    return poolId ? poolRegistry.get(poolId) : undefined;
}

function rollPool(
    pool: MapEventPool,
    rng: () => number,
): MapEventPoolEntry | undefined {
    if (pool.entries.length === 0) return undefined;
    const total = pool.entries.reduce((s, e) => s + e.weight, 0);
    if (total <= 0) return undefined;
    let roll = rng() * total;
    for (const entry of pool.entries) {
        roll -= entry.weight;
        if (roll <= 0) return entry;
    }
    return pool.entries[pool.entries.length - 1];
}

/**
 * Resolves the MapEvent for the player's current node. See file header.
 */
export function resolveMapEvent(
    state: GameState,
    rng: () => number = () => getRng().random(),
): ResolveMapEventResult {
    const map = state.world.currentMap;
    const nodeId = map.currentNode;

    // 1. Already consumed? Idempotent no-op.
    if (map.consumedNodes.includes(nodeId)) {
        const none: ResolvedEvent = { kind: 'none' };
        return { state, event: none };
    }

    // Restore the pre-Phase-25 reach-objective auto-advance — any active
    // `reach: target=nodeId` quest objective ticks on arrival, before the
    // pool roll. Pure no-op for non-reach quests or fully-completed reaches.
    const questsAfterReach = advanceReachObjectives(state.quests, nodeId);
    const stateAfterReach: GameState = questsAfterReach === state.quests
        ? state
        : { ...state, quests: questsAfterReach };

    // 2. Find the active pool.
    const pool = lookupPool(map.continent, map.name, nodeId);
    if (!pool) {
        // No pool registered — reveal + unlock adjacents + consume to advance
        // discovery and traversal, but produce no event.
        const next = unlockAdjacent(revealAdjacent(map, nodeId), nodeId);
        const consumed = markNodeConsumed(next, nodeId);
        return {
            state: { ...stateAfterReach, world: { ...stateAfterReach.world, currentMap: consumed } },
            event: { kind: 'none' },
        };
    }

    // 3. Roll an entry.
    const entry = rollPool(pool, rng);
    if (!entry) {
        const next = unlockAdjacent(revealAdjacent(map, nodeId), nodeId);
        const consumed = markNodeConsumed(next, nodeId);
        return {
            state: { ...stateAfterReach, world: { ...stateAfterReach.world, currentMap: consumed } },
            event: { kind: 'none' },
        };
    }

    // 4. Apply the matching handler.
    const result = applyPayload(stateAfterReach, entry.payload, rng);

    // 5. Reveal + unlock adjacents + mark consumed. Phase 31 — unlock is what
    // moves the adjacents out of `lockedNodes` into `availableNodes` so the
    // CLI `mapTab` filter actually offers them as valid moves. The reveal
    // path (Spec 23) only updates `discoveredNodes`.
    const next = unlockAdjacent(
        revealAdjacent(result.state.world.currentMap, nodeId),
        nodeId,
    );
    const consumed = markNodeConsumed(next, nodeId);
    const nextState: GameState = {
        ...result.state,
        world: { ...result.state.world, currentMap: consumed },
    };

    return { state: nextState, event: result.event };
}
