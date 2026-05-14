/**
 * Game reducer — pure top-level dispatch (Spec 09).
 *
 * `gameReducer(state, action)` is the single dispatch spine. Every store
 * action goes through here; the store layer wraps it with side effects
 * (autosave, event emission). The reducer itself is pure — it returns a
 * fresh `GameState` and never touches disk or any module-level mutable.
 *
 * Save / load are intentionally NO-OPS at the reducer level: persistence is a
 * side effect owned by `createGameStore`. The reducer only describes what the
 * state would become; the store decides what to do with it.
 */

import { GameState } from './types';
import { GameAction } from './actions.types';
import { Character } from '../Character/types';
import { Encounter, QuestLog } from '../World/types';
import { Enemy } from '../Enemy/types';
import { initializeCombat } from '../Combat/combat.reducer';
import { determineEnemyAction, determineCombatEnd } from '../Combat';
import { resolveCombatRound } from '../Combat/combat.resolver';
import { getSkillById } from '../Skills/skill.library';
import {
    useConsumable as useConsumableItem,
} from '../Items/item.reducer';
import { useConsumableEffect } from '../Items/equipment.engine';
import { isConsumable } from '../Items/types';
import { lookupEffect } from '../Effects/effects.library';
import {
    equipItem as equipItemReducer,
    unequipItem as unequipItemReducer,
} from '../Character/equipment.reducer';
import { createCharacter } from '../Character';
import { createStartingWorld, emptyQuestLog } from '../World';
import { moveToNode as moveWorld } from '../World/world.reducer';
import { processNode as processWorldNode } from '../World/process-node';
import { applyDialogueChoice as applyDialogueRuntime } from '../World/dialogue.runtime';
import { killObjectives, progressQuest, findQuest } from '../World/quest.engine';
import { calculateMaxHealth } from '../Utils';
import { EXPERIENCE_PER_LEVEL, FRIENDSHIP_COUNTER_MAX } from './game-mechanics.constants';
import { addItemStacking, rollEncounterLoot, totalEncounterXp } from './combat-grants';
import { getRng } from '../Utils/rng';

/**
 * Increment when GameState's shape changes. Save loaders branch on this so
 * old saves can be migrated rather than corrupted.
 */
export const GAME_STATE_VERSION = 3;

/** Builds a brand-new GameState with default player and world. */
export function createNewGameState(): GameState {
    return {
        version: GAME_STATE_VERSION,
        player: createCharacter({
            name: 'Player',
            level: 1,
            baseStats: { heart: 1, body: 1, mind: 1 },
        }),
        world: createStartingWorld(),
        combat: null,
        quests: emptyQuestLog(),
        flags: [],
        moralMeter: 0,
        rngState: getRng().getState(),
    };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Type-guard for the `Enemy | Encounter` startCombat overload. */
function isEncounter(target: Enemy | Encounter): target is Encounter {
    return Array.isArray((target as Encounter).enemies);
}

/**
 * Minimal level-up step (placeholder per Phase 09 brief). While the player has
 * accumulated enough XP for the next level, increment `level`, recompute
 * `maxHealth`, raise the threshold, and refill HP. Spec 06's full progression
 * (stat allocation, skill unlocks) flows in later.
 */
function applyLevelUps(player: Character): Character {
    let next = player;
    while (next.experience >= next.experienceToNextLevel) {
        const level = next.level + 1;
        const maxHealth = calculateMaxHealth(level, next.baseStats);
        next = {
            ...next,
            level,
            maxHealth,
            health: maxHealth,
            experienceToNextLevel: level * EXPERIENCE_PER_LEVEL,
        };
    }
    return next;
}

const skillLookup = (id: string) => getSkillById(id);

/**
 * Shifts the moral meter by the specified delta, clamping to [-100, +100].
 * Optionally gated by min/max requirements — if the current meter doesn't meet
 * the gating criteria, the shift is blocked and state returns unchanged.
 */
function shiftMoralMeter(state: GameState, delta: number, gating?: { min?: number; max?: number }): GameState {
    const current = state.moralMeter;
    
    // Check gating constraints
    if (gating) {
        if (gating.min !== undefined && current < gating.min) {
            return state; // Blocked by minimum requirement
        }
        if (gating.max !== undefined && current > gating.max) {
            return state; // Blocked by maximum requirement
        }
    }
    
    // Apply shift with clamping
    const newMeter = Math.max(-100, Math.min(100, current + delta));
    
    return {
        ...state,
        moralMeter: newMeter,
    };
}

// ─── Reducer ──────────────────────────────────────────────────────────────────

/**
 * Pure dispatch spine. Routes every `GameAction` to the corresponding sub-
 * reducer and returns the resulting `GameState`. Never throws on unknown
 * action types — instead returns state unchanged (caller is responsible for
 * type safety).
 *
 * TODO(spec-09): autosave currently fires on every action in the store. If
 *  the resulting cadence feels too brutal in playtest, throttle to map
 *  transitions or explicit saves only.
 */
export function gameReducer(state: GameState, action: GameAction): GameState {
    switch (action.type) {
        case 'START_COMBAT': {
            const encounter: Encounter = isEncounter(action.payload.target)
                ? action.payload.target
                : { enemies: [action.payload.target] };
            if (encounter.enemies.length === 0) {
                throw new Error('START_COMBAT: encounter has no enemies.');
            }
            return {
                ...state,
                combat: initializeCombat(state.player, encounter.enemies[0]),
                currentEncounter: encounter,
            };
        }

        case 'COMBAT_ROUND': {
            if (!state.combat) return state;
            const { playerAction, playerStance, skillId, itemId } = action.payload;
            const enemyAction = determineEnemyAction(state.combat.enemy, state.combat);
            const { state: nextCombat } = resolveCombatRound(
                state.combat,
                { stance: playerStance, action: playerAction, skillId, itemId },
                enemyAction,
                skillLookup,
            );
            return { ...state, combat: nextCombat };
        }

        case 'END_COMBAT': {
            const { combat } = state;
            if (!combat) return state;

            const combatEnd = determineCombatEnd(combat);
            const outcome: 'victory' | 'defeat' | 'flee' | 'friendship' =
                combatEnd === 'player' ? 'victory'
                : combatEnd === 'ko' ? 'defeat'
                : combatEnd === 'friendship' ? 'friendship'
                : 'flee';

            // Promote the combat-snapshot player back to root, restoring the
            // root inventory for defeat / flee so combat mutations don't leak.
            let nextPlayer: Character = (outcome === 'victory' || outcome === 'friendship')
                ? combat.player
                : { ...combat.player, inventory: state.player.inventory };
            let nextQuests: QuestLog = state.quests;

            if ((outcome === 'victory' || outcome === 'friendship') && state.currentEncounter) {
                const grantedLoot = action.payload?.grantedLoot
                    ?? rollEncounterLoot(state.currentEncounter);
                const grantedXp = action.payload?.grantedXp
                    ?? totalEncounterXp(state.currentEncounter);

                let nextInventory = nextPlayer.inventory;
                for (const drop of grantedLoot) {
                    nextInventory = addItemStacking(nextInventory, drop);
                }
                nextPlayer = {
                    ...nextPlayer,
                    experience: nextPlayer.experience + grantedXp,
                    inventory: nextInventory,
                };
                // Advance any active `kill` objectives whose target matches.
                for (const enemy of state.currentEncounter.enemies) {
                    const kills = killObjectives(nextQuests, enemy.name);
                    for (const k of kills) {
                        const res = progressQuest(nextQuests, k.questName, k.objectiveId, 1);
                        nextQuests = res.log;
                        if (res.completedName) {
                            const q = findQuest(state.quests, res.completedName);
                            if (q && typeof q.reward !== 'string' && q.reward && 'kind' in q.reward) {
                                if (q.reward.kind === 'currency') {
                                    nextPlayer = { ...nextPlayer, currency: nextPlayer.currency + q.reward.amount };
                                } else if (q.reward.kind === 'experience') {
                                    nextPlayer = { ...nextPlayer, experience: nextPlayer.experience + q.reward.amount };
                                }
                            }
                        }
                    }
                }
            }

            // Friendship victories grant +1 to moral meter (compassion)
            const baseState = {
                ...state,
                player: nextPlayer,
                quests: nextQuests,
                combat: null,
                currentEncounter: undefined,
            };

            return outcome === 'friendship'
                ? shiftMoralMeter(baseState, 1)
                : baseState;
        }

        case 'MOVE_TO_NODE': {
            return {
                ...state,
                world: moveWorld(state.world, action.payload.nodeId),
            };
        }

        case 'PROCESS_NODE': {
            return processWorldNode(state).gameState;
        }

        case 'APPLY_DIALOGUE': {
            return applyDialogueRuntime(state, action.payload.tree, action.payload.choice).gameState;
        }

        case 'USE_ITEM': {
            const { player } = state;
            const item = player.inventory.find(i => i.id === action.payload.itemId);
            if (!item || !isConsumable(item)) return state;
            const { player: healed } = useConsumableEffect(player, item, 0, lookupEffect);
            const nextInventory = useConsumableItem(healed.inventory, action.payload.itemId);
            return { ...state, player: { ...healed, inventory: nextInventory } };
        }

        case 'EQUIP_ITEM': {
            return { ...state, player: equipItemReducer(state.player, action.payload.item) };
        }

        case 'UNEQUIP_ITEM': {
            return { ...state, player: unequipItemReducer(state.player, action.payload.slot) };
        }

        case 'LEVEL_UP': {
            return { ...state, player: applyLevelUps(state.player) };
        }

        case 'SHIFT_MORAL_METER': {
            return shiftMoralMeter(state, action.payload.delta, action.payload.gating);
        }

        case 'SAVE_GAME': {
            return {
                ...state,
                rngState: getRng().getState(),
            };
        }

        case 'LOAD_GAME':
            // Side effects owned by the store layer; reducer is pure.
            return state;
    }
}
