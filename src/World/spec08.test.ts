/**
 * Spec 08 — exploration loop test suite.
 *
 * Coverage:
 *   - moveToNode adjacency / completed-lock / locked-node validation.
 *   - processWorldEffectTick + getActiveHazards behaviour over multiple steps.
 *   - Per-objective quest engine (start / progress / complete).
 *   - processNode dispatch for every event type the demo map exercises.
 *   - End-to-end flow through fishing-village from start to boss-kill.
 */

import { describe, it, expect } from 'vitest';
import {
    createStartingWorld, moveToNode, completeCurrentNode, IllegalMoveError,
    processNode, applyDialogueChoice, getMapDefinition,
    emptyQuestLog, startQuest, progressQuest, isQuestComplete, completeQuest,
} from './index';
import { processWorldEffectTick, getActiveHazards, applyEffect, lookupEffect } from '../Effects';
import { createCharacter } from '../Character';
import { createNewGameState } from '../Game/game.reducer';
import { GameState } from '../Game/types';

const startingState = (): GameState => createNewGameState();

// ── moveToNode ──────────────────────────────────────────────────────────────

describe('moveToNode', () => {
    it('moves to a connected, unlocked, uncompleted node', () => {
        const world = createStartingWorld();
        const next = moveToNode(world, 'fv-2');
        expect(next.currentMap.currentNode).toBe('fv-2');
    });

    it('rejects non-adjacent nodes', () => {
        const world = createStartingWorld();
        expect(() => moveToNode(world, 'fv-5')).toThrow(IllegalMoveError);
    });

    it('rejects locked nodes', () => {
        const world = createStartingWorld();
        // fv-3 starts locked (only fv-2 is adjacent to start).
        expect(world.currentMap.lockedNodes).toContain('fv-3');
        expect(() => moveToNode(world, 'fv-3')).toThrow(IllegalMoveError);
    });

    it('locks completed nodes against back-travel (Q2)', () => {
        let world = createStartingWorld();
        world = moveToNode(world, 'fv-2');
        world = completeCurrentNode(world);
        // After completing fv-2, fv-3 becomes available.
        expect(world.currentMap.availableNodes).toContain('fv-3');
        world = moveToNode(world, 'fv-3');
        // Can't go back to the completed fv-2.
        expect(() => moveToNode(world, 'fv-2')).toThrow(IllegalMoveError);
    });

    it('returns the same state when target equals current node', () => {
        const world = createStartingWorld();
        const same = moveToNode(world, world.currentMap.currentNode);
        expect(same).toBe(world);
    });
});

// ── processWorldEffectTick (Q3) ─────────────────────────────────────────────

describe('processWorldEffectTick + getActiveHazards', () => {
    it('applies poison DoT each step (two steps verified)', () => {
        const player = createCharacter({
            name: 'Tester',
            level: 5,
            baseStats: { heart: 5, body: 5, mind: 5 },
        });
        const poison = lookupEffect('debuff_poison');
        expect(poison).toBeDefined();
        const { activeEffects } = applyEffect(player.effects, poison!, 0);
        const poisoned = { ...player, effects: activeEffects };

        const hpBefore = poisoned.health;
        const step1 = processWorldEffectTick(poisoned);
        expect(step1.damage).toBeGreaterThan(0);
        expect(step1.player.health).toBeLessThan(hpBefore);

        const step2 = processWorldEffectTick(step1.player);
        expect(step2.player.health).toBeLessThan(step1.player.health);
    });

    it('exposes active hazards via getActiveHazards (Q4)', () => {
        const player = createCharacter({
            name: 'Tester',
            level: 5,
            baseStats: { heart: 5, body: 5, mind: 5 },
        });
        const poison = lookupEffect('debuff_poison')!;
        const { activeEffects } = applyEffect(player.effects, poison, 0);
        const hazards = getActiveHazards({ effects: activeEffects });
        expect(hazards.length).toBeGreaterThan(0);
        expect(hazards[0].effectId).toBe('debuff_poison');
        expect(hazards[0].damagePerStep).toBeGreaterThan(0);
    });

    it('decrements duration each step and drops expired effects', () => {
        const player = createCharacter({
            name: 'Tester',
            level: 5,
            baseStats: { heart: 5, body: 5, mind: 5 },
        });
        const poison = lookupEffect('debuff_poison')!;
        let target = { ...player, effects: applyEffect(player.effects, poison, 0).activeEffects };
        const startDuration = target.effects[0].remainingDuration;
        const after = processWorldEffectTick(target);
        if (after.player.effects.length > 0) {
            expect(after.player.effects[0].remainingDuration).toBe(startDuration - 1);
        } else {
            expect(after.expired.length).toBeGreaterThan(0);
        }
    });
});

// ── Quest engine (Q7B) ──────────────────────────────────────────────────────

describe('per-objective quest engine', () => {
    const fishingDef = () => getMapDefinition('coastal-continent', 'fishing-village');

    it('starts a quest and tracks objectives', () => {
        const quest = fishingDef().quests!.find(q => q.name === 'starting-quest')!;
        const log = startQuest(emptyQuestLog(), quest);
        expect(log.active).toHaveLength(1);
        expect(log.active[0].status).toBe('active');
        expect(isQuestComplete(log.active[0])).toBe(false);
    });

    it('progressQuest advances counters and auto-completes when filled', () => {
        const quest = fishingDef().quests!.find(q => q.name === 'starting-quest')!;
        let log = startQuest(emptyQuestLog(), quest);
        const res = progressQuest(log, 'starting-quest', 'kill-tyrant', 1);
        log = res.log;
        expect(log.completed).toContain('starting-quest');
        expect(res.completedName).toBe('starting-quest');
    });

    it('completeQuest moves the quest to completed list', () => {
        const quest = fishingDef().quests!.find(q => q.name === 'starting-quest')!;
        let log = startQuest(emptyQuestLog(), quest);
        log = completeQuest(log, 'starting-quest');
        expect(log.completed).toContain('starting-quest');
        expect(log.active).toHaveLength(0);
    });
});

// ── processNode dispatcher ─────────────────────────────────────────────────

describe('processNode dispatch', () => {
    it('returns kind=npc with dialogue tree for the NPC node', () => {
        let state = startingState();
        state = { ...state, world: moveToNode(state.world, 'fv-2') };
        const result = processNode(state);
        expect(result.event.kind).toBe('npc');
        if (result.event.kind === 'npc') {
            expect(result.event.npcName).toBe('Old Marrow');
            expect(result.event.dialogue).toBeDefined();
        }
    });

    it('returns kind=shop for the shop node', () => {
        let state = startingState();
        // Walk to fv-3 (must complete fv-2 first to unlock).
        state = { ...state, world: moveToNode(state.world, 'fv-2') };
        state = { ...state, world: completeCurrentNode(state.world) };
        state = { ...state, world: moveToNode(state.world, 'fv-3') };
        const result = processNode(state);
        expect(result.event.kind).toBe('shop');
    });

    it('returns kind=encounter on encounter nodes', () => {
        let state = startingState();
        state = { ...state, world: moveToNode(state.world, 'fv-2') };
        state = { ...state, world: completeCurrentNode(state.world) };
        state = { ...state, world: moveToNode(state.world, 'fv-3') };
        state = { ...state, world: completeCurrentNode(state.world) };
        state = { ...state, world: moveToNode(state.world, 'fv-4') };
        const result = processNode(state);
        expect(result.event.kind).toBe('encounter');
        if (result.event.kind === 'encounter') {
            expect(result.event.isBoss).toBe(false);
            expect(result.event.encounter.enemies).toHaveLength(1);
        }
    });

    it('grants currency on treasure nodes', () => {
        let state = startingState();
        // Walk fv-1 → fv-5.
        for (const target of ['fv-2', 'fv-3', 'fv-4', 'fv-5'] as const) {
            state = { ...state, world: moveToNode(state.world, target) };
            if (target !== 'fv-5') state = { ...state, world: completeCurrentNode(state.world) };
        }
        const before = state.player.currency;
        const result = processNode(state);
        expect(result.event.kind).toBe('treasure');
        expect(result.gameState.player.currency).toBe(before + 10);
    });

    it('returns kind=encounter with isBoss=true on the boss node', () => {
        let state = startingState();
        for (const target of ['fv-2', 'fv-3', 'fv-4', 'fv-5', 'fv-6'] as const) {
            state = { ...state, world: moveToNode(state.world, target) };
            if (target !== 'fv-6') state = { ...state, world: completeCurrentNode(state.world) };
        }
        const result = processNode(state);
        expect(result.event.kind).toBe('encounter');
        if (result.event.kind === 'encounter') {
            expect(result.event.isBoss).toBe(true);
            expect(result.event.encounter.enemies[0].name).toBe('The Coastal Tyrant');
        }
    });
});

// ── Dialogue (Q9) ──────────────────────────────────────────────────────────

describe('applyDialogueChoice', () => {
    it('starts a quest when a choice carries startQuest', () => {
        let state = startingState();
        state = { ...state, world: moveToNode(state.world, 'fv-2') };
        const result = processNode(state);
        expect(result.event.kind).toBe('npc');
        if (result.event.kind !== 'npc' || !result.event.dialogue) return;
        const tree = result.event.dialogue;
        const root = tree.nodes[tree.rootId];
        // Pick "What needs doing?" → leads to 'offer'
        const offerChoice = root.choices!.find(c => c.text.startsWith('What needs'));
        expect(offerChoice).toBeDefined();
        const step1 = applyDialogueChoice(result.gameState, tree, offerChoice!);
        expect(step1.nextNode?.id).toBe('offer');
        // Pick "Consider it done" → starts the quest
        const accept = step1.nextNode!.choices!.find(c => c.effect?.startQuest);
        const step2 = applyDialogueChoice(step1.gameState, tree, accept!);
        expect(step2.effects.startedQuest).toBe('starting-quest');
        expect(step2.gameState.quests.active.find(q => q.name === 'starting-quest')).toBeDefined();
    });

    it('grants currency when a choice carries grantCurrency', () => {
        let state = startingState();
        state = { ...state, world: moveToNode(state.world, 'fv-2') };
        const result = processNode(state);
        if (result.event.kind !== 'npc' || !result.event.dialogue) throw new Error('expected npc');
        const tree = result.event.dialogue;
        const thanksNode = tree.nodes.thanks;
        const choice = thanksNode.choices![0];
        const before = result.gameState.player.currency;
        const step = applyDialogueChoice(result.gameState, tree, choice);
        expect(step.gameState.player.currency).toBe(before + 25);
    });
});
