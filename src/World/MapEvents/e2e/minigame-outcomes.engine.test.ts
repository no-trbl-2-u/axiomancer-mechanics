/**
 * Hermetic e2e — minigame outcome appliers (2026-07).
 *
 * The counterpart of `resolveMapEvent`'s `deferMinigames` option: each
 * applier folds a claimed minigame outcome back onto the player. Covers
 * the honest mappings (vitae <-> health, shillings <-> currency, cleanse,
 * seeded loot-cache item refs), the documented gaps (sandbox tokens /
 * pieces / keepsakes stay unapplied), purity (inputs never mutated), and
 * clamping at the health/currency floors.
 */

import { describe, it, expect, afterEach, vi } from 'vitest';
import {
    applyHazardOutcome,
    applyGatheringOutcome,
    applyRestOutcome,
    applyLootCacheOutcome,
    applyQuestBoardOutcome,
    cacheItemRefsFromItems,
} from '../minigame-outcomes';
import { createCharacter } from '../../../Character';
import type { Character } from '../../../Character/types';
import type { Item } from '../../../Items/types';
import {
    HAZARD_CACHE_SHILLINGS,
    HAZARD_MAXHP_SCAR,
    HAZARD_MINHP_LOSS,
    HAZARD_VITAE_REWARD,
} from '../../Hazard';
import type { HazardOutcome } from '../../Hazard';
import type { GatherOutcome } from '../../Gathering';
import type { RestOutcome } from '../../Rest';
import { simulateLootCache } from '../../LootCache';
import type { LootCacheOutcome } from '../../LootCache';
import { simulateQuestBoard } from '../../QuestBoard';
import { mockSequentialRng, restoreOriginalRng } from '../../../test-utils/rng';

afterEach(() => {
    vi.restoreAllMocks();
    restoreOriginalRng();
});

function freshPlayer(overrides?: Partial<Character>): Character {
    mockSequentialRng(0.5);
    const player = createCharacter({
        name: 'Applier Subject',
        level: 1,
        baseStats: { heart: 5, body: 5, mind: 5 },
    });
    return { ...player, currency: 20, ...overrides };
}

function hazardOutcome(overrides?: Partial<HazardOutcome>): HazardOutcome {
    return {
        tier: 'complete',
        wins: 2,
        losses: 1,
        rewards: [],
        consequences: [],
        offerCards: [],
        canSkip: false,
        reserveBonus: 0,
        penaltyVitae: 0,
        vitaeCost: 0,
        vitaeRestore: 0,
        bountyShillings: 0,
        subquests: [],
        questShillings: 0,
        questVitae: 0,
        questTokens: 0,
        ...overrides,
    };
}

function gatherOutcome(overrides?: Partial<GatherOutcome>): GatherOutcome {
    return {
        tier: 'laden',
        kept: [],
        lost: [],
        familyTotals: [],
        sets: [],
        roundHarvest: false,
        shillings: 0,
        bittenVitae: 0,
        offeringVitae: 0,
        offeringShillings: 0,
        blessingVitae: 0,
        grace: 0,
        wrath: 0,
        scarred: false,
        boons: [],
        boonShillings: 0,
        boonVitae: 0,
        boonTokens: 0,
        ...overrides,
    };
}

describe('applyHazardOutcome', () => {
    it('settles the vitae/shilling ledger plus reward and consequence catalogue amounts', () => {
        const player = freshPlayer({ health: 50 });
        const outcome = hazardOutcome({
            penaltyVitae: 4,
            vitaeCost: 2,
            vitaeRestore: 3,
            reserveBonus: 1,
            questVitae: 2,
            bountyShillings: 4,
            questShillings: 9,
            rewards: ['cache', 'vitae'],
            consequences: ['minhp', 'maxhp'],
        });

        const next = applyHazardOutcome(player, outcome);

        // maxHealth scar applies first; health delta clamps to the new max.
        expect(next.maxHealth).toBe(player.maxHealth - HAZARD_MAXHP_SCAR);
        const expectedDelta = -4 - 2 + 3 + 1 + 2 + HAZARD_VITAE_REWARD - HAZARD_MINHP_LOSS;
        expect(next.health).toBe(50 + expectedDelta);
        expect(next.currency).toBe(20 + 4 + 9 + HAZARD_CACHE_SHILLINGS);
    });

    it('clamps health into [0, maxHealth] and currency at 0', () => {
        const bitten = applyHazardOutcome(
            freshPlayer({ health: 3, currency: 0 }),
            hazardOutcome({ penaltyVitae: 99 }),
        );
        expect(bitten.health).toBe(0);
        expect(bitten.currency).toBe(0);

        const player = freshPlayer();
        const healed = applyHazardOutcome(
            { ...player, health: player.maxHealth - 1 },
            hazardOutcome({ vitaeRestore: 50 }),
        );
        expect(healed.health).toBe(player.maxHealth);
    });

    it('leaves token/deck/curse consequences unapplied (documented gaps) and never mutates input', () => {
        const player = freshPlayer({ health: 40 });
        const before = JSON.parse(JSON.stringify(player));
        const next = applyHazardOutcome(
            player,
            hazardOutcome({ questTokens: 3, rewards: ['token'], consequences: ['tokens', 'deadcard', 'curse'] }),
        );
        // No Character field maps to tokens/deck/curse — everything is untouched.
        expect(next.health).toBe(40);
        expect(next.maxHealth).toBe(player.maxHealth);
        expect(next.currency).toBe(player.currency);
        expect(next.inventory).toEqual(player.inventory);
        expect(player).toEqual(before);
        expect(next).not.toBe(player);
    });
});

describe('applyGatheringOutcome', () => {
    it('settles vitae and shilling ledger fields', () => {
        const player = freshPlayer({ health: 50 });
        const next = applyGatheringOutcome(player, gatherOutcome({
            shillings: 7,
            boonShillings: 3,
            offeringShillings: 2,
            bittenVitae: 5,
            offeringVitae: 2,
            blessingVitae: 4,
            boonVitae: 1,
        }));
        expect(next.currency).toBe(20 + 7 + 3 - 2);
        expect(next.health).toBe(50 - 5 - 2 + 4 + 1);
    });

    it('does not invent items from kept sandbox pieces and never mutates input', () => {
        const player = freshPlayer();
        const before = JSON.parse(JSON.stringify(player));
        const next = applyGatheringOutcome(player, gatherOutcome({
            kept: [{ uid: 'p-1', plotId: 'mire-mint', family: 'bloom', richness: 3, name: 'Mire Mint' }],
            boonTokens: 2,
            scarred: true,
        }));
        expect(next.inventory).toEqual(player.inventory);
        expect(player).toEqual(before);
        expect(next).not.toBe(player);
    });

    it('floors health and currency at 0', () => {
        const next = applyGatheringOutcome(
            freshPlayer({ health: 2, currency: 1 }),
            gatherOutcome({ bittenVitae: 10, offeringShillings: 5 }),
        );
        expect(next.health).toBe(0);
        expect(next.currency).toBe(0);
    });
});

describe('applyRestOutcome', () => {
    const dawn = (overrides?: Partial<RestOutcome>): RestOutcome => ({
        tier: 'rested',
        healFraction: 0.5,
        cleansed: false,
        warmth: 3,
        comfort: 2,
        keepsakes: [],
        ...overrides,
    });

    it('heals round(maxHealth * healFraction), clamped at maxHealth', () => {
        const player = freshPlayer({ health: 10 });
        const next = applyRestOutcome(player, dawn({ healFraction: 0.5 }));
        expect(next.health).toBe(
            Math.min(player.maxHealth, 10 + Math.round(player.maxHealth * 0.5)),
        );

        const full = applyRestOutcome(freshPlayer(), dawn({ healFraction: 1.0 }));
        expect(full.health).toBe(full.maxHealth);
    });

    it('cleanses all lingering effects only when the outcome says so', () => {
        const effects = [{ effectId: 'poisoned', remainingDuration: 3, intensity: 1, appliedAt: 0, tier: 1 as const }];
        const player = freshPlayer({ effects });
        const before = JSON.parse(JSON.stringify(player));

        const kept = applyRestOutcome(player, dawn({ cleansed: false }));
        expect(kept.effects).toHaveLength(1);

        const cleansed = applyRestOutcome(player, dawn({ cleansed: true, keepsakes: ['a dream, held'] }));
        expect(cleansed.effects).toEqual([]);
        // Keepsake labels have no Items mapping — inventory untouched.
        expect(cleansed.inventory).toEqual(player.inventory);
        expect(player).toEqual(before);
    });
});

describe('applyLootCacheOutcome', () => {
    const realItems: Item[] = [
        { id: 'driftwood', name: 'Driftwood', description: 'Salt-bleached.', category: 'material', quantity: 1 } as Item,
        { id: 'whale-oil-lamp', name: 'Whale-Oil Lamp', description: 'Still burning.', category: 'material', quantity: 1 } as Item,
    ];

    const claimed = (overrides?: Partial<LootCacheOutcome>): LootCacheOutcome => ({
        tier: 'prudent',
        itemsKept: [],
        currencyKept: 0,
        keepsakes: [],
        bittenVitae: 0,
        layersOpened: 1,
        ...overrides,
    });

    it('maps kept refs back to the real source items via the cache-item-<i> uid convention', () => {
        const refs = cacheItemRefsFromItems(realItems);
        expect(refs).toEqual([
            { uid: 'cache-item-0', name: 'Driftwood' },
            { uid: 'cache-item-1', name: 'Whale-Oil Lamp' },
        ]);

        const player = freshPlayer();
        const next = applyLootCacheOutcome(
            player,
            claimed({ itemsKept: refs, currencyKept: 12, bittenVitae: 3 }),
            realItems,
        );
        expect(next.currency).toBe(20 + 12);
        expect(next.health).toBe(player.health - 3);
        expect(next.inventory).toHaveLength(player.inventory.length + 2);
        const names = next.inventory.map(i => i.name);
        expect(names).toContain('Driftwood');
        expect(names).toContain('Whale-Oil Lamp');
        // Cloned, not shared.
        expect(next.inventory.find(i => i.id === 'driftwood')).not.toBe(realItems[0]);
    });

    it('falls back to matching refs whose uid is a real item id, and skips unmappable refs', () => {
        const player = freshPlayer();
        const next = applyLootCacheOutcome(
            player,
            claimed({ itemsKept: [{ uid: 'driftwood', name: 'Driftwood' }, { uid: 'sim-i-1', name: 'Tarnished Compass' }] }),
            realItems,
        );
        expect(next.inventory.map(i => i.id)).toContain('driftwood');
        // 'sim-i-1' has no source item — an honest Item cannot be invented.
        expect(next.inventory.map(i => i.name)).not.toContain('Tarnished Compass');
    });

    it('applies currency and bite (never below 0) without sourceItems, and works on a real sim outcome', () => {
        const player = freshPlayer({ health: 2, currency: 0 });
        const before = JSON.parse(JSON.stringify(player));
        const bitten = applyLootCacheOutcome(player, claimed({ bittenVitae: 9, currencyKept: 5 }));
        expect(bitten.health).toBe(0);
        expect(bitten.currency).toBe(5);
        expect(bitten.inventory).toEqual(player.inventory);
        expect(player).toEqual(before);

        // Full loop: seed a real session from the real items and apply its claim.
        const refs = cacheItemRefsFromItems(realItems);
        const run = simulateLootCache(7, 'prudent', refs, 10);
        const base = freshPlayer();
        const next = applyLootCacheOutcome(base, run.outcome, realItems);
        expect(next.currency).toBe(20 + run.outcome.currencyKept);
        expect(next.inventory.length).toBe(base.inventory.length + run.outcome.itemsKept.length);
    });
});

describe('applyQuestBoardOutcome', () => {
    it('returns an untouched deep clone — the board is fully sandboxed', () => {
        const player = freshPlayer();
        const before = JSON.parse(JSON.stringify(player));
        const run = simulateQuestBoard(11, 'build-the-boat', 'safe');

        const next = applyQuestBoardOutcome(player, run.outcome);

        expect(next).toEqual(player);
        expect(next).not.toBe(player);
        expect(next.inventory).not.toBe(player.inventory);
        expect(player).toEqual(before);
    });
});
