/**
 * MapEvents (Spec 23) — type surface.
 *
 * Nine event kinds ('quest' joined the original eight in Phase 137)
 * plus a weighted-pool authoring model. See `specs/23-map-events.md`
 * for the original spec; see
 * `src/World/MapEvents/resolve-map-event.ts` for the dispatcher.
 */

import type { ActiveEffect } from '../../Effects/types';
import type { GameState } from '../../Game/types';
import type { Item } from '../../Items/types';
import type { ShopInventory } from '../../Items/shop.types';
import type { NPC, DialogueTree } from '../../NPCs/types';
import type { EnemySlug } from '../../Enemy/enemy.library';
import type { Encounter, NodeId } from '../types';
import type { PhilosophicalAlignment } from '../../Philosophy/types';

/**
 * The MapEvent kinds. 'quest' joined the original eight in Phase 137;
 * 'narration' (a dialogue-backed monologue shell) joined them in 2026-06.
 */
export type MapEventKind =
    | 'encounter'
    | 'interaction'
    | 'gathering'
    | 'rest'
    | 'village'
    | 'cutscene'
    | 'hazard'
    | 'loot-cache'
    | 'quest'
    | 'narration';

// ─── Per-kind authoring payloads ──────────────────────────────────────────────

export interface EncounterPayload {
    kind: 'encounter';
    /** Specific enemy slug; if omitted, the encounter generator picks. */
    enemySlug?: EnemySlug;
    /** Boss flag — affects scaling and downstream UI framing. */
    isBoss?: boolean;
    /**
     * Absolute level to scale the enemy to, overriding the default
     * `max(enemy.level, player.level)` scaling. Lets an authored encounter
     * pin a fixed difficulty — e.g. a starting-region boss that must stay
     * beatable by a fresh player even though the shared enemy is endgame-tier.
     */
    level?: number;
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
    /**
     * Transactional shop attached to this village (Phase 37). Authoring
     * is optional — a village can carry merchants for dialogue without
     * a shop, or a shop without named merchants.
     */
    shop?: ShopInventory;
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

export interface QuestEventPayload {
    kind: 'quest';
    /** Quest-board id from `World/QuestBoard` (e.g. 'build-the-boat'). */
    boardId: string;
    description?: string;
}

export interface NarrationPayload {
    kind: 'narration';
    /**
     * Dialogue tree the narration plays through (`src/NPCs/types.ts`). A
     * narration is authored as a monologue — leaf `DialogueNode`s with no
     * `choices` — so it reuses the existing dialogue runtime without
     * branching. Unlike `interaction`, the tree is authored inline on the
     * node rather than looked up from a map NPC.
     */
    dialogue: DialogueTree;
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
    | LootCachePayload
    | QuestEventPayload
    | NarrationPayload;

// ─── Pools ────────────────────────────────────────────────────────────────────

export interface MapEventPoolEntry {
    /** Must match `payload.kind`. */
    kind: MapEventKind;
    /** Weight for weighted-random draw; must be positive. */
    weight: number;
    payload: MapEventPayload;
    /**
     * Per-axis shift on the Phase 42 philosophical alignment cube, applied
     * by `resolveMapEvent` after the matching handler runs. Each axis clamps
     * to [-100, +100]. Missing axes in the partial pass through unchanged.
     * Authoring band: ±1..±5; defining ±10 choices reserved for endgame.
     */
    alignmentDelta?: Partial<PhilosophicalAlignment>;
}

export interface MapEventPool {
    id: string;
    entries: readonly MapEventPoolEntry[];
}

// ─── Resolved events (the engine's output) ────────────────────────────────────

/**
 * Deferred minigame kinds (2026-07): when `resolveMapEvent` runs with
 * `deferMinigames: true`, the `gathering` / `rest` / `hazard` / `loot-cache`
 * handlers do NOT touch `state.player`. The resolved event instead carries
 * `deferred: true` plus the authored payload config the host needs to run the
 * REAL minigame (Gleaning / Night Watch / hazard crossing / Reliquary) and
 * apply its outcome itself (see `minigame-outcomes.ts`). Absent/false
 * `deferred` means the flat baseline was already applied (bit-identical to the
 * pre-option behaviour).
 *
 *  - `gathering`: `items` are the authored payload items (cloned, NOT added
 *    to the inventory when deferred).
 *  - `rest`: `healed` is 0 when deferred; `healFraction` is the authored
 *    baseline the Night Watch session scales.
 *  - `hazard`: `effects` is empty and no damage was applied when deferred;
 *    `effectIds` echoes the authored effect config, `damage` the authored
 *    flat damage.
 *  - `loot-cache`: `items`/`currency` are the authored payload (cloned, NOT
 *    granted when deferred) — the Reliquary session is seeded from them.
 */
export type ResolvedEvent =
    | { kind: 'encounter';   encounter: Encounter; isBoss: boolean }
    | { kind: 'interaction'; npcName: string; dialogue?: DialogueTree }
    | { kind: 'gathering';   items: Item[]; deferred?: boolean }
    | { kind: 'rest';        healed: number; healFraction: number; deferred?: boolean }
    | { kind: 'village';     villageName: string; merchants: NPC[]; shop?: ShopInventory }
    | { kind: 'cutscene';    lines: readonly string[] }
    | { kind: 'hazard';      effects: ActiveEffect[]; damage: number; deferred?: boolean; effectIds?: readonly string[] }
    | { kind: 'loot-cache';  items: Item[]; currency: number; deferred?: boolean }
    | { kind: 'quest';       boardId: string }
    | { kind: 'narration';   dialogue: DialogueTree }
    | { kind: 'none' };

/**
 * Options bag for `resolveMapEvent` (2026-07). Passing a bare rng function as
 * the second argument remains supported for back-compat.
 */
export interface ResolveMapEventOptions {
    /** Injected RNG (defaults to the engine's `getRng().random`). */
    rng?: () => number;
    /**
     * When true, the minigame-backed kinds (`hazard` / `gathering` / `rest` /
     * `loot-cache`) leave `state.player` untouched and mark their resolved
     * event `deferred: true` so the host can run the real minigame and apply
     * its outcome. Default false — bit-identical to the historical behaviour.
     */
    deferMinigames?: boolean;
}

export interface ResolveMapEventResult {
    state: GameState;
    event: ResolvedEvent;
}

// ─── Re-export NodeId for downstream consumers ────────────────────────────────
export type { NodeId };
