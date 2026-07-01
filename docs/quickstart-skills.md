# Quickstart — Skills

> Execute skills, manage resources, and use the synergy system. For
> full API reference see [`skills.md`](./skills.md).

## Execute a skill in combat

```typescript
import { executeSkill, getSkillById, initializeCombat } from 'axiomancer-mechanics';

const state = initializeCombat(player, enemy);

// executeSkill(state, cardId, lookupCard, casterSide? = 'player') -> CardResolution
const { state: next, events } = executeSkill(state, 'achilles-gambit', getSkillById);
// next.enemy.health reduced by basePower + body × SKILL_STAT_MULTIPLIER
// events includes { kind: 'damage', ... }; a Fallacy/Paradox card also
// emits { kind: 'philosophical-generated', ... }
```

> Cards no longer cost a `resourceCost` pool — that field was removed when
> combat was de-tokenized. Card power comes from the caster's stats (and,
> in a live encounter, the drafted stance die + Conviction); casting does
> not spend heart/body/mind tokens.

## Resource economy

In the Hazard-Pattern engine, card power comes from the **drafted stance
die** and **Conviction** each turn — not from a spent token pool. The
`combatResources` counters on `CombatState` still exist as an accumulator
(seeded from equipped item/set token grants, incremented by
`generatePhilosophicalResource` when a Fallacy/Paradox card resolves), but
cards are no longer gated on a `resourceCost`.

`generateBasicActionResources` is a standalone helper that mints stance
tokens for a hit / miss / defend outcome; equipment and set bonuses layer
extra tokens on top:

```typescript
import { generateBasicActionResources } from 'axiomancer-mechanics';

const pool = { heart: 0, body: 0, mind: 0, fallacy: 0, paradox: 0 };
const after = generateBasicActionResources(pool, 'body', 'hit');
// after.body === 3 (hit on matching stance grants +3)
```

| Outcome | Tokens generated |
|---------|------------------|
| Hit | +3 of the given stance |
| Miss | +1 of the given stance |
| Defend | +5 of the given stance |

When a Fallacy/Paradox card resolves, the engine mints one matching
philosophical token and emits `{ kind: 'philosophical-generated', ... }`.

## Skill tiers

| Tier | Characteristics | Example |
|------|-----------------|---------|
| 1 | Single effect; auto-lands | `false-dilemma` — 4 mind damage + `debuff_confusion` |
| 2 | May carry a `synergy` clause; buffs roll on the caster's d20 | `mob-appeal` — 10 body damage + secondary self-heal |
| 3 | Signature-tier; effects always land (inescapable) | `bootstrap-paradox` — heart × 2 self-heal |

## Synergy-fired events

Tier 2 skills can carry a `synergy` clause that fires bonus damage
when conditions are met:

```typescript
// After executeSkill, check for synergy events
const synergy = events.find(e => e.kind === 'synergy-fired');
if (synergy) {
  console.log(`Synergy! +${synergy.bonusDamage} bonus damage`);
  console.log(`Consumed effects: ${synergy.consumedEffectIds.target}`);
}
```

## Effect application (post-Phase-80)

Skills with `combatEffects` apply effects via `resolveEffectApplication`:
- **Tier 1**: auto-applies (no roll)
- **Tier 2 debuff**: always lands (no resist roll)
- **Tier 3**: always lands (inescapable)
- **Tier 2 buff**: caster d20 fumble/crit (Nat 1 = `buff-fumbled`; Nat 20 = 2× intensity)

## Deep-dive

- Skill library: [`skills.md`](./skills.md) § Tier tables
- Synergy system: [`skills.md`](./skills.md) § Tier 2 synergy
- Enemy caster path: [`skills.md`](./skills.md) § Enemy caster path
- Effect application: [`effects.md`](./effects.md) § Application Rules
