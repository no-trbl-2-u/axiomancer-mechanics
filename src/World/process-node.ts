/**
 * Node-event dispatcher (Spec 08 — `processNode`).
 *
 * `processNode(gameState)` looks up the `MapEvent` attached to the player's
 * current node and resolves it into the appropriate state transition:
 *
 * - `encounter` / `boss-encounter` → generates an `Encounter` (or uses the
 *   authored enemy / `enemySlug`) for the caller to feed to `startCombat`.
 *   The world state is *not* advanced here — `completeCurrentNode` runs
 *   after the fight resolves.
 * - `treasure` / `gather` → grants items + currency directly to the player.
 * - `quest` → discovers and starts the named quest if not already in the log.
 * - `npc` → returns the NPC and its dialogue tree for the UI to render.
 * - `shop` → returns the shop NPC; the shop view itself is data-only here.
 * - `event` → rest (Spec 08 Q10A): heals the player by `healFraction × maxHealth`.
 * - `other` / unset → no-op narration.
 *
 * Quest auto-progression:
 *   - `reachableObjectives(log, nodeId)` are advanced for every active
 *     `reach` objective targeting this node.
 *
 * The function is pure and returns a `ProcessNodeResult` carrying the
 * updated `GameState` plus optional payloads (encounter, dialogue, shop)
 * the orchestrator surfaces to the CLI.
 */

import { GameState } from '../Game/types';
import { Character } from '../Character/types';
import { Item } from '../Items/types';
import { MapEvent, MapDefinition, Encounter, Quest, Reward } from './types';
import { getMapDefinition } from './map.registry';
import { generateEncounter } from './encounter';
import { discoverQuest, startQuest, progressQuest, reachableObjectives } from './quest.engine';
import { ENEMY_REGISTRY, EnemySlug } from '../Enemy/enemy.library';
import { scaleEnemyToLevel } from './encounter';
import { deepClone } from '../Utils';
import { DialogueTree } from '../NPCs/types';

/** A normalized representation of what occurred when `processNode` ran. */
export type ProcessedEvent =
    | { kind: 'encounter'; encounter: Encounter; isBoss: boolean }
    | { kind: 'treasure'; items: Item[]; currency: number }
    | { kind: 'gather'; items: Item[] }
    | { kind: 'quest'; questName: string; startedNew: boolean }
    | { kind: 'shop'; npcName: string }
    | { kind: 'npc'; npcName: string; dialogue?: DialogueTree }
    | { kind: 'rest'; healed: number }
    | { kind: 'none' };

/** Result returned by `processNode`. */
export interface ProcessNodeResult {
    gameState: GameState;
    event: ProcessedEvent;
    /** Quest objectives auto-advanced by reaching this node. */
    objectivesProgressed: Array<{ questName: string; objectiveId: string }>;
    /** Quests that completed as a side effect (e.g. via reach-objective fill). */
    questsCompleted: string[];
    /** Human-readable narration line for the UI log. */
    message: string;
}

// ── helpers ────────────────────────────────────────────────────────────────

function resolveEnemyEncounter(
    event: MapEvent,
    def: MapDefinition,
    nodeId: string,
    playerLevel: number,
): Encounter {
    // Explicit Enemy on the event takes precedence.
    if (event.enemy) {
        return {
            enemies: [scaleEnemyToLevel(event.enemy, playerLevel)],
            origin: `${def.name}:${nodeId}`,
        };
    }
    // Named slug — pick from ENEMY_REGISTRY and scale.
    if (event.enemySlug) {
        const source = ENEMY_REGISTRY[event.enemySlug as EnemySlug];
        if (!source) {
            throw new Error(`processNode: unknown enemySlug '${event.enemySlug}' on node ${nodeId}.`);
        }
        // Bosses keep their authored level; other slugs scale up to player level.
        return {
            enemies: [scaleEnemyToLevel(source, Math.max(source.level, playerLevel))],
            origin: `${def.name}:${nodeId}`,
        };
    }
    // Fallback to the random encounter generator.
    const node = def.nodes.find(n => n.id === nodeId)!;
    return generateEncounter(node, playerLevel, {
        mapName: def.name,
        difficulty: event.type === 'boss-encounter' ? 'boss' : undefined,
    });
}

function grantCurrency(player: Character, amount: number): Character {
    return { ...player, currency: player.currency + amount };
}

function grantItems(player: Character, items: Item[]): Character {
    if (items.length === 0) return player;
    return { ...player, inventory: [...player.inventory, ...items.map(i => deepClone(i))] };
}

function applyReward(player: Character, reward: Reward | undefined): {
    player: Character;
    currency: number;
    items: Item[];
} {
    if (!reward) return { player, currency: 0, items: [] };
    if (typeof reward === 'string') {
        // Legacy tag rewards have no payload.
        return { player, currency: 0, items: [] };
    }
    if ('kind' in reward) {
        switch (reward.kind) {
            case 'currency':
                return { player: grantCurrency(player, reward.amount), currency: reward.amount, items: [] };
            case 'experience':
                return { player: { ...player, experience: player.experience + reward.amount }, currency: 0, items: [] };
            case 'item':
                return { player: grantItems(player, [reward.item]), currency: 0, items: [reward.item] };
            case 'skill':
                if (player.knownSkills.includes(reward.skillId)) {
                    return { player, currency: 0, items: [] };
                }
                return {
                    player: { ...player, knownSkills: [...player.knownSkills, reward.skillId] },
                    currency: 0, items: [],
                };
        }
    }
    // Bare Item reward.
    return { player: grantItems(player, [reward as Item]), currency: 0, items: [reward as Item] };
}

// ── dispatcher ─────────────────────────────────────────────────────────────

/**
 * Resolves the node event under the player's current position on the
 * current map. Pure — returns a fresh `GameState` and a `ProcessedEvent`
 * describing what happened.
 */
export function processNode(gameState: GameState): ProcessNodeResult {
    const map = gameState.world.currentMap;
    const def = getMapDefinition(map.continent, map.name);
    const nodeId = map.currentNode;
    const event = def.nodeEvents?.[nodeId];

    // Always advance `reach`-style objectives the moment the player arrives.
    const reaches = reachableObjectives(gameState.quests, nodeId);
    let questLog = gameState.quests;
    const objectivesProgressed: ProcessNodeResult['objectivesProgressed'] = [];
    const questsCompleted: string[] = [];
    let player = gameState.player;

    for (const r of reaches) {
        const res = progressQuest(questLog, r.questName, r.objectiveId, 1);
        questLog = res.log;
        objectivesProgressed.push(r);
        if (res.completedName) {
            questsCompleted.push(res.completedName);
            const quest = gameState.quests.active.find(q => q.name === res.completedName);
            if (quest) {
                const applied = applyReward(player, quest.reward);
                player = applied.player;
            }
        }
    }

    let nextState: GameState = { ...gameState, player, quests: questLog };

    if (!event) {
        return {
            gameState: nextState,
            event: { kind: 'none' },
            objectivesProgressed,
            questsCompleted,
            message: `You arrive at ${nodeId}. Nothing of note happens.`,
        };
    }

    switch (event.type) {
        case 'encounter':
        case 'boss-encounter': {
            const encounter = resolveEnemyEncounter(event, def, nodeId, gameState.player.level);
            return {
                gameState: nextState,
                event: { kind: 'encounter', encounter, isBoss: event.type === 'boss-encounter' },
                objectivesProgressed,
                questsCompleted,
                message: event.description,
            };
        }
        case 'treasure': {
            const applied = applyReward(player, event.reward);
            const finalPlayer = applied.player;
            const items = [...(event.items ?? []), ...applied.items];
            const withItems = grantItems(finalPlayer, event.items ?? []);
            nextState = { ...nextState, player: withItems };
            return {
                gameState: nextState,
                event: { kind: 'treasure', items, currency: applied.currency },
                objectivesProgressed,
                questsCompleted,
                message: event.description,
            };
        }
        case 'gather': {
            const items = event.items ?? [];
            const withItems = grantItems(player, items);
            nextState = { ...nextState, player: withItems };
            return {
                gameState: nextState,
                event: { kind: 'gather', items },
                objectivesProgressed,
                questsCompleted,
                message: event.description,
            };
        }
        case 'quest': {
            if (!event.questName) {
                return {
                    gameState: nextState,
                    event: { kind: 'none' },
                    objectivesProgressed,
                    questsCompleted,
                    message: 'A quest node with no quest reference. (Authoring bug.)',
                };
            }
            const questDef = def.quests?.find(q => q.name === event.questName);
            let log = nextState.quests;
            let started = false;
            if (questDef) {
                if (!log.active.some(q => q.name === questDef.name) && !log.completed.includes(questDef.name)) {
                    log = discoverQuest(log, questDef);
                    log = startQuest(log, questDef);
                    started = true;
                }
            }
            nextState = { ...nextState, quests: log };
            return {
                gameState: nextState,
                event: { kind: 'quest', questName: event.questName, startedNew: started },
                objectivesProgressed,
                questsCompleted,
                message: event.description,
            };
        }
        case 'shop': {
            const npc = def.npcs?.find(n => n.name === event.npcName);
            return {
                gameState: nextState,
                event: { kind: 'shop', npcName: npc?.name ?? event.npcName ?? 'Shopkeeper' },
                objectivesProgressed,
                questsCompleted,
                message: event.description,
            };
        }
        case 'npc': {
            const npc = def.npcs?.find(n => n.name === event.npcName);
            return {
                gameState: nextState,
                event: {
                    kind: 'npc',
                    npcName: npc?.name ?? event.npcName ?? 'Stranger',
                    dialogue: npc?.dialogueTree,
                },
                objectivesProgressed,
                questsCompleted,
                message: event.description,
            };
        }
        case 'event': {
            // Spec 08 Q10A — rest on event nodes (heals back to max by default).
            const fraction = event.healFraction ?? 1.0;
            const beforeHp = player.health;
            const newHp = Math.min(player.maxHealth, player.health + Math.round(player.maxHealth * fraction));
            const healed = newHp - beforeHp;
            const rested: Character = { ...player, health: newHp };
            nextState = { ...nextState, player: rested };
            return {
                gameState: nextState,
                event: { kind: 'rest', healed },
                objectivesProgressed,
                questsCompleted,
                message: event.description,
            };
        }
        case 'other':
        default:
            return {
                gameState: nextState,
                event: { kind: 'none' },
                objectivesProgressed,
                questsCompleted,
                message: event.description,
            };
    }
}
