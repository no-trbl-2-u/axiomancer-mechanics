/**
 * Hazard v2 engine — hermetic unit suite. Seeded RNG only; no timers,
 * no network, no Math.random.
 *
 * Ported from the mobile v2 source of truth
 * (`../axiomancer-mobile/state/hazard/__tests__/engine.test.ts`). This is
 * the divergence-proof suite for `docs/hazard-v2-vs-mechanics-divergence.md`:
 * route-select-first session, 4 dice once, gold-wild powering, utilities on
 * apply, no between-round re-cast, salvage, momentum, tiered outcomes, reward
 * offers, reserves, and the deck-flag codec.
 */

import { describe, it, expect } from 'vitest';

import {
    acknowledgeHazardOutcome,
    applyHazardCard,
    claimHazardRewards,
    continueHazardAfterResolve,
    createHazardSession,
    discardHazardCard,
    finishHazardRolling,
    hazardCardValue,
    hazardProjectedProgress,
    hazardTierOf,
    powerHazardCard,
    resolveHazardRound,
    selectHazardRoute,
    stageHazardCard,
    unstageHazardCard,
} from '../hazard.engine';
import {
    getHazardCardDef,
    getHazardDef,
    HAZARD_CRACK_CARD,
    HAZARD_DECK,
    HAZARD_LIBRARY,
    HAZARD_REWARD_CARDS,
} from '../hazard.content';
import { appendAcquiredCard, decodeAcquiredCards, hazardDeckBag, hazardStarterBag } from '../hazard.deck-flags';
import {
    HAZARD_DICE_COUNT,
    HAZARD_HAND_SIZE,
    HAZARD_MOMENTUM_CAP,
    type HazardHandEntry,
    type HazardSessionState,
} from '../hazard.types';

const BAG = hazardStarterBag();
const HAZARD_ID = 'cracked-cliff';

function freshSession(seed = 7): HazardSessionState {
    return createHazardSession(seed, BAG, HAZARD_ID);
}

function playingSession(seed = 7, route: 'safe' | 'risk' = 'safe'): HazardSessionState {
    return finishHazardRolling(selectHazardRoute(freshSession(seed), route, BAG));
}

/** Force a deterministic hand/dice arrangement for targeted scenarios. */
function rig(
    s: HazardSessionState,
    over: Partial<HazardSessionState>,
): HazardSessionState {
    return { ...s, ...over };
}

function entry(uid: string, cardId: string, dieId: string | null = null): HazardHandEntry {
    return { uid, cardId, dieId };
}

describe('hazard session lifecycle', () => {
    it('opens in route-select with a full hand visible BEFORE dice exist', () => {
        const s = freshSession();
        expect(s.phase).toBe('route-select');
        expect(s.hand).toHaveLength(HAZARD_HAND_SIZE);
        expect(s.dice).toHaveLength(0);
        expect(s.marks).toEqual(['pending', 'pending', 'pending']);
    });

    it('is deterministic for a fixed seed', () => {
        const a = createHazardSession(42, BAG, HAZARD_ID);
        const b = createHazardSession(42, BAG, HAZARD_ID);
        expect(a).toEqual(b);
    });

    it('differs across seeds', () => {
        const a = createHazardSession(1, BAG, HAZARD_ID);
        const b = createHazardSession(2, BAG, HAZARD_ID);
        expect(a.hand.map((h) => h.cardId)).not.toEqual(b.hand.map((h) => h.cardId));
    });

    it('selectHazardRoute casts exactly four dice and binds the route', () => {
        const s = selectHazardRoute(freshSession(), 'risk', BAG);
        expect(s.phase).toBe('rolling');
        expect(s.route).toBe('risk');
        expect(s.dice).toHaveLength(HAZARD_DICE_COUNT);
        for (const d of s.dice) {
            expect(['red', 'blue', 'purple', 'gold', 'hex']).toContain(d.kind);
            expect(d.state).toBe('available');
        }
    });

    it('route selection is a no-op outside route-select', () => {
        const s = playingSession();
        expect(selectHazardRoute(s, 'risk', BAG)).toBe(s);
    });

    it('finishHazardRolling moves rolling → playing only', () => {
        const rolling = selectHazardRoute(freshSession(), 'safe', BAG);
        expect(finishHazardRolling(rolling).phase).toBe('playing');
        const idle = freshSession();
        expect(finishHazardRolling(idle)).toBe(idle);
    });
});

describe('staging and unstaging', () => {
    it('stages a hand card into the play area', () => {
        const s = playingSession();
        const uid = s.hand[0].uid;
        const ns = stageHazardCard(s, uid, BAG);
        expect(ns.play.map((p) => p.uid)).toContain(uid);
        expect(ns.hand.map((h) => h.uid)).not.toContain(uid);
    });

    it('the play area is uncapped — the whole hand can be staged', () => {
        let s = playingSession();
        // rig a 7-card hand of plain cards
        const hand = Array.from({ length: 7 }, (_, i) => entry(`h${i}`, 'steps'));
        s = rig(s, { hand, play: [] });
        for (const h of hand) s = stageHazardCard(s, h.uid, BAG);
        expect(s.play).toHaveLength(7);
        expect(s.hand).toHaveLength(0);
    });

    it('unstage returns the card and frees its die', () => {
        let s = playingSession();
        s = rig(s, {
            hand: [entry('h1', 'steps')],
            play: [],
            dice: [{ id: 'dx', kind: 'red', state: 'available' }],
        });
        s = stageHazardCard(s, 'h1', BAG);
        s = powerHazardCard(s, 'h1', 'dx', BAG);
        expect(s.dice[0].state).toBe('spent');
        s = unstageHazardCard(s, 'h1');
        expect(s.play).toHaveLength(0);
        expect(s.hand[0].uid).toBe('h1');
        expect(s.hand[0].dieId).toBeNull();
        expect(s.dice[0].state).toBe('available');
    });
});

describe('powering cards with dice (SURGE)', () => {
    function poweringSetup(cardId: string, dieKind: string): HazardSessionState {
        let s = playingSession();
        s = rig(s, {
            hand: [entry('h1', cardId)],
            play: [],
            dice: [{ id: 'dx', kind: dieKind as never, state: 'available' }],
        });
        return stageHazardCard(s, 'h1', BAG);
    }

    it('matching colour powers the card and spends the die', () => {
        const s = powerHazardCard(poweringSetup('steps', 'red'), 'h1', 'dx', BAG);
        expect(s.play[0].dieId).toBe('dx');
        expect(s.dice[0].state).toBe('spent');
    });

    it('mismatched colour is rejected', () => {
        const before = poweringSetup('steps', 'blue');
        expect(powerHazardCard(before, 'h1', 'dx', BAG)).toBe(before);
    });

    it('hex dice are blocked', () => {
        const before = poweringSetup('steps', 'hex');
        expect(powerHazardCard(before, 'h1', 'dx', BAG)).toBe(before);
    });

    it('gold cards accept ONLY gold dice', () => {
        for (const kind of ['red', 'blue', 'purple']) {
            const before = poweringSetup('oath', kind);
            expect(powerHazardCard(before, 'h1', 'dx', BAG)).toBe(before);
        }
        const s = powerHazardCard(poweringSetup('oath', 'gold'), 'h1', 'dx', BAG);
        expect(s.play[0].dieId).toBe('dx');
    });

    it('dead CRACK cards reject all dice and contribute nothing', () => {
        const before = poweringSetup(HAZARD_CRACK_CARD.id, 'purple');
        expect(powerHazardCard(before, 'h1', 'dx', BAG)).toBe(before);
        expect(hazardCardValue(entry('h1', HAZARD_CRACK_CARD.id))).toEqual({ force: 0, escape: 0 });
    });

    it('re-powering with a new die frees the old one', () => {
        let s = playingSession();
        s = rig(s, {
            hand: [entry('h1', 'steps')],
            play: [],
            dice: [
                { id: 'd1', kind: 'red', state: 'available' },
                { id: 'd2', kind: 'red', state: 'available' },
            ],
        });
        s = stageHazardCard(s, 'h1', BAG);
        s = powerHazardCard(s, 'h1', 'd1', BAG);
        s = powerHazardCard(s, 'h1', 'd2', BAG);
        expect(s.play[0].dieId).toBe('d2');
        expect(s.dice.find((d) => d.id === 'd1')?.state).toBe('available');
        expect(s.dice.find((d) => d.id === 'd2')?.state).toBe('spent');
    });

    it('card values follow free vs powered rows', () => {
        const def = getHazardCardDef('steps');
        expect(hazardCardValue(entry('x', 'steps'))).toEqual({ force: def.f, escape: def.e });
        expect(hazardCardValue(entry('x', 'steps', 'd1'))).toEqual({ force: def.fp, escape: def.ep });
    });
});

describe('utility card effects (fire on APPLY, not on stage/power)', () => {
    it('the wild gold die powers a card of ANY colour', () => {
        let s = playingSession();
        s = rig(s, {
            hand: [entry('h1', 'steps')],
            play: [],
            dice: [{ id: 'dg', kind: 'gold', state: 'available' }],
        });
        s = stageHazardCard(s, 'h1', BAG);
        s = powerHazardCard(s, 'h1', 'dg', BAG);
        expect(s.play[0].dieId).toBe('dg');
        const def = getHazardCardDef('steps');
        expect(hazardCardValue(s.play[0])).toEqual({ force: def.fp, escape: 0 });
    });

    it('SURE FOOTING draws nothing on stage; base 1 on apply, powered 2', () => {
        let s = playingSession();
        s = rig(s, {
            hand: [entry('h1', 'footing')],
            play: [],
            dice: [{ id: 'dp', kind: 'purple', state: 'available' }],
        });
        s = stageHazardCard(s, 'h1', BAG);
        expect(s.hand).toHaveLength(0); // staged, no draw yet
        // base apply (no die) draws drawBase = 1
        const base = applyHazardCard(s, 'h1', BAG);
        expect(base.hand).toHaveLength(1);
        expect(base.play[0].applied).toBe(true);
        // powered apply draws drawPowered = 2
        const powered = applyHazardCard(powerHazardCard(s, 'h1', 'dp', BAG), 'h1', BAG);
        expect(powered.hand).toHaveLength(2);
    });

    it('apply is one-way: re-apply, unstage, power, and discard are all refused', () => {
        let s = playingSession();
        s = rig(s, {
            hand: [entry('h1', 'steps')],
            play: [],
            dice: [{ id: 'dr', kind: 'red', state: 'available' }],
        });
        s = stageHazardCard(s, 'h1', BAG);
        s = applyHazardCard(s, 'h1', BAG);
        expect(s.play[0].applied).toBe(true);
        expect(applyHazardCard(s, 'h1', BAG)).toBe(s);
        expect(unstageHazardCard(s, 'h1')).toBe(s);
        expect(powerHazardCard(s, 'h1', 'dr', BAG)).toBe(s);
    });

    it('BALANCE POLE re-casts available dice on apply (base, no bonus die)', () => {
        let s = playingSession(11);
        s = rig(s, {
            hand: [entry('h1', 'pole')],
            play: [],
            dice: [
                { id: 'd1', kind: 'red', state: 'available' },
                { id: 'd2', kind: 'blue', state: 'spent' },
                { id: 'd3', kind: 'purple', state: 'available' },
            ],
        });
        s = stageHazardCard(s, 'h1', BAG);
        s = applyHazardCard(s, 'h1', BAG); // base recast — no die attached
        expect(s.dice).toHaveLength(3); // no bonus die at base tier
        expect(s.dice.find((d) => d.id === 'd2')).toBeDefined(); // spent untouched
        expect(s.dice.find((d) => d.id === 'd1')).toBeUndefined(); // recast
        expect(s.dice.find((d) => d.id === 'd3')).toBeUndefined(); // recast
    });

    it('powered re-cast adds a bonus die', () => {
        let s = playingSession(11);
        s = rig(s, {
            hand: [entry('h1', 'pole')],
            play: [],
            dice: [
                { id: 'dp', kind: 'purple', state: 'available' },
                { id: 'dx', kind: 'red', state: 'available' },
            ],
        });
        s = stageHazardCard(s, 'h1', BAG);
        s = powerHazardCard(s, 'h1', 'dp', BAG); // spend a purple die on the card
        s = applyHazardCard(s, 'h1', BAG); // powered → recast + bonus die
        expect(s.dice.filter((d) => d.temporary)).toHaveLength(1);
        expect(s.dice.find((d) => d.temporary)?.kind).not.toBe('hex');
    });

    it('READ THE WIND converts hex dice to its own colour on apply', () => {
        let s = playingSession();
        s = rig(s, {
            hand: [entry('h1', 'windread')],
            play: [],
            dice: [
                { id: 'd1', kind: 'hex', state: 'available' },
                { id: 'd2', kind: 'hex', state: 'available' },
                { id: 'd3', kind: 'blue', state: 'available' },
            ],
        });
        s = stageHazardCard(s, 'h1', BAG);
        s = applyHazardCard(s, 'h1', BAG);
        expect(s.dice.filter((d) => d.kind === 'purple')).toHaveLength(2);
        expect(s.dice.find((d) => d.id === 'd3')?.kind).toBe('blue');
    });

    it('gold OATH: major draw fires for free; its dual number pays only when powered', () => {
        let s = playingSession();
        s = rig(s, {
            hand: [entry('h1', 'oath')],
            play: [],
            dice: [{ id: 'dg', kind: 'gold', state: 'available' }],
        });
        s = stageHazardCard(s, 'h1', BAG);
        expect(hazardCardValue(s.play[0])).toEqual({ force: 0, escape: 0 }); // free row 0/0
        s = powerHazardCard(s, 'h1', 'dg', BAG);
        const def = getHazardCardDef('oath');
        expect(hazardCardValue(s.play[0])).toEqual({ force: def.fp, escape: def.ep });
        const before = s.hand.length;
        s = applyHazardCard(s, 'h1', BAG);
        expect(s.hand.length).toBe(before + (def.drawPowered ?? def.drawBase ?? 0)); // major draw
    });
});

describe('round resolution — safe route (combined meter)', () => {
    it('clears when force+escape ≥ threshold and stamps O', () => {
        const def = getHazardDef(HAZARD_ID);
        const need = def.safe.thresholds[0];
        let s = playingSession(3, 'safe');
        // IRON GRIP free = 5F; rig enough copies to clear
        const copies = Math.ceil(need / 5);
        const hand = Array.from({ length: copies }, (_, i) => entry(`h${i}`, 'grip'));
        s = rig(s, { hand, play: [] });
        for (const h of hand) s = stageHazardCard(s, h.uid, BAG);
        s = resolveHazardRound(s);
        expect(s.phase).toBe('resolve-flash');
        expect(s.marks[0]).toBe('O');
        expect(s.resolveInfo?.cleared).toBe(true);
        expect(s.resolveInfo?.combined).toBeGreaterThanOrEqual(need);
    });

    it('fails short of threshold and stamps X', () => {
        let s = playingSession(3, 'safe');
        s = rig(s, { hand: [entry('h1', 'scram')], play: [] });
        s = stageHazardCard(s, 'h1', BAG);
        s = resolveHazardRound(s);
        expect(s.marks[0]).toBe('X');
        expect(s.resolveInfo?.cleared).toBe(false);
    });

    it('cannot resolve an empty play area', () => {
        const s = playingSession();
        expect(resolveHazardRound(s)).toBe(s);
    });
});

describe('round resolution — risk route (dual meters, BOTH required)', () => {
    it('one cleared meter alone still fails the round', () => {
        const def = getHazardDef(HAZARD_ID);
        const [nF] = def.risk.thresholds[0];
        let s = playingSession(3, 'risk');
        const copies = Math.ceil(nF / 5);
        const hand = Array.from({ length: copies }, (_, i) => entry(`h${i}`, 'grip'));
        s = rig(s, { hand, play: [] });
        for (const h of hand) s = stageHazardCard(s, h.uid, BAG);
        s = resolveHazardRound(s);
        expect(s.resolveInfo?.force).toBeGreaterThanOrEqual(nF);
        expect(s.resolveInfo?.cleared).toBe(false);
        expect(s.marks[0]).toBe('X');
    });

    it('both meters cleared in the same round stamps O', () => {
        const def = getHazardDef(HAZARD_ID);
        const [nF, nE] = def.risk.thresholds[0];
        let s = playingSession(3, 'risk');
        const gripCopies = Math.ceil(nF / 5);
        const leapCopies = Math.ceil(nE / 5);
        const hand = [
            ...Array.from({ length: gripCopies }, (_, i) => entry(`g${i}`, 'grip')),
            ...Array.from({ length: leapCopies }, (_, i) => entry(`l${i}`, 'leap')),
        ];
        s = rig(s, { hand, play: [] });
        for (const h of hand) s = stageHazardCard(s, h.uid, BAG);
        s = resolveHazardRound(s);
        expect(s.resolveInfo?.cleared).toBe(true);
        expect(s.marks[0]).toBe('O');
    });
});

describe('between rounds — the dice do NOT re-cast', () => {
    it('advances the round: same dice pool, PLAYED cards discard, the unplayed hand is KEPT, draw tops up to 5', () => {
        let s = playingSession(5, 'safe');
        const diceBefore = s.dice;
        s = rig(s, { hand: [entry('h1', 'steps'), entry('h2', 'scram')], play: [] });
        s = stageHazardCard(s, 'h1', BAG);
        s = resolveHazardRound(s);
        s = continueHazardAfterResolve(s, BAG);
        expect(s.phase).toBe('playing');
        expect(s.round).toBe(2);
        expect(s.dice).toEqual(diceBefore); // identity of the cast preserved
        // played card discarded; the held SCRAMBLE survives the boundary
        expect(s.discardPile).toEqual(['steps']);
        expect(s.hand.map((h) => h.uid)).toContain('h2');
        // drew back up to exactly HAZARD_HAND_SIZE
        expect(s.hand).toHaveLength(HAZARD_HAND_SIZE);
        expect(s.play).toHaveLength(0);
    });

    it('a draw-inflated hand keeps everything and draws nothing', () => {
        let s = playingSession(5, 'safe');
        const seven = Array.from({ length: 7 }, (_, i) => entry(`k${i}`, 'footing'));
        s = rig(s, { hand: [...seven, entry('p1', 'steps')], play: [] });
        s = stageHazardCard(s, 'p1', BAG);
        s = resolveHazardRound(s);
        s = continueHazardAfterResolve(s, BAG);
        expect(s.hand).toHaveLength(7); // all kept, none drawn
        expect(s.hand.map((h) => h.uid)).toEqual(seven.map((k) => k.uid));
    });

    it('spent dice stay spent across rounds', () => {
        let s = playingSession(5, 'safe');
        s = rig(s, {
            hand: [entry('h1', 'steps')],
            play: [],
            dice: [
                { id: 'd1', kind: 'red', state: 'available' },
                { id: 'd2', kind: 'blue', state: 'available' },
            ],
        });
        s = stageHazardCard(s, 'h1', BAG);
        s = powerHazardCard(s, 'h1', 'd1', BAG);
        s = resolveHazardRound(s);
        s = continueHazardAfterResolve(s, BAG);
        expect(s.dice.find((d) => d.id === 'd1')?.state).toBe('spent');
        expect(s.dice.find((d) => d.id === 'd2')?.state).toBe('available');
    });
});

describe('discard to the trash bin (salvage)', () => {
    it('progress salvage adds to the CURRENT round only', () => {
        let s = playingSession(5, 'safe');
        s = rig(s, { hand: [entry('h1', 'steps'), entry('h2', 'haul')], play: [], progressBase: { force: 0, escape: 0 } });
        s = discardHazardCard(s, 'h1'); // STONE STEPS salvage: +1 FORCE this round
        expect(s.hand.map((h) => h.uid)).toEqual(['h2']);
        expect(s.discardPile).toContain('steps');
        expect(s.progressBase.force).toBe(1);
        expect(hazardProjectedProgress(s).force).toBe(1);
        // the round advance overwrites the base — salvage does not persist
        s = stageHazardCard(s, 'h2', BAG);
        s = resolveHazardRound(s);
        const carry = s.resolveInfo!.carryForce;
        s = continueHazardAfterResolve(s, BAG);
        expect(s.progressBase.force).toBe(carry);
    });

    it('mana salvage conjures a temporary die of the card colour', () => {
        let s = playingSession(5, 'safe');
        s = rig(s, { hand: [entry('h1', 'haul')], play: [], dice: [] });
        s = discardHazardCard(s, 'h1'); // DEAD-MAN HAUL salvage: conjure a red die
        expect(s.dice).toHaveLength(1);
        expect(s.dice[0].kind).toBe('red');
        expect(s.dice[0].temporary).toBe(true);
        expect(s.dice[0].state).toBe('available');
    });

    it('CRACK cards discard for nothing (no salvage)', () => {
        let s = playingSession(5, 'safe');
        s = rig(s, { hand: [entry('h1', HAZARD_CRACK_CARD.id)], play: [], dice: [] });
        s = discardHazardCard(s, 'h1');
        expect(s.hand).toHaveLength(0);
        expect(s.dice).toHaveLength(0);
        expect(s.progressBase).toEqual({ force: 0, escape: 0 });
        expect(s.discardPile).toEqual([HAZARD_CRACK_CARD.id]);
    });

    it('discard is HAND-ONLY: a staged card cannot be binned', () => {
        let s = playingSession(5, 'safe');
        s = rig(s, {
            hand: [entry('h1', 'grip')],
            play: [],
            dice: [{ id: 'dr', kind: 'red', state: 'available' }],
        });
        s = stageHazardCard(s, 'h1', BAG);
        s = powerHazardCard(s, 'h1', 'dr', BAG);
        expect(discardHazardCard(s, 'h1')).toBe(s); // staged → no-op
    });

    it('discard is a no-op outside the playing phase and for unknown uids', () => {
        const reveal = freshSession();
        expect(discardHazardCard(reveal, 'nope')).toBe(reveal);
        const playing = playingSession(5, 'safe');
        expect(discardHazardCard(playing, 'nope')).toBe(playing);
    });
});

describe('momentum carry (REC#1)', () => {
    it('carries half the surplus, capped, into the next round', () => {
        const def = getHazardDef(HAZARD_ID);
        const need = def.safe.thresholds[0];
        let s = playingSession(3, 'safe');
        // Stage massive surplus: 6 × IRON GRIP free 5F = 30
        const hand = Array.from({ length: 6 }, (_, i) => entry(`h${i}`, 'grip'));
        s = rig(s, { hand, play: [] });
        for (const h of hand) s = stageHazardCard(s, h.uid, BAG);
        s = resolveHazardRound(s);
        const surplus = 30 - need;
        expect(s.resolveInfo?.carryForce).toBe(Math.min(HAZARD_MOMENTUM_CAP, Math.floor(surplus / 2)));
        s = continueHazardAfterResolve(s, BAG);
        expect(s.progressBase.force).toBe(Math.min(HAZARD_MOMENTUM_CAP, Math.floor(surplus / 2)));
        // projected progress includes the carried base
        expect(hazardProjectedProgress(s).force).toBe(s.progressBase.force);
    });

    it('no carry on a failed round', () => {
        let s = playingSession(3, 'safe');
        s = rig(s, { hand: [entry('h1', 'scram')], play: [] });
        s = stageHazardCard(s, 'h1', BAG);
        s = resolveHazardRound(s);
        expect(s.resolveInfo?.carryForce).toBe(0);
        expect(s.resolveInfo?.carryEscape).toBe(0);
    });
});

describe('outcome and rewards', () => {
    function runToOutcome(
        seed: number,
        route: 'safe' | 'risk',
        roundCard: string | null,
    ): HazardSessionState {
        let s = playingSession(seed, route);
        for (let round = 0; round < 3; round++) {
            const hand = roundCard
                ? Array.from({ length: 6 }, (_, i) => entry(`r${round}h${i}`, roundCard))
                : [entry(`r${round}h0`, 'crack')];
            s = rig(s, { hand: roundCard ? hand : [entry(`r${round}h0`, HAZARD_CRACK_CARD.id)], play: [] });
            for (const h of s.hand.slice()) s = stageHazardCard(s, h.uid, BAG);
            s = resolveHazardRound(s);
            s = continueHazardAfterResolve(s, BAG);
        }
        return s;
    }

    it('tier mapping: perfect / complete / failure', () => {
        expect(hazardTierOf(['O', 'O', 'O'])).toBe('perfect');
        expect(hazardTierOf(['O', 'X', 'X'])).toBe('complete');
        expect(hazardTierOf(['X', 'X', 'X'])).toBe('failure');
    });

    it('perfect run: gold-tier rewards, guaranteed rare offer, skippable, zero consequences', () => {
        // SURE FOOTING free 2/2 ×6 = 12/12 — clears every safe threshold
        // (and both risk meters at the tuned values).
        const s = runToOutcome(9, 'risk', 'footing');
        expect(s.phase).toBe('outcome');
        const o = s.outcome!;
        expect(o.tier).toBe('perfect');
        expect(o.consequences).toEqual([]);
        expect(o.canSkip).toBe(true);
        expect(o.offerCards).toHaveLength(3);
        expect(o.offerCards[0].rarity).toBe('rare');
        expect(o.rewards).toEqual(['cache', 'relic', 'token']);
        expect(o.penaltyVitae).toBe(0);
    });

    it('failure run: no offer cards, maximum consequences, scaled penalty', () => {
        const s = runToOutcome(9, 'risk', null);
        const o = s.outcome!;
        expect(o.tier).toBe('failure');
        expect(o.offerCards).toEqual([]);
        expect(o.consequences).toEqual(['minhp', 'maxhp', 'deadcard', 'curse']);
        expect(o.canSkip).toBe(false);
        const def = getHazardDef(HAZARD_ID);
        expect(o.penaltyVitae).toBe(def.risk.penaltyVitae * 3);
    });

    it('single-win complete: no rare offers (0% rare on one win)', () => {
        // Win only round 1 on safe, fail 2 and 3 — across several seeds the
        // offer must never contain a rare.
        for (let seed = 1; seed <= 12; seed++) {
            let s = playingSession(seed, 'safe');
            for (let round = 0; round < 3; round++) {
                const cards =
                    round === 0
                        ? Array.from({ length: 6 }, (_, i) => entry(`r${round}h${i}`, 'grip'))
                        : [entry(`r${round}h0`, HAZARD_CRACK_CARD.id)];
                s = rig(s, { hand: cards, play: [] });
                for (const h of s.hand.slice()) s = stageHazardCard(s, h.uid, BAG);
                s = resolveHazardRound(s);
                s = continueHazardAfterResolve(s, BAG);
            }
            const o = s.outcome!;
            expect(o.tier).toBe('complete');
            expect(o.wins).toBe(1);
            for (const card of o.offerCards) expect(card.rarity).not.toBe('rare');
        }
    });

    it('reserves (REC#3): unspent non-hex dice count toward the bonus on success', () => {
        let s = playingSession(9, 'safe');
        s = rig(s, {
            dice: [
                { id: 'd1', kind: 'red', state: 'available' },
                { id: 'd2', kind: 'blue', state: 'spent' },
                { id: 'd3', kind: 'hex', state: 'available' },
                { id: 'd4', kind: 'gold', state: 'available' },
            ],
        });
        for (let round = 0; round < 3; round++) {
            s = rig(s, { hand: Array.from({ length: 6 }, (_, i) => entry(`r${round}h${i}`, 'footing')), play: [] });
            for (const h of s.hand.slice()) s = stageHazardCard(s, h.uid, BAG);
            s = resolveHazardRound(s);
            s = continueHazardAfterResolve(s, BAG);
        }
        expect(s.outcome!.reserveBonus).toBe(2); // d1 + d4
    });

    it('rewards flow: outcome → rewards → done with a picked card', () => {
        let s = runToOutcome(9, 'safe', 'footing');
        s = acknowledgeHazardOutcome(s);
        expect(s.phase).toBe('rewards');
        const pick = s.outcome!.offerCards[1];
        s = claimHazardRewards(s, pick.id);
        expect(s.phase).toBe('done');
        expect(s.pickedRewardCardId).toBe(pick.id);
    });

    it('non-perfect tiers cannot skip the card pick', () => {
        let s = playingSession(9, 'safe');
        for (let round = 0; round < 3; round++) {
            const cards =
                round === 0
                    ? Array.from({ length: 6 }, (_, i) => entry(`r${round}h${i}`, 'grip'))
                    : [entry(`r${round}h0`, HAZARD_CRACK_CARD.id)];
            s = rig(s, { hand: cards, play: [] });
            for (const h of s.hand.slice()) s = stageHazardCard(s, h.uid, BAG);
            s = resolveHazardRound(s);
            s = continueHazardAfterResolve(s, BAG);
        }
        s = acknowledgeHazardOutcome(s);
        const before = s;
        expect(claimHazardRewards(before, null)).toBe(before); // must pick
        const picked = claimHazardRewards(before, before.outcome!.offerCards[0].id);
        expect(picked.phase).toBe('done');
    });

    it('perfect tier may skip', () => {
        let s = runToOutcome(9, 'safe', 'footing');
        s = acknowledgeHazardOutcome(s);
        const skipped = claimHazardRewards(s, null);
        expect(skipped.phase).toBe('done');
        expect(skipped.pickedRewardCardId).toBeNull();
    });
});

describe('deck flags codec', () => {
    it('starter bag matches authored weights', () => {
        const bag = hazardStarterBag();
        const total = HAZARD_DECK.reduce((n, c) => n + (c.weight ?? 1), 0);
        expect(bag).toHaveLength(total);
    });

    it('round-trips acquired cards including duplicates', () => {
        let flags: string[] = ['unrelated-flag'];
        flags = appendAcquiredCard(flags, 'r_grip');
        flags = appendAcquiredCard(flags, 'r_grip');
        flags = appendAcquiredCard(flags, HAZARD_CRACK_CARD.id);
        expect(decodeAcquiredCards(flags)).toEqual(['r_grip', 'r_grip', 'crack']);
        expect(hazardDeckBag(flags)).toHaveLength(hazardStarterBag().length + 3);
        expect(flags).toContain('unrelated-flag');
    });
});

describe('content integrity', () => {
    it('every deck and reward card resolves through getHazardCardDef', () => {
        for (const c of [...HAZARD_DECK, ...HAZARD_REWARD_CARDS]) {
            expect(getHazardCardDef(c.id).name).toBe(c.name);
        }
    });

    it('all hazards have 3 rounds, matching threshold ladders, and both routes', () => {
        for (const h of HAZARD_LIBRARY) {
            expect(h.rounds).toBe(3);
            expect(h.safe.thresholds).toHaveLength(3);
            expect(h.risk.thresholds).toHaveLength(3);
            for (const t of h.risk.thresholds) expect(t).toHaveLength(2);
            expect(h.risk.penaltyVitae).toBeGreaterThan(h.safe.penaltyVitae);
        }
    });

    it('gold cards are rare; only purple/gold reach mid-or-strong in both types', () => {
        for (const c of HAZARD_DECK) {
            if (c.kind === 'gold') expect(c.rarity).toBe('rare');
            if (c.kind === 'red' && !c.effect) expect(c.f).toBeGreaterThan(c.e);
            if (c.kind === 'blue' && !c.effect) expect(c.e).toBeGreaterThan(c.f);
        }
    });
});
