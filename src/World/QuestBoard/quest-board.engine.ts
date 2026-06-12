/**
 * Quest Board minigame — pure engine transitions.
 *
 * Every transition is `(session, …) → session` and threads explicit
 * RNG state; a session is fully reproducible from its seed. Invalid
 * calls (wrong phase, unknown ids, disabled options) return the input
 * session unchanged — the host never needs try/catch around play.
 *
 * State machine:
 *
 *   intro ──beginQuestBoard──▶ idle ──rollQuestBone──▶ space
 *     ▲                          │  ▲                    │
 *     │                          │  └─continueQuestSpace─┤ (stretches left)
 *   create                       │ ◀──acknowledgeQuestDusk    │
 *                                │        ▲                   │
 *                                │       dusk ◀───────────────┤ (day spent / collapse)
 *                                │                            │
 *                                └──▶ outcome ◀───────────────┘ (boat complete)
 *                                        │
 *                              claimQuestBoardCompletion
 *                                        ▼
 *                                      done
 *
 * The boat completes when every required part has been FITTED, and
 * fitting happens only when the piece lands on or passes the slipway
 * (space 0) moving forward — the plan always routes back through the
 * place boats are born.
 */

import {
    getQuestBoardDef,
    getQuestCharmDef,
    QUEST_BOARD_CHARMS,
    QUEST_BOARD_VOWS,
    getQuestVowDef,
} from './quest-board.content';
import { QUEST_BOARD_TUNING } from './quest-board.tuning';
import {
    rollDie, seedRng, shuffle, nextFloat,
    type QuestBoardRngState,
} from './quest-board.rng';
import {
    EMPTY_PART_TALLY,
    QUEST_PART_KINDS,
    type QuestBoardDef,
    type QuestBoardMetrics,
    type QuestBoardOutcome,
    type QuestBoardSession,
    type QuestCharmId,
    type QuestCharmState,
    type QuestOutcomeTier,
    type QuestPartTally,
    type QuestPendingSpace,
    type QuestSpaceDef,
    type QuestSpaceOption,
    type QuestSpaceResult,
    type QuestVowResult,
    type QuestVowStatus,
} from './quest-board.types';

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

const T = QUEST_BOARD_TUNING;

function emptyResult(): QuestSpaceResult {
    return {
        title: '',
        body: '',
        rolls: [],
        fishDelta: 0,
        vigorDelta: 0,
        partsDelta: {},
        windDelta: 0,
        slippedBack: 0,
    };
}

function addParts(tally: QuestPartTally, delta: Partial<QuestPartTally>): QuestPartTally {
    const next = { ...tally };
    for (const kind of QUEST_PART_KINDS) {
        next[kind] += delta[kind] ?? 0;
    }
    return next;
}

/** Applies a result's deltas to the session's resources (not position). */
function applyResultDeltas(s: QuestBoardSession, r: QuestSpaceResult): QuestBoardSession {
    const def = getQuestBoardDef(s.boardId);
    const fish = Math.max(0, s.fish + r.fishDelta);
    const vigor = Math.min(def.maxVigor, s.vigor + r.vigorDelta);
    const metrics: QuestBoardMetrics = {
        ...s.metrics,
        fishSpent: s.metrics.fishSpent + Math.max(0, -r.fishDelta),
        lowestVigor: Math.min(s.metrics.lowestVigor, vigor),
    };
    return {
        ...s,
        fish,
        vigor,
        parts: addParts(s.parts, r.partsDelta),
        wind: s.wind + r.windDelta,
        metrics,
    };
}

function consumeCharm(charms: QuestCharmState[], id: QuestCharmId): QuestCharmState[] {
    return charms.map(c => (c.id === id ? { ...c, primed: false, used: true } : c));
}

function isPrimed(s: QuestBoardSession, id: QuestCharmId): boolean {
    return s.charms.some(c => c.id === id && c.primed);
}

function spaceAt(def: QuestBoardDef, pos: number): QuestSpaceDef {
    return def.spaces[pos];
}

// ---------------------------------------------------------------------------
// Selectors / previews
// ---------------------------------------------------------------------------

/** The board definition behind a session. */
export function questBoardDefOf(s: QuestBoardSession): QuestBoardDef {
    return getQuestBoardDef(s.boardId);
}

/** Parts still missing from the hull (required − fitted). */
export function questPartsMissing(s: QuestBoardSession): QuestPartTally {
    const def = getQuestBoardDef(s.boardId);
    const out = { ...EMPTY_PART_TALLY };
    for (const kind of QUEST_PART_KINDS) {
        out[kind] = Math.max(0, def.partsRequired[kind] - s.fitted[kind]);
    }
    return out;
}

/** True when every required part has been fitted. */
export function questBoardComplete(s: QuestBoardSession): boolean {
    const missing = questPartsMissing(s);
    return QUEST_PART_KINDS.every(kind => missing[kind] === 0);
}

/**
 * Judges the session's dealt vows against current play.
 *
 * Mid-play, a vow reads 'kept' while it currently holds, 'broken' once
 * it can never hold again (the day passed, the floor was breached),
 * and 'active' while it could still go either way. After the finish
 * line every vow is judged kept/broken for the ledger.
 */
export function questVowResults(s: QuestBoardSession): QuestVowResult[] {
    const finished = s.outcome !== null || questBoardComplete(s);
    return s.vows.map(id => {
        const def = getQuestVowDef(id);
        const holds = vowHolds(id, s);
        let status: QuestVowStatus;
        if (finished) {
            status = holds ? 'kept' : 'broken';
        } else if (vowIrrecoverable(id, s)) {
            status = 'broken';
        } else {
            status = holds ? 'kept' : 'active';
        }
        return { id, name: def.name, desc: def.desc, status };
    });
}

/** A vow that can no longer be kept reads 'broken' even mid-play. */
function vowIrrecoverable(id: QuestVowResult['id'], s: QuestBoardSession): boolean {
    switch (id) {
        case 'swift-keel': return s.day > T.swiftKeelDay;
        case 'unbitten':   return s.metrics.lowestVigor < T.unbittenFloor;
        // fish / duels / tales can always still rise.
        default: return false;
    }
}

/** Outcome tier the current play would earn if the boat finished now. */
export function questBoardTierOf(s: QuestBoardSession): QuestOutcomeTier {
    if (s.outcome !== null) return s.outcome.tier;
    const vowsKept = questVowResults(s).filter(v => v.status !== 'broken').length;
    if (s.day <= T.masterworkMaxDays && vowsKept >= T.masterworkMinVows) return 'masterwork';
    if (s.day <= T.seaworthyMaxDays && vowsKept >= T.seaworthyMinVows) return 'seaworthy';
    return 'driftwood';
}

// ---------------------------------------------------------------------------
// Lifecycle
// ---------------------------------------------------------------------------

export function createQuestBoardSession(seed: number, boardId: string): QuestBoardSession {
    const def = getQuestBoardDef(boardId); // throws on unknown board
    let rng: QuestBoardRngState = seedRng(seed);

    const charmsDraw = shuffle(rng, QUEST_BOARD_CHARMS.map(c => c.id));
    rng = charmsDraw.state;
    const charms: QuestCharmState[] = charmsDraw.value
        .slice(0, T.charmsDealt)
        .map(id => ({ id, used: false, primed: false }));

    const vowsDraw = shuffle(rng, QUEST_BOARD_VOWS.map(v => v.id));
    rng = vowsDraw.state;
    const vows = vowsDraw.value.slice(0, T.vowsDealt);

    return {
        boardId: def.id,
        phase: 'intro',
        pos: 0,
        day: 1,
        stretch: 0,
        fish: def.startFish,
        vigor: def.startVigor,
        parts: { ...EMPTY_PART_TALLY },
        fitted: { ...EMPTY_PART_TALLY },
        lastRoll: null,
        pending: null,
        charms,
        vows,
        wind: 0,
        collapsedToday: false,
        metrics: {
            rolls: 0,
            duelsWon: 0,
            duelsLost: 0,
            snagsSuffered: 0,
            fishSpent: 0,
            talesHeard: 0,
            collapses: 0,
            lowestVigor: def.startVigor,
        },
        outcome: null,
        seed,
        rng,
    };
}

/** intro → idle. */
export function beginQuestBoard(s: QuestBoardSession): QuestBoardSession {
    if (s.phase !== 'intro') return s;
    return { ...s, phase: 'idle' };
}

// ---------------------------------------------------------------------------
// Charms
// ---------------------------------------------------------------------------

/**
 * Primes a one-use charm. Only in 'idle' (between rolls); the effect
 * stays primed until its trigger consumes it (a roll, a duel, a snag,
 * a gather).
 */
export function useQuestCharm(s: QuestBoardSession, id: QuestCharmId): QuestBoardSession {
    if (s.phase !== 'idle') return s;
    const charm = s.charms.find(c => c.id === id);
    if (!charm || charm.used || charm.primed) return s;
    getQuestCharmDef(id); // throws on unknown id
    return {
        ...s,
        charms: s.charms.map(c => (c.id === id ? { ...c, primed: true } : c)),
    };
}

// ---------------------------------------------------------------------------
// The roll (movement + slipway fitting + space arrival)
// ---------------------------------------------------------------------------

/**
 * idle → space | outcome. Casts the bone die, applies wind and primed
 * roll-charms, advances the piece, fits carried parts when the move
 * lands on or crosses the slipway, and opens the arrival space.
 */
export function rollQuestBone(s: QuestBoardSession): QuestBoardSession {
    if (s.phase !== 'idle' || s.outcome !== null) return s;
    const def = getQuestBoardDef(s.boardId);
    let rng = s.rng;
    let charms = s.charms;

    // Die — GULL FEATHER rolls twice, keeps the higher.
    let die: number;
    {
        const first = rollDie(rng);
        rng = first.state;
        die = first.value;
        if (isPrimed(s, 'gull-feather')) {
            const second = rollDie(rng);
            rng = second.state;
            die = Math.max(die, second.value);
            charms = consumeCharm(charms, 'gull-feather');
        }
    }

    // Bonus — banked wind plus THE FRIEND'S WHISTLE.
    let bonus = s.wind;
    if (charms.some(c => c.id === 'friends-whistle' && c.primed)) {
        bonus += 2;
        charms = consumeCharm(charms, 'friends-whistle');
    }
    const total = die + bonus;

    // Movement. Crossing or landing on space 0 (the slipway) fits
    // carried parts onto the hull.
    const len = def.spaces.length;
    const rawTarget = s.pos + total;
    const crossedSlipway = rawTarget >= len;
    const pos = rawTarget % len;

    let fitted = s.fitted;
    let parts = s.parts;
    if (crossedSlipway || pos === 0) {
        const next = fitCarriedParts(def, parts, fitted);
        fitted = next.fitted;
        parts = next.parts;
    }

    const moved: QuestBoardSession = {
        ...s,
        rng,
        charms,
        pos,
        parts,
        fitted,
        wind: 0,
        stretch: s.stretch + 1,
        lastRoll: { die, bonus, total },
        metrics: { ...s.metrics, rolls: s.metrics.rolls + 1 },
    };

    // The boat may now be complete — outcome pre-empts the arrival space.
    if (questBoardComplete(moved)) {
        return finishQuestBoard({ ...moved, pos: 0 });
    }

    return arriveAtSpace(moved);
}

function fitCarriedParts(
    def: QuestBoardDef,
    parts: QuestPartTally,
    fitted: QuestPartTally,
): { parts: QuestPartTally; fitted: QuestPartTally } {
    const nextParts = { ...parts };
    const nextFitted = { ...fitted };
    for (const kind of QUEST_PART_KINDS) {
        const need = Math.max(0, def.partsRequired[kind] - nextFitted[kind]);
        const fit = Math.min(need, nextParts[kind]);
        nextFitted[kind] += fit;
        nextParts[kind] -= fit;
    }
    return { parts: nextParts, fitted: nextFitted };
}

// ---------------------------------------------------------------------------
// Space arrival (build the pending interaction)
// ---------------------------------------------------------------------------

function arriveAtSpace(s: QuestBoardSession): QuestBoardSession {
    const def = getQuestBoardDef(s.boardId);
    const space = spaceAt(def, s.pos);

    switch (space.kind) {
        case 'slipway': {
            // Landing exactly: parts already fitted by the move. The card
            // just reports the state of the hull.
            const missing = questPartsMissing(s);
            const missingLines = QUEST_PART_KINDS
                .filter(k => missing[k] > 0)
                .map(k => `${missing[k]} × ${def.partNames[k]}`);
            const result: QuestSpaceResult = {
                ...emptyResult(),
                title: 'THE KEEL TAKES SHAPE',
                body: missingLines.length > 0
                    ? `Everything carried is fitted and pegged. Still wanting: ${missingLines.join(', ')}.`
                    : 'Nothing left to fit. She only wants water now.',
            };
            return openSpace(s, space, [], result);
        }

        case 'gather': {
            const g = space.gather;
            const hooked = isPrimed(s, 'lucky-hook');
            const options: QuestSpaceOption[] = [
                {
                    id: 'safe',
                    label: 'TAKE WHAT LIES EASY',
                    desc: `+${g.safeYield * (hooked ? 2 : 1)} ${def.partNames[g.part]}, no risk.`,
                },
                {
                    id: 'deep',
                    label: 'WADE IN DEEPER',
                    desc: `Roll ${g.deepThreshold}+: +${g.deepYield * (hooked ? 2 : 1)} ${def.partNames[g.part]}. Fail: the easy take, −${g.deepBite} vigor.`,
                },
            ];
            return openSpace(s, space, options, null);
        }

        case 'duel': {
            const d = space.duel;
            const options: QuestSpaceOption[] = [
                {
                    id: 'fight',
                    label: 'STAND AND FIGHT',
                    desc: `Your bone against its tusk (+${d.foeBonus}). Win: +${d.spoils.count} ${def.partNames[d.spoils.part]}. Lose: −${d.bite} vigor.`,
                },
            ];
            if (d.bribeFish > 0) {
                options.push({
                    id: 'bribe',
                    label: 'TOSS IT A FISH',
                    desc: `−${d.bribeFish} fish to pass unbothered.`,
                    ...(s.fish < d.bribeFish
                        ? { disabledReason: 'Not enough fish.' }
                        : {}),
                });
            }
            return openSpace(s, space, options, null);
        }

        case 'snag': {
            const n = space.snag;
            // TAR-SOAKED TWINE crosses clean without a roll.
            if (isPrimed(s, 'tar-twine')) {
                const result: QuestSpaceResult = {
                    ...emptyResult(),
                    title: 'THE TWINE HOLDS',
                    body: 'Lashed, tied, and trusted — the bad ground passes underfoot like a rumor about somebody else.',
                };
                return openSpace(
                    { ...s, charms: consumeCharm(s.charms, 'tar-twine') },
                    space, [], result,
                );
            }
            const options: QuestSpaceOption[] = [
                {
                    id: 'risk',
                    label: 'CHANCE IT',
                    desc: `Roll ${n.threshold}+ to cross clean. Fail: −${n.bite} vigor, slip back ${n.slipBack}.`,
                },
            ];
            if (n.detourFish > 0) {
                options.push({
                    id: 'detour',
                    label: 'THE LONG WAY ROUND',
                    desc: `−${n.detourFish} fish for the ferryman's path.`,
                    ...(s.fish < n.detourFish
                        ? { disabledReason: 'Not enough fish.' }
                        : {}),
                });
            }
            return openSpace(s, space, options, null);
        }

        case 'hearth': {
            const healed = Math.min(space.hearth.vigor, getQuestBoardDef(s.boardId).maxVigor - s.vigor);
            const result: QuestSpaceResult = {
                ...emptyResult(),
                title: 'STEW AND SILENCE',
                body: healed > 0
                    ? `The fire does its old work. +${healed} vigor.`
                    : 'Nothing aches yet. The fire keeps its counsel for later.',
                vigorDelta: healed,
            };
            return openSpace(s, space, [], result);
        }

        case 'market': {
            return openSpace(s, space, marketOptions(s, space), null, []);
        }

        case 'parley': {
            const p = space.parley;
            const options: QuestSpaceOption[] = p.options.map(o => ({
                id: o.id,
                label: o.label,
                desc: o.desc,
                ...((o.fish ?? 0) < 0 && s.fish < -(o.fish ?? 0)
                    ? { disabledReason: 'Not enough fish.' }
                    : {}),
            }));
            return openSpace(s, space, options, null);
        }

        case 'cache': {
            let rng = s.rng;
            const draw = nextFloat(rng);
            rng = draw.state;
            const finds = space.cache.finds;
            const totalWeight = finds.reduce((sum, f) => sum + f.weight, 0);
            let mark = draw.value * totalWeight;
            let find = finds[finds.length - 1];
            for (const f of finds) {
                mark -= f.weight;
                if (mark <= 0) { find = f; break; }
            }
            const result: QuestSpaceResult = {
                ...emptyResult(),
                title: 'SOMETHING UNDER THE BOARDS',
                body: find.label,
                fishDelta: find.fish ?? 0,
                vigorDelta: find.vigor ?? 0,
                partsDelta: find.parts ? { [find.parts.part]: find.parts.count } : {},
            };
            return openSpace({ ...s, rng }, space, [], result);
        }

        case 'omen': {
            const result: QuestSpaceResult = {
                ...emptyResult(),
                title: space.name,
                body: space.omen.lines.join('\n'),
                windDelta: space.omen.wind,
            };
            const tallied: QuestBoardSession = {
                ...s,
                metrics: { ...s.metrics, talesHeard: s.metrics.talesHeard + 1 },
            };
            return openSpace(tallied, space, [], result);
        }
    }
}

function marketOptions(s: QuestBoardSession, space: Extract<QuestSpaceDef, { kind: 'market' }>): QuestSpaceOption[] {
    const def = getQuestBoardDef(s.boardId);
    const options: QuestSpaceOption[] = space.market.offers.map((o, i) => ({
        id: `offer-${i}`,
        label: `${o.count} × ${def.partNames[o.part]}`,
        desc: `−${o.fishCost} fish.`,
        ...(s.fish < o.fishCost ? { disabledReason: 'Not enough fish.' } : {}),
    }));
    options.push({ id: 'leave', label: 'LEAVE THE ROW', desc: 'Pocket what remains and move on.' });
    return options;
}

/**
 * Opens the pending interaction. Result-only spaces apply their deltas
 * immediately (the card is acknowledgement, not a decision).
 */
function openSpace(
    s: QuestBoardSession,
    space: QuestSpaceDef,
    options: QuestSpaceOption[],
    result: QuestSpaceResult | null,
    ledger?: string[],
): QuestBoardSession {
    const applied = result ? applyResultDeltas(s, result) : s;
    const pending: QuestPendingSpace = {
        spaceId: space.id,
        kind: space.kind,
        title: space.name,
        body: space.kind === 'parley' ? space.parley.prompt : space.flavor,
        options: result ? [] : options,
        result,
        ...(ledger !== undefined ? { ledger } : {}),
    };
    return { ...applied, phase: 'space', pending };
}

// ---------------------------------------------------------------------------
// Choosing on an open space
// ---------------------------------------------------------------------------

/**
 * space → space. Resolves the picked option into a result card (or,
 * for the market, applies the purchase and keeps the stalls open).
 */
export function chooseQuestSpaceOption(s: QuestBoardSession, optionId: string): QuestBoardSession {
    if (s.phase !== 'space' || s.pending === null || s.pending.result !== null) return s;
    const def = getQuestBoardDef(s.boardId);
    const space = def.spaces.find(sp => sp.id === s.pending!.spaceId);
    if (!space) return s;
    const option = s.pending.options.find(o => o.id === optionId);
    if (!option || option.disabledReason) return s;

    switch (space.kind) {
        case 'gather': {
            const g = space.gather;
            const hooked = isPrimed(s, 'lucky-hook');
            const mult = hooked ? 2 : 1;
            let next = hooked ? { ...s, charms: consumeCharm(s.charms, 'lucky-hook') } : s;

            if (optionId === 'safe') {
                const result: QuestSpaceResult = {
                    ...emptyResult(),
                    title: 'AN EASY TAKE',
                    body: `What lies loose comes along willingly. +${g.safeYield * mult} ${def.partNames[g.part]}.`,
                    partsDelta: { [g.part]: g.safeYield * mult },
                };
                return settleResult(next, result);
            }
            // deep
            const roll = rollDie(next.rng);
            next = { ...next, rng: roll.state };
            const success = roll.value >= g.deepThreshold;
            const result: QuestSpaceResult = success
                ? {
                    ...emptyResult(),
                    title: 'THE DEEP TAKE',
                    body: `Worth the wet boots. +${g.deepYield * mult} ${def.partNames[g.part]}.`,
                    rolls: [roll.value],
                    partsDelta: { [g.part]: g.deepYield * mult },
                }
                : {
                    ...emptyResult(),
                    title: 'THE PLACE BITES BACK',
                    body: `It does not want to be taken from today. The easy pieces come along; the rest cost skin. +${g.safeYield * mult} ${def.partNames[g.part]}, −${g.deepBite} vigor.`,
                    rolls: [roll.value],
                    partsDelta: { [g.part]: g.safeYield * mult },
                    vigorDelta: -g.deepBite,
                };
            return settleResult(next, result);
        }

        case 'duel': {
            const d = space.duel;
            if (optionId === 'bribe') {
                const result: QuestSpaceResult = {
                    ...emptyResult(),
                    title: 'TRIBUTE PAID',
                    body: `${d.foe} accepts the toll with bad grace, which is its only kind. −${d.bribeFish} fish.`,
                    fishDelta: -d.bribeFish,
                };
                return settleResult(s, result);
            }
            // fight
            let next = s;
            let yourBonus = 0;
            if (isPrimed(next, 'mothers-locket')) {
                yourBonus = 2;
                next = { ...next, charms: consumeCharm(next.charms, 'mothers-locket') };
            }
            const yours = rollDie(next.rng);
            const theirs = rollDie(yours.state);
            next = { ...next, rng: theirs.state };
            const yourTotal = yours.value + yourBonus;
            const theirTotal = theirs.value + d.foeBonus;

            if (yourTotal > theirTotal) {
                const result: QuestSpaceResult = {
                    ...emptyResult(),
                    title: `${d.foe} IS ROUTED`,
                    body: `It remembers urgent business elsewhere. The hoard is yours: +${d.spoils.count} ${def.partNames[d.spoils.part]}.`,
                    rolls: [yours.value, theirs.value],
                    partsDelta: { [d.spoils.part]: d.spoils.count },
                };
                next = { ...next, metrics: { ...next.metrics, duelsWon: next.metrics.duelsWon + 1 } };
                return settleResult(next, result);
            }
            if (yourTotal === theirTotal) {
                const result: QuestSpaceResult = {
                    ...emptyResult(),
                    title: 'A STANDOFF',
                    body: 'Neither side blinks, so both pretend the whole thing was about something else. No spoils, no scars.',
                    rolls: [yours.value, theirs.value],
                };
                return settleResult(next, result);
            }
            const result: QuestSpaceResult = {
                ...emptyResult(),
                title: 'DRIVEN OFF',
                body: `${d.foe} holds the field and crows about it. −${d.bite} vigor.`,
                rolls: [yours.value, theirs.value],
                vigorDelta: -d.bite,
            };
            next = { ...next, metrics: { ...next.metrics, duelsLost: next.metrics.duelsLost + 1 } };
            return settleResult(next, result);
        }

        case 'snag': {
            const n = space.snag;
            if (optionId === 'detour') {
                const result: QuestSpaceResult = {
                    ...emptyResult(),
                    title: 'THE LONG WAY ROUND',
                    body: `Slower, dearer, dry. −${n.detourFish} fish.`,
                    fishDelta: -n.detourFish,
                };
                return settleResult(s, result);
            }
            // risk
            const roll = rollDie(s.rng);
            let next: QuestBoardSession = { ...s, rng: roll.state };
            if (roll.value >= n.threshold) {
                const result: QuestSpaceResult = {
                    ...emptyResult(),
                    title: 'CLEAN ACROSS',
                    body: 'Quick feet and no witnesses. The bad ground keeps its tax for the next one through.',
                    rolls: [roll.value],
                };
                return settleResult(next, result);
            }
            const def2 = getQuestBoardDef(next.boardId);
            const slippedPos = (next.pos - n.slipBack + def2.spaces.length) % def2.spaces.length;
            next = {
                ...next,
                pos: slippedPos,
                metrics: { ...next.metrics, snagsSuffered: next.metrics.snagsSuffered + 1 },
            };
            const result: QuestSpaceResult = {
                ...emptyResult(),
                title: 'TAKEN BY THE GROUND',
                body: `Skin, pride, and ground all lost at once. −${n.bite} vigor, back ${n.slipBack} spaces.`,
                rolls: [roll.value],
                vigorDelta: -n.bite,
                slippedBack: n.slipBack,
            };
            return settleResult(next, result);
        }

        case 'market': {
            if (optionId === 'leave') {
                const ledger = s.pending.ledger ?? [];
                const result: QuestSpaceResult = {
                    ...emptyResult(),
                    title: ledger.length > 0 ? 'DEALINGS DONE' : 'JUST LOOKING',
                    body: ledger.length > 0
                        ? `The stalls part with: ${ledger.join('; ')}.`
                        : 'Three stalls watched him weigh his fish and walk on. They have seen worse manners.',
                };
                // Purchases were already applied; the leave card is a recap.
                const pending: QuestPendingSpace = { ...s.pending, options: [], result };
                return { ...s, pending };
            }
            const index = Number(optionId.replace('offer-', ''));
            const offer = space.market.offers[index];
            if (!offer || s.fish < offer.fishCost) return s;
            const purchase: QuestSpaceResult = {
                ...emptyResult(),
                title: '',
                body: '',
                fishDelta: -offer.fishCost,
                partsDelta: { [offer.part]: offer.count },
            };
            const paid = applyResultDeltas(s, purchase);
            const ledger = [
                ...(s.pending.ledger ?? []),
                `${offer.count} × ${def.partNames[offer.part]} for ${offer.fishCost} fish`,
            ];
            const pending: QuestPendingSpace = {
                ...s.pending,
                options: marketOptions(paid, space),
                ledger,
            };
            return { ...paid, pending };
        }

        case 'parley': {
            const authored = space.parley.options.find(o => o.id === optionId);
            if (!authored) return s;
            const result: QuestSpaceResult = {
                ...emptyResult(),
                title: space.parley.npc,
                body: authored.outcome,
                fishDelta: authored.fish ?? 0,
                vigorDelta: authored.vigor ?? 0,
                partsDelta: authored.parts ? { [authored.parts.part]: authored.parts.count } : {},
                windDelta: authored.wind ?? 0,
            };
            const next: QuestBoardSession = {
                ...s,
                metrics: { ...s.metrics, talesHeard: s.metrics.talesHeard + 1 },
            };
            return settleResult(next, result);
        }

        // slipway / hearth / cache / omen are result-only; no options to choose.
        default:
            return s;
    }
}

/** Applies a freshly-resolved result and closes the options. */
function settleResult(s: QuestBoardSession, result: QuestSpaceResult): QuestBoardSession {
    if (s.pending === null) return s;
    const applied = applyResultDeltas(s, result);
    const pending: QuestPendingSpace = { ...s.pending, options: [], result };
    return { ...applied, pending };
}

// ---------------------------------------------------------------------------
// Continuing (space → idle | dusk | outcome)
// ---------------------------------------------------------------------------

/**
 * space → idle | dusk | outcome. Acknowledges the result card; vigor
 * collapse or a spent day brings dusk, otherwise play returns to the
 * bone die.
 */
export function continueQuestSpace(s: QuestBoardSession): QuestBoardSession {
    if (s.phase !== 'space' || s.pending === null || s.pending.result === null) return s;
    const def = getQuestBoardDef(s.boardId);
    const cleared: QuestBoardSession = { ...s, pending: null };

    // Collapse: vigor spent to nothing. The day ends early; the Boy is
    // walked home and fed. Never a fail state — the quest cannot be lost.
    if (cleared.vigor <= 0) {
        const recovered = Math.max(1, Math.floor(def.maxVigor * T.collapseRecoverFraction));
        return {
            ...cleared,
            vigor: recovered,
            collapsedToday: true,
            metrics: { ...cleared.metrics, collapses: cleared.metrics.collapses + 1 },
            phase: 'dusk',
        };
    }

    if (cleared.stretch >= T.stretchesPerDay) {
        return { ...cleared, phase: 'dusk' };
    }

    return { ...cleared, phase: 'idle' };
}

/** dusk → idle. A new day: supper restores a little vigor. */
export function acknowledgeQuestDusk(s: QuestBoardSession): QuestBoardSession {
    if (s.phase !== 'dusk') return s;
    const def = getQuestBoardDef(s.boardId);
    return {
        ...s,
        day: s.day + 1,
        stretch: 0,
        vigor: Math.min(def.maxVigor, s.vigor + T.duskVigor),
        collapsedToday: false,
        phase: 'idle',
    };
}

// ---------------------------------------------------------------------------
// Outcome
// ---------------------------------------------------------------------------

function finishQuestBoard(s: QuestBoardSession): QuestBoardSession {
    // The board is complete here, so questVowResults judges every vow
    // kept/broken — no 'active' survives the finish line.
    const finalVows = questVowResults(s);
    const vowsKept = finalVows.filter(v => v.status === 'kept').length;

    let tier: QuestOutcomeTier;
    if (s.day <= T.masterworkMaxDays && vowsKept >= T.masterworkMinVows) tier = 'masterwork';
    else if (s.day <= T.seaworthyMaxDays && vowsKept >= T.seaworthyMinVows) tier = 'seaworthy';
    else tier = 'driftwood';

    const outcome: QuestBoardOutcome = {
        tier,
        daysTaken: s.day,
        fishLeft: s.fish,
        vigorLeft: s.vigor,
        vows: finalVows,
        vowsKept,
        metrics: s.metrics,
    };
    return { ...s, pending: null, outcome, phase: 'outcome' };
}

function vowHolds(id: QuestVowResult['id'], s: QuestBoardSession): boolean {
    switch (id) {
        case 'swift-keel':     return s.day <= T.swiftKeelDay;
        case 'unbitten':       return s.metrics.lowestVigor >= T.unbittenFloor;
        case 'fed-larder':     return s.fish >= T.fedLarderFish;
        case 'gulls-bane':     return s.metrics.duelsWon >= T.gullsBaneWins;
        case 'tale-collector': return s.metrics.talesHeard >= T.taleCollectorCount;
    }
}

/**
 * outcome → done. The host claims the completion record (board id +
 * tier) and applies its cosmetic story effects (flags); the engine
 * just seals the session.
 */
export function claimQuestBoardCompletion(s: QuestBoardSession): QuestBoardSession {
    if (s.phase !== 'outcome' || s.outcome === null) return s;
    return { ...s, phase: 'done' };
}
