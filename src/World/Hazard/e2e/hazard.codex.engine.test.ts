/**
 * Hazard codex library (2026-06-13) — hermetic e2e for the 150-card
 * roster and its six new mechanics: PURGE / TRANSMUTE / MEND / BOUNTY /
 * WARD / ANCHOR. Seeded RNG only; no timers, no network, no Math.random.
 */

import { describe, expect, it } from 'vitest';

import {
    applyHazardCard,
    continueHazardAfterResolve,
    createHazardSession,
    resolveHazardRound,
    selectHazardRoute,
    finishHazardRolling,
    stageHazardCard,
} from '../hazard.engine';
import {
    getHazardCardDef,
    getHazardDef,
    HAZARD_CRACK_CARD,
    HAZARD_DECK,
    HAZARD_KEYWORDS,
    HAZARD_REWARD_CARDS,
} from '../hazard.content';
import { hazardStarterBag } from '../hazard.deck-flags';
import {
    HAZARD_MOMENTUM_CAP,
    type HazardDie,
    type HazardHandEntry,
    type HazardSessionState,
} from '../hazard.types';

const BAG = hazardStarterBag();
const HAZARD_ID = 'cracked-cliff';

function playingSession(seed = 7, route: 'safe' | 'risk' = 'safe'): HazardSessionState {
    return finishHazardRolling(selectHazardRoute(createHazardSession(seed, BAG, HAZARD_ID), route, BAG));
}

function rig(s: HazardSessionState, over: Partial<HazardSessionState>): HazardSessionState {
    return { ...s, ...over };
}

function entry(uid: string, cardId: string, dieId: string | null = null): HazardHandEntry {
    return { uid, cardId, dieId };
}

function die(id: string, kind: HazardDie['kind'], state: HazardDie['state'] = 'available'): HazardDie {
    return { id, kind, state };
}

/** Stage a card from a rigged hand and APPLY it (fires its utility). */
function stageAndApply(s: HazardSessionState, cardId: string, dieId: string | null = null): HazardSessionState {
    s = rig(s, { hand: [{ uid: 'cx', cardId, dieId: null }], play: [] });
    s = stageHazardCard(s, 'cx', BAG);
    if (dieId) s = { ...s, play: s.play.map((p) => (p.uid === 'cx' ? { ...p, dieId } : p)) };
    return applyHazardCard(s, 'cx', BAG);
}

// ---------------------------------------------------------------------------
// Library shape
// ---------------------------------------------------------------------------

describe('codex library shape', () => {
    const ALL = [...HAZARD_DECK, ...HAZARD_REWARD_CARDS, HAZARD_CRACK_CARD];

    it('the full library is exactly 150 cards with unique ids', () => {
        expect(ALL).toHaveLength(150);
        expect(new Set(ALL.map((c) => c.id)).size).toBe(150);
    });

    it('every keyword on every card is in the glossary', () => {
        for (const card of ALL) {
            for (const kw of card.keywords) {
                expect(HAZARD_KEYWORDS[kw], `${card.id} keyword ${kw}`).toBeDefined();
            }
        }
    });

    it('structural invariants hold per card archetype', () => {
        for (const card of ALL) {
            if (card.choose) {
                expect(card.fp, card.id).toBe(card.ep);
            }
            if (card.kind === 'gold' && !card.dead) {
                // Gold leads with its utility; numbers wait for the die.
                expect(card.f, card.id).toBe(0);
                expect(card.e, card.id).toBe(0);
            }
            if (card.colors) {
                expect(card.colors.length, card.id).toBe(2);
                // The card's own colour must be one of its power colours
                // (r_drop predates the kind-first ordering convention).
                expect(card.colors, card.id).toContain(card.kind);
                expect(card.keywords, card.id).toContain('twotone');
            }
            if (card.effect === 'mend') expect(card.mendBase ?? 0, card.id).toBeGreaterThan(0);
            if (card.effect === 'bounty') expect(card.bountyBase ?? 0, card.id).toBeGreaterThan(0);
            if (card.effect === 'ward') expect(card.wardBase ?? 0, card.id).toBeGreaterThan(0);
            if (card.effect === 'anchor') expect(card.anchorBase ?? 0, card.id).toBeGreaterThan(0);
            if (card.effect && ['purge', 'transmute', 'mend', 'bounty', 'ward', 'anchor'].includes(card.effect)) {
                expect(card.keywords, card.id).toContain(card.effect);
            }
        }
    });

    it('every codex effect family is represented in the reward pool', () => {
        for (const effect of ['purge', 'transmute', 'mend', 'bounty', 'ward', 'anchor'] as const) {
            expect(HAZARD_REWARD_CARDS.some((c) => c.effect === effect), effect).toBe(true);
        }
    });
});

// ---------------------------------------------------------------------------
// PURGE
// ---------------------------------------------------------------------------

describe('PURGE', () => {
    it('minor cuts one CRACK from hand first, then the draw pile', () => {
        let s = playingSession();
        s = rig(s, {
            hand: [entry('a', HAZARD_CRACK_CARD.id), entry('b', HAZARD_CRACK_CARD.id)],
            drawPile: [HAZARD_CRACK_CARD.id, 'steps'],
        });
        s = rig(stageAndApply(rig(s, {}), 'x_menderknife'), {});
        // hand had 2 cracks pre-stage (the stage helper replaced the hand) —
        // rebuild explicitly instead:
        let t = playingSession();
        t = rig(t, {
            hand: [entry('a', HAZARD_CRACK_CARD.id), entry('m', 'x_menderknife')],
            drawPile: [HAZARD_CRACK_CARD.id, 'steps'],
            play: [],
        });
        t = stageHazardCard(t, 'm', BAG);
        t = applyHazardCard(t, 'm', BAG);
        expect(t.hand.filter((h) => h.cardId === HAZARD_CRACK_CARD.id)).toHaveLength(0);
        // pile crack untouched by the minor purge once the hand had one
        expect(t.drawPile.filter((id) => id === HAZARD_CRACK_CARD.id)).toHaveLength(1);
        void s;
    });

    it('major (gold) scours hand, pile, and discard', () => {
        let s = playingSession();
        s = rig(s, {
            hand: [entry('a', HAZARD_CRACK_CARD.id), entry('m', 'x_lastrelic')],
            drawPile: [HAZARD_CRACK_CARD.id, 'steps', HAZARD_CRACK_CARD.id],
            discardPile: [HAZARD_CRACK_CARD.id, 'haul'],
            play: [],
        });
        s = stageHazardCard(s, 'm', BAG);
        s = applyHazardCard(s, 'm', BAG); // majorEffect: fires major with no die
        expect(s.hand.some((h) => h.cardId === HAZARD_CRACK_CARD.id)).toBe(false);
        expect(s.drawPile).toEqual(['steps']);
        expect(s.discardPile).toEqual(['haul']);
    });
});

// ---------------------------------------------------------------------------
// TRANSMUTE
// ---------------------------------------------------------------------------

describe('TRANSMUTE', () => {
    it('minor recolors the first off-colour available die; hex never turns', () => {
        let s = playingSession();
        s = rig(s, { dice: [die('d1', 'hex'), die('d2', 'blue'), die('d3', 'purple'), die('d4', 'red', 'spent')] });
        s = rig(s, { hand: [entry('m', 'x_redsmith')], play: [] });
        s = stageHazardCard(s, 'm', BAG);
        s = applyHazardCard(s, 'm', BAG);
        expect(s.dice.map((d) => d.kind)).toEqual(['hex', 'red', 'purple', 'red']);
    });

    it('major recolors every available off-colour die', () => {
        let s = playingSession();
        s = rig(s, { dice: [die('d1', 'hex'), die('d2', 'blue'), die('d3', 'purple'), die('d4', 'gold')] });
        s = rig(s, { hand: [entry('m', 'x_redsmith')], play: [] });
        s = stageHazardCard(s, 'm', BAG);
        // power it with the gold die to fire the major tier
        s = { ...s, play: s.play.map((p) => ({ ...p, dieId: 'd4' })), dice: s.dice.map((d) => (d.id === 'd4' ? { ...d, state: 'spent' as const } : d)) };
        s = applyHazardCard(s, 'm', BAG);
        // d4 is spent (powering), so it stays gold; d2/d3 turn red; hex holds.
        expect(s.dice.map((d) => d.kind)).toEqual(['hex', 'red', 'red', 'gold']);
    });
});

// ---------------------------------------------------------------------------
// MEND / BOUNTY / WARD / ANCHOR — accruals and the outcome ledger
// ---------------------------------------------------------------------------

describe('claim-time accruals', () => {
    it('MEND and BOUNTY accrue at minor and major tiers', () => {
        let s = playingSession();
        s = stageAndApply(s, 'x_fieldstitch');
        const minorMend = s.vitaeRestore;
        expect(minorMend).toBeGreaterThan(0);
        s = rig(s, { dice: [die('g1', 'gold')] });
        s = rig(s, { hand: [entry('b2', 'x_relicpouch')], play: s.play });
        s = stageHazardCard(s, 'b2', BAG);
        s = { ...s, play: s.play.map((p) => (p.uid === 'b2' ? { ...p, dieId: 'g1' } : p)) };
        s = applyHazardCard(s, 'b2', BAG);
        const majorBounty = getHazardCardDef('x_relicpouch').bountyPowered ?? 0;
        expect(s.bountyShillings).toBe(majorBounty);
    });

    it('the outcome pays MEND/BOUNTY only on a survived crossing', () => {
        const base = playingSession(11, 'safe');
        const def = getHazardDef(HAZARD_ID);
        // Survived: one cleared round (marks rigged), accruals present.
        let s = rig(base, {
            round: def.rounds,
            marks: ['O', 'X', 'pending'],
            play: [entry('p1', 'steps', null)],
            vitaeRestore: 4,
            bountyShillings: 8,
            wardPenaltyReduction: 99,
        });
        s = resolveHazardRound(s, BAG);
        s = continueHazardAfterResolve(s, BAG);
        expect(s.phase).toBe('outcome');
        expect(s.outcome?.tier).not.toBe('failure');
        expect(s.outcome?.vitaeRestore).toBe(4);
        expect(s.outcome?.bountyShillings).toBe(8);
        // WARD floors the penalty at zero, never negative.
        expect(s.outcome?.penaltyVitae).toBe(0);

        // Failure: same accruals, all rounds lost → forfeited.
        let f = rig(base, {
            round: def.rounds,
            marks: ['X', 'X', 'pending'],
            play: [entry('p1', HAZARD_CRACK_CARD.id, null)],
            vitaeRestore: 4,
            bountyShillings: 8,
        });
        f = resolveHazardRound(f, BAG);
        f = continueHazardAfterResolve(f, BAG);
        expect(f.outcome?.tier).toBe('failure');
        expect(f.outcome?.vitaeRestore).toBe(0);
        expect(f.outcome?.bountyShillings).toBe(0);
        // Sacrifice-style costs still settle on a failure; ward only ever
        // reduces the penalty, which here is 3 lost rounds × penaltyVitae.
        expect(f.outcome?.penaltyVitae).toBe(def.safe.penaltyVitae * 3);
    });

    it('ANCHOR floors the carry even off a failed round, capped by the cap', () => {
        let s = playingSession(13, 'safe');
        // Fail round 1 on purpose with a dead card, floor primed at 2.
        s = rig(s, {
            carryFloor: 2,
            play: [entry('p1', HAZARD_CRACK_CARD.id, null)],
            hand: [],
        });
        s = resolveHazardRound(s, BAG);
        expect(s.resolveInfo?.cleared).toBe(false);
        expect((s.resolveInfo?.carryForce ?? 0) + (s.resolveInfo?.carryEscape ?? 0)).toBe(2);
        s = continueHazardAfterResolve(s, BAG);
        expect(s.progressBase.force + s.progressBase.escape).toBe(2);

        // The floor itself respects the session momentum cap on accrual.
        let t = playingSession(13, 'safe');
        t = stageAndApply(t, 'x_oldcapstan');
        t = stageAndApply(rig(t, {}), 'x_oldcapstan');
        t = stageAndApply(rig(t, {}), 'x_oldcapstan');
        expect(t.carryFloor).toBeLessThanOrEqual(HAZARD_MOMENTUM_CAP);
    });

    it('the momentum floor never pays out past the final round', () => {
        const def = getHazardDef(HAZARD_ID);
        let s = playingSession(17, 'safe');
        s = rig(s, {
            round: def.rounds,
            marks: ['O', 'O', 'pending'],
            carryFloor: 3,
            play: [entry('p1', HAZARD_CRACK_CARD.id, null)],
        });
        s = resolveHazardRound(s, BAG);
        expect(s.resolveInfo?.carryForce).toBe(0);
        expect(s.resolveInfo?.carryEscape).toBe(0);
    });
});
