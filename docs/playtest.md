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