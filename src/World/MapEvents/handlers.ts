/**
 * MapEvent handlers (Spec 23) — one function per kind.
 *
 * Each handler is pure: `(state, payload, rng) → { state, event }`.
 * Handlers do NOT mark nodes consumed or reveal adjacents — that's the
 * dispatcher's job in `resolve-map-event.ts`. Handlers only compute the
 * state delta produced by the event itself (HP heal, item grant, effect
 * application, etc.).
 *
 * Design note: the brief proposed one file per kind in a `handlers/`
 * subdir; collapsed to one file because each handler body is short and
 * the imports overlap heavily. If a handler grows past ~50 LOC, split
 * it into its own file at that point.
 */

import type { GameState } from '../../Game/types';
import type { Character } from '../../Character/types';
import type { Item } from '../../Items/types';
import { deepClone } from '../../Utils';
import { applyDamage } from '../../Combat/health';
import { applyEffect } from '../../Effects';
import { lookupEffect } from '../../Effects/effects.library';
import type { ActiveEffect } from '../../Effects/types';
import { generateEncounter, scaleEnemyToLevel } from '../encounter';
import { getMapDefinition } from '../map.registry';
import { ENEMY_REGISTRY, type EnemySlug } from '../../Enemy/enemy.library';
import type {
    EncounterPayload, InteractionPayload, GatheringPayload, RestPayload,
    VillagePayload, CutscenePayload, HazardPayload, LootCachePayload,
    ResolvedEvent, ResolveMapEventResult,
} from './types';

function withPlayer(state: GameState, next: Character): GameState {
    return { ...state, player: next };
}

// ─── encounter ────────────────────────────────────────────────────────────────

export function resolveEncounter(
    state: GameState,
    payload: EncounterPayload,
): ResolveMapEventResult {
    const map = state.world.currentMap;
    const def = getMapDefinition(map.continent, map.name);
    const node = def.nodes.find(n => n.id === map.currentNode)!;
    const isBoss = payload.isBoss === true;

    if (payload.enemySlug) {
        const source = ENEMY_REGISTRY[payload.enemySlug as EnemySlug];
        if (!source) {
            throw new Error(`MapEvents: unknown enemySlug '${payload.enemySlug}'.`);
        }
        const scaled = scaleEnemyToLevel(source, Math.max(source.level, state.player.level));
        const encounter = { enemies: [scaled], origin: `${def.name}:${node.id}` };
        return { state, event: { kind: 'encounter', encounter, isBoss } };
    }

    const encounter = generateEncounter(node, state.player.level, {
        mapName: def.name,
        difficulty: isBoss ? 'boss' : undefined,
    });
    return { state, event: { kind: 'encounter', encounter, isBoss } };
}

// ─── interaction ──────────────────────────────────────────────────────────────

export function resolveInteraction(
    state: GameState,
    payload: InteractionPayload,
): ResolveMapEventResult {
    const map = state.world.currentMap;
    const def = getMapDefinition(map.continent, map.name);
    const npc = def.npcs?.find(n => n.name === payload.npcName);
    return {
        state,
        event: {
            kind: 'interaction',
            npcName: npc?.name ?? payload.npcName,
            dialogue: npc?.dialogueTree,
        },
    };
}

// ─── gathering ────────────────────────────────────────────────────────────────

export function resolveGathering(
    state: GameState,
    payload: GatheringPayload,
): ResolveMapEventResult {
    const items = payload.items.map(deepClone) as Item[];
    const player: Character = {
        ...state.player,
        inventory: [...state.player.inventory, ...items],
    };
    return {
        state: withPlayer(state, player),
        event: { kind: 'gathering', items },
    };
}

// ─── rest ─────────────────────────────────────────────────────────────────────

export function resolveRest(
    state: GameState,
    payload: RestPayload,
): ResolveMapEventResult {
    const fraction = payload.healFraction ?? 1.0;
    const before = state.player.health;
    const newHp = Math.min(
        state.player.maxHealth,
        before + Math.round(state.player.maxHealth * fraction),
    );
    const healed = newHp - before;
    const player: Character = { ...state.player, health: newHp };
    return {
        state: withPlayer(state, player),
        event: { kind: 'rest', healed },
    };
}

// ─── village ──────────────────────────────────────────────────────────────────

export function resolveVillage(
    state: GameState,
    payload: VillagePayload,
): ResolveMapEventResult {
    const merchants = (payload.merchants ?? []).map(m => ({ ...m }));
    return {
        state,
        event: {
            kind: 'village',
            villageName: payload.villageName,
            merchants,
        },
    };
}

// ─── cutscene ─────────────────────────────────────────────────────────────────

export function resolveCutscene(
    state: GameState,
    payload: CutscenePayload,
): ResolveMapEventResult {
    return {
        state,
        event: { kind: 'cutscene', lines: payload.lines },
    };
}

// ─── hazard ───────────────────────────────────────────────────────────────────

export function resolveHazard(
    state: GameState,
    payload: HazardPayload,
    _rng: () => number,
): ResolveMapEventResult {
    const round = 0; // node-event hazards apply outside combat; round 0 is fine.
    const applied: ActiveEffect[] = [];
    let effects = state.player.effects;
    for (const id of payload.effectIds ?? []) {
        const def = lookupEffect(id);
        if (!def) continue;
        const res = applyEffect(effects, def, round);
        effects = res.activeEffects;
        const a = effects.find(e => e.effectId === id);
        if (a) applied.push(a);
    }

    let player: Character = { ...state.player, effects };
    const damage = payload.damage ?? 0;
    if (damage > 0) {
        player = applyDamage(player, damage);
    }

    return {
        state: withPlayer(state, player),
        event: { kind: 'hazard', effects: applied, damage },
    };
}

// ─── loot-cache ───────────────────────────────────────────────────────────────

export function resolveLootCache(
    state: GameState,
    payload: LootCachePayload,
): ResolveMapEventResult {
    const items = (payload.items ?? []).map(deepClone) as Item[];
    const currency = payload.currency ?? 0;
    const player: Character = {
        ...state.player,
        inventory: [...state.player.inventory, ...items],
        currency: state.player.currency + currency,
    };
    return {
        state: withPlayer(state, player),
        event: { kind: 'loot-cache', items, currency },
    };
}

// ─── dispatch table ───────────────────────────────────────────────────────────

import type { MapEventPayload } from './types';

export function applyPayload(
    state: GameState,
    payload: MapEventPayload,
    rng: () => number,
): ResolveMapEventResult {
    switch (payload.kind) {
        case 'encounter':   return resolveEncounter(state, payload);
        case 'interaction': return resolveInteraction(state, payload);
        case 'gathering':   return resolveGathering(state, payload);
        case 'rest':        return resolveRest(state, payload);
        case 'village':     return resolveVillage(state, payload);
        case 'cutscene':    return resolveCutscene(state, payload);
        case 'hazard':      return resolveHazard(state, payload, rng);
        case 'loot-cache':  return resolveLootCache(state, payload);
    }
}
