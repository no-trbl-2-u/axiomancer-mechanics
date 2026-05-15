/**
 * Spec 08 e2e — full exploration loop through fishing-village.
 *
 * Demo scenario: enter map → talk to Old Marrow (accept quest) → traverse
 * encounter / treasure / boss nodes → defeat the Coastal Tyrant → quest
 * completes → currency reward granted, XP banked, loot in inventory.
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import { createGameStore } from './store';
import { nullAdapter } from './persistence/null.adapter';
import {
    moveToNode, completeCurrentNode, processNode, applyDialogueChoice,
    getMapDefinition,
} from '../World';
import { Player } from '../Character/characters.mock';
import { createCharacter } from '../Character';
import { GameState } from './types';
import { applyEffect, lookupEffect, processWorldEffectTick } from '../Effects';
import { mockSequentialRng } from '../test-utils/rng';

afterEach(() => vi.restoreAllMocks());

function bootstrap(): ReturnType<typeof createGameStore> {
    // Strong player so combat resolves quickly.
    const strongPlayer = createCharacter({
        name: 'Hero',
        level: 10,
        baseStats: { heart: 20, body: 20, mind: 20 },
        currency: 0,
    });
    const overrides: Partial<GameState> = { player: strongPlayer };
    return createGameStore(nullAdapter, overrides);
}

describe('Spec 08 e2e — fishing-village exploration loop', () => {
    it('travels start → encounter → treasure → boss; quest completes; rewards granted', () => {
        // Fix RNG so encounter rolls and loot rolls are deterministic.
        mockSequentialRng(0.5);

        const store = bootstrap();
        let state = store.getState();

        // 1. Talk to Old Marrow on fv-2 and accept the quest.
        const moved2 = moveToNode(state.world, 'fv-2');
        store.setState({ world: moved2 });
        let result = processNode(store.getState());
        store.setState(result.gameState);
        expect(result.event.kind).toBe('npc');
        if (result.event.kind === 'npc' && result.event.dialogue) {
            const tree = result.event.dialogue;
            const root = tree.nodes[tree.rootId];
            const offer = root.choices!.find(c => c.nextNodeId === 'offer')!;
            const step1 = applyDialogueChoice(store.getState(), tree, offer);
            store.setState(step1.gameState);
            const accept = step1.nextNode!.choices!.find(c => c.effect?.startQuest)!;
            const step2 = applyDialogueChoice(store.getState(), tree, accept);
            store.setState(step2.gameState);
            expect(step2.effects.startedQuest).toBe('starting-quest');
        }
        store.setState({ world: completeCurrentNode(store.getState().world) });

        // 2. Pass the shop (fv-3) without buying.
        store.setState({ world: moveToNode(store.getState().world, 'fv-3') });
        const shopRes = processNode(store.getState());
        store.setState(shopRes.gameState);
        expect(shopRes.event.kind).toBe('shop');
        store.setState({ world: completeCurrentNode(store.getState().world) });

        // 3. Encounter node fv-4 → fight + win.
        store.setState({ world: moveToNode(store.getState().world, 'fv-4') });
        const encRes = processNode(store.getState());
        store.setState(encRes.gameState);
        expect(encRes.event.kind).toBe('encounter');
        if (encRes.event.kind === 'encounter') {
            store.getState().startCombat(encRes.event.encounter);
            // Force victory by zeroing enemy HP.
            const combat = store.getState().combat!;
            store.setState({ combat: { ...combat, enemy: { ...combat.enemy, health: 0 } } });
            const report = store.getState().endCombat();
            expect(report.outcome).toBe('victory');
        }
        store.setState({ world: completeCurrentNode(store.getState().world) });

        // 4. Treasure node fv-5 → currency reward.
        store.setState({ world: moveToNode(store.getState().world, 'fv-5') });
        const treasureBefore = store.getState().player.currency;
        const treasureRes = processNode(store.getState());
        store.setState(treasureRes.gameState);
        expect(treasureRes.event.kind).toBe('treasure');
        expect(store.getState().player.currency).toBe(treasureBefore + 10);
        store.setState({ world: completeCurrentNode(store.getState().world) });

        // 5. Boss encounter fv-6 → fight, win, quest auto-completes.
        store.setState({ world: moveToNode(store.getState().world, 'fv-6') });
        const bossRes = processNode(store.getState());
        store.setState(bossRes.gameState);
        expect(bossRes.event.kind).toBe('encounter');
        if (bossRes.event.kind !== 'encounter') throw new Error('expected encounter');
        expect(bossRes.event.isBoss).toBe(true);
        expect(bossRes.event.encounter.enemies[0].name).toBe('The Coastal Tyrant');
        const xpBefore = store.getState().player.experience;
        store.getState().startCombat(bossRes.event.encounter);
        const bossCombat = store.getState().combat!;
        store.setState({ combat: { ...bossCombat, enemy: { ...bossCombat.enemy, health: 0 } } });
        const bossReport = store.getState().endCombat();
        expect(bossReport.outcome).toBe('victory');
        expect(store.getState().player.experience).toBeGreaterThan(xpBefore);

        // Quest auto-completed via killObjectives in endCombat.
        expect(store.getState().quests.completed).toContain('starting-quest');
        // Reward (25 currency) was granted automatically.
        expect(store.getState().player.currency).toBeGreaterThanOrEqual(35);
    });

    it('hazard tick fires when the player moves between nodes', () => {
        // Apply poison to the player; walk two steps; HP should drop.
        const store = bootstrap();
        const poison = lookupEffect('debuff_poison')!;
        const { activeEffects } = applyEffect(store.getState().player.effects, poison, 0);
        store.setState({ player: { ...store.getState().player, effects: activeEffects } });
        const startHp = store.getState().player.health;

        // Step 1: fv-1 → fv-2 (manual orchestration: world reducer + player tick).
        let world = moveToNode(store.getState().world, 'fv-2');
        let tick = processWorldEffectTick(store.getState().player);
        store.setState({ world, player: tick.player });
        const hpAfter1 = store.getState().player.health;
        expect(hpAfter1).toBeLessThan(startHp);

        store.setState({ world: completeCurrentNode(store.getState().world) });

        // Step 2: fv-2 → fv-3.
        world = moveToNode(store.getState().world, 'fv-3');
        tick = processWorldEffectTick(store.getState().player);
        store.setState({ world, player: tick.player });
        expect(store.getState().player.health).toBeLessThan(hpAfter1);
    });
});

// Compile-time sanity for the demo map's authored content.
describe('fishing-village authoring sanity', () => {
    it('has the demo NPC, shop, quest, and boss', () => {
        const def = getMapDefinition('coastal-continent', 'fishing-village');
        expect(def.npcs?.some(n => n.name === 'Old Marrow')).toBe(true);
        expect(def.npcs?.some(n => n.isShopkeeper)).toBe(true);
        expect(def.quests?.some(q => q.name === 'starting-quest')).toBe(true);
        expect(def.nodeEvents?.['fv-6']?.type).toBe('boss-encounter');
        // Player reference unused.
        void Player;
    });
});
