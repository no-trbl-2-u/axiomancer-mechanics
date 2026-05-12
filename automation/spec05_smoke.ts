/**
 * Spec 05 smoke walkthrough — runs the equipment and consumable engine
 * end-to-end through the public surface and prints what the resolver
 * observes, so the output can be saved as a walkthrough artifact.
 *
 * This is NOT a hermetic test (it relies on real Math.random for the
 * combat dice). For the hermetic e2e suite see
 * `src/Items/e2e/equipment.engine.test.ts`.
 */

import { createCharacter } from '../src/Character/index';
import { equipItem, unequipItem } from '../src/Character/equipment.reducer';
import { Equipment, Consumable } from '../src/Items/types';
import { createGameStore } from '../src/Game/store';
import { nullAdapter } from '../src/Game/persistence/null.adapter';
import { Disatree_01 } from '../src/Enemy/enemy.library';
import { initializeCombat } from '../src/Combat/combat.reducer';
import { resolveCombatRound } from '../src/Combat/combat.resolver';

console.log('═══════════════════════════════════════════════════════════════');
console.log('  SPEC 05 SMOKE WALKTHROUGH — Equipment & Consumables');
console.log('═══════════════════════════════════════════════════════════════');

// ── 1. Equipping a weapon visibly changes derivedStats ─────────────────────
const ironBlade: Equipment = {
    id: 'eq_iron_blade',
    name: 'Iron Blade',
    description: '+2 body, +1 physicalAttack',
    category: 'equipment',
    slot: 'weapon',
    tier: 1,
    statModifiers: [
        { stat: 'body',           value: 2 },
        { stat: 'physicalAttack', value: 1 },
    ],
};

const fresh = createCharacter({
    name: 'Demo', level: 1,
    baseStats: { heart: 4, body: 3, mind: 2 },
});
console.log('\n[1] derivedStats BEFORE Iron Blade:');
console.log('    physicalAttack  =', fresh.derivedStats.physicalAttack);
console.log('    physicalDefense =', fresh.derivedStats.physicalDefense);

const equipped = equipItem(fresh, ironBlade);
console.log('[1] derivedStats AFTER  Iron Blade (+2 body, +1 physicalAttack):');
console.log('    physicalAttack  =', equipped.derivedStats.physicalAttack,
            '(was 3 → effectiveBody 5 → +1 mod → 6)');
console.log('    physicalDefense =', equipped.derivedStats.physicalDefense,
            '(was 9 → effectiveBody 5 × DEFENSE 3 → 15)');

const reverted = unequipItem(equipped, 'weapon');
console.log('[1] derivedStats AFTER  unequip:');
console.log('    physicalAttack  =', reverted.derivedStats.physicalAttack);
console.log('    physicalDefense =', reverted.derivedStats.physicalDefense);

// ── 2. Berserker Band seeds combatResources.body = 3 at combat start ───────
const berserkerBand: Equipment = {
    id: 'eq_berserker_band',
    name: 'Berserker Band',
    description: '+3 body tokens at combat start, +2 body on every hit.',
    category: 'equipment',
    slot: 'accessory',
    tier: 2,
    resourceInteraction: {
        combatStartTokens: { body: 3 },
        generationBonus: [{ trigger: 'hit', resourceType: 'body', bonus: 2 }],
    },
};
const bandPlayer = createCharacter({
    name: 'Banded', level: 1,
    baseStats: { heart: 4, body: 3, mind: 2 },
    equipment: { accessory: berserkerBand },
});
const battle = initializeCombat(bandPlayer, Disatree_01);
console.log('\n[2] Berserker Band → initial combatResources:');
console.log('   ', battle.combatResources);

// ── 3. Healing Potion in combat ────────────────────────────────────────────
const potion: Consumable = {
    id: 'csl_heal_10',
    name: 'Healing Potion',
    description: 'Heals 10 HP.',
    category: 'consumable',
    healAmount: 10,
    quantity: 2,
};
const hurt = {
    ...fresh,
    health: fresh.maxHealth - 12,
    inventory: [potion],
};
let combat = initializeCombat(hurt, Disatree_01);
console.log('\n[3] HP before item action:', combat.player.health,
            '/ max', combat.player.maxHealth);
console.log('    Inventory:', combat.player.inventory.map(i => ({ id: i.id, q: (i as Consumable).quantity })));

const { state: afterItem, combatEvents } = resolveCombatRound(
    combat,
    { stance: 'heart', action: 'item', itemId: potion.id },
    { stance: 'body',  action: 'attack' },
);
combat = afterItem;
const itemEv = combatEvents.find(ev => ev.phase === 'item');
console.log('    item event:', itemEv);
console.log('    HP after item action :', combat.player.health,
            '/ max', combat.player.maxHealth);
console.log('    Inventory after item :',
            combat.player.inventory.map(i => ({ id: i.id, q: (i as Consumable).quantity })));

// ── 4. Game-store lifecycle for equipItem / unequipItem ─────────────────────
const store = createGameStore(nullAdapter, { player: fresh });
console.log('\n[4] Store player.equipment before:', store.getState().player.equipment);
store.getState().equipItem(ironBlade);
console.log('[4] Store player.derivedStats after equipItem:',
            store.getState().player.derivedStats.physicalAttack,
            '/', store.getState().player.derivedStats.physicalDefense);
store.getState().unequipItem('weapon');
console.log('[4] Store player.derivedStats after unequipItem:',
            store.getState().player.derivedStats.physicalAttack,
            '/', store.getState().player.derivedStats.physicalDefense);

console.log('\n═══════════════════════════════════════════════════════════════');
console.log('  DONE');
console.log('═══════════════════════════════════════════════════════════════');
