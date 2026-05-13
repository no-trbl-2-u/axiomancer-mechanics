# Morality System

> **Status:** Phase 10 complete — moral choice tracking, friendship bonus,
> dialogue integration, and save migration (v2→v3) are live. The beggar
> encounter in fishing-village demonstrates the full pipeline.

## Overview

The morality system tracks player alignment through choices made in dialogue,
combat outcomes, and quest resolutions. The moral meter influences available 
dialogue options, story paths, and endings—not through direct gating but by 
affecting which narrative branches open over time.

## Core Mechanics

### Moral Meter

`GameState.moralMeter: number` ranges from **-100** (ruthless) to **+100** 
(compassionate), defaulting to **0** (neutral) for new games and migrated saves.

```ts
// Examples of moral meter values
-100  // Completely ruthless
 -25  // Tends toward harsh choices  
   0  // Neutral/balanced
 +35  // Generally compassionate
+100  // Saint-like moral standing
```

### Choice Magnitudes

Different choices shift the moral meter by varying amounts:

- **Minor choices:** ±1 (small acts of kindness/cruelty)
- **Major choices:** ±5 (significant moral decisions) 
- **Defining choices:** ±10 (life-changing moral stands)
- **Friendship victories:** +1 (successful peaceful resolution)

### Clamping and Gating

The system enforces bounds and enables conditional choices:

```ts
// Automatic clamping - shifts never exceed [-100, +100]
state.moralMeter = Math.max(-100, Math.min(100, currentMeter + delta));

// Optional gating - block shifts based on current alignment
gameState.shiftMoralMeter(delta, { min: 20 }); // Requires meter ≥ 20
gameState.shiftMoralMeter(delta, { max: -10 }); // Requires meter ≤ -10
```

## Integration Points

### Combat: Friendship Victories

When combat ends with a friendship victory (both combatants defend until 
`friendshipCounter >= 3`), the player gains **+1** to the moral meter,
representing the compassion shown in finding peaceful resolution.

```ts
// Triggered automatically in END_COMBAT when determineCombatEnd() === 'friendship'
if (outcome === 'friendship') {
    return shiftMoralMeter(baseState, 1);
}
```

### Dialogue: Flag-Based Processing

Dialogue choices can set flags that trigger moral meter shifts. The system
maps specific flag names to moral deltas:

```ts
const MORAL_FLAG_EFFECTS = {
    'beggar_generous_gift': 5,      // Major generous act
    'beggar_small_gift': 1,         // Minor kindness
    'beggar_kind_gesture': 3,       // Moderate compassion
    'beggar_dismissed': -1,         // Minor callousness  
    'beggar_harsh_words': -5,       // Major cruelty
};
```

When `applyDialogueChoice` sets a flag with a moral effect, the meter shifts
automatically and the effect is logged for UI feedback.

### API Surface

**Store Actions:**
```ts
store.getState().shiftMoralMeter(delta, gating?);
```

**Selectors:**
```ts
const currentMeter = selectMoralMeter(store.getState());
```

**Low-level dispatch:**
```ts
dispatch({ type: 'SHIFT_MORAL_METER', payload: { delta, gating } });
```

## Demo Content

### The Coastal Beggar

The fishing village (node `fv-7`) features a beggar encounter demonstrating
the full moral choice spectrum:

| Choice | Delta | Cost | Narrative Outcome |
|--------|-------|------|-------------------|
| Give 10 gold generously | **+5** | 10 gold | Major act of charity |
| Give 5 gold | **+1** | 5 gold | Simple kindness |
| Share rations | **+3** | None | Meaningful gesture |
| Walk away dismissively | **-1** | None | Callous indifference |
| Harsh words | **-5** | None | Active cruelty |

Each choice sets a unique flag (`beggar_generous_gift`, `beggar_harsh_words`, 
etc.) that other content can reference, creating lasting consequences beyond 
the immediate moral shift.

## Future Expansions

The current implementation (Phase 10) establishes the foundation. Future
phases will expand the system:

- **Multi-axis morality:** Honor, cunning, and compassion as separate tracks
- **NPC reputation:** Per-character relationship scores
- **Ending gates:** Multiple conclusions based on moral standing
- **Skill restrictions:** Alignment-locked abilities and equipment
- **Difficulty scaling:** Enemy behavior influenced by player choices

## Save Compatibility

**Version Migration:** Save files are migrated from v2 to v3 automatically.
Existing saves default to `moralMeter: 0` (neutral), preserving progress while
enabling moral tracking for future choices.

The migration is transparent—players with existing saves can continue their
journey without interruption, and their moral meter will begin tracking
from their first post-migration choice.

## Technical Notes

- **Pure reducers:** All moral meter changes flow through `shiftMoralMeter`
- **Event-driven:** Dialogue effects trigger via flag mapping
- **Bounds-safe:** Automatic clamping prevents overflow/underflow
- **Testable:** Complete e2e test coverage in `moral.meter.engine.test.ts`
- **Persistent:** Moral meter is included in save/load operations

## See Also

- [`src/Game/e2e/moral.meter.engine.test.ts`](../src/Game/e2e/moral.meter.engine.test.ts) — comprehensive test coverage
- [`src/World/dialogue.runtime.ts`](../src/World/dialogue.runtime.ts) — flag-to-moral-shift processing
- [`src/World/Continents/Coastal-Village/maps.ts`](../src/World/Continents/Coastal-Village/maps.ts) — beggar demo content
- [`specs/10-moral-difficulty-meter.md`](../specs/10-moral-difficulty-meter.md) — original implementation spec