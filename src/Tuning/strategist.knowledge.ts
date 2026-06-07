/**
 * Strategist cross-run knowledge store.
 *
 * Mines per-run transcripts for how much damage the player dealt in each stance
 * and with each skill against a given enemy, accumulates it across runs/cells,
 * and exposes an advisor the strategist policy consults to exploit learned
 * weaknesses. Persisted as JSON so learning survives across tuning ticks.
 */

import * as fs from 'fs';
import * as path from 'path';
import type { Stance } from '../Combat';
import type { PlaytestRunSummary, StrategistAdvisor } from '../Playtest/types';
import type { EnemyKnowledge, StrategistKnowledge } from './types';

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

function ensureEnemy(knowledge: StrategistKnowledge, slug: string): EnemyKnowledge {
    let entry = knowledge.enemies[slug];
    if (!entry) {
        entry = { slug, stanceDamage: {}, skillDamage: {}, sampleCount: 0 };
        knowledge.enemies[slug] = entry;
    }
    return entry;
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

/**
 * Fold one run's transcript into the knowledge store, attributing each round's
 * damage-to-enemy to the player's stance and (if any) skill that round.
 */
export function updateFromRun(
    knowledge: StrategistKnowledge,
    enemySlug: string,
    run: PlaytestRunSummary,
): void {
    const entry = ensureEnemy(knowledge, enemySlug);
    for (const round of run.transcript) {
        const dmg = roundDamageToEnemy(round.combatEvents);
        if (round.playerAction.action !== 'attack' && round.playerAction.action !== 'skill') continue;
        const stance = round.playerAction.stance;
        const sd = entry.stanceDamage[stance] ?? { total: 0, samples: 0 };
        sd.total += dmg;
        sd.samples += 1;
        entry.stanceDamage[stance] = sd;

        const skillId = round.playerAction.skillId;
        if (skillId) {
            const kd = entry.skillDamage[skillId] ?? { total: 0, samples: 0 };
            kd.total += dmg;
            kd.samples += 1;
            entry.skillDamage[skillId] = kd;
        }
    }
    entry.sampleCount += run.transcript.length;
    knowledge.updatedAt = new Date().toISOString();
}

function bestAverage<T extends string>(
    table: Partial<Record<T, { total: number; samples: number }>>,
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
    return best;
}

export function recommendStance(knowledge: StrategistKnowledge, slug: string): Stance | undefined {
    const entry = knowledge.enemies[slug];
    if (!entry) return undefined;
    return bestAverage<Stance>(
        entry.stanceDamage as Partial<Record<Stance, { total: number; samples: number }>>,
    );
}

export function recommendSkill(knowledge: StrategistKnowledge, slug: string): string | undefined {
    const entry = knowledge.enemies[slug];
    if (!entry) return undefined;
    return bestAverage<string>(entry.skillDamage);
}

/** Wrap a knowledge snapshot as the structural advisor the policy consults. */
export function makeAdvisor(knowledge: StrategistKnowledge): StrategistAdvisor {
    return {
        recommendStance: (key: string) => recommendStance(knowledge, key),
        recommendSkill: (key: string) => recommendSkill(knowledge, key),
    };
}

export { STANCES };
