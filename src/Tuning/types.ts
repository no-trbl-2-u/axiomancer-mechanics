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

/** Every registry-facing tuning category (for narrowing mixed focus lists). */
export const TUNING_CATEGORIES: readonly TuningCategory[] = [
    'fundamental', 'enemy', 'item', 'effect', 'skill', 'loot',
];

/**
 * Parsed `--focus` directive. Every field optional; an empty filter means
 * "test everything at default weighting".
 */
export interface FocusFilter {
    /** Raw focus string, retained for the report. */
    raw?: string;
    /**
     * Registry categories AND/OR playstyle names. Playstyle entries weight
     * matching matrix cells; registry entries narrow the tunable registry
     * (`contentMatchesFocus` ignores playstyle entries).
     */
    categories?: (TuningCategory | PlaytestPolicy)[];
    tags?: string[];
    /** ISO date (`YYYY-MM-DD`); matches content/tunables with `addedIn` ≥ this. */
    addedAfter?: string;
    levelBands?: LevelBand[];
    /** Difficulties to weight higher in the matrix. */
    difficulties?: Difficulty[];
    /** Enemy slugs to prefer when assigning cell opponents. */
    enemies?: string[];
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
    /** Per-difficulty target band (see `difficulty.bands.ts`). */
    band: TargetBand;
}

export interface MatrixPlan {
    cells: MatrixCell[];
    baseSeed: string;
    focus: FocusFilter;
    metadata: {
        levels: number[];
        playstyles: PlaytestPolicy[];
        difficulties: Difficulty[];
        baseRuns: number;
        seed: string;
    };
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
        /** Card actions per run — proxy for status-effect engagement. */
        skillUsePerRun: number;
        /** Share of player actions that were skills (vs attack/defend/item). */
        skillActionShare: number;
    };
    /** Phase 139 — Resource economy metrics for analysis */
    resources?: {
        /** Share of rounds with adequate resources (≥ 3 total) */
        healthShare: number;
        /** Average total resource pool size per round */
        averagePool: number;
        /** Resource starvation pattern classification */
        pattern: 'healthy' | 'starved' | 'flooded' | 'unstable';
        /** Percentage of rounds in starvation (< 3 total resources) */
        starvationRate: number;
        /** Resource consumption efficiency (spent / generated) */
        efficiency: number;
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
    /** Player level for this cell (lets the witness metric group matchups). */
    level: number;
    /** Playstyle for this cell — the witness compares strategist vs aggressive. */
    playstyle: PlaytestPolicy;
    difficulty: Difficulty;
    weight: number;
    resolutionSuccessRate: number;
    defeatRate: number;
    /** Per-cell target band (difficulty-dependent). */
    band: TargetBand;
    /** Squared distance from this cell's band (0 ⇒ inside the band). */
    bandDeviation: number;
    /**
     * Status-effect LEVERAGE share in [0,1] — raw activity discounted by whether
     * the fight resolved (status that ends fights counts; status sprayed into a
     * timeout barely does). This is what the objective penalises shortfall below.
     * `undefined` when the cell carries no transcript ⇒ no penalty.
     */
    engagementShare?: number;
    /**
     * Raw status-effect ACTIVITY share in [0,1] (was status used at all),
     * undiscounted. Diagnostic only — reported alongside leverage so the gap
     * between "status used" and "status mattered" is legible. `undefined` when
     * the cell carries no transcript.
     */
    activityShare?: number;
    /** Squared shortfall below the engagement floor (0 ⇒ at/above floor). */
    engagementDeviation: number;
    /**
     * Combined per-cell objective (band + engagement shortfall). LOWER is
     * healthier. This is the paired sample the A/B significance test consumes.
     */
    deviation: number;
}

/**
 * The witness test, made mathematical. Doctrine: if basic-attack trading is a
 * more attractive route than status play, the design has failed. So we compare,
 * across the matrix, how well the status-first STRATEGIST resolves fights versus
 * the basic-attack AGGRESSIVE. `strategistEdge > 0` ⇒ status play out-resolves
 * basic play (healthy); `< 0` ⇒ basic attacks win more (a doctrine failure the
 * objective should not reward). Present only when the matrix ran both playstyles.
 */
export interface WitnessMetric {
    /** Weighted-mean resolution success of strategist (status-first) cells. */
    strategistResolution: number;
    /** Weighted-mean resolution success of aggressive (basic-attack) cells. */
    aggressiveResolution: number;
    /** strategistResolution − aggressiveResolution; >0 ⇒ status play wins more. */
    strategistEdge: number;
    /** Number of (strategist, aggressive) cells the comparison drew from. */
    cells: number;
}

export interface HealthScore {
    perCell: CellHealth[];
    /** Aggregate combined deviation (band + engagement) — LOWER is healthier. */
    aggregate: number;
    /** Resolution-band component of the aggregate (for diagnostics). */
    aggregateBand: number;
    /** Engagement-shortfall component of the aggregate (for diagnostics). */
    aggregateEngagement: number;
    /** Mean status-effect LEVERAGE share across cells (HIGHER is healthier). */
    meanEngagement: number;
    /** Mean raw status-effect ACTIVITY share across cells (diagnostic). */
    meanActivity: number;
    /** Strategist-vs-aggressive witness comparison (when both ran). */
    witness?: WitnessMetric;
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
    /**
     * Witness guard tripped: the candidate made basic-attack play (aggressive)
     * out-resolve status play (strategist) materially more than the baseline did
     * — a doctrine regression even if the aggregate improved.
     */
    witnessRegression: boolean;
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
