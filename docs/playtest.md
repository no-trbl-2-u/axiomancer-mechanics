# Playtest Module

> Automated combat simulation and balance testing framework for Axiomancer Mechanics

## Overview

The Playtest module provides a comprehensive testing framework for simulating combat scenarios with various player policies to validate game balance, identify potential issues, and generate performance metrics. It supports headless automation for continuous integration and provides detailed reports for analysis.

## Core Components

### Runner Engine (`playtest.runner.ts`)

The main engine that orchestrates playtest scenarios:

- **`runPlaytestScenario(scenario: PlaytestScenario): PlaytestReport`** — Executes a complete playtest scenario with multiple runs
- **`aggregateMetrics(runs: PlaytestRunSummary[]): PlaytestMetrics`** — Aggregates results across multiple runs

### Policy System (`policies.ts`)

Defines automated player behavior patterns:

- **`selectPolicyAction(policy: PlaytestPolicy, combat: CombatState): CombatAction`** — Selects actions based on policy

#### Available Policies

| Policy | Behavior |
|--------|----------|
| `aggressive` | Prioritizes attacking with occasional skill usage |
| `defensive` | Uses healing items when low HP, defends when moderate HP |
| `friendship` | Always uses heart stance + defend to maximize friendship counter |
| `resource-optimal` | Uses skills when available resources permit, otherwise attacks |
| `random` | Randomized actions across all available options |
| `mixed` | Rotates through all other policies each round |

### CLI Interface (`cli.ts`)

Command-line interface for running playtests interactively or in automation pipelines.

### Report Generation (`report.ts`)

Generates formatted output from playtest metrics for analysis and review.

## Reference Fixtures (Phase 104)

The Playtest module includes two canonical reference scenarios that anchor balance decisions with reproducible data:

### Early-Game Reference

- **Fixture**: `earlyGameFixture` 
- **Character**: Level 1 apprentice preset (5/5/5 base stats)
- **Enemy**: Tidepool Crab (weakest fishing village enemy)
- **Purpose**: Tests start-of-game balance and progression gates

### Endgame Reference

- **Fixture**: `endgameFixture`
- **Character**: Max-level (20/20/20 stats) with all skills and rare equipment
- **Enemy**: Coastal Tyrant (primary boss encounter)
- **Purpose**: Tests late-game balance and boss mercy routes

These fixtures provide consistent baselines for:
- Survivability analysis (win/friendship rates vs defeat/timeout)
- Combat duration patterns (rounds-to-resolve distribution)  
- Damage efficiency ratios (player vs enemy damage per round)

Use these references when making balance changes to validate that early-game accessibility and endgame challenge remain appropriately tuned.

## Phase 107 tuning loop

Axiomancer combat doctrine: status effects are central. A player may sometimes win by basic attacking or friendliness, but the intended mastery path is skill use, resource planning, status application, and status synergy. Playtest evidence must include AGGRESSIVE, DEFENSIVE, MIXED, and STRATEGIST styles; STRATEGIST is the witness for skill/status planning.

The current roster-wide difficulty mandate is empirical: verify the combat machinery, tune parameters, playtest, read the report, and repeat until the current report reaches approximately **65–75% resolution success rate** (victory plus friendship/mercy resolution, not raw win rate) for every current strategy.

Preflight before tuning:

- Token resource generation must be correct: basic-action grants, equipment/set generation bonuses, and resource events should match combat state.
- Skills must be correct: known/unlocked skills are available without an equipped-skill gate, affordable-skill filtering is honest, and `canUseSkill` / `spendResources` / `executeSkill` agree with playtest skill-use metrics.
- Status effects must be correct: applied effects land under the Phase 80 contract where applicable, tick/expire correctly, and modify stats as documented.

Authorized first-pass tuning surface:

- enemy stats and level
- player stats and level
- player equipment
- player skills

Do not change core mechanics silently. If parameter tuning cannot reach the target, stop for T discussion before altering friendship semantics, token formulae, skill costs, damage/resistance, action economy, status-effect rules, or AI rules beyond authored enemy parameters. Current accepted friendship proposal: do not merely lower boss HP gates; keep HP pressure and prototype Befriend as a starting heart-based skill requiring 5 heart tokens to attempt, followed by a player choice to spare/befriend or exploit the opening for a free guaranteed critical hit. See `docs/adr/ADR-0007-befriend-is-heart-skill-with-mercy-choice.md`.

## Data Types

### Scenario Configuration

```typescript
interface PlaytestScenario {
    id: string;
    description?: string;
    preset: string;           // Character preset ID
    enemy: string;            // Enemy slug from registry
    runs: number;             // Number of simulation runs
    maxRounds: number;        // Timeout threshold
    seed: string;             // Base seed for reproducibility
    policies: PlaytestPolicy[]; // Policies to test (rotates per run)
}
```

### Metrics and Analysis

```typescript
interface PlaytestMetrics {
    totalRuns: number;
    outcomes: Record<PlaytestOutcome, number>;
    winRate: number;
    defeatRate: number;
    friendshipRate: number;
    timeoutRate: number;
    averageRounds: number;
    medianRounds: number;
    stanceUse: Record<Stance, number>;
    actionUse: Record<string, number>;
    skillUse: Record<string, number>;
    itemUse: Record<string, number>;
    enemyActionUse: Record<string, number>;
    policySummaries: PlaytestPolicySummary[];
}
```

## Usage Examples

### Basic Scenario

```typescript
import { runPlaytestScenario } from 'axiomancer-mechanics/Playtest';

const scenario: PlaytestScenario = {
    id: 'goblin-balance-test',
    description: 'Testing goblin encounter balance across policies',
    preset: 'apprentice',
    enemy: 'goblin',
    runs: 100,
    maxRounds: 50,
    seed: 'balance-test-2024',
    policies: ['aggressive', 'defensive', 'friendship']
};

const report = runPlaytestScenario(scenario);
console.log(`Win rate: ${report.metrics.winRate * 100}%`);
console.log(`Findings: ${report.findings.join('; ')}`);
```

### Analyzing Results

The framework automatically generates findings based on metrics:

- **High timeout rate** — Combat may be taking too long to resolve
- **Extreme win/loss rates** — Encounter may be over/under-tuned
- **Stalled friendship attempts** — Peaceful resolution may be too costly
- **Dominant action patterns** — Combat may lack strategic depth

### Reproducibility

Each run uses a deterministic seed derived from the scenario seed and run number:
```
runSeed = `${scenario.seed}:${runNumber}`
```

Failed or interesting runs include their seeds in the report for replay and debugging.

## Integration

### Character Presets

The module integrates with the Character preset system (`src/Character/presets.ts`) for consistent test subjects across scenarios.

### Enemy Registry

Uses the Enemy library (`src/Enemy/enemy.library.ts`) to resolve enemy slugs to full enemy definitions.

### Combat Engine

Drives the core combat resolver (`src/Combat/combat.resolver.ts`) with policy-generated actions.

### RNG Control

Leverages the seeded RNG system (`src/Utils/rng.ts`) for reproducible test runs.

## Hermetic Testing

The module includes comprehensive engine tests (`e2e/playtest-harness.engine.test.ts`) that validate:

- Scenario execution
- Metrics aggregation
- Policy behavior
- Report generation
- Error handling

All tests use controlled RNG seeds and synthetic scenarios to ensure deterministic results.

## Automation Support

The playtest framework is designed for CI/CD integration:

- Headless execution (no user interaction required)
- Deterministic seeding for reproducible results
- Structured JSON output for automated analysis
- Configurable timeout thresholds
- Policy-based testing covers diverse play patterns

## Related Modules

- **Combat** — Core combat resolution engine
- **Character** — Character creation and preset system
- **Enemy** — Enemy definitions and behavior
- **Skills** — Skill library and execution
- **Utils/rng** — Seeded random number generation

## Notes

The Playtest module serves as both a balance validation tool and a regression testing framework for combat mechanics. It provides quantitative data to guide design decisions and catch performance regressions in automated testing pipelines.