/**
 * Strategist cross-run knowledge store.
 *
 * The strategist is the doctrine's witness: it is meant to win by APPLYING and
 * EXPLOITING status effects, not by trading basic attacks. So it learns, per
 * enemy, which stance and which skill yield the most status-effect leverage
 * (effects applied to the enemy + synergies exploited), and recommends those
 * first. Raw damage is still tracked and used as a fallback / tiebreak so the
 * policy never stalls when no status data exists yet.
 *
 * Mines per-run transcripts, accumulates across runs/cells, and persists as
 * JSON so learning survives across tuning ticks.
 */

import * as fs from 'fs';
import * as path from 'path';
import type { Stance } from '../Combat';
import type { PlaytestRunSummary, StrategistAdvisor } from '../Playtest/types';
import type { EnemyKnowledge, RunningMean, StrategistKnowledge } from './types';

const REPO_ROOT = path.resolve(__dirname, '..', '..');
export const DEFAULT_KNOWLEDGE_PATH = path.join(
    REPO_ROOT, 'automation', 'playtest', 'strategist-knowledge.json',
);

const STANCES: Stance[] = ['heart', 'body', 'mind'];
/** Minimum observations before a recommendation is trusted. */
const MIN_SAMPLES = 3;

export function emptyKnowledge(): StrategistKnowledge {
    return { enemies: {}, updatedAt: new Date(0).toISOString() };
}

export function loadKnowledge(filePath: string = DEFAULT_KNOWLEDGE_PATH): StrategistKnowledge {
    try {
        const raw = fs.readFileSync(filePath, 'utf8');
        const parsed = JSON.parse(raw) as StrategistKnowledge;
        if (parsed && typeof parsed === 'object' && parsed.enemies) return parsed;
    } catch {
        /* missing / unreadable → start fresh */
    }
    return emptyKnowledge();
}

export function saveKnowledge(
    knowledge: StrategistKnowledge,
    filePath: string = DEFAULT_KNOWLEDGE_PATH,
): void {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify(knowledge, null, 2) + '\n', 'utf8');
}

/** Deep clone a knowledge snapshot (so a tick can freeze its measurement). */
export function cloneKnowledge(knowledge: StrategistKnowledge): StrategistKnowledge {
    return JSON.parse(JSON.stringify(knowledge)) as StrategistKnowledge;
}

function ensureEnemy(knowledge: StrategistKnowledge, slug: string): Required<EnemyKnowledge> {
    let entry = knowledge.enemies[slug];
    if (!entry) {
        entry = { slug, stanceDamage: {}, skillDamage: {}, sampleCount: 0 };
        knowledge.enemies[slug] = entry;
    }
    // Back-compat: older persisted entries lack the status tables.
    entry.stanceStatus ??= {};
    entry.skillStatus ??= {};
    return entry as Required<EnemyKnowledge>;
}

function add(table: Record<string, RunningMean>, key: string, value: number): void {
    const cell = table[key] ?? { total: 0, samples: 0 };
    cell.total += value;
    cell.samples += 1;
    table[key] = cell;
}

/** Damage dealt to the enemy by a single round's combat events. */
function roundDamageToEnemy(events: PlaytestRunSummary['transcript'][number]['combatEvents']): number {
    return events.reduce((total, event) => {
        if (event.phase === 'scenario' && event.kind === 'damage-applied' && event.defender === 'enemy') {
            return total + event.finalDamage;
        }
        if (event.phase === 'skill' && event.kind === 'damage' && event.target === 'enemy') {
            return total + event.amount;
        }
        return total;
    }, 0);
}

/** Status-effect leverage the player generated this round (apply + exploit). */
function roundStatusLeverage(events: PlaytestRunSummary['transcript'][number]['combatEvents']): number {
    return events.reduce((total, event) => {
        if (event.phase === 'skill' && event.kind === 'effect-applied') return total + 1;
        if (event.phase === 'skill' && event.kind === 'synergy-fired') return total + 1;
        if (event.phase === 'scenario' && event.kind === 'proc-applied'
            && event.actor === 'player' && event.appliedTo === 'opponent') return total + 1;
        return total;
    }, 0);
}

/**
 * Fold one run's transcript into the knowledge store, attributing each round's
 * damage-to-enemy AND status-effect leverage to the player's stance and (if
 * any) skill that round.
 */
export function updateFromRun(
    knowledge: StrategistKnowledge,
    enemySlug: string,
    run: PlaytestRunSummary,
): void {
    const entry = ensureEnemy(knowledge, enemySlug);
    for (const round of run.transcript) {
        if (round.playerAction.action !== 'attack' && round.playerAction.action !== 'skill') continue;
        const dmg = roundDamageToEnemy(round.combatEvents);
        const status = roundStatusLeverage(round.combatEvents);
        const stance = round.playerAction.stance;
        add(entry.stanceDamage as Record<string, RunningMean>, stance, dmg);
        add(entry.stanceStatus as Record<string, RunningMean>, stance, status);

        const skillId = round.playerAction.skillId;
        if (skillId) {
            add(entry.skillDamage, skillId, dmg);
            add(entry.skillStatus, skillId, status);
        }
    }
    entry.sampleCount += run.transcript.length;
    knowledge.updatedAt = new Date().toISOString();
}

/**
 * Best key by average value. `requirePositive` returns undefined when the best
 * average is ≤0 (used so an all-zero status table defers to the damage table).
 */
function bestAverage<T extends string>(
    table: Partial<Record<T, RunningMean>>,
    requirePositive = false,
): T | undefined {
    let best: T | undefined;
    let bestAvg = -Infinity;
    for (const key of Object.keys(table) as T[]) {
        const cell = table[key]!;
        if (cell.samples < MIN_SAMPLES) continue;
        const avg = cell.total / cell.samples;
        if (avg > bestAvg) {
            bestAvg = avg;
            best = key;
        }
    }
    if (requirePositive && bestAvg <= 0) return undefined;
    return best;
}

export function recommendStance(knowledge: StrategistKnowledge, slug: string): Stance | undefined {
    const entry = knowledge.enemies[slug];
    if (!entry) return undefined;
    // Status leverage first (the doctrine), damage as fallback.
    return bestAverage<Stance>(
        (entry.stanceStatus ?? {}) as Partial<Record<Stance, RunningMean>>, true,
    ) ?? bestAverage<Stance>(
        entry.stanceDamage as Partial<Record<Stance, RunningMean>>,
    );
}

export function recommendSkill(knowledge: StrategistKnowledge, slug: string): string | undefined {
    const entry = knowledge.enemies[slug];
    if (!entry) return undefined;
    return bestAverage<string>(entry.skillStatus ?? {}, true)
        ?? bestAverage<string>(entry.skillDamage);
}

/** Wrap a knowledge snapshot as the structural advisor the policy consults. */
export function makeAdvisor(knowledge: StrategistKnowledge): StrategistAdvisor {
    return {
        recommendStance: (key: string) => recommendStance(knowledge, key),
        recommendSkill: (key: string) => recommendSkill(knowledge, key),
    };
}

export { STANCES };
