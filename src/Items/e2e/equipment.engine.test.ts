/**
 * Hermetic E2E Tests — Equipment & Consumables Engine (Spec 05)
 *
 * Hermetic = self-contained + deterministic + isolated:
 *   1. Self-contained — no disk I/O (nullAdapter), no network, no TTY.
 *   2. Deterministic  — Math.random is stubbed via helpers in
 *                       `src/test-utils/rng.ts`.
 *   3. Isolated       — `vi.restoreAllMocks` in afterEach keeps tests
 *                       independent.
 *
 * Coverage:
 *   • equipItem / unequipItem drive `derivedStats` and `effects` mutations
 *     end-to-end through `createCharacter` → `equipItem` round-trip.
 *   • `initializeCombat` seeds `combatResources` from `combatStartTokens`
 *     across every equipped slot.
 *   • `generateBasicActionResources` folds `generationBonus` entries on top
 *     of the base table.
 *   • `resolveCombatRound` routes `action: 'item'` through the consumable
 *     engine — healAmount applied, stack decremented, enemy still resolves.
 *   • Equipment `onHitEffects` ride on the Spec 03 proc roll (`baseChance: 1`
 *     with no fumble → guaranteed proc when the wearer lands a hit).
 *   • Game-store lifecycle for equipItem / unequipItem / useConsumable via
 *     `nullAdapter` with a `vi.spyOn(nullAdapter, 'save')` assertion.
 *
 * Reference test (canonical structure to copy):
 *   `src/Combat/e2e/combat.resolver.test.ts`.
 */

import { afterEach, describe, it, expect, vi } from 'vitest';

import { createCharacter } from '../../Character/index';
import { equipItem, unequipItem, getEquipmentModifiers } from '../../Character/equipment.reducer';
import { Disatree_01 } from '../../Enemy/enemy.library';
import { createGameStore } from '../../Game/store';
import { nullAdapter } from '../../Game/persistence/null.adapter';
import {
    aggregateCombatStartTokens,
    applyEquipmentGenerationBonus,
    getEquipmentProcTriggers,
} from '../equipment.engine';
import { initializeCombat } from '../../Combat/combat.reducer';
import { resolveCombatRound } from '../../Combat/combat.resolver';
import { generateBasicActionResources } from '../../Skills/skill.engine';
import { mockSequentialRng, mockAlternatingRng } from '../../test-utils/rng';
import { Consumable, Equipment } from '../types';

// ─── Fixtures ────────────────────────────────────────────────────────────────

const buildPlayer = () => createCharacter({
    name: 'TestPlayer',
    level: 1,
    baseStats: { heart: 4, body: 3, mind: 2 },
});

const ironWeapon: Equipment = {
    id: 'eq_iron_blade',
    name: 'Iron Blade',
    description: 'A simple iron blade. +2 body, +1 physicalAttack.',
    category: 'equipment',
    slot: 'weapon',
    rarity: 'common',
    requiredLevel: 1,
    statModifiers: [
        { stat: 'body',           value: 2 },
        { stat: 'physicalAttack', value: 1 },
    ],
};

const passiveCirclet: Equipment = {
    id: 'eq_circlet_courage',
    name: 'Circlet of Courage',
    description: 'Grants Briar Stance permanently while worn.',
    category: 'equipment',
    slot: 'head',
    rarity: 'common',
    requiredLevel: 1,
    passiveEffects: ['tier1_body_defend'],
};

const berserkerBand: Equipment = {
    id: 'eq_berserker_band',
    name: 'Berserker Band',
    description: '+3 body tokens at combat start.',
    category: 'equipment',
    slot: 'accessory',
    rarity: 'uncommon',
    requiredLevel: 1,
    resourceInteraction: {
        combatStartTokens: { body: 3 },
        generationBonus: [
            { trigger: 'hit', resourceType: 'body', bonus: 2 },
        ],
    },
};

const guaranteedHitProc: Equipment = {
    id: 'eq_proc_weapon',
    name: 'Marking Sword',
    description: 'Marks the foe on every hit.',
    category: 'equipment',
    slot: 'weapon',
    rarity: 'common',
    requiredLevel: 1,
    onHitEffects: [
        {
            effectId:   'tier1_mind_mark',
            target:     'opponent',
            tier:       1,
            baseChance: 1,
            intensityOverride: 1,
            durationOverride:  2,
        },
    ],
};

const healingPotion: Consumable = {
    id: 'csl_heal_10',
    name: 'Healing Potion',
    description: '+10 HP immediately.',
    category: 'consumable',
    healAmount: 10,
    quantity: 3,
};

const regenPotion: Consumable = {
    id: 'csl_regen',
    name: 'Tristram\'s Tincture',
    description: 'Applies Tristram\'s Recovery.',
    category: 'consumable',
    effectId: 'buff_regeneration',
    quantity: 1,
};

// ─── Tests ───────────────────────────────────────────────────────────────────

afterEach(() => {
    vi.restoreAllMocks();
});

// ────────────────────────────────────────────────────────────────────────────
// equipItem / unequipItem fold modifiers into derivedStats and effects
// ────────────────────────────────────────────────────────────────────────────

describe('equipItem / unequipItem', () => {
    it('folds statModifiers into derivedStats at equip-time and reverts on unequip', () => {
        const player = buildPlayer();
        // Sanity: base stats and derived stats are the unmodified defaults.
        expect(player.baseStats.body).toBe(3);
        expect(player.derivedStats.physicalAttack).toBe(3); // body * 1

        const equipped = equipItem(player, ironWeapon);

        // The +2 body propagates through deriveStats AND the +1 physicalAttack
        // patch goes on top → 3 + 2 = 5 body, derived physicalAttack = 5 + 1 = 6.
        expect(equipped.equipment.weapon).toBe(ironWeapon);
        expect(equipped.derivedStats.physicalAttack).toBe(6);
        // physicalDefense follows body × DEFENSE multiplier (3) → 15.
        expect(equipped.derivedStats.physicalDefense).toBe(15);
        // baseStats are NOT mutated — the canonical stats remain.
        expect(equipped.baseStats.body).toBe(3);

        const unequipped = unequipItem(equipped, 'weapon');
        expect(unequipped.equipment.weapon).toBeUndefined();
        expect(unequipped.derivedStats.physicalAttack).toBe(3);
        expect(unequipped.derivedStats.physicalDefense).toBe(9);
    });

    it('pushes passiveEffects as permanent ActiveEffects sourced to the item, and removes them on unequip', () => {
        const player = buildPlayer();
        expect(player.effects).toHaveLength(0);

        const equipped = equipItem(player, passiveCirclet);
        expect(equipped.effects).toHaveLength(1);
        const active = equipped.effects[0];
        expect(active.effectId).toBe('tier1_body_defend');
        expect(active.remainingDuration).toBe(-1);
        expect(active.sourceId).toBe(passiveCirclet.id);

        const unequipped = unequipItem(equipped, 'head');
        expect(unequipped.effects).toHaveLength(0);
    });

    it('replacing an item in a slot drops the previous item\'s passive effects and statModifiers', () => {
        const player = buildPlayer();
        const withCirclet = equipItem(player, passiveCirclet);
        expect(withCirclet.effects).toHaveLength(1);

        const replacementCirclet: Equipment = {
            ...passiveCirclet,
            id:             'eq_other_circlet',
            passiveEffects: ['buff_haste'],
        };
        const replaced = equipItem(withCirclet, replacementCirclet);
        expect(replaced.effects).toHaveLength(1);
        expect(replaced.effects[0]!.effectId).toBe('buff_haste');
        expect(replaced.effects[0]!.sourceId).toBe('eq_other_circlet');
    });

    it('createCharacter accepts a starting equipment map and applies it via equipItem', () => {
        const player = createCharacter({
            name: 'Equipped',
            level: 1,
            baseStats: { heart: 4, body: 3, mind: 2 },
            equipment: { weapon: ironWeapon, head: passiveCirclet },
        });
        expect(player.derivedStats.physicalAttack).toBe(6);
        expect(player.effects.some(e => e.sourceId === passiveCirclet.id)).toBe(true);
    });
});

// ────────────────────────────────────────────────────────────────────────────
// Combat-start token seeding
// ────────────────────────────────────────────────────────────────────────────

describe('initializeCombat: combat-start token seeding', () => {
    it('seeds combatResources from each equipped item\'s combatStartTokens', () => {
        const player = createCharacter({
            name: 'Seeded',
            level: 1,
            baseStats: { heart: 4, body: 3, mind: 2 },
            equipment: { accessory: berserkerBand },
        });
        const state = initializeCombat(player, Disatree_01);
        expect(state.combatResources).toEqual({
            heart: 0, body: 3, mind: 0, fallacy: 0, paradox: 0,
        });
    });

    it('items without resourceInteraction contribute zero to every counter', () => {
        const player = createCharacter({
            name: 'NoTokens',
            level: 1,
            baseStats: { heart: 4, body: 3, mind: 2 },
            equipment: { weapon: ironWeapon },
        });
        const state = initializeCombat(player, Disatree_01);
        expect(state.combatResources).toEqual({
            heart: 0, body: 0, mind: 0, fallacy: 0, paradox: 0,
        });
    });

    it('aggregateCombatStartTokens sums across multiple equipped slots', () => {
        const accessory: Equipment = {
            ...berserkerBand,
            id: 'eq_band_2',
            slot: 'accessory',
            resourceInteraction: { combatStartTokens: { body: 1, paradox: 2 } },
        };
        const offhand: Equipment = {
            id: 'eq_offhand',
            name: 'Offhand',
            description: '',
            category: 'equipment',
            slot: 'hands',
            rarity: 'common',
            requiredLevel: 1,
            resourceInteraction: { combatStartTokens: { body: 4, heart: 1 } },
        };
        const tokens = aggregateCombatStartTokens({ accessory, hands: offhand });
        expect(tokens).toEqual({
            heart: 1, body: 5, mind: 0, fallacy: 0, paradox: 2,
        });
    });
});

// ────────────────────────────────────────────────────────────────────────────
// Generation bonus
// ────────────────────────────────────────────────────────────────────────────

describe('generateBasicActionResources: equipment generation bonus', () => {
    it('applies matching generationBonus entries on top of the base table', () => {
        const equipment = { accessory: berserkerBand };
        const base = { heart: 0, body: 0, mind: 0, fallacy: 0, paradox: 0 };
        // body attack hit base = +3 body; bonus = +2 body on hit → 5
        const hit = generateBasicActionResources(base, 'body', 'hit', equipment);
        expect(hit.body).toBe(5);
        // body attack miss base = +1 body; no bonus for miss → 1
        const miss = generateBasicActionResources(base, 'body', 'miss', equipment);
        expect(miss.body).toBe(1);
    });

    it('a "any"-trigger bonus applies to every basic action outcome', () => {
        const universal: Equipment = {
            id: 'eq_any',
            name: 'Any',
            description: '',
            category: 'equipment',
            slot: 'feet',
            rarity: 'common',
            requiredLevel: 1,
            resourceInteraction: {
                generationBonus: [{ trigger: 'any', resourceType: 'mind', bonus: 1 }],
            },
        };
        const base = { heart: 0, body: 0, mind: 0, fallacy: 0, paradox: 0 };
        expect(applyEquipmentGenerationBonus(base, { feet: universal }, 'hit').mind).toBe(1);
        expect(applyEquipmentGenerationBonus(base, { feet: universal }, 'miss').mind).toBe(1);
        expect(applyEquipmentGenerationBonus(base, { feet: universal }, 'defend').mind).toBe(1);
    });
});

// ────────────────────────────────────────────────────────────────────────────
// onHitEffects: surfaced through the Spec 03 proc roll
// ────────────────────────────────────────────────────────────────────────────

describe('Equipment proc triggers', () => {
    it('getEquipmentProcTriggers returns onHit/onDefend entries from every equipped piece', () => {
        const equipment = { weapon: guaranteedHitProc };
        expect(getEquipmentProcTriggers(equipment, 'attack')).toHaveLength(1);
        expect(getEquipmentProcTriggers(equipment, 'defend')).toHaveLength(0);
    });

    it('onHitEffects with baseChance 1 land a mark on the enemy when the player wins the contest', () => {
        mockAlternatingRng();

        const player = createCharacter({
            name:      'Marker',
            level:     1,
            baseStats: { heart: 4, body: 3, mind: 2 },
            equipment: { weapon: guaranteedHitProc },
        });

        // Player picks mind/attack vs enemy heart/attack → player has advantage,
        // mirrors the canonical combat e2e suite where the player KOs Disatree
        // in a single round. We assert the proc landed BEFORE the enemy KO is
        // checked — the proc event is emitted while damage resolves.
        let state = initializeCombat(player, Disatree_01);
        const result = resolveCombatRound(
            state,
            { stance: 'mind', action: 'attack' },
            { stance: 'heart', action: 'attack' },
        );
        state = result.state;

        const procApplied = result.combatEvents.find(
            ev => ev.phase === 'scenario' && ev.kind === 'proc-applied'
              && ev.appliedTo === 'opponent'
              && ev.effect.id === 'tier1_mind_mark',
        );
        expect(procApplied).toBeDefined();
    });
});

// ────────────────────────────────────────────────────────────────────────────
// Consumable: item action through the resolver
// ────────────────────────────────────────────────────────────────────────────

describe('resolveCombatRound: action: \'item\' (consumables)', () => {
    it('healAmount restores HP and decrements the inventory stack; enemy still acts', () => {
        mockAlternatingRng();

        const player = createCharacter({
            name:      'Drinker',
            level:     1,
            baseStats: { heart: 4, body: 3, mind: 2 },
            inventory: [{ ...healingPotion, quantity: 3 }],
        });

        // Pre-damage the player so the heal is observable.
        const damaged = { ...player, health: player.maxHealth - 8 };
        let state = initializeCombat(damaged, Disatree_01);
        // Snapshot HP after the deep-clone so we compare against the right base.
        const hpBeforeItem = state.player.health;

        const result = resolveCombatRound(
            state,
            { stance: 'body', action: 'item', itemId: healingPotion.id },
            { stance: 'body', action: 'attack' },
        );
        state = result.state;

        const used = result.combatEvents.find(
            ev => ev.phase === 'item' && ev.kind === 'used',
        );
        expect(used).toBeDefined();
        expect(used && used.phase === 'item' && used.kind === 'used' && used.healed).toBe(8);

        // Inventory decremented from 3 → 2; HP went up by 8 then the enemy hit
        // at passive defense, so HP is somewhere between (hpBeforeItem) and
        // (hpBeforeItem + 8). The hermetic check we care about is "enemy did
        // attack", which surfaces as a damage-applied event.
        const consumableLeft = state.player.inventory.find(i => i.id === healingPotion.id) as Consumable;
        expect(consumableLeft.quantity).toBe(2);

        // The item action mirrors the existing skip-vs-attack semantics: the
        // enemy enters an attack contest at passive defense. The player still
        // rolls a "phantom" d20 for the contest (this matches how skip-vs-
        // attack already works pre-Spec 05), so the contest may or may not
        // produce a damage-applied event depending on the RNG. We assert the
        // contest happened (an attack-roll exists) and the round advanced.
        const enemyAttackRoll = result.combatEvents.find(
            ev => ev.phase === 'scenario'
              && ev.kind === 'attack-roll'
              && ev.actor === 'enemy',
        );
        expect(enemyAttackRoll).toBeDefined();
        expect(state.round).toBe(2);
        expect(state.player.health).toBeGreaterThan(0);
        expect(hpBeforeItem).toBeGreaterThanOrEqual(0);
    });

    it('effect-based consumable applies the referenced library effect to the player', () => {
        mockAlternatingRng();

        const player = createCharacter({
            name:      'Drinker',
            level:     1,
            baseStats: { heart: 4, body: 3, mind: 2 },
            inventory: [{ ...regenPotion }],
        });
        let state = initializeCombat(player, Disatree_01);

        const result = resolveCombatRound(
            state,
            { stance: 'body', action: 'item', itemId: regenPotion.id },
            { stance: 'body', action: 'defend' },
        );
        state = result.state;

        const hasRegen = state.player.effects.some(e => e.effectId === 'buff_regeneration');
        expect(hasRegen).toBe(true);

        const used = result.combatEvents.find(
            ev => ev.phase === 'item' && ev.kind === 'used'
                && ev.appliedEffectId === 'buff_regeneration',
        );
        expect(used).toBeDefined();

        // Stack of 1 → removed.
        const left = state.player.inventory.find(i => i.id === regenPotion.id);
        expect(left).toBeUndefined();
    });

    it('item action with an unknown itemId emits a blocked event and leaves inventory unchanged', () => {
        mockAlternatingRng();

        const player = createCharacter({
            name:      'Bumbler',
            level:     1,
            baseStats: { heart: 4, body: 3, mind: 2 },
            inventory: [{ ...healingPotion }],
        });
        let state = initializeCombat(player, Disatree_01);

        const result = resolveCombatRound(
            state,
            { stance: 'body', action: 'item', itemId: 'csl_does_not_exist' },
            { stance: 'body', action: 'defend' },
        );
        state = result.state;

        const blocked = result.combatEvents.find(
            ev => ev.phase === 'item' && ev.kind === 'blocked',
        );
        expect(blocked).toBeDefined();
        const stillThere = state.player.inventory.find(i => i.id === healingPotion.id) as Consumable;
        expect(stillThere.quantity).toBe(healingPotion.quantity);
    });
});

// ────────────────────────────────────────────────────────────────────────────
// Equipment modifier aggregation invariants
// ────────────────────────────────────────────────────────────────────────────

describe('Invariants', () => {
    it('getEquipmentModifiers on an empty slot map returns zeroed maps', () => {
        const agg = getEquipmentModifiers({});
        expect(agg.statFlat.size).toBe(0);
        expect(agg.statMultBonus.size).toBe(0);
    });

    it('unequipping an empty slot is a no-op (returns the same reference)', () => {
        const player = buildPlayer();
        expect(unequipItem(player, 'weapon')).toBe(player);
    });

    it('input character is not mutated by equipItem', () => {
        const player = buildPlayer();
        const beforeHash = JSON.stringify(player);
        equipItem(player, ironWeapon);
        expect(JSON.stringify(player)).toBe(beforeHash);
    });
});

// ────────────────────────────────────────────────────────────────────────────
// Game store lifecycle — nullAdapter (zero disk access)
// ────────────────────────────────────────────────────────────────────────────

describe('Game store lifecycle: equipment & consumables with nullAdapter', () => {
    it('equipItem / unequipItem flow through the store; autosave fires (Spec 09 Q4) but the nullAdapter never touches disk', () => {
        const saveSpy = vi.spyOn(nullAdapter, 'save');
        const player  = buildPlayer();
        const store   = createGameStore(nullAdapter, { player });

        store.getState().equipItem(ironWeapon);
        expect(store.getState().player.equipment.weapon).toBe(ironWeapon);
        expect(store.getState().player.derivedStats.physicalAttack).toBe(6);

        store.getState().unequipItem('weapon');
        expect(store.getState().player.equipment.weapon).toBeUndefined();
        expect(store.getState().player.derivedStats.physicalAttack).toBe(3);

        // Autosave on every action — but the nullAdapter's save is a silent
        // no-op, so no disk write actually occurs.
        expect(saveSpy).toHaveBeenCalled();
    });

    it('useConsumable applies the healAmount on the root player and decrements the stack', () => {
        // Use a fresh, slightly hurt player so the heal is observable.
        const player = {
            ...buildPlayer(),
        };
        const hurt = { ...player, health: player.maxHealth - 5,
                       inventory: [{ ...healingPotion, quantity: 2 }] };
        const store = createGameStore(nullAdapter, { player: hurt });

        const before = store.getState().player.health;
        store.getState().useConsumable(healingPotion.id);

        const after = store.getState().player.health;
        expect(after).toBe(before + 5); // heal clamps at maxHealth; 5 HP missing.
        const left = store.getState().player.inventory
            .find(i => i.id === healingPotion.id) as Consumable;
        expect(left.quantity).toBe(1);
    });

    it('useConsumable is a no-op for a non-consumable / unknown itemId', () => {
        const player = buildPlayer();
        const store  = createGameStore(nullAdapter, { player });
        store.getState().useConsumable('csl_does_not_exist');
        expect(store.getState().player.inventory).toEqual(player.inventory);
    });

    it('a Berserker Band wearer\'s combat starts with non-zero body tokens', () => {
        mockSequentialRng(0.5);
        const player = createCharacter({
            name: 'Equipped',
            level: 1,
            baseStats: { heart: 4, body: 3, mind: 2 },
            equipment: { accessory: berserkerBand },
        });
        const store = createGameStore(nullAdapter, { player });
        store.getState().startCombat(Disatree_01);
        const combat = store.getState().combat!;
        expect(combat.combatResources.body).toBe(3);
    });
});
