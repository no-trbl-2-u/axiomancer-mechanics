/**
 * Tuning workflow types (Part B).
 *
 * The tuning layer runs a character × playstyle × enemy matrix on top of the
 * existing playtest harness, scores aggregate "health", proposes a single
 * numeric change, A/B-tests it under identical seeds, and keeps the healthier
 * variant. These types describe that pipeline. No combat logic lives here.
 */

import type { Stance } from '../Combat';
import type { PlaytestPolicy, PlaytestReport } from '../Playtest/types';
import type { BaseStats } from '../Character/types';

// ─── Focus ──────────────────────────────────────────────────────────────────

/** Coarse player-level bands the matrix and focus filter reason about. */
export type LevelBand = 'early' | 'mid' | 'late' | 'end';

/** Category a tunable / content entry belongs to (drives `--focus`). */
export type TuningCategory =
    | 'fundamental' | 'enemy' | 'item' | 'effect' | 'skill' | 'loot';

/**
 * Parsed `--focus` directive. Every field optional; an empty filter means
 * "test everything at default weighting".
 */
export interface FocusFilter {
    /** Raw focus string, retained for the report. */
    raw?: string;
    categories?: TuningCategory[];
    tags?: string[];
    /** ISO date (`YYYY-MM-DD`); matches content/tunables with `addedIn` ≥ this. */
    addedAfter?: string;
    levelBands?: LevelBand[];
    /** Multiplier applied to per-cell run counts for focused cells (≥0). */
    sampleScale?: number;
}

// ─── Tunable registry ─────────────────────────────────────────────────────────

export type TunableKind =
    | 'constant' | 'multiplier' | 'enemy-stat' | 'item-modifier'
    | 'skill-power' | 'effect-duration' | 'drop-weight';

/**
 * Structured, machine-resolvable pointer to ONE numeric leaf in a source file.
 * Never a regex — the applier walks the TypeScript AST (or parses JSON) to the
 * exact node addressed here.
 */
export interface TunableLocator {
    /** For TS-constant kinds: the exported symbol name (e.g. STAT_MULTIPLIERS). */
    exportName?: string;
    /** Dotted key path within the export's object literal (e.g. ['DEFENSE']). */
    keyPath?: string[];
    /** For JSON data: top-level array of records keyed by `idField`. */
    idField?: string;
    /** For JSON data: the id value selecting the record. */
    id?: string;
    /** For JSON data: dotted field path within the selected record. */
    field?: string[];
}

/**
 * One allow-listed numeric knob. Anything NOT in the registry is, by
 * construction, "propose-only" — the applier cannot resolve a locator for it.
 */
export interface TunableParam {
    id: string;
    kind: TunableKind;
    category: TuningCategory;
    /** Repo-relative path to the source/JSON file holding the value. */
    file: string;
    locator: TunableLocator;
    /** Hard floor / ceiling enforced on every candidate. */
    min: number;
    max: number;
    /** Snap granularity (1 ⇒ integers). Omit for continuous values. */
    step?: number;
    /** Per-run magnitude cap relative to the current value (default 0.25). */
    magnitudeCapPct: number;
    tags: string[];
    /** ISO date / phase tag for `--focus` provenance matching. */
    addedIn?: string;
    /** Why this value is safe to tune autonomously. */
    rationale: string;
}

// ─── Matrix ───────────────────────────────────────────────────────────────────

export type Difficulty = 'easy' | 'normal' | 'hard';

export interface MatrixCell {
    cellId: string;
    level: number;
    playstyle: PlaytestPolicy;
    difficulty: Difficulty;
    /** Enemy registry slug chosen for this cell. */
    enemySlug: string;
    runs: number;
    weight: number;
}

export interface MatrixPlan {
    cells: MatrixCell[];
    baseSeed: string;
    focus: FocusFilter;
}

/** Compact stat block for a combatant, embedded in the suggestions evidence. */
export interface CombatantSnapshot {
    name: string;
    level: number;
    baseStats: BaseStats;
    maxHealth: number;
    /** Headline derived combat stats (attack/defense per axis). */
    derived: {
        physicalAttack: number; physicalDefense: number;
        mentalAttack: number; mentalDefense: number;
        emotionalAttack: number; emotionalDefense: number;
    };
}

/**
 * A snapshot of the relevant game state for one matrix cell — the player
 * loadout, the scaled enemy, and combat-state highlights — so a suggestion can
 * carry its supporting evidence inline (the reviewer never has to reconstruct
 * the matchup from raw logs).
 */
export interface CellSnapshot {
    player: CombatantSnapshot & { knownSkills: number; equipment: string[] };
    enemy: CombatantSnapshot & { logic: string; difficulty?: string; slug: string };
    combat: {
        resolutionSuccessRate: number;
        defeatRate: number;
        timeoutRate: number;
        averageRounds: number;
        damageRatioPlayerToEnemy: number;
        /** Top stances by share, e.g. "body 60% · mind 30%". */
        topStances: string;
        /** Top skill ids by use count (status-effect engagement signal). */
        topSkills: string[];
        /** Skill actions per run — proxy for status-effect engagement. */
        skillUsePerRun: number;
        /** Share of player actions that were skills (vs attack/defend/item). */
        skillActionShare: number;
    };
}

export interface CellResult {
    cell: MatrixCell;
    report: PlaytestReport;
    /** Optional supporting snapshot (populated by the matrix runner). */
    snapshot?: CellSnapshot;
}

// ─── Health scoring ───────────────────────────────────────────────────────────

export interface CellHealth {
    cellId: string;
    resolutionSuccessRate: number;
    defeatRate: number;
    /** Squared distance from the target band (0 ⇒ inside the band). */
    deviation: number;
}

export interface HealthScore {
    perCell: CellHealth[];
    /** Aggregate deviation — LOWER is healthier. */
    aggregate: number;
    targetBand: { low: number; high: number };
    /** Worst defeat rate across cells (regression guard). */
    maxDefeatRate: number;
    summary: string;
}

export interface HealthComparison {
    winner: 'A' | 'B';
    delta: number;
    significant: boolean;
    regression: boolean;
    note: string;
}

// ─── Experiment / candidates ──────────────────────────────────────────────────

export interface Candidate {
    paramId: string;
    proposedValue: number;
    rationale: string;
    source: 'analyst' | 'api' | 'heuristic';
}

export interface ExperimentResult {
    candidate: Candidate;
    paramId: string;
    oldValue: number;
    newValue: number;
    variantA: HealthScore;
    variantB: HealthScore;
    comparison: HealthComparison;
    /** True when variant B was kept (winner + passed verify). */
    kept: boolean;
    verifyPassed: boolean;
    diff?: string;
    notes: string[];
}

// ─── Report ───────────────────────────────────────────────────────────────────

export interface TuningTickResult {
    timestamp: string;
    focus: FocusFilter;
    plan: MatrixPlan;
    baseline: HealthScore;
    baselineCells: CellResult[];
    experiments: ExperimentResult[];
    /** Structural ideas the loop cannot auto-apply (propose-only). */
    proposeOnly: { paramId?: string; summary: string; rationale: string }[];
}

// ─── Strategist knowledge ─────────────────────────────────────────────────────

export interface EnemyKnowledge {
    slug: string;
    /** Average damage the player dealt while attacking in each stance. */
    stanceDamage: Partial<Record<Stance, { total: number; samples: number }>>;
    /** Average damage observed per skill id. */
    skillDamage: Record<string, { total: number; samples: number }>;
    sampleCount: number;
}

export interface StrategistKnowledge {
    enemies: Record<string, EnemyKnowledge>;
    updatedAt: string;
}
