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
 * How INCREASING a tunable's value moves an outcome dimension. `raises` /
 * `lowers` give the heuristic a corrective direction without a sensitivity
 * probe; `either` (or omitted) means the direction is ambiguous and the param
 * is left to a probe / human. Read as: "raising this param <raises|lowers>
 * <difficulty for the player | status-effect engagement>".
 */
export type DirectionHint = 'raises' | 'lowers' | 'either';

export interface TunableEffectHint {
    /** Effect of raising the value on how HARD the game is for the player. */
    difficulty?: DirectionHint;
    /** Effect of raising the value on STATUS-EFFECT engagement. */
    engagement?: DirectionHint;
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
    /**
     * Declared monotonic direction this knob pushes difficulty / engagement.
     * Lets the heuristic propose corrective nudges for ALL knobs, not just the
     * two headline ones. Omitted ⇒ ambiguous ⇒ propose-only.
     */
    effect?: TunableEffectHint;
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

export interface TargetBand { low: number; high: number; }

export interface CellHealth {
    cellId: string;
    difficulty: Difficulty;
    weight: number;
    resolutionSuccessRate: number;
    defeatRate: number;
    /** Per-cell target band (difficulty-dependent). */
    band: TargetBand;
    /** Squared distance from this cell's band (0 ⇒ inside the band). */
    bandDeviation: number;
    /**
     * Status-effect engagement share in [0,1] (rounds where the player applied
     * or exploited a status effect / action rounds). `undefined` when the cell
     * carries no transcript (e.g. synthetic test reports) ⇒ no penalty.
     */
    engagementShare?: number;
    /** Squared shortfall below the engagement floor (0 ⇒ at/above floor). */
    engagementDeviation: number;
    /**
     * Combined per-cell objective (band + engagement shortfall). LOWER is
     * healthier. This is the paired sample the A/B significance test consumes.
     */
    deviation: number;
}

export interface HealthScore {
    perCell: CellHealth[];
    /** Aggregate combined deviation (band + engagement) — LOWER is healthier. */
    aggregate: number;
    /** Resolution-band component of the aggregate (for diagnostics). */
    aggregateBand: number;
    /** Engagement-shortfall component of the aggregate (for diagnostics). */
    aggregateEngagement: number;
    /** Mean status-effect engagement share across cells (HIGHER is healthier). */
    meanEngagement: number;
    /** The normal-difficulty band, retained for display/back-compat. */
    targetBand: TargetBand;
    /** The engagement floor the objective penalizes shortfall below. */
    engagementFloor: number;
    /** Worst defeat rate across cells (regression guard). */
    maxDefeatRate: number;
    summary: string;
}

export type Confidence = 'high' | 'medium' | 'low';

export interface HealthComparison {
    winner: 'A' | 'B';
    /** Aggregate objective delta (a.aggregate − b.aggregate); >0 ⇒ B healthier. */
    delta: number;
    /** True when the paired per-cell improvement clears the noise floor. */
    significant: boolean;
    /** Statistical confidence in the verdict, from the paired-cell spread. */
    confidence: Confidence;
    /** Defeat-rate regression guard tripped. */
    regression: boolean;
    /** Engagement-collapse guard tripped (status play got materially worse). */
    engagementRegression: boolean;
    /** Paired-cell statistics behind `significant` / `confidence`. */
    stats: { meanDelta: number; stdErr: number; n: number; ciMargin: number };
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

/** Accumulator for an averaged observation (total / samples). */
export interface RunningMean { total: number; samples: number; }

export interface EnemyKnowledge {
    slug: string;
    /** Average damage the player dealt while attacking in each stance. */
    stanceDamage: Partial<Record<Stance, RunningMean>>;
    /** Average damage observed per skill id. */
    skillDamage: Record<string, RunningMean>;
    /**
     * Average STATUS-EFFECT leverage (effects applied to the enemy + exploited
     * via synergy) per stance. The strategist optimises this first — per the
     * doctrine that status play, not raw damage, is the intended winning path.
     */
    stanceStatus?: Partial<Record<Stance, RunningMean>>;
    /** Average status-effect leverage observed per skill id. */
    skillStatus?: Record<string, RunningMean>;
    sampleCount: number;
}

export interface StrategistKnowledge {
    enemies: Record<string, EnemyKnowledge>;
    updatedAt: string;
}

// ─── Experiment ledger ──────────────────────────────────────────────────────

/** One recorded A/B outcome, persisted so the loop remembers what it tried. */
export interface LedgerEntry {
    timestamp: string;
    paramId: string;
    oldValue: number;
    newValue: number;
    /** Direction of the attempted change relative to the old value. */
    direction: 'up' | 'down';
    deltaHealth: number;
    kept: boolean;
    significant: boolean;
    confidence: Confidence;
    focus?: string;
}

export interface ExperimentLedger {
    entries: LedgerEntry[];
    updatedAt: string;
}
