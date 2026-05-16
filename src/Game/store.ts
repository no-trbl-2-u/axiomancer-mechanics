/**
 * Game Store
 *
 * A framework-agnostic Zustand vanilla store. Works in Node.js today and
 * in React Native via the `useStore` hook.
 *
 * ── Architectural rule ───────────────────────────────────────────────────────
 * Per Spec 09, every state mutation flows through `gameReducer`. The store is
 * a thin Zustand wrapper that:
 *   1. Calls `gameReducer(get(), action)` to compute the next state.
 *   2. `set(...)` to publish it.
 *   3. Emits the corresponding `GameEvent` to any subscribed consumer.
 *   4. Autosaves through the provided `PersistenceAdapter`.
 *
 * Legacy method-style actions (`startCombat`, `endCombat`, ...) are retained
 * so callers don't have to rewrite imports; each is now sugar over `dispatch`.
 *
 * ── Usage (Node.js) ──────────────────────────────────────────────────────────
 *   import { createGameStore, createEventEmitter } from 'axiomancer-mechanics';
 *   import { createNodeAdapter } from 'axiomancer-mechanics/node';
 *
 *   const events = createEventEmitter();
 *   const store  = createGameStore(createNodeAdapter(), undefined, events);
 *   events.on('combat:started', e => console.log(e));
 *   store.getState().dispatch({ type: 'START_COMBAT', payload: { target: someEnemy } });
 *
 * ── Usage (React Native) ─────────────────────────────────────────────────────
 *   import { createGameStore } from 'axiomancer-mechanics';
 *   import { useStore } from 'zustand';
 *
 *   const store = createGameStore(asyncStorageAdapter);
 *   const player = useStore(store, s => s.player);
 */

import { createStore, StoreApi } from 'zustand/vanilla';
import { Character } from '../Character/types';
import { Enemy } from '../Enemy/types';
import { CombatState } from '../Combat/types';
import type { RoundEvent } from '../Combat/combat.resolver';
import { Encounter } from '../World/types';
import {
    Item, Equipment, EquipmentSlot,
} from '../Items/types';
import { DialogueTree, DialogueChoice } from '../NPCs/types';
import { PhilosophicalAlignment } from '../Philosophy/types';
import { GameState } from './types';
import { GameAction } from './actions.types';
import { gameReducer, createNewGameState } from './game.reducer';
import { GameEventEmitter, GameEvent, GameEventType } from './events';
import { PersistenceAdapter } from './persistence/types';
import { rollEncounterLoot, totalEncounterXp } from './combat-grants';
import { FRIENDSHIP_COUNTER_MAX } from './game-mechanics.constants';
import { getRng } from '../Utils/rng';
import { getAvailableSkills } from '../Skills';
import {
    addItem as addItemReducer,
    removeItem as removeItemReducer,
    stackItem as stackItemReducer,
} from '../Items/item.reducer';

/**
 * Summary of what an `endCombat` call granted to the player (Spec 07).
 *
 * Returned from `endCombat()` so the CLI / UI can render an after-action
 * report.
 *
 * - `outcome` — `'victory'` when the player killed the enemy, `'defeat'`
 *   when the player went down first, `'friendship'` when the
 *   friendship-counter capped (Phase 36 — half XP and a moral-meter shift),
 *   `'flee'` when combat ended without any of the above (manual escape).
 * - `xpGained` — flat XP added to `player.experience` this turn (enemy XP
 *   only; quest reward XP is folded directly into `player.experience`).
 *   Half-XP on `'friendship'`; full XP on `'victory'`; zero on `'defeat'` /
 *   `'flee'`.
 * - `loot` — items added to `player.inventory` (pre stack-merge). Granted
 *   on victory and friendship; empty on defeat / flee.
 */
export interface CombatEndReport {
    outcome: 'victory' | 'defeat' | 'friendship' | 'flee';
    xpGained: number;
    loot: Item[];
}

/**
 * Every operation that mutates the root GameState. Grouped by domain.
 *
 * The canonical entry point is `dispatch(action)`; the named methods below
 * are sugar that builds the action for you. New consumers should prefer
 * `dispatch` for forward compatibility.
 */
export interface GameActions {
    /** Generic dispatch — applies the action via `gameReducer`. */
    dispatch: (action: GameAction) => void;

    // ── Combat ───────────────────────────────────────────────────────────────
    startCombat: (target: Enemy | Encounter) => void;
    /**
     * Replaces the in-progress combat snapshot (UI driver path). Pass the
     * `RoundEvent[]` from `resolveCombatRound` as the second argument to
     * surface the per-round sub-event stream on the emitted `combat:round`
     * event — the agent-e2e grader and any RN consumer needs it to inspect
     * what skills / items / effects actually did. Omit if the caller is
     * only mutating combat state for non-round reasons.
     */
    updateCombat: (combat: CombatState, combatEvents?: readonly RoundEvent[]) => void;
    endCombat: () => CombatEndReport;

    // ── World / dialogue ─────────────────────────────────────────────────────
    moveToNode: (nodeId: string) => void;
    processNode: () => void;
    applyDialogue: (tree: DialogueTree, choice: DialogueChoice) => void;

    // ── Inventory ────────────────────────────────────────────────────────────
    addItem: (item: Item) => void;
    removeItem: (itemId: string) => void;
    useConsumable: (itemId: string) => void;
    stackItem: (itemId: string, amount: number) => void;

    // ── Equipment ────────────────────────────────────────────────────────────
    equipItem: (item: Equipment) => void;
    unequipItem: (slot: EquipmentSlot) => void;

    // ── Progression / persistence ────────────────────────────────────────────
    levelUp: () => void;
    allocateStatPoint: (stat: 'heart' | 'body' | 'mind') => void;
    learnSkill: (skillId: string) => void;
    save: () => void;
    // ── Morality ─────────────────────────────────────────────────────────────
    shiftMoralMeter: (delta: number, gating?: { min?: number; max?: number }) => void;
    // ── Philosophical alignment ──────────────────────────────────────────────
    shiftPhilosophicalAlignment: (delta: Partial<PhilosophicalAlignment>) => void;
}

/** Full store type — state + actions. */
export type GameStore = GameState & GameActions;

/**
 * Map a `GameAction` to the corresponding `GameEvent` (or null if the action
 * shouldn't broadcast). The reducer is pure, so the store is the right place
 * for these side-effecting notifications.
 */
/**
 * Compute the extra envelope fields that depend on the prev→next diff.
 * Today this is only the Phase 30 `unlockedSkills` bag for level-ups —
 * the list of skill ids that became eligible because the promotion
 * crossed a learning-requirement threshold.
 */
function enrichExtra(
    action: GameAction,
    prev: GameState,
    next: GameState,
    extra?: { report?: CombatEndReport },
): { report?: CombatEndReport; unlockedSkills?: string[] } | undefined {
    if (action.type !== 'LEVEL_UP') return extra;
    if (next.player.level === prev.player.level) return extra; // No promotion → no diff.
    const before = new Set(getAvailableSkills(prev.player).map(s => s.id));
    const after = getAvailableSkills(next.player).map(s => s.id);
    const unlockedSkills = after.filter(id => !before.has(id));
    return { ...(extra ?? {}), unlockedSkills };
}

function eventForAction(
    action: GameAction,
    nextState: GameState,
    extra?: { report?: CombatEndReport; unlockedSkills?: string[] },
): GameEvent | null {
    const map: Partial<Record<GameAction['type'], GameEventType>> = {
        START_COMBAT:   'combat:started',
        COMBAT_ROUND:   'combat:round',
        END_COMBAT:     'combat:ended',
        MOVE_TO_NODE:   'world:moved',
        PROCESS_NODE:   'world:processed',
        APPLY_DIALOGUE: 'dialogue:applied',
        LEVEL_UP:       'character:levelup',
        USE_ITEM:       'inventory:changed',
        EQUIP_ITEM:     'inventory:changed',
        UNEQUIP_ITEM:   'inventory:changed',
        SAVE_GAME:      'game:saved',
        LOAD_GAME:      'game:loaded',
    };
    const type = map[action.type];
    if (!type) return null;
    return { type, payload: { action, state: nextState, ...(extra ?? {}) } };
}

/**
 * Constructs a Zustand vanilla store backed by `adapter`.
 *
 * @param adapter   - Persistence backend (Node fs, AsyncStorage, null for tests).
 * @param overrides - Optional partial state to merge over the loaded/default state.
 * @param emitter   - Optional event emitter; consumers subscribe to it to
 *                    learn about combat / world / progression transitions.
 *                    Kept outside `GameState` so handlers don't serialise.
 */
export function createGameStore(
    adapter: PersistenceAdapter,
    overrides?: Partial<GameState>,
    emitter?: GameEventEmitter,
): StoreApi<GameStore> {
    const saved   = adapter.load();
    const base    = saved ?? createNewGameState();
    const initial: GameState = { ...base, ...overrides };

    // Restore RNG state from loaded save
    if (saved?.rngState !== undefined) {
        getRng().setState(saved.rngState);
    }

    return createStore<GameStore>()((set, get) => {
        // Core dispatch: run reducer → set → emit → autosave.
        // TODO(spec-09): autosave fires on every action. Throttle (or restrict
        //  to map transitions) if playtesting reveals the cadence is too
        //  brutal — Spec 09 Q4 deliberately leaves this dial open.
        function dispatch(action: GameAction, extra?: { report?: CombatEndReport }): GameState {
            const prev = get();
            const next = gameReducer(prev, action);
            set(next);
            const enriched = enrichExtra(action, prev, next, extra);
            const event = eventForAction(action, next, enriched);
            if (event && emitter) emitter.emit(event);
            // Save excludes transient currentEncounter — encounters re-roll on
            // load (Spec 07).
            const {
                currentEncounter: _drop, version, player, world, combat, quests, flags,
                moralMeter, rngState, philosophicalAlignment,
            } = next;
            adapter.save({
                version, player, world, combat, quests, flags,
                moralMeter, rngState, philosophicalAlignment,
            });
            return next;
        }

        return {
            ...initial,

            dispatch(action) { dispatch(action); },

            // ── Combat ───────────────────────────────────────────────────────
            startCombat(target) {
                dispatch({ type: 'START_COMBAT', payload: { target } });
            },

            updateCombat(combat, combatEvents) {
                // Direct state edit — the existing combat CLI loop relies on
                // mutating the snapshot between rounds (it calls
                // resolveCombatRound itself). Run autosave + event for parity.
                set({ combat });
                const next = get();
                if (emitter) emitter.emit({
                    type: 'combat:round',
                    payload: {
                        state: next,
                        ...(combatEvents !== undefined ? { combatEvents } : {}),
                    },
                });
                const {
                    currentEncounter: _drop, version, player, world, combat: cb, quests, flags,
                    moralMeter, rngState, philosophicalAlignment,
                } = next;
                adapter.save({
                    version, player, world, combat: cb, quests, flags,
                    moralMeter, rngState, philosophicalAlignment,
                });
            },

            endCombat() {
                const pre = get();
                if (!pre.combat) {
                    return { outcome: 'flee', xpGained: 0, loot: [] };
                }
                const outcome: CombatEndReport['outcome'] =
                    pre.combat.enemy.health <= 0 ? 'victory'
                    : pre.combat.player.health <= 0 ? 'defeat'
                    : pre.combat.friendshipCounter >= FRIENDSHIP_COUNTER_MAX ? 'friendship'
                    : 'flee';

                let xpGained = 0;
                let loot: Item[] = [];
                if (outcome === 'victory' && pre.currentEncounter) {
                    xpGained = totalEncounterXp(pre.currentEncounter);
                    loot = rollEncounterLoot(pre.currentEncounter);
                } else if (outcome === 'friendship' && pre.currentEncounter) {
                    // Phase 36 — friendship grants half the kill-win XP and the
                    // full loot table (consistent with the reducer treating
                    // friendship as a peaceful resolution rather than a flee).
                    xpGained = Math.floor(totalEncounterXp(pre.currentEncounter) * 0.5);
                    loot = rollEncounterLoot(pre.currentEncounter);
                }

                const report: CombatEndReport = { outcome, xpGained, loot };
                dispatch(
                    { type: 'END_COMBAT', payload: { grantedLoot: loot, grantedXp: xpGained } },
                    { report },
                );
                return report;
            },

            // ── World / dialogue ─────────────────────────────────────────────
            moveToNode(nodeId) {
                dispatch({ type: 'MOVE_TO_NODE', payload: { nodeId } });
            },

            processNode() {
                dispatch({ type: 'PROCESS_NODE' });
            },

            applyDialogue(tree, choice) {
                dispatch({ type: 'APPLY_DIALOGUE', payload: { tree, choice } });
            },

            // ── Inventory ────────────────────────────────────────────────────
            addItem(item) {
                set(state => ({
                    player: { ...state.player, inventory: addItemReducer(state.player.inventory, item) },
                }));
                if (emitter) emitter.emit({ type: 'inventory:changed', payload: { item, state: get() } });
            },

            removeItem(itemId) {
                set(state => ({
                    player: { ...state.player, inventory: removeItemReducer(state.player.inventory, itemId) },
                }));
                if (emitter) emitter.emit({ type: 'inventory:changed', payload: { state: get() } });
            },

            useConsumable(itemId) {
                dispatch({ type: 'USE_ITEM', payload: { itemId } });
            },

            stackItem(itemId, amount) {
                set(state => ({
                    player: { ...state.player, inventory: stackItemReducer(state.player.inventory, itemId, amount) },
                }));
                if (emitter) emitter.emit({ type: 'inventory:changed', payload: { state: get() } });
            },

            // ── Equipment ────────────────────────────────────────────────────
            equipItem(item) {
                dispatch({ type: 'EQUIP_ITEM', payload: { item } });
            },

            unequipItem(slot) {
                dispatch({ type: 'UNEQUIP_ITEM', payload: { slot } });
            },

            // ── Progression / persistence ────────────────────────────────────
            levelUp() {
                dispatch({ type: 'LEVEL_UP' });
            },

            allocateStatPoint(stat) {
                dispatch({ type: 'ALLOCATE_STAT_POINT', payload: { stat } });
            },

            learnSkill(skillId) {
                dispatch({ type: 'LEARN_SKILL', payload: { skillId } });
            },

            save() {
                const next = get();
                const {
                    currentEncounter: _drop, version, player, world, combat, quests, flags,
                    moralMeter, rngState, philosophicalAlignment,
                } = next;
                adapter.save({
                    version, player, world, combat, quests, flags,
                    moralMeter, rngState, philosophicalAlignment,
                });
                if (emitter) emitter.emit({ type: 'game:saved', payload: { state: next } });
            },

            // ── Morality ──────────────────────────────────────────────────────
            shiftMoralMeter(delta: number, gating?: { min?: number; max?: number }) {
                dispatch({ type: 'SHIFT_MORAL_METER', payload: { delta, gating } });
            },

            // ── Philosophical alignment ──────────────────────────────────────
            shiftPhilosophicalAlignment(delta: Partial<PhilosophicalAlignment>) {
                dispatch({ type: 'SHIFT_PHILOSOPHICAL_ALIGNMENT', payload: { delta } });
            },
        };
    });
}

// ─── Selectors ────────────────────────────────────────────────────────────────

export type { StoreApi };

export const selectPlayer      = (s: GameStore): Character          => s.player;
export const selectCombat      = (s: GameStore): CombatState | null => s.combat;
export const selectIsInCombat  = (s: GameStore): boolean            => s.combat !== null;
export const selectInventory   = (s: GameStore): Item[]             => s.player.inventory;
export const selectVersion     = (s: GameStore): number             => s.version;
export const selectMoralMeter  = (s: GameStore): number             => s.moralMeter;

// Backwards-compat alias.
export const selectCombatState = selectCombat;
