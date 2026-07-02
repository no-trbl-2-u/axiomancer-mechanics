/**
 * Hermetic e2e — CLI dialogue loop (`src/CLI/dialogue.loop.ts`).
 *
 * Mirrors the script-mode io pattern of `io.engine.test.ts`: no TTY,
 * `inquirer` never renders — answers come from the script array, output is
 * captured by spying on `console.log` (human output mode).
 *
 * Coverage:
 *   1. Walking Old Marrow's real tree (greet -> offer -> accepted) with
 *      `{"choice":0}` answers starts 'starting-quest' and terminates.
 *   2. questCompleted-gated choices ('thanks' node) are hidden
 *      pre-completion — the node ends without consuming a prompt answer.
 *   3. The same gated choices surface post-completion and pay out.
 *   4. `{"choice":-1}` leaves immediately with no state change.
 *   5. Out-of-range scripted indices throw a descriptive error.
 *   6. `runNarrationPlayback` logs all three fv-14 lines in authored order.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import { setIoMode, setOutputMode } from '../io';
import { runDialogueLoop, runNarrationPlayback, type GameStoreLike } from '../dialogue.loop';
import { createNewGameState } from '../../Game/game.reducer';
import type { GameState } from '../../Game/types';
import type { DialogueTree } from '../../NPCs/types';
import type { QuestName } from '../../World/quest.library';
import { getMapDefinition } from '../../World/map.registry';
// Side effect of the World barrel import: registers the authored map-event
// content (fv-14 narration pool included).
import { getNodeEventPool } from '../../World';
import { setSeed } from '../../Utils/rng';

// ─── harness ──────────────────────────────────────────────────────────────────

/** Minimal store satisfying GameStoreLike — real GameState, plain fold-back. */
function makeStore(mutate?: (s: GameState) => GameState): GameStoreLike {
    let state = createNewGameState();
    if (mutate) state = mutate(state);
    return {
        getState: () => state,
        setState: (partial: Partial<GameState>) => {
            state = { ...state, ...partial };
        },
    };
}

/** Old Marrow's real authored tree, via the public map registry. */
function oldMarrowTree(): DialogueTree {
    const def = getMapDefinition('coastal-continent', 'fishing-village');
    const npc = def.npcs?.find(n => n.name === 'Old Marrow');
    if (!npc?.dialogueTree) {
        throw new Error('Old Marrow (with dialogueTree) not found on fishing-village.');
    }
    return npc.dialogueTree;
}

/** Same nodes as Old Marrow's tree but rooted at the post-quest 'thanks' node. */
function thanksRootedTree(): DialogueTree {
    return { ...oldMarrowTree(), rootId: 'thanks' };
}

let loggedLines: string[];

beforeEach(() => {
    setSeed('dialogue-loop-e2e');
    setOutputMode('human');
    loggedLines = [];
    vi.spyOn(console, 'log').mockImplementation((...args: unknown[]) => {
        loggedLines.push(args.map(String).join(' '));
    });
});

afterEach(() => {
    vi.restoreAllMocks();
    setIoMode({ kind: 'tty' });
    setOutputMode('human');
});

// ─── runDialogueLoop ──────────────────────────────────────────────────────────

describe('runDialogueLoop — Old Marrow starting quest', () => {
    it('walks greet -> offer -> accepted on {"choice":0} answers and starts the quest', async () => {
        const answers = [{ choice: 0 }, { choice: 0 }];
        setIoMode({ kind: 'script', answers });
        const store = makeStore();

        expect(store.getState().quests.active).toHaveLength(0);

        await runDialogueLoop(store, oldMarrowTree(), 'Old Marrow');

        // Both scripted answers were consumed and the loop terminated.
        expect(answers).toHaveLength(0);

        // Fold-back: 'starting-quest' is active in the store's quest log.
        const state = store.getState();
        expect(state.quests.active.map(q => q.name)).toContain('starting-quest');
        expect(state.quests.completed).not.toContain('starting-quest');

        // Terminal leaf node text was logged, speaker-prefixed.
        expect(loggedLines.some(l => l.startsWith('Old Marrow:') && l.includes('Mind the tide'))).toBe(true);
        // Effect summary surfaced for the transcript.
        expect(loggedLines.some(l => l.includes('[quest started] starting-quest'))).toBe(true);

        // The tree is a Phase 63 observer (id 'old-marrow') — the fold-back
        // carried the lastSeenAlignmentCells cache written by
        // applyDialogueChoice.
        expect(state.lastSeenAlignmentCells?.['old-marrow']).toBeTruthy();
    });

    it('hides questCompleted-gated choices pre-completion — thanks node ends with no prompt', async () => {
        // Every choice on 'thanks' requires questCompleted 'starting-quest'.
        // Pre-completion the node must play as choiceless: an EMPTY answer
        // script proves no prompt fired (a visible choice would throw
        // 'script exhausted').
        setIoMode({ kind: 'script', answers: [] });
        const store = makeStore();
        const before = store.getState();

        await runDialogueLoop(store, thanksRootedTree());

        expect(store.getState().player.currency).toBe(before.player.currency);
        expect(loggedLines.some(l => l.includes('You did it, then'))).toBe(true);
    });

    it('surfaces the gated choices post-completion and pays out', async () => {
        setIoMode({ kind: 'script', answers: [{ choice: 0 }] });
        const store = makeStore(s => ({
            ...s,
            quests: { ...s.quests, completed: ['starting-quest' as QuestName] },
        }));
        const before = store.getState().player.currency;

        await runDialogueLoop(store, thanksRootedTree(), 'Old Marrow');

        // Choice 0 ("Take it") grants 25 currency and ends (nextNodeId unset).
        expect(store.getState().player.currency).toBe(before + 25);
    });

    it('leaves immediately on {"choice":-1} with no state change', async () => {
        setIoMode({ kind: 'script', answers: [{ choice: -1 }] });
        const store = makeStore();
        const before = store.getState();

        await runDialogueLoop(store, oldMarrowTree(), 'Old Marrow');

        const after = store.getState();
        expect(after).toBe(before); // setState never called
        expect(after.quests.active).toHaveLength(0);
        expect(after.lastSeenAlignmentCells?.['old-marrow']).toBeUndefined();
    });

    it('throws a descriptive error on an out-of-range scripted index', async () => {
        setIoMode({ kind: 'script', answers: [{ choice: 7 }] });
        const store = makeStore();

        await expect(runDialogueLoop(store, oldMarrowTree())).rejects.toThrow(
            /choice index 7 is out of range at node 'greet'/,
        );
    });
});

// ─── runNarrationPlayback ─────────────────────────────────────────────────────

describe('runNarrationPlayback — fv-14 strand recollection', () => {
    it('logs all three authored narration lines in order', () => {
        const pool = getNodeEventPool('coastal-continent', 'fishing-village', 'fv-14');
        expect(pool).toBeDefined();
        const entry = pool!.entries.find(e => e.kind === 'narration');
        expect(entry).toBeDefined();
        const payload = entry!.payload;
        if (payload.kind !== 'narration') throw new Error('fv-14 pool entry is not a narration payload.');

        runNarrationPlayback(payload.dialogue);

        expect(loggedLines).toEqual([
            'The tide has gone out, and the strand lies bare to the grey morning.',
            'Somewhere a gull cries, and you remember why you came so far north.',
            'The sea keeps its own counsel. You walk on.',
        ]);
    });
});
