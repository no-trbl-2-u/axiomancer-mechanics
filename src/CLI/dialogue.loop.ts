/**
 * CLI dialogue loop — drives a branching `DialogueTree` through the shared
 * `io` prompt abstraction (D6, "whole first level via game CLI").
 *
 * UI-only per the CLI layering rule: traversal helpers live in
 * `src/NPCs/dialogue.ts`, side effects in `src/World/dialogue.runtime.ts`.
 * This file only renders node text, prompts for a choice, and folds the
 * mutated `GameState` fields back into the store (the same
 * `store.setState({...slices})` pattern `game.cli.ts` uses after
 * `resolveMapEvent`).
 *
 * Scripted answer shape (script / stdin io modes): `{"choice": <index>}`
 * where the index is the position in the *visible* choice list, or `-1`
 * to leave the conversation.
 */

import { log, prompt } from './io';
import type { GameState } from '../Game/types';
import type { DialogueNode, DialogueTree } from '../NPCs/types';
import {
    getDialogueNode, visibleChoices, isLeafNode, type DialogueContext,
} from '../NPCs/dialogue';
import { applyDialogueChoice } from '../World/dialogue.runtime';

/**
 * Minimal structural store contract — the slice of the zustand game store
 * the dialogue loop needs. Method syntax keeps the real
 * `ReturnType<typeof createGameStore>` (whose `getState()` returns
 * `GameState & <verbs>` and whose `setState` takes a wider partial)
 * structurally assignable, while tests can pass a plain object.
 */
export interface GameStoreLike {
    getState(): GameState;
    setState(partial: Partial<GameState>): void;
}

/**
 * Builds the `visibleChoices` predicate context from the current store
 * state, mirroring the field mapping documented on `DialogueContext`:
 * active/completed quest names, world flags, the Phase 42 alignment cube,
 * and (for identified trees) the Phase 63 last-seen alignment cell.
 */
function dialogueContextFromState(state: GameState, tree: DialogueTree): DialogueContext {
    return {
        activeQuests: new Set<string>(state.quests.active.map(q => q.name)),
        completedQuests: new Set<string>(state.quests.completed),
        flags: new Set<string>(state.flags),
        alignment: state.philosophicalAlignment,
        lastSeenAlignmentCellId: tree.id ? state.lastSeenAlignmentCells?.[tree.id] : undefined,
    };
}

/** One-line effect summaries so scripted transcripts show what a choice did. */
function logChoiceEffects(effects: ReturnType<typeof applyDialogueChoice>['effects']): void {
    if (effects.startedQuest) log(`  [quest started] ${effects.startedQuest}`);
    if (effects.completedQuest) log(`  [quest completed] ${effects.completedQuest}`);
    if (effects.progressedObjective) {
        const p = effects.progressedObjective;
        log(`  [quest progressed] ${p.name} (${p.objectiveId} +${p.amount})`);
    }
    if (effects.learnedSkill) log(`  [skill learned] ${effects.learnedSkill}`);
    if (effects.setFlag) log(`  [flag set] ${effects.setFlag}`);
    if (typeof effects.grantedCurrency === 'number') log(`  [currency] ${effects.grantedCurrency >= 0 ? '+' : ''}${effects.grantedCurrency}`);
}

/**
 * Runs one conversation against `tree`, starting at `tree.rootId`.
 *
 * Per node: gate choices via `visibleChoices` against the CURRENT store
 * state, prompt (`rawlist`, name `'choice'`, value = index into the visible
 * list, plus a `(leave)` -1 escape), apply the picked choice through
 * `applyDialogueChoice`, fold the mutated `GameState` fields back into the
 * store, and follow `nextNode` until the conversation ends (leaf node,
 * `nextNodeId` unset, or the player leaves).
 *
 * Nodes with no *visible* choices (true leaves, or nodes whose every choice
 * is gated off) log their text and end the conversation — no prompt fires.
 */
export async function runDialogueLoop(
    store: GameStoreLike,
    tree: DialogueTree,
    speaker?: string,
): Promise<void> {
    let node: DialogueNode | null = getDialogueNode(tree, tree.rootId);
    while (node) {
        const message = speaker ? `${speaker}: ${node.text}` : node.text;
        const choices = isLeafNode(node)
            ? []
            : visibleChoices(node, dialogueContextFromState(store.getState(), tree));

        if (choices.length === 0) {
            log(message);
            return;
        }

        const { choice } = await prompt<{ choice: number }>([
            {
                type: 'rawlist',
                name: 'choice',
                message,
                choices: [
                    ...choices.map((c, i) => ({ name: c.text, value: i })),
                    { name: '(leave)', value: -1 },
                ],
            },
        ]);

        if (choice === -1) return;
        const picked = choices[choice];
        if (!picked) {
            throw new Error(
                `runDialogueLoop: choice index ${choice} is out of range at node '${node.id}' ` +
                `(${choices.length} visible choice${choices.length === 1 ? '' : 's'}; -1 leaves).`,
            );
        }

        const result = applyDialogueChoice(store.getState(), tree, picked);
        // Fold back exactly the fields applyDialogueChoice mutates — same
        // slice-wise setState pattern game.cli.ts uses for resolveMapEvent.
        store.setState({
            player: result.gameState.player,
            quests: result.gameState.quests,
            flags: result.gameState.flags,
            moralMeter: result.gameState.moralMeter,
            philosophicalAlignment: result.gameState.philosophicalAlignment,
            lastSeenAlignmentCells: result.gameState.lastSeenAlignmentCells,
        });
        logChoiceEffects(result.effects);

        node = result.nextNode;
    }
}

/**
 * Plays a choiceless narration monologue (`NarrationPayload.dialogue`,
 * e.g. the fv-14 strand recollection): logs every node's text in authored
 * order. No prompt, no state mutation — narration trees are leaf-only by
 * authoring convention.
 */
export function runNarrationPlayback(tree: DialogueTree): void {
    for (const node of Object.values(tree.nodes)) {
        log(node.text);
    }
}
