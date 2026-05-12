/**
 * Hermetic E2E Tests — Equipment & Consumable Library × Resource Interaction (Spec 05b)
 *
 * Verifies the new library content end-to-end through the highest-level
 * combat entry points (`initializeCombat`, `resolveCombatRound`) and the
 * generation-bonus engine helper (`generateBasicActionResources`).
 *
 * Hermetic standard (per `docs/testing.md` / `AGENTS.md`):
 *   1. Self-contained — no disk I/O, no network, no TTY.
 *   2. Deterministic  — `Math.random` stubbed via helpers in
 *                       `src/test-utils/rng.ts`.
 *   3. Isolated       — `vi.restoreAllMocks` in `afterEach` keeps tests
 *                       independent.
 *
 * Coverage matrix (Spec 05b acceptance):
 *   • Library inventory (sizes, slots, tiers, resource-interaction counts).
 *   • Scenario 1 — combat-start seeding from a single accessory
 *     (`berserker-band` → body 3).
 *   • Scenario 1b — swapping accessory swings the seed (`scholar-lens`
 *     → mind 3, no leftover body).
 *   • Scenario 2 — generation bonus from `paradox-shard` adds +1 mind on hit
 *     on top of the base table.
 *   • Scenario 3 — multi-item additive stacking
 *     (`berserker-axe` + `berserker-band` → body 5).
 *   • Scenario 4 — consumable `resourceGrant` lands in-combat
 *     (`body-elixir` adds +3 body to live `combatResources`).
 *
 * Reference test structure: `src/Combat/e2e/combat.resolver.test.ts`.
 */

import { afterEach, describe, it, expect, vi } from 'vitest';

import { createCharacter } from '../../Character/index';
import { initializeCombat } from '../../Combat/combat.reducer';
import { resolveCombatRound } from '../../Combat/combat.resolver';
import { Disatree_01 } from '../../Enemy/enemy.library';
import { generateBasicActionResources } from '../../Skills/skill.engine';
import { mockAlternatingRng } from '../../test-utils/rng';

import {
    consumableLibrary,
    equipmentLibrary,
    getConsumableById,
    getEquipmentById,
    getEquipmentBySlot,
    getEquipmentByTier,
} from '../index';
import { Consumable } from '../types';

// ─── Library Inventory ───────────────────────────────────────────────────────

afterEach(() => {
    vi.restoreAllMocks();
});

describe('equipment.library: inventory', () => {
    it('exports exactly 50 equipment pieces', () => {
        expect(equipmentLibrary).toHaveLength(50);
    });

    it('every Spec 05b slot is represented with the right count', () => {
        expect(getEquipmentBySlot('weapon')).toHaveLength(8);
        expect(getEquipmentBySlot('armor')).toHaveLength(7);
        expect(getEquipmentBySlot('accessory')).toHaveLength(8);
        expect(getEquipmentBySlot('head')).toHaveLength(7);
        expect(getEquipmentBySlot('body')).toHaveLength(7);
        expect(getEquipmentBySlot('hands')).toHaveLength(7);
        expect(getEquipmentBySlot('feet')).toHaveLength(6);
    });

    it('covers every tier (1 / 2 / 3)', () => {
        expect(getEquipmentByTier(1).length).toBeGreaterThan(0);
        expect(getEquipmentByTier(2).length).toBeGreaterThan(0);
        expect(getEquipmentByTier(3).length).toBeGreaterThan(0);
        expect(
            getEquipmentByTier(1).length
          + getEquipmentByTier(2).length
          + getEquipmentByTier(3).length,
        ).toBe(50);
    });

    it('at least 15 items carry a populated resourceInteraction payload', () => {
        const withRI = equipmentLibrary.filter(item => {
            const ri = item.resourceInteraction;
            if (!ri) return false;
            const hasStart = ri.combatStartTokens && Object.keys(ri.combatStartTokens).length > 0;
            const hasGen   = ri.generationBonus   && ri.generationBonus.length > 0;
            return Boolean(hasStart || hasGen);
        });
        expect(withRI.length).toBeGreaterThanOrEqual(15);
    });

    it('tier-1 items have no resourceInteraction (clean baseline per Q4 design choice)', () => {
        // Q4 itself is orthogonal — the engine does not enforce this, but the
        // library curation does, per the "Tier 1 items (16 total): no
        // resourceInteraction" line in the spec.
        for (const item of getEquipmentByTier(1)) {
            expect(item.resourceInteraction).toBeUndefined();
        }
    });

    it('no equipment combatStartTokens grants fallacy or paradox tokens (Q3 option B)', () => {
        for (const item of equipmentLibrary) {
            const cs = item.resourceInteraction?.combatStartTokens;
            if (!cs) continue;
            expect(cs.fallacy ?? 0).toBe(0);
            expect(cs.paradox ?? 0).toBe(0);
        }
    });

    it('getEquipmentById returns each declared item and undefined for unknown ids', () => {
        for (const item of equipmentLibrary) {
            expect(getEquipmentById(item.id)).toBe(item);
        }
        expect(getEquipmentById('does-not-exist')).toBeUndefined();
    });
});

describe('consumable.library: inventory', () => {
    it('exports exactly 12 consumables', () => {
        expect(consumableLibrary).toHaveLength(12);
    });

    it('at least 3 consumables carry a populated resourceGrant payload', () => {
        const withGrant = consumableLibrary.filter(c =>
            c.resourceGrant && Object.keys(c.resourceGrant).length > 0,
        );
        expect(withGrant.length).toBeGreaterThanOrEqual(3);
    });

    it('no consumable resourceGrant includes fallacy or paradox (Q3 design intent)', () => {
        for (const c of consumableLibrary) {
            const grant = c.resourceGrant;
            if (!grant) continue;
            expect(grant.fallacy ?? 0).toBe(0);
            expect(grant.paradox ?? 0).toBe(0);
        }
    });

    it('getConsumableById returns each declared consumable', () => {
        for (const c of consumableLibrary) {
            expect(getConsumableById(c.id)).toBe(c);
        }
        expect(getConsumableById('does-not-exist')).toBeUndefined();
    });
});

// ─── Scenario 1 — combat-start seeding from a single accessory ──────────────

describe('Scenario 1 — combat-start token seeding', () => {
    it('berserker-band → combatResources.body === 3, every other counter is 0', () => {
        const band = getEquipmentById('berserker-band');
        expect(band).toBeDefined();
        const player = createCharacter({
            name: 'Berserker',
            level: 1,
            baseStats: { heart: 4, body: 3, mind: 2 },
            equipment: { accessory: band! },
        });
        const state = initializeCombat(player, Disatree_01);
        expect(state.combatResources).toEqual({
            heart: 0, body: 3, mind: 0, fallacy: 0, paradox: 0,
        });
    });

    it('swapping accessory swings the seed — scholar-lens → mind === 3, body stays 0', () => {
        const lens = getEquipmentById('scholar-lens');
        expect(lens).toBeDefined();
        const player = createCharacter({
            name: 'Scholar',
            level: 1,
            baseStats: { heart: 4, body: 3, mind: 2 },
            equipment: { accessory: lens! },
        });
        const state = initializeCombat(player, Disatree_01);
        expect(state.combatResources).toEqual({
            heart: 0, body: 0, mind: 3, fallacy: 0, paradox: 0,
        });
    });
});

// ─── Scenario 2 — generation bonus stacks on top of the base table ──────────

describe('Scenario 2 — generation bonus stacks on the base table', () => {
    it('paradox-shard adds +1 mind on a mind-hit basic action', () => {
        const shard = getEquipmentById('paradox-shard');
        expect(shard).toBeDefined();
        const player = createCharacter({
            name: 'Shardbearer',
            level: 1,
            baseStats: { heart: 4, body: 3, mind: 2 },
            equipment: { weapon: shard! },
        });
        // Seed from `combatStartTokens: { mind: 2 }` on the same item.
        const state = initializeCombat(player, Disatree_01);
        expect(state.combatResources.mind).toBe(2);

        // Base mind-hit table value is +3 mind (see Spec 04). The +1 mind on
        // hit bonus from paradox-shard takes it to +4. Folded onto the seed:
        //   seed 2  +  +4 = 6.
        const generated = generateBasicActionResources(
            state.combatResources, 'mind', 'hit', player.equipment,
        );
        expect(generated.mind).toBe(state.combatResources.mind + 4);
    });
});

// ─── Scenario 3 — additive multi-item stacking (Q2) ─────────────────────────

describe('Scenario 3 — multi-item combatStartTokens stack additively', () => {
    it('berserker-axe (cs body+2) + berserker-band (cs body+3) → body 5', () => {
        const axe  = getEquipmentById('berserker-axe');
        const band = getEquipmentById('berserker-band');
        expect(axe).toBeDefined();
        expect(band).toBeDefined();
        const player = createCharacter({
            name: 'Berserker Pair',
            level: 1,
            baseStats: { heart: 4, body: 3, mind: 2 },
            equipment: { weapon: axe!, accessory: band! },
        });
        const state = initializeCombat(player, Disatree_01);
        expect(state.combatResources.body).toBe(5);
        // Other counters untouched — no other item contributes.
        expect(state.combatResources.mind).toBe(0);
        expect(state.combatResources.heart).toBe(0);
        expect(state.combatResources.fallacy).toBe(0);
        expect(state.combatResources.paradox).toBe(0);
    });
});

// ─── Scenario 4 — consumable resourceGrant in-combat (Q6 option A) ──────────

describe('Scenario 4 — consumable resourceGrant lands in-combat', () => {
    it('body-elixir adds +3 body to live combatResources when used', () => {
        mockAlternatingRng();
        const elixir = getConsumableById('body-elixir');
        expect(elixir).toBeDefined();
        const player = createCharacter({
            name: 'Elixir Drinker',
            level: 1,
            baseStats: { heart: 4, body: 3, mind: 2 },
            inventory: [{ ...elixir! }],
        });
        const state = initializeCombat(player, Disatree_01);
        expect(state.combatResources.body).toBe(0); // no equipment seeded body.

        const result = resolveCombatRound(
            state,
            { stance: 'body', action: 'item', itemId: 'body-elixir' },
            { stance: 'body', action: 'defend' },
        );

        // The grant should be folded into combatResources for the next round.
        expect(result.state.combatResources.body).toBe(3);

        // The 'used' event records the exact grant the resolver applied.
        const used = result.combatEvents.find(
            ev => ev.phase === 'item' && ev.kind === 'used',
        );
        expect(used).toBeDefined();
        expect(used && used.phase === 'item' && used.kind === 'used').toBe(true);
        if (used && used.phase === 'item' && used.kind === 'used') {
            expect(used.resourceGrant).toEqual({
                heart: 0, body: 3, mind: 0, fallacy: 0, paradox: 0,
            });
        }

        // Stack of 1 → removed from inventory.
        const left = result.state.player.inventory.find(i => i.id === 'body-elixir');
        expect(left).toBeUndefined();
    });

    it('berserker-brew applies buff_haste and stacks +5 body tokens on use', () => {
        mockAlternatingRng();
        const brew = getConsumableById('berserker-brew');
        expect(brew).toBeDefined();
        const player = createCharacter({
            name: 'Brewer',
            level: 1,
            baseStats: { heart: 4, body: 3, mind: 2 },
            inventory: [{ ...brew! }],
        });
        const state = initializeCombat(player, Disatree_01);

        const result = resolveCombatRound(
            state,
            { stance: 'body', action: 'item', itemId: 'berserker-brew' },
            { stance: 'body', action: 'defend' },
        );

        expect(result.state.combatResources.body).toBe(5);
        const hasHaste = result.state.player.effects.some(e => e.effectId === 'buff_haste');
        expect(hasHaste).toBe(true);
    });

    it('a consumable with no resourceGrant emits an all-zero grant on the used event', () => {
        mockAlternatingRng();
        const minor = getConsumableById('minor-healing-potion');
        expect(minor).toBeDefined();
        const player = createCharacter({
            name: 'Sipper',
            level: 1,
            baseStats: { heart: 4, body: 3, mind: 2 },
            inventory: [{ ...minor!, quantity: 1 } as Consumable],
        });
        // Pre-damage so heal is observable.
        const damaged = { ...player, health: player.maxHealth - 5 };
        const state = initializeCombat(damaged, Disatree_01);

        const result = resolveCombatRound(
            state,
            { stance: 'body', action: 'item', itemId: 'minor-healing-potion' },
            { stance: 'body', action: 'defend' },
        );

        // No grant, so combatResources is untouched by the item path.
        expect(result.state.combatResources).toEqual({
            heart: 0, body: 0, mind: 0, fallacy: 0, paradox: 0,
        });
        const used = result.combatEvents.find(
            ev => ev.phase === 'item' && ev.kind === 'used',
        );
        if (used && used.phase === 'item' && used.kind === 'used') {
            expect(used.resourceGrant).toEqual({
                heart: 0, body: 0, mind: 0, fallacy: 0, paradox: 0,
            });
            expect(used.healed).toBe(5); // clamped at maxHealth.
        }
    });
});
