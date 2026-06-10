#!/usr/bin/env node

/**
 * Hazard Minigame CLI — standalone driver for the hazard mini-game.
 *
 * Reachable as a SUBCOMMAND of the game CLI:
 *
 *   npm run game -- hazard [flags]
 *   npm run hazard -- [flags]            (convenience alias)
 *
 * It reuses the shared `io.ts` layer (tty inquirer / `--script` JSON /
 * `--stdin`, plus `--json-events` and `--state-log`) so a person, a replay
 * file, or an agent can all drive it through the same surface as game.cli.ts.
 *
 * Scope (per the scoping questionnaire):
 *   • `--hazard <id>`   pick a hazard card (H01..); prompts from the library
 *                       when omitted.
 *   • `--route top|bottom`  choose the route; prompts when omitted.
 *   • `--auto`          let a greedy heuristic play each round; otherwise the
 *                       player picks cards by hand.
 *   • `--seed <n|str>`  seed the shared RNG so a run is fully reproducible.
 *   • `--runs <n>`      play N hazards back-to-back (default 5). A fresh
 *                       per-encounter "hazard state" is created for each run;
 *                       the cross-run player ledger (vitae / supply / items)
 *                       persists and is only reset when this process exits.
 *
 * Dice exhaustion / refresh and deck state persist WITHIN an encounter (the
 * engine's HazardMinigameState carries them across rounds); that state is
 * discarded once the encounter completes, exactly as a real hazard would end.
 *
 * Logic stays in the hazard engine. This file only parses flags, prompts,
 * dispatches engine verbs, applies the reward/penalty ledger, and formats.
 */

import {
    prompt, emit, log, logState,
    setIoMode, setOutputMode, setStateLogPath,
} from './io';
import { setSeed, getRng } from '../Utils/rng';
import {
    initializeHazard,
    drawOpeningHand,
    selectRoute,
    rollDiceAndStartRound,
    playCardInRound,
    resolveRound,
    advanceToNextRound,
    computeFinalScore,
    getHazardCard,
    getActionCard,
    canAffordCost,
    HAZARD_CARD_LIBRARY,
    STARTER_DECK_CARD_IDS,
} from '../World/Hazard';
import type {
    HazardCard,
    HazardMinigameState,
    HazardProgressType,
    HazardRoute,
    HazardReward,
    HazardPenalty,
    HazardRngFunction,
} from '../World/Hazard/hazard.types';

// ─── Flags ──────────────────────────────────────────────────────────────────

export interface HazardCliFlags {
    hazardId?: string;
    route?: 'top' | 'bottom';
    auto: boolean;
    seed?: string;
    runs: number;
    // Shared io flags (parity with game.cli.ts).
    scriptPath?: string;
    stdin: boolean;
    jsonEvents: boolean;
    stateLogPath?: string;
}

const USAGE =
    'Usage: npm run game -- hazard ' +
    '[--hazard <id>] [--route top|bottom] [--auto] [--seed <n>] [--runs <n>] ' +
    '[--script <path>] [--stdin] [--json-events] [--state-log <path>]';

/** Pull `--flag value` or `--flag=value`; returns [value, nextIndex]. */
function takeValue(args: string[], i: number, flag: string): [string, number] {
    const arg = args[i]!;
    const eq = `${flag}=`;
    if (arg.startsWith(eq)) return [arg.slice(eq.length), i + 1];
    const next = args[i + 1];
    if (next === undefined || next.startsWith('--')) {
        throw new Error(`${flag} requires a value argument.\n${USAGE}`);
    }
    return [next, i + 2];
}

export function parseHazardArgv(args: string[]): HazardCliFlags {
    const flags: HazardCliFlags = { auto: false, runs: 5, stdin: false, jsonEvents: false };
    let i = 0;
    while (i < args.length) {
        const arg = args[i]!;
        const base = arg.split('=', 1)[0]!;
        switch (base) {
            case '--auto':         flags.auto = true; i++; break;
            case '--stdin':        flags.stdin = true; i++; break;
            case '--json-events':  flags.jsonEvents = true; i++; break;
            case '--hazard':       [flags.hazardId, i] = takeValue(args, i, '--hazard'); break;
            case '--seed':         [flags.seed, i] = takeValue(args, i, '--seed'); break;
            case '--script':       [flags.scriptPath, i] = takeValue(args, i, '--script'); break;
            case '--state-log':    [flags.stateLogPath, i] = takeValue(args, i, '--state-log'); break;
            case '--route': {
                let value: string;
                [value, i] = takeValue(args, i, '--route');
                if (value !== 'top' && value !== 'bottom') {
                    throw new Error(`--route must be 'top' or 'bottom', got '${value}'.\n${USAGE}`);
                }
                flags.route = value;
                break;
            }
            case '--runs': {
                let value: string;
                [value, i] = takeValue(args, i, '--runs');
                const n = Number(value);
                if (!Number.isInteger(n) || n < 1) {
                    throw new Error(`--runs must be a positive integer, got '${value}'.\n${USAGE}`);
                }
                flags.runs = n;
                break;
            }
            default:
                throw new Error(`Unknown hazard CLI flag: '${arg}'.\n${USAGE}`);
        }
    }
    return flags;
}

// ─── Player ledger (persists across --runs, cleared on process exit) ──────────

interface PlayerLedger {
    vitae: number;
    supplyTokens: number;
    items: string[];
    /**
     * Extra X marks a failed round threatened to inflict. The engine does not
     * yet retroactively re-mark rounds (resolveRound leaves penaltiesApplied
     * empty — TODO in hazard.engine.ts), so we only tally them here so a tester
     * can see the pressure a route applied.
     */
    threatenedX: number;
}

function freshLedger(): PlayerLedger {
    return { vitae: 0, supplyTokens: 0, items: [], threatenedX: 0 };
}

function applyReward(ledger: PlayerLedger, reward: HazardReward | undefined): void {
    if (!reward) return;
    ledger.vitae += reward.vitae ?? 0;
    ledger.supplyTokens += reward.supplyTokens ?? 0;
    if (reward.items) ledger.items.push(...reward.items);
}

function applyPenalty(ledger: PlayerLedger, penalty: HazardPenalty | undefined): void {
    if (!penalty) return;
    ledger.vitae += penalty.vitae ?? 0;
    ledger.supplyTokens += penalty.supplyTokens ?? 0;
    ledger.threatenedX += penalty.additionalX ?? 0;
}

/**
 * Apply an encounter's outcome to the cross-run ledger. CLI-layer policy
 * (the engine's resolveRound does not yet apply rewards/penalties):
 *   • each round marked X applies the route failurePenalty, plus the
 *     finalRoundFailurePenalty on the last round;
 *   • the route reward is granted when the encounter nets positive
 *     (finalScore > 0, i.e. more O than X).
 */
function applyEncounterOutcome(ledger: PlayerLedger, state: HazardMinigameState): void {
    // FIXME: This function needs to be updated for v2 tiered reward/penalty system
    // For now, just prevent crashes - the reward/penalty logic is broken
    if (!state.hazardCard) {
        console.warn('applyEncounterOutcome: state.hazardCard is undefined');
        return;
    }
    
    const route = activeRoute(state);
    console.warn('applyEncounterOutcome: v2 reward/penalty system not yet implemented in CLI');
    // TODO: Implement v2 tiered rewards/penalties based on final outcome
}

// ─── Engine helpers ───────────────────────────────────────────────────────────

function activeRoute(state: HazardMinigameState): HazardRoute {
    return state.chosenRoute === 'bottom'
        ? state.hazardCard.riskRoute
        : state.hazardCard.safeRoute;
}

/** The progress type a round is judged against - v2 always uses combined force+escape. */
function requiredProgressType(state: HazardMinigameState): HazardProgressType | null {
    // v2 always uses combined force+escape progress, no single progress types
    return null;
}

function thresholdForCurrentRound(state: HazardMinigameState): number {
    const route = activeRoute(state);
    const idx = (state.currentRound?.round ?? 1) - 1;
    
    if (route.type === 'safe') {
        return route.combinedThresholds[idx] ?? 0;
    } else {
        // For risk routes, return combined force + escape requirement
        const forceThreshold = route.forceThresholds[idx] ?? 0;
        const escapeThreshold = route.escapeThresholds[idx] ?? 0;
        return forceThreshold + escapeThreshold;
    }
}

function progressTowardThreshold(state: HazardMinigameState): number {
    const req = requiredProgressType(state);
    const progress = state.currentRound?.progress;
    if (!progress) return 0;
    if (req === null) return Object.values(progress).reduce((a, b) => a + b, 0);
    return progress[req];
}

function availableDiceSummary(state: HazardMinigameState): string {
    const avail = state.mana.filter(d => d.state === 'available');
    if (avail.length === 0) return '(no dice available)';
    return avail.map(d => d.color).join(', ');
}

function canPayBottom(state: HazardMinigameState, cardId: string): boolean {
    const card = getActionCard(cardId);
    if (!card) return false;
    if (card.bottomManaCost.length === 0) return true;
    return canAffordCost(state.mana, card.bottomManaCost, card.class === 'x-die-interaction');
}

/**
 * Attempt a card play. On an illegal action (unknown card, unaffordable bottom
 * cost, wrong phase) we WARN and SKIP — returning the unchanged state — and log
 * the attempted action together with a full hazard-state snapshot so automated
 * tuning runs can learn what the driver tried to do. (Scoping decision Q9.)
 */
function tryPlayCard(
    state: HazardMinigameState,
    cardId: string,
    useBottom: boolean,
): HazardMinigameState {
    try {
        return playCardInRound(state, cardId, useBottom);
    } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        log(`  ⚠ illegal action skipped: play ${cardId} (${useBottom ? 'bottom' : 'top'}) — ${message}`);
        logState('illegalHazardAction', state, state, {
            attempted: { kind: 'playCard', cardId, useBottom },
            error: message,
            hazardState: state,
        });
        return state;
    }
}

// ─── Card play: auto heuristic ────────────────────────────────────────────────

/**
 * Greedy round policy: spend free focus cards first to load the buffer, then
 * play progress cards that advance the required type — preferring the bottom
 * action (bigger payoff) whenever its mana cost is affordable.
 */
function autoPlayRound(state: HazardMinigameState): HazardMinigameState {
    const req = requiredProgressType(state);

    // 1) Focus cards (free top action) build the focus buffer for the next
    //    progress card.
    for (const cardId of [...state.hand]) {
        if (!state.hand.includes(cardId)) continue;
        const card = getActionCard(cardId);
        if (card?.class === 'focus') {
            state = tryPlayCard(state, cardId, false);
        }
    }

    // 2) Progress cards matching the required type (or 'any', or all when the
    //    route is player-choice).
    for (const cardId of [...state.hand]) {
        if (!state.hand.includes(cardId)) continue;
        const card = getActionCard(cardId);
        if (!card || card.class !== 'direct-progress') continue;
        // v2: all cards provide force/escape progress, no specific progress type matching needed
        const matches = true;
        if (!matches) continue;
        const useBottom = card.bottomManaCost.length > 0 && canPayBottom(state, cardId);
        state = tryPlayCard(state, cardId, useBottom);
    }

    return state;
}

// ─── Card play: manual ─────────────────────────────────────────────────────────

async function manualPlayRound(state: HazardMinigameState): Promise<HazardMinigameState> {
    while (state.phase === 'round-play') {
        const req = requiredProgressType(state);
        const reqLabel = req ?? 'any (player-choice sum)';
        log(
            `\n  Round ${state.currentRound?.round}/${state.hazardCard.rounds} — ` +
            `need ${reqLabel} ≥ ${thresholdForCurrentRound(state)}, ` +
            `have ${progressTowardThreshold(state)}.`,
        );
        log(`  Dice available: ${availableDiceSummary(state)}`);

        if (state.hand.length === 0) {
            log('  Hand empty — resolving round.');
            return state;
        }

        const cardChoices = state.hand.map((cardId, idx) => {
            const card = getActionCard(cardId);
            const tag = card ? `${card.name} [${card.class}/force:${card.forceValue}/escape:${card.escapeValue}]` : cardId;
            return { name: `${cardId}: ${tag}`, value: `${idx}` };
        });
        cardChoices.push({ name: 'Resolve round (stop playing cards)', value: 'resolve' });

        const { pick } = await prompt<{ pick: string }>([{
            type: 'rawlist', name: 'pick', message: 'Play which card?', choices: cardChoices,
        }]);
        if (pick === 'resolve') return state;

        const cardId = state.hand[Number(pick)]!;
        const card = getActionCard(cardId);
        const hasBottom = (card?.bottomManaCost.length ?? 0) > 0 || card?.isEnchant;
        let useBottom = false;
        if (hasBottom) {
            const affordable = canPayBottom(state, cardId);
            const costLabel = (card?.bottomManaCost ?? [])
                .map(c => `${c.count} ${c.color}`).join(', ') || 'free';
            const { side } = await prompt<{ side: 'top' | 'bottom' }>([{
                type: 'rawlist', name: 'side', message: 'Top or bottom action?',
                choices: [
                    { name: 'Top — free effect', value: 'top' },
                    {
                        name: `Bottom — costs ${costLabel}${affordable ? '' : ' (UNAFFORDABLE)'}`,
                        value: 'bottom',
                    },
                ],
            }]);
            useBottom = side === 'bottom';
        }
        state = tryPlayCard(state, cardId, useBottom);
    }
    return state;
}

// ─── A single encounter ─────────────────────────────────────────────────────────

interface EncounterResult {
    hazardId: string;
    route: 'top' | 'bottom';
    marks: string;
    finalScore: number;
}

async function pickHazardCard(flags: HazardCliFlags): Promise<HazardCard> {
    if (flags.hazardId) {
        const card = getHazardCard(flags.hazardId);
        if (!card) {
            const known = HAZARD_CARD_LIBRARY.map(c => c.id).join(', ');
            throw new Error(`Unknown hazard id '${flags.hazardId}'. Known: ${known}.`);
        }
        return card;
    }
    const { id } = await prompt<{ id: string }>([{
        type: 'rawlist', name: 'id', message: 'Which hazard?',
        choices: HAZARD_CARD_LIBRARY.map(c => ({
            name: `${c.id} — ${c.name} (${c.rounds} rounds)`, value: c.id,
        })),
    }]);
    return getHazardCard(id)!;
}

async function pickRoute(state: HazardMinigameState, flags: HazardCliFlags): Promise<'top' | 'bottom'> {
    if (flags.route) return flags.route;
    const { top, bottom } = { top: state.hazardCard.safeRoute, bottom: state.hazardCard.riskRoute };
    const describe = (r: HazardRoute) => {
        if (r.type === 'safe') {
            return `safe · combined [${r.combinedThresholds.join(', ')}]`;
        } else {
            return `risk · force [${r.forceThresholds.join(', ')}] escape [${r.escapeThresholds.join(', ')}]`;
        }
    };
    const { route } = await prompt<{ route: 'top' | 'bottom' }>([{
        type: 'rawlist', name: 'route', message: 'Choose a route:',
        choices: [
            { name: `Top    — ${describe(top)}`, value: 'top' },
            { name: `Bottom — ${describe(bottom)}`, value: 'bottom' },
        ],
    }]);
    return route;
}

async function playEncounter(
    flags: HazardCliFlags,
    rng: HazardRngFunction,
    ledger: PlayerLedger,
    runIndex: number,
): Promise<EncounterResult> {
    const hazardCard = await pickHazardCard(flags);
    log(`\n═══ Run ${runIndex} — ${hazardCard.id}: ${hazardCard.name} (${hazardCard.rounds} rounds) ═══`);
    log(`  ${hazardCard.scenario}`);

    let state = initializeHazard(hazardCard, STARTER_DECK_CARD_IDS, rng);
    logState('initializeHazard', null, state, { hazardId: hazardCard.id, runIndex });

    state = drawOpeningHand(state, rng);

    const route = await pickRoute(state, flags);

    // v2 doesn't have player-choice routes - all routes have fixed progress requirements
    
    // Convert CLI route names to engine route names
    const engineRoute = route === 'bottom' ? 'risk' : 'safe';
    
    const before = state;
    state = selectRoute(state, engineRoute);
    logState('selectRoute', before, state, { route, engineRoute });

    state = rollDiceAndStartRound(state, rng);
    logState('rollDiceAndStartRound', null, state, { dice: state.mana.map(d => d.color) });

    while (state.phase === 'round-play') {
        const roundBefore = state;
        state = flags.auto ? autoPlayRound(state) : await manualPlayRound(state);

        const resolved = resolveRound(state);
        const lastResult = resolved.rounds[resolved.rounds.length - 1]!;
        log(
            `  Round ${lastResult.round} → ${lastResult.mark}` +
            ` (had ${progressTowardThreshold(state)} / need ${thresholdForCurrentRound(state)})`,
        );
        logState('resolveRound', roundBefore, resolved, lastResult);
        state = resolved;

        if (state.phase === 'between-rounds') {
            state = advanceToNextRound(state, rng);
            logState('advanceToNextRound', null, state, { round: state.currentRound?.round });
        }
    }

    const finalScore = computeFinalScore(state);
    applyEncounterOutcome(ledger, state);

    const marks = state.rounds.map(r => r.succeeded ? 'O' : 'X').join('');
    const result: EncounterResult = {
        hazardId: hazardCard.id,
        route,
        marks,
        finalScore,
    };
    log(`  Result: [${marks}]  score ${result.finalScore}  (route: ${route})`);
    logState('computeFinalScore', null, state, {
        ...result,
        ledger: { ...ledger, items: [...ledger.items] },
    });
    emit({ type: 'hazard:complete', payload: result });
    return result;
}

/** Helper mirrors activeRoute but for a route not yet committed to state. */
function activeRouteForChoice(state: HazardMinigameState, route: 'top' | 'bottom'): HazardRoute {
    return route === 'bottom' ? state.hazardCard.riskRoute : state.hazardCard.safeRoute;
}

// ─── Entry point ────────────────────────────────────────────────────────────────

export async function runHazardCli(argv: string[]): Promise<void> {
    const flags = parseHazardArgv(argv);

    if (flags.jsonEvents) setOutputMode('json');
    if (flags.scriptPath) {
        const fs = await import('fs');
        const answers = JSON.parse(fs.readFileSync(flags.scriptPath, 'utf-8'));
        if (!Array.isArray(answers)) {
            throw new Error('--script JSON must be a top-level array of answer objects.');
        }
        setIoMode({ kind: 'script', answers });
    } else if (flags.stdin) {
        setIoMode({ kind: 'stdin' });
    }
    if (flags.stateLogPath) setStateLogPath(flags.stateLogPath);
    if (flags.seed !== undefined) setSeed(flags.seed);

    const rng: HazardRngFunction = () => getRng().random();
    const ledger = freshLedger();

    log('Axiomancer — hazard mini-game.');
    log(`Mode: ${flags.auto ? 'auto' : 'manual'}  ·  runs: ${flags.runs}` +
        (flags.seed !== undefined ? `  ·  seed: ${flags.seed}` : ''));

    const results: EncounterResult[] = [];
    for (let run = 1; run <= flags.runs; run++) {
        results.push(await playEncounter(flags, rng, ledger, run));
    }

    const totalScore = results.reduce((sum, r) => sum + r.finalScore, 0);
    const passed = results.filter(r => r.finalScore > 0).length;
    log('\n═══ Summary ═══');
    for (const r of results) {
        log(`  ${r.hazardId} (${r.route}): [${r.marks}] → ${r.finalScore}`);
    }
    log(`  ${passed}/${results.length} encounters net-positive · total score ${totalScore}`);
    log(`  Ledger — vitae ${ledger.vitae}, supply ${ledger.supplyTokens}, ` +
        `items [${ledger.items.join(', ') || 'none'}], threatened-X ${ledger.threatenedX}`);
    emit({
        type: 'hazard:summary',
        payload: { results, totalScore, passed, ledger: { ...ledger, items: [...ledger.items] } },
    });
}

// Allow direct execution: `ts-node src/CLI/hazard.cli.ts [flags]`.
if (require.main === module) {
    runHazardCli(process.argv.slice(2)).catch(err => {
        emit({ type: 'cli:exit', payload: { reason: 'error', message: String(err) } });
        process.exitCode = 1;
        log(String(err));
    });
}
