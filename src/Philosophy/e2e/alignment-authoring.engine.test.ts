/**
 * Hermetic e2e for the Phase 43 authoring surfaces.
 *
 * Unit 1 — verifies that `alignmentDelta` on a dialogue choice and on a
 * map-event pool entry actually shifts `GameState.philosophicalAlignment`
 * via the existing resolvers (applyDialogueChoice + resolveMapEvent).
 * Unit 3 will extend with a full-store / gameReducer-driven case.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { applyDialogueChoice } from '../../World/dialogue.runtime';
import {
    resolveMapEvent,
    registerMapEventPool,
    setNodeEventPoolOverride,
    _clearMapEventPoolRegistry,
} from '../../World/MapEvents/resolve-map-event';
import { createNewGameState } from '../../Game/game.reducer';
import type { DialogueChoice, DialogueTree } from '../../NPCs/types';
import type { MapEventPool } from '../../World/MapEvents/types';
import { mockSequentialRng } from '../../test-utils/rng';

function makeTree(): DialogueTree {
    return {
        rootNodeId: 'root',
        nodes: {
            root: { id: 'root', text: 'root', choices: [] },
        },
    };
}

describe('Phase 43 — dialogue alignmentDelta', () => {
    it('applies a partial alignmentDelta on a dialogue choice and surfaces philosophicalShift', () => {
        const tree = makeTree();
        const choice: DialogueChoice = {
            text: 'Speak with kindness',
            effect: {
                alignmentDelta: { outlook: 10, scope: 5 },
            },
        };

        const state = createNewGameState();
        expect(state.philosophicalAlignment).toEqual({ epistemology: 0, outlook: 0, scope: 0 });

        const res = applyDialogueChoice(state, tree, choice);
        expect(res.gameState.philosophicalAlignment).toEqual({
            epistemology: 0,
            outlook: 10,
            scope: 5,
        });
        expect(res.effects.philosophicalShift).toEqual({ outlook: 10, scope: 5 });
    });

    it('does not populate philosophicalShift when the choice carries no alignmentDelta', () => {
        const tree = makeTree();
        const choice: DialogueChoice = {
            text: 'Stay silent',
            effect: { moralDelta: 1 },
        };
        const res = applyDialogueChoice(createNewGameState(), tree, choice);
        expect(res.effects.philosophicalShift).toBeUndefined();
        expect(res.gameState.philosophicalAlignment).toEqual({ epistemology: 0, outlook: 0, scope: 0 });
    });

    it('clamps alignment shifts at the [-100, +100] axis bounds', () => {
        const tree = makeTree();
        const choice: DialogueChoice = {
            text: 'Massive optimistic surge',
            effect: { alignmentDelta: { outlook: 150 } },
        };
        const start = createNewGameState();
        const seeded = { ...start, philosophicalAlignment: { epistemology: 0, outlook: 90, scope: 0 } };
        const res = applyDialogueChoice(seeded, tree, choice);
        expect(res.gameState.philosophicalAlignment.outlook).toBe(100);
    });
});

describe('Phase 43 — map-event pool-entry alignmentDelta', () => {
    beforeEach(() => {
        _clearMapEventPoolRegistry();
        // Deterministic single-entry pool roll; mockSequentialRng returns the
        // same value indefinitely so createCharacter's id-gen + the pool roll
        // both succeed without exhausting a fixed sequence.
        mockSequentialRng(0);
    });

    it('shifts philosophicalAlignment when the resolved pool entry carries an alignmentDelta', () => {
        const state = createNewGameState();
        const { continent, name, currentNode } = state.world.currentMap;

        const pool: MapEventPool = {
            id: 'phase43-test-pool',
            entries: [{
                kind: 'rest',
                weight: 1,
                payload: { kind: 'rest', healFraction: 0 },
                alignmentDelta: { epistemology: -5, scope: 8 },
            }],
        };
        registerMapEventPool(pool);
        setNodeEventPoolOverride(continent, name, currentNode, pool.id);

        const result = resolveMapEvent(state);
        expect(result.event.kind).toBe('rest');
        expect(result.state.philosophicalAlignment).toEqual({
            epistemology: -5,
            outlook: 0,
            scope: 8,
        });
    });

    it('leaves philosophicalAlignment unchanged when the entry carries no alignmentDelta', () => {
        const state = createNewGameState();
        const { continent, name, currentNode } = state.world.currentMap;

        const pool: MapEventPool = {
            id: 'phase43-no-delta-pool',
            entries: [{
                kind: 'rest',
                weight: 1,
                payload: { kind: 'rest', healFraction: 0 },
            }],
        };
        registerMapEventPool(pool);
        setNodeEventPoolOverride(continent, name, currentNode, pool.id);

        const result = resolveMapEvent(state);
        expect(result.state.philosophicalAlignment).toEqual({ epistemology: 0, outlook: 0, scope: 0 });
    });
});
