/**
 * Dialogue runtime — applies a chosen `DialogueChoice` to the `GameState`.
 *
 * The dialogue tree itself lives under `src/NPCs/`; this module orchestrates
 * the side effects on `GameState` (start quest, advance objective, complete
 * quest, teach skill, set flag, grant currency).
 */

import { GameState } from '../Game/types';
import { DialogueChoice, DialogueTree, DialogueNode } from '../NPCs/types';
import {
    discoverQuest, startQuest, progressQuest, completeQuest, findActiveQuest,
} from './quest.engine';
import { getMapDefinition } from './map.registry';
import { QuestName } from './quest.library';

/** Maps specific flag names to moral meter shifts. */
const MORAL_FLAG_EFFECTS: Record<string, number> = {
    'beggar_generous_gift': 5,
    'beggar_small_gift': 1,
    'beggar_kind_gesture': 3,
    'beggar_dismissed': -1,
    'beggar_harsh_words': -5,
} as const;

/** Result of applying a dialogue choice to the GameState. */
export interface ApplyDialogueChoiceResult {
    gameState: GameState;
    nextNode: DialogueNode | null;
    /** Side-effect summary for the UI log. */
    effects: {
        startedQuest?: QuestName;
        completedQuest?: QuestName;
        progressedObjective?: { name: QuestName; objectiveId: string; amount: number };
        learnedSkill?: string;
        setFlag?: string;
        grantedCurrency?: number;
        moralShift?: number;
    };
}

/**
 * Applies `choice.effect` to `gameState` and returns the resulting state
 * along with the next dialogue node (if any). When `choice.nextNodeId` is
 * unset, the conversation ends and `nextNode` is `null`.
 *
 * The function looks up quest definitions from the current map's
 * `MapDefinition` so an NPC can hand out any quest authored on its map
 * without each definition having to re-declare the same Quest objects.
 */
export function applyDialogueChoice(
    gameState: GameState,
    tree: DialogueTree,
    choice: DialogueChoice,
): ApplyDialogueChoiceResult {
    let player = gameState.player;
    let quests = gameState.quests;
    let flags = gameState.flags;
    const effects: ApplyDialogueChoiceResult['effects'] = {};

    const e = choice.effect;
    if (e) {
        if (e.startQuest) {
            const def = getMapDefinition(
                gameState.world.currentMap.continent,
                gameState.world.currentMap.name,
            );
            const quest = def.quests?.find(q => q.name === e.startQuest);
            if (quest) {
                if (!quests.active.some(q => q.name === quest.name) && !quests.completed.includes(quest.name)) {
                    quests = discoverQuest(quests, quest);
                    quests = startQuest(quests, quest);
                    effects.startedQuest = quest.name;
                }
            }
        }
        if (e.progressQuest) {
            const amount = e.progressQuest.amount ?? 1;
            const res = progressQuest(quests, e.progressQuest.name, e.progressQuest.objectiveId, amount);
            if (findActiveQuest(quests, e.progressQuest.name)) {
                quests = res.log;
                effects.progressedObjective = { ...e.progressQuest, amount };
                if (res.completedName) {
                    effects.completedQuest = res.completedName;
                }
            }
        }
        if (e.completeQuest) {
            if (!quests.completed.includes(e.completeQuest)) {
                quests = completeQuest(quests, e.completeQuest);
                effects.completedQuest = e.completeQuest;
            }
        }
        if (e.teachSkill) {
            if (!player.knownSkills.includes(e.teachSkill)) {
                player = { ...player, knownSkills: [...player.knownSkills, e.teachSkill] };
                effects.learnedSkill = e.teachSkill;
            }
        }
        if (e.setFlag) {
            if (!flags.includes(e.setFlag)) {
                flags = [...flags, e.setFlag];
                effects.setFlag = e.setFlag;
            }
        }
        if (e.grantCurrency) {
            player = { ...player, currency: player.currency + e.grantCurrency };
            effects.grantedCurrency = e.grantCurrency;
        }
    }

    // Check if any newly set flag triggers a moral meter shift
    let moralMeter = gameState.moralMeter;
    if (effects.setFlag && MORAL_FLAG_EFFECTS[effects.setFlag] !== undefined) {
        const delta = MORAL_FLAG_EFFECTS[effects.setFlag];
        moralMeter = Math.max(-100, Math.min(100, moralMeter + delta));
        effects.moralShift = delta;
    }

    const nextNode = choice.nextNodeId ? (tree.nodes[choice.nextNodeId] ?? null) : null;

    return {
        gameState: { ...gameState, player, quests, flags, moralMeter },
        nextNode,
        effects,
    };
}
