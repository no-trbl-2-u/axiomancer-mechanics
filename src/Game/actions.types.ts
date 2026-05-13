/**
 * GameAction tagged union — every top-level state transition.
 *
 * Dispatched through `gameReducer(state, action): GameState`. The store
 * provides typed sugar around `dispatch` and emits `GameEvent`s after each
 * reducer run.
 *
 * Phase 09 keeps payloads minimal but real. Where the underlying reducer
 * needs richer context (e.g. dialogue requires the active tree), the payload
 * carries it through — the CLI / UI is responsible for staging that context
 * before dispatch. See `phase_09_game_loop_orchestration.md` Unit 1.
 */

import { Enemy } from '../Enemy/types';
import { Encounter } from '../World/types';
import { Action, Stance } from '../Combat/types';
import { Equipment, EquipmentSlot, Item } from '../Items/types';
import { DialogueTree, DialogueChoice } from '../NPCs/types';

export type GameAction =
    | { type: 'START_COMBAT';   payload: { target: Enemy | Encounter } }
    | { type: 'COMBAT_ROUND';   payload: { playerAction: Action; playerStance: Stance; skillId?: string; itemId?: string } }
    | { type: 'END_COMBAT';     payload?: { grantedLoot?: Item[]; grantedXp?: number } }
    | { type: 'MOVE_TO_NODE';   payload: { nodeId: string } }
    | { type: 'PROCESS_NODE';   payload?: undefined }
    | { type: 'APPLY_DIALOGUE'; payload: { tree: DialogueTree; choice: DialogueChoice } }
    | { type: 'USE_ITEM';       payload: { itemId: string } }
    | { type: 'EQUIP_ITEM';     payload: { item: Equipment } }
    | { type: 'UNEQUIP_ITEM';   payload: { slot: EquipmentSlot } }
    | { type: 'LEVEL_UP';       payload?: undefined }
    | { type: 'SAVE_GAME';      payload?: undefined }
    | { type: 'LOAD_GAME';      payload?: undefined };

/** Narrowed action type, extracted by `type` discriminator. */
export type GameActionOf<T extends GameAction['type']> = Extract<GameAction, { type: T }>;
