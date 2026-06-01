# Playtest Automation — Next Steps

> Developer workflow integration for Phase 104 reference fixtures

## Reference Fixtures Integration

Phase 104 established two canonical balance probes that should be used as baselines when making balance changes:

### Early-Game Probe
- **Run**: `earlyGameFixture` from `src/Playtest/fixtures/early-game.ts`
- **Baseline**: Level-1 apprentice vs Tidepool Crab
- **Validation**: Changes should maintain reasonable survivability for new players

### Endgame Probe  
- **Run**: `endgameFixture` from `src/Playtest/fixtures/endgame.ts`
- **Baseline**: Max-level character vs Coastal Tyrant
- **Validation**: Changes should not make boss encounters trivial or impossible

### Mercy Probe (Phase 101)
- **Run**: `mercy` policy from `src/Playtest/policies.ts`  
- **Baseline**: Wound-then-spare approach against Coastal Tyrant
- **Validation**: Changes should maintain viable mercy route (timeout under 25%)

## Balance Change Workflow

When modifying combat mechanics, enemy stats, or player progression:

1. **Baseline measurement**: Run both reference fixtures to capture current metrics
2. **Apply changes**: Make your balance modifications
3. **Impact analysis**: Re-run fixtures and compare:
   - Survivability rate shifts
   - Combat duration changes (rounds-to-resolve distribution)
   - Damage efficiency ratio changes
4. **Validation**: Ensure changes maintain intended difficulty curve

## Example Usage

```typescript
import { runPlaytestScenario, earlyGameFixture, endgameFixture } from 'axiomancer-mechanics';

// Baseline measurement
const baselineEarly = runPlaytestScenario(earlyGameFixture);
const baselineEndgame = runPlaytestScenario(endgameFixture);

// After balance changes...
const newEarly = runPlaytestScenario(earlyGameFixture); 
const newEndgame = runPlaytestScenario(endgameFixture);

// Compare survivability rates
console.log('Early survivability:', 
  baselineEarly.metrics.survivabilityRate, '→', newEarly.metrics.survivabilityRate);
console.log('Endgame survivability:', 
  baselineEndgame.metrics.survivabilityRate, '→', newEndgame.metrics.survivabilityRate);
```

## Integration Opportunities

### CI/CD Pipeline (Future)
- Run reference fixtures on PR/merge to catch balance regressions
- Flag significant metric shifts for manual review
- Maintain historical baseline data for trend analysis

### Automated Regression Detection (Future)
- Define acceptable variance thresholds for each fixture
- Alert when changes push metrics outside expected bounds  
- Archive baseline data with each release tag

### Extended Coverage (Future)
- Additional enemy type probes (elite, unique encounters)
- Mid-game progression checkpoints
- Policy-specific balance validation (friendship route viability)

## Current Phase 101 Integration

The endgame fixture specifically targets the Coastal Tyrant boss because Phase 101 (mercy-route tuning) needs systematic data rather than ad-hoc manual testing. The current evidence shows:

- 80% timeout rate indicates balance failure
- 4% friendship rate suggests mercy route is too hidden/costly  
- Endgame fixture provides reproducible data for tuning decisions

Use the endgame probe as the primary data source for Phase 101 mercy route adjustments.