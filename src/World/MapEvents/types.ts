/**
 * MapEvents (Spec 23) — type surface.
 *
 * Eight event kinds plus a weighted-pool authoring model. See
 * `specs/23-map-events.md` for the spec; see
 * `src/World/MapEvents/resolve-map-event.ts` for the dispatcher.
 */

import type { ActiveEffect } from '../../Effects/types';
import type { GameState } from '../../Game/types';
import type { Item } from '../../Items/types';
import type { NPC, DialogueTree } from '../../NPCs/types';
import type { EnemySlug } from '../../Enemy/enemy.library';
import type { Encounter, NodeId } from '../types';

/** The eight final MapEvent kinds. */
export type MapEventKind =
    | 'encounter'
    | 'interaction'
    | 'gathering'
    | 'rest'
    | 'village'
    | 'cutscene'
    | 'hazard'
    | 'loot-cache';

// ─── Per-kind authoring payloads ──────────────────────────────────────────────

export interface EncounterPayload {
    kind: 'encounter';
    /** Specific enemy slug; if omitted, the encounter generator picks. */
    enemySlug?: EnemySlug;
    /** Boss flag — affects scaling and downstream UI framing. */
    isBoss?: boolean;
    description?: string;
}

export interface InteractionPayload {
    kind: 'interaction';
    /** NPC name on the current map. */
    npcName: string;
    description?: string;
}

export interface GatheringPayload {
    kind: 'gathering';
    /** Items the player gathers. Cloned at resolution time. */
    items: readonly Item[];
    description?: string;
}

export interface RestPayload {
    kind: 'rest';
    /** Fraction of `player.maxHealth` to heal. Defaults to 1.0 (full rest). */
    healFraction?: number;
    description?: string;
}

export interface VillagePayload {
    kind: 'village';
    villageName: string;
    /** Shopkeepers / merchants present in the scene. */
    merchants?: readonly NPC[];
    description?: string;
}

export interface CutscenePayload {
    kind: 'cutscene';
    /** Ordered narration lines. */
    lines: readonly string[];
    description?: string;
}

export interface HazardPayload {
    kind: 'hazard';
    /** Effect IDs (from `src/Effects/`) applied to the player on arrival. */
    effectIds?: readonly string[];
    /** Flat damage applied to the player on arrival. */
    damage?: number;
    description?: string;
}

export interface LootCachePayload {
    kind: 'loot-cache';
    items?: readonly Item[];
    currency?: number;
    description?: string;
}

/** Discriminated union of all authoring payloads. */
export type MapEventPayload =
    | EncounterPayload
    | InteractionPayload
    | GatheringPayload
    | RestPayload
    | VillagePayload
    | CutscenePayload
    | HazardPayload
    | LootCachePayload;

// ─── Pools ────────────────────────────────────────────────────────────────────

export interface MapEventPoolEntry {
    /** Must match `payload.kind`. */
    kind: MapEventKind;
    /** Weight for weighted-random draw; must be positive. */
    weight: number;
    payload: MapEventPayload;
}

export interface MapEventPool {
    id: string;
    entries: readonly MapEventPoolEntry[];
}

// ─── Resolved events (the engine's output) ────────────────────────────────────

export type ResolvedEvent =
    | { kind: 'encounter';   encounter: Encounter; isBoss: boolean }
    | { kind: 'interaction'; npcName: string; dialogue?: DialogueTree }
    | { kind: 'gathering';   items: Item[] }
    | { kind: 'rest';        healed: number }
    | { kind: 'village';     villageName: string; merchants: NPC[] }
    | { kind: 'cutscene';    lines: readonly string[] }
    | { kind: 'hazard';      effects: ActiveEffect[]; damage: number }
    | { kind: 'loot-cache';  items: Item[]; currency: number }
    | { kind: 'none' };

export interface ResolveMapEventResult {
    state: GameState;
    event: ResolvedEvent;
}

// ─── Re-export NodeId for downstream consumers ────────────────────────────────
export type { NodeId };
