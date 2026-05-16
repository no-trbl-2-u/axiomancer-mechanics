/**
 * Hermetic E2E Tests — Combat Resolver
 *
 * This file is the *canonical example* of a hermetic e2e test in this repo.
 * If you are writing a new e2e test, copy its structure. The full standard
 * lives in `docs/testing.md`.
 *
 * Hermetic = self-contained + deterministic + isolated:
 *   1. Self-contained — no disk I/O (nullAdapter), no network, no TTY.
 *   2. Deterministic  — Math.random is stubbed via the helpers in
 *                       `src/test-utils/rng.ts` so rolls are reproducible.
 *   3. Isolated       — `vi.restoreAllMocks` in afterEach keeps tests
 *                       independent.
 *
 * What IS covered here:
 *   • Full combat-round resolution through `resolveCombatRound` (the resolver).
 *   • All three win conditions: player victory, KO, friendship.
 *   • State invariants (HP clamp, round counter, fixture immutability).
 *   • Game-store lifecycle (startCombat → updateCombat → endCombat) with
 *     the nullAdapter, confirming zero disk access.
 *
 * What CANNOT be tested hermetically (called out in `docs/testing.md`):
 *   • The interactive demo CLI (`src/CLI/game.cli.ts`, run via `npm run
 *     game`) — it owns display and needs TTY prompts via inquirer. The
 *     engine modules it dispatches into are the durable contract; keep
 *     all combat logic in `combat.resolver.ts` and its `phases/` so it
 *     stays testable here.
 *
 * RNG convention used by `mockAlternatingRng`:
 *   Alternating 0.9 / 0.1 → `randomInt(1, 20)` yields 19 then 3. For a
 *   2d20-keep-max (advantage) roll this gives max(19, 3) = 19; for
 *   2d20-keep-min (disadvantage) min(19, 3) = 3.
 */

import { describe, it, expect, afterEach, vi } from 'vitest';

import { Player } from '../../Character/characters.mock';
import { Disatree_01 } from '../../Enemy/enemy.library';
import { createGameStore } from '../../Game/store';
import { nullAdapter } from '../../Game/persistence/null.adapter';
import { FRIENDSHIP_COUNTER_MAX } from '../../Game/game-mechanics.constants';
import { mockAlternatingRng, mockSequentialRng } from '../../test-utils/rng';
import { isCombatOngoing, determineCombatEnd } from '../index';
import { initializeCombat } from '../combat.reducer';
import { resolveCombatRound } from '../combat.resolver';

// ─── Tests ───────────────────────────────────────────────────────────────────

afterEach(() => {
    vi.restoreAllMocks();
});

// ────────────────────────────────────────────────────────────────────────────
// WIN CONDITION: Friendship victory
//
// Both sides choose 'defend' every round — the only scenario with zero RNG.
// After FRIENDSHIP_COUNTER_MAX rounds, isCombatOngoing returns false.
// ────────────────────────────────────────────────────────────────────────────

describe('Win condition: friendship victory', () => {
    it('friendship counter reaches FRIENDSHIP_COUNTER_MAX when both always defend', () => {
        let state = initializeCombat(Player, Disatree_01);

        let rounds = 0;
        while (isCombatOngoing(state) && rounds < 20) {
            ({ state } = resolveCombatRound(
                state,
                { stance: 'heart', action: 'defend' },
                { stance: 'heart', action: 'defend' },
            ));
            rounds++;
        }

        expect(determineCombatEnd(state)).toBe('friendship');
        expect(state.friendshipCounter).toBe(FRIENDSHIP_COUNTER_MAX);
        // Each round increments by 1, so rounds == counter
        expect(rounds).toBe(FRIENDSHIP_COUNTER_MAX);
    });

    // Phase 36 — store.endCombat() reports outcome='friendship' (not 'flee')
    // when the friendship-counter capped, grants 0.5x kill-win XP, and rolls
    // the loot table. The reducer side has shipped this since Phase 10 (full
    // XP via grantedXp fallback); the store was always reporting 'flee' and
    // zeroing the XP. Closes Knowledge-Gaps Q5 + Spec 06 Q2 follow-up.
    it('store endCombat() reports friendship outcome with half-XP grant', async () => {
        const { createGameStore: makeStore } = await import('../../Game/store');
        const { TidepoolCrab } = await import('../../Enemy/enemy.library');

        const store = makeStore(nullAdapter, { player: Player });
        const encounter = { enemies: [TidepoolCrab] };
        store.getState().startCombat(encounter);

        // Drive heart/defend rounds until the friendship counter caps.
        let combat = store.getState().combat;
        const playerXpBefore = store.getState().player.experience;
        let safety = 0;
        while (combat && isCombatOngoing(combat) && safety < 20) {
            const next = resolveCombatRound(
                combat,
                { stance: 'heart', action: 'defend' },
                { stance: 'heart', action: 'defend' },
            ).state;
            store.getState().updateCombat(next);
            combat = store.getState().combat;
            safety++;
        }
        expect(combat?.friendshipCounter).toBe(FRIENDSHIP_COUNTER_MAX);

        const expectedXp = Math.floor((TidepoolCrab.xpReward ?? 0) * 0.5);
        const report = store.getState().endCombat();

        expect(report.outcome).toBe('friendship');
        expect(report.xpGained).toBe(expectedXp);
        // Player's experience reflects the granted XP (cascade through reducer).
        expect(store.getState().player.experience).toBe(playerXpBefore + expectedXp);
    });
});

// ────────────────────────────────────────────────────────────────────────────
// WIN CONDITION: Player victory
//
// Player uses Mind vs enemy Heart → player has type advantage (2d20 keep max)
// and enemy has disadvantage (2d20 keep min).  With the alternating RNG:
//   Player roll:  max(19, 3) = 19 + mind_attack(2) = 21
//   Enemy roll:   min(19, 3) = 3 + heart_attack(1) + rollModifier(-5) = -1
// Player wins the contest and deals damage large enough to KO Disatree_01
// (health 10) in one round.
// ────────────────────────────────────────────────────────────────────────────

describe('Win condition: player victory', () => {
    it('enemy HP reaches 0 when player has type advantage and RNG favors player', () => {
        mockAlternatingRng();

        let state = initializeCombat(Player, Disatree_01);

        let rounds = 0;
        while (isCombatOngoing(state) && rounds < 50) {
            ({ state } = resolveCombatRound(
                state,
                { stance: 'mind', action: 'attack' },
                { stance: 'heart', action: 'attack' },
            ));
            rounds++;
        }

        expect(determineCombatEnd(state)).toBe('player');
        expect(state.enemy.health).toBe(0);
        // With these fixtures the enemy is defeated in a single round
        expect(rounds).toBe(1);
    });
});

// ────────────────────────────────────────────────────────────────────────────
// WIN CONDITION: Player KO
//
// Player uses Heart vs enemy Mind → player has disadvantage, enemy has advantage.
// The player also gains Fleeting Kindness (tier-1 heart/attack self-buff,
// rollModifier: -5), which further reduces their roll each round.
//   Player roll:  min(19, 3) = 3 + heart_attack(4) + rollModifier(-5) = 2
//   Enemy roll:   max(19, 3) = 19 + mind_attack(1) = 20
// Each round the enemy deals 16 damage; player (health 35) is KO'd in 3 rounds.
// ────────────────────────────────────────────────────────────────────────────

describe('Win condition: player KO', () => {
    it('player HP reaches 0 when enemy has type advantage and RNG favors enemy', () => {
        mockAlternatingRng();

        let state = initializeCombat(Player, Disatree_01);

        let rounds = 0;
        while (isCombatOngoing(state) && rounds < 50) {
            ({ state } = resolveCombatRound(
                state,
                { stance: 'heart', action: 'attack' },
                { stance: 'mind', action: 'attack' },
            ));
            rounds++;
        }

        expect(determineCombatEnd(state)).toBe('ko');
        expect(state.player.health).toBe(0);
        expect(rounds).toBe(3);
    });
});

// ────────────────────────────────────────────────────────────────────────────
// CRIT WIRING (Phase 32 — resolver-path integration)
//
// The damage helpers `selectCritDamage` / `calculateFinalDamage` are unit-
// tested in `src/Combat/index.test.ts`; this block pins the wiring through
// `resolveCombatRound` → `scenario.ts` → `damage-applied` event. With
// `mockSequentialRng(0.99)` every d20 rolls 20, so `isCriticalHit(20)` fires
// and the player's `damage-applied` event must carry `isCritical: true` +
// a `critStyle`. The control case uses `mockSequentialRng(0.5)` so every
// d20 rolls 11 — no crit, no fields.
// ────────────────────────────────────────────────────────────────────────────

describe('Crit wiring (Phase 32)', () => {
    it('emits isCritical + critStyle on damage-applied when the attacker rolls nat 20', () => {
        mockSequentialRng(0.99);

        const state = initializeCombat(Player, Disatree_01);
        const { combatEvents } = resolveCombatRound(
            state,
            { stance: 'mind', action: 'attack' },
            { stance: 'heart', action: 'attack' },
        );

        const playerHit = combatEvents.find(
            (ev): ev is Extract<typeof ev, { kind: 'damage-applied' }> =>
                ev.phase === 'scenario' && ev.kind === 'damage-applied' && ev.attacker === 'player',
        );

        expect(playerHit).toBeDefined();
        expect(playerHit?.isCritical).toBe(true);
        expect(playerHit?.critStyle === 'double' || playerHit?.critStyle === 'pierce').toBe(true);
    });

    it('omits isCritical on a non-crit hit', () => {
        mockSequentialRng(0.5);

        const state = initializeCombat(Player, Disatree_01);
        const { combatEvents } = resolveCombatRound(
            state,
            { stance: 'mind', action: 'attack' },
            { stance: 'heart', action: 'attack' },
        );

        const playerHit = combatEvents.find(
            (ev): ev is Extract<typeof ev, { kind: 'damage-applied' }> =>
                ev.phase === 'scenario' && ev.kind === 'damage-applied' && ev.attacker === 'player',
        );

        expect(playerHit).toBeDefined();
        expect(playerHit?.isCritical).toBeUndefined();
        expect(playerHit?.critStyle).toBeUndefined();
    });
});

// ────────────────────────────────────────────────────────────────────────────
// INVARIANTS
// ────────────────────────────────────────────────────────────────────────────

describe('State invariants', () => {
    it('round counter starts at 1 and increments once per resolveCombatRound call', () => {
        mockAlternatingRng();

        let state = initializeCombat(Player, Disatree_01);
        expect(state.round).toBe(1);

        ({ state } = resolveCombatRound(state, { stance: 'body', action: 'defend' }, { stance: 'body', action: 'attack' }));
        expect(state.round).toBe(2);

        ({ state } = resolveCombatRound(state, { stance: 'body', action: 'defend' }, { stance: 'body', action: 'attack' }));
        expect(state.round).toBe(3);
    });

    it('HP is always ≥ 0 throughout a full combat encounter', () => {
        mockAlternatingRng();

        let state = initializeCombat(Player, Disatree_01);
        let rounds = 0;

        while (isCombatOngoing(state) && rounds < 50) {
            ({ state } = resolveCombatRound(
                state,
                { stance: 'mind', action: 'attack' },
                { stance: 'heart', action: 'attack' },
            ));
            rounds++;
            expect(state.player.health).toBeGreaterThanOrEqual(0);
            expect(state.enemy.health).toBeGreaterThanOrEqual(0);
        }
    });

    it('initializeCombat deep-clones combatants so mutations stay scoped to combat', () => {
        const state = initializeCombat(Player, Disatree_01);

        // Mutating combat's player does not change the source fixture
        (state.player as { health: number }).health = 0;
        expect(Player.health).toBe(Player.maxHealth);
    });
});

// ────────────────────────────────────────────────────────────────────────────
// GAME STORE LIFECYCLE — nullAdapter (zero disk access)
// ────────────────────────────────────────────────────────────────────────────

describe('Game store lifecycle with nullAdapter', () => {
    it('nullAdapter.load() always returns null — no saved state on disk', () => {
        expect(nullAdapter.load()).toBeNull();
    });

    it('nullAdapter.save() is a silent no-op and never throws', () => {
        const store = createGameStore(nullAdapter, { player: Player });
        expect(() => store.getState().save()).not.toThrow();
    });

    it('save() autosaves on every action (Spec 09 Q4)', () => {
        const saveSpy = vi.spyOn(nullAdapter, 'save');

        const store = createGameStore(nullAdapter, { player: Player });
        store.getState().startCombat(Disatree_01);
        store.getState().endCombat();

        // Autosave fires after each dispatch — Spec 09 leaves room to throttle
        // this later if the cadence proves too brutal.
        expect(saveSpy).toHaveBeenCalled();
    });

    it('startCombat creates a combat snapshot without mutating root player', () => {
        const store = createGameStore(nullAdapter, { player: Player });
        const rootHpBefore = store.getState().player.health;

        store.getState().startCombat(Disatree_01);

        // A combat snapshot now exists
        expect(store.getState().combat).not.toBeNull();
        // Root player is still intact
        expect(store.getState().player.health).toBe(rootHpBefore);
    });

    it('endCombat promotes the combat-player snapshot to root and clears combat', () => {
        mockAlternatingRng();

        const store = createGameStore(nullAdapter, { player: Player });
        store.getState().startCombat(Disatree_01);

        // Advance one turn
        const { state: next } = resolveCombatRound(
            store.getState().combat!,
            { stance: 'mind', action: 'attack' },
            { stance: 'heart', action: 'attack' },
        );
        store.getState().updateCombat(next);

        const combatPlayerHp = next.player.health;

        store.getState().endCombat();

        expect(store.getState().combat).toBeNull();
        expect(store.getState().player.health).toBe(combatPlayerHp);
    });

    it('a full combat loop via the store ends in a consistent outcome', () => {
        mockAlternatingRng();

        const store = createGameStore(nullAdapter, { player: Player });
        store.getState().startCombat(Disatree_01);

        let guard = 0;
        while (true) {
            const combat = store.getState().combat;
            if (!combat || !isCombatOngoing(combat)) break;
            const { state: next } = resolveCombatRound(
                combat,
                { stance: 'mind', action: 'attack' },
                { stance: 'heart', action: 'attack' },
            );
            store.getState().updateCombat(next);
            if (++guard > 100) throw new Error('Combat loop did not terminate');
        }

        const finalCombat = store.getState().combat!;
        store.getState().endCombat();

        // Combat cleared, root player health updated
        expect(store.getState().combat).toBeNull();
        expect(store.getState().player.health).toBe(finalCombat.player.health);
        // Outcome is deterministic with stubbed RNG
        expect(determineCombatEnd(finalCombat)).toBe('player');
    });
});
