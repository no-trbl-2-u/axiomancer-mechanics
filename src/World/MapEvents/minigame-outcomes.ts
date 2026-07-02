/**
 * Minigame outcome appliers (2026-07) — the counterpart of
 * `resolveMapEvent`'s `deferMinigames` option.
 *
 * When a host defers a minigame-backed map event, it runs the REAL
 * minigame session (hazard crossing / Gleaning / Night Watch / Reliquary /
 * Boy's Almanac) and then folds the claimed outcome back onto the player
 * with one of these appliers. Each applier is pure: it deep-clones the
 * incoming `Character` and never mutates it.
 *
 * Honesty rule: an outcome field maps to a player delta ONLY where the
 * mapping is well-defined by the engine (vitae <-> health, shillings <->
 * currency, cleanse <-> effects, seeded item refs <-> the real items the
 * session was seeded from). Sandbox-only fields (paradox/fallacy tokens,
 * hazard deck growth, gathering pieces, keepsake labels, quest-board fish
 * and vigor) have NO honest `Character` mapping yet — each gap is
 * documented on the applier rather than papered over with invented items.
 */

import type { Character } from '../../Character/types';
import type { Item } from '../../Items/types';
import { clamp, deepClone } from '../../Utils';
import type { HazardOutcome } from '../Hazard';
import {
    HAZARD_CACHE_SHILLINGS,
    HAZARD_MAXHP_SCAR,
    HAZARD_MINHP_LOSS,
    HAZARD_RELIC_SHILLINGS,
    HAZARD_VITAE_REWARD,
} from '../Hazard';
import type { GatherOutcome } from '../Gathering';
import type { RestOutcome } from '../Rest';
import type { CacheItemRef, LootCacheOutcome } from '../LootCache';
import type { QuestBoardOutcome } from '../QuestBoard';

/** Clamps `health` into `[0, maxHealth]` after a delta. */
function settleHealth(player: Character, delta: number): number {
    return clamp(Math.round(player.health + delta), 0, player.maxHealth);
}

/**
 * Applies a claimed `HazardOutcome` to the player.
 *
 * Applied (well-defined mappings, all vitae/shilling ledger fields plus the
 * reward/consequence catalogue amounts from `HAZARD_TUNING.rewards`):
 *  - health: − `penaltyVitae` − `vitaeCost` + `vitaeRestore` + `reserveBonus`
 *    + `questVitae` + (`vitae` reward → `HAZARD_VITAE_REWARD`)
 *    − (`minhp` consequence → `HAZARD_MINHP_LOSS`), clamped to
 *    `[0, maxHealth]`;
 *  - maxHealth: − `HAZARD_MAXHP_SCAR` per `maxhp` consequence (floored at 1;
 *    the "until you next rest at an inn" recovery is a host concern — the
 *    scar is applied flat here and documented as permanent-until-healed);
 *  - currency: + `bountyShillings` + `questShillings`
 *    + (`cache` reward → `HAZARD_CACHE_SHILLINGS`)
 *    + (`relic` reward → `HAZARD_RELIC_SHILLINGS`), floored at 0.
 *
 * Documented gaps (no honest `Character` mapping — NOT applied):
 *  - `token` reward / `questTokens` / the `tokens` consequence: banked
 *    Paradox & Fallacy tokens live in combat state, not on `Character`;
 *  - `deadcard` consequence and `offerCards`/`rewards` card picks: hazard
 *    DECK growth is host-side persistence (`hazard.deck-flags.ts`), not a
 *    `Character` field;
 *  - `curse` consequence ("hostile Curse die next combat"): next-combat
 *    setup, not a `Character` field.
 */
export function applyHazardOutcome(player: Character, outcome: HazardOutcome): Character {
    const next = deepClone(player);

    const rewardVitae = outcome.rewards.includes('vitae') ? HAZARD_VITAE_REWARD : 0;
    const minhpLoss = outcome.consequences.includes('minhp') ? HAZARD_MINHP_LOSS : 0;
    const maxhpScars = outcome.consequences.filter(c => c === 'maxhp').length;

    next.maxHealth = Math.max(1, next.maxHealth - maxhpScars * HAZARD_MAXHP_SCAR);

    const healthDelta =
        -outcome.penaltyVitae
        - outcome.vitaeCost
        + outcome.vitaeRestore
        + outcome.reserveBonus
        + outcome.questVitae
        + rewardVitae
        - minhpLoss;
    next.health = settleHealth(next, healthDelta);

    const cacheShillings = outcome.rewards.includes('cache') ? HAZARD_CACHE_SHILLINGS : 0;
    const relicShillings = outcome.rewards.includes('relic') ? HAZARD_RELIC_SHILLINGS : 0;
    next.currency = Math.max(
        0,
        next.currency + outcome.bountyShillings + outcome.questShillings
            + cacheShillings + relicShillings,
    );

    return next;
}

/**
 * Applies a claimed `GatherOutcome` (the Gleaning) to the player.
 *
 * Applied (well-defined vitae/shilling ledger fields):
 *  - health: − `bittenVitae` − `offeringVitae` + `blessingVitae`
 *    + `boonVitae`, clamped to `[0, maxHealth]`;
 *  - currency: + `shillings` + `boonShillings` − `offeringShillings`,
 *    floored at 0.
 *
 * Documented gaps (NOT applied):
 *  - `kept` pieces: `GatherPiece` is a sandbox material (plotId/family/
 *    richness) with no counterpart in the Items library — inventing `Item`s
 *    from piece names would be dishonest. Until a material catalogue maps
 *    plot families to real items, kept pieces are already monetised through
 *    `shillings` and otherwise stay narrative.
 *  - `boonTokens`: banked combat tokens are not a `Character` field.
 *  - `scarred`: the morale shift has no `Character` field.
 */
export function applyGatheringOutcome(player: Character, outcome: GatherOutcome): Character {
    const next = deepClone(player);

    const healthDelta =
        -outcome.bittenVitae
        - outcome.offeringVitae
        + outcome.blessingVitae
        + outcome.boonVitae;
    next.health = settleHealth(next, healthDelta);

    next.currency = Math.max(
        0,
        next.currency + outcome.shillings + outcome.boonShillings - outcome.offeringShillings,
    );

    return next;
}

/**
 * Applies a claimed `RestOutcome` (the Night Watch) to the player.
 *
 * Applied:
 *  - health: + `round(maxHealth * outcome.healFraction)`, clamped at
 *    `maxHealth` (mirrors the flat map-event rest handler, which the
 *    minigame's `healFraction` replaces);
 *  - `cleansed`: clears ALL lingering `effects` — the outcome doc says
 *    "the host clears lingering effects" and out-of-combat effect state
 *    carries no buff/debuff partition to be more surgical with.
 *
 * Documented gap (NOT applied): `keepsakes` are flavour labels minted by
 * the night ("a dream, held", etc.) with no Items-library mapping.
 */
export function applyRestOutcome(player: Character, outcome: RestOutcome): Character {
    const next = deepClone(player);
    next.health = Math.min(
        next.maxHealth,
        next.health + Math.round(next.maxHealth * outcome.healFraction),
    );
    if (outcome.cleansed) {
        next.effects = [];
    }
    return next;
}

const CACHE_ITEM_UID_RE = /^cache-item-(\d+)$/;

/**
 * Builds the `CacheItemRef`s a Reliquary session is seeded with from real
 * items, using the `cache-item-<index>` uid convention that
 * `applyLootCacheOutcome` maps back to `sourceItems`.
 */
export function cacheItemRefsFromItems(items: readonly Item[]): CacheItemRef[] {
    return items.map((item, i) => ({ uid: `cache-item-${i}`, name: item.name }));
}

/**
 * Applies a claimed `LootCacheOutcome` (the Reliquary) to the player.
 *
 * Applied:
 *  - currency: + `currencyKept` (the lid purse and deeper-layer bonuses the
 *    session actually surfaced);
 *  - health: − `bittenVitae` (sprung traps), clamped at 0;
 *  - inventory: kept item refs mapped back to REAL items when `sourceItems`
 *    (the items the session was seeded from — see `cacheItemRefsFromItems`)
 *    is provided. A ref resolves by the `cache-item-<index>` uid convention,
 *    falling back to a `sourceItems` entry whose `id` equals the ref uid
 *    (for hosts that seed refs with real item ids). Matched items are
 *    deep-cloned into the inventory.
 *
 * Documented gaps (NOT applied):
 *  - kept refs with no `sourceItems` match (including calls without
 *    `sourceItems`): a `CacheItemRef` is `{ uid, name }` only — an honest
 *    `Item` cannot be reconstructed from it;
 *  - `keepsakes`: flavour labels with no Items-library mapping.
 */
export function applyLootCacheOutcome(
    player: Character,
    outcome: LootCacheOutcome,
    sourceItems?: readonly Item[],
): Character {
    const next = deepClone(player);

    next.currency = Math.max(0, next.currency + outcome.currencyKept);
    next.health = settleHealth(next, -outcome.bittenVitae);

    if (sourceItems && sourceItems.length > 0) {
        for (const ref of outcome.itemsKept) {
            const m = CACHE_ITEM_UID_RE.exec(ref.uid);
            const byIndex = m ? sourceItems[Number(m[1])] : undefined;
            const item = byIndex ?? sourceItems.find(it => it.id === ref.uid);
            if (item) next.inventory.push(deepClone(item));
        }
    }

    return next;
}

/**
 * Applies a claimed `QuestBoardOutcome` (the Boy's Almanac) to the player.
 *
 * The quest board is FULLY sandboxed: fish, vigor, parts, and vows are
 * board-local resources with no `Character` counterpart, and the tier /
 * vow ledger feeds quest progression and narrative at the host layer (the
 * `quest` map-event handler already mutates nothing). There is therefore
 * no honest player delta to apply — the function exists for surface
 * symmetry with the other appliers and returns an untouched deep clone.
 * If a future board mints real rewards (shillings, items), map them here.
 */
export function applyQuestBoardOutcome(player: Character, _outcome: QuestBoardOutcome): Character {
    return deepClone(player);
}
