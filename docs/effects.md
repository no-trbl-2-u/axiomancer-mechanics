# Effects

Effects are temporary modifiers applied to combatants during battle. Each effect has a `teir` that determines its strength and how resistance is handled.

## Teir Scale

| Teir | Resist DR | Rule |
|------|-----------|------|
| **Teir 1** | — | Auto-applies. No resist roll. Always lands. |
| **Teir 2** | 12–14 | Resist roll required (buff: fumble only; debuff: roll vs DR). |
| **Teir 3** | 17–18 | Only natural 20 repels it. |

## Resistance System

Each effect carries:
- `resistedBy: ActionType` — which stat (`heart`, `body`, `mind`) the target uses to resist
- `resistDR: number` — base difficulty of the resist roll

**RPS Rule:** Body effects are resisted by Mind. Mind effects by Heart. Heart effects by Body.

### Teir 2 — Buff (caster rolls)
- Natural 1 (fumble): buff fizzles entirely.
- Natural 20 (crit focus): buff applies at 2× intensity.
- Anything else: auto-succeeds.

### Teir 2 — Debuff (target rolls to resist)
```
DR    = effect.resistDR + attacker.baseStats.heart + equipmentBonus
Roll  = d20 + target.derivedStats[resistedBy defense]
```
- Natural 20 (rebound): resist is absolute — effect bounces to the attacker at 2× intensity.
- Natural 1 (overwhelmed): resistance crumbles — effect lands at 2× duration.
- Roll ≥ DR: resisted.
- Roll < DR: lands normally.

### Teir 3
- Natural 20: effect is repelled.
- Anything else: inescapable.

---

## Buffs

| Teir | Examples |
|------|---------|
| **Teir 1** | Petitio Principii Pulse, Gettier's Flicker, Ad Hoc Patch — minor single-stat boosts or negligible roll bonuses |
| **Teir 2** | Attack Up, Defense Up, Regeneration, Accuracy Up, Reflect, Cleanse, Advantage (type-specific), Counter, Life Steal |
| **Teir 3** | All Stats Up, All Defense Up, Haste, Invincibility, Stealth, Critical Damage Up, Barrier |

## Debuffs

| Teir | Examples |
|------|---------|
| **Teir 1** | Straw Man's Echo, Post Hoc Tremor, Affirming the Consequent — minor stat penalties or negligible roll penalties |
| **Teir 2** | Bleed, Poison, Frostbite, Shock, Wound, Slow, Disease, Burn, Fear, Knockdown, Attack Down, Defense Down, Accuracy Down, Evasion Down |
| **Teir 3** | Stun, Charm, Silence, Sleep, Confusion, Blind, Petrify, Strong Poison, HP Decay, Vulnerability |

---

## Field Reference

```jsonc
{
  "id": "effect_id",
  "name": "Effect Name",
  "description": "Flavor text.",
  "type": "buff" | "debuff",
  "category": "stat" | "damage" | "defense" | "advantage" | "control" | "regeneration",
  "duration": 3,           // rounds active; 0 = instant; -1 = permanent
  "stacking": "none" | "intensity" | "duration",
  "teir": "Teir 1" | "Teir 2" | "Teir 3",
  "resistedBy": "body" | "mind" | "heart",
  "resistDR": 12,          // Teir 1 = 10 (unused), Teir 2 = 12–14, Teir 3 = 17–18
  "payload": {
    "statModifiers": [{ "stat": "body", "value": 2, "isMultiplier": false }],
    "rollModifier": 2,           // flat bonus/penalty added to every dice roll
    "defenseModifier": 1,        // flat bonus/penalty added to defense values
    "damageOverTime": { "damagePerRound": 3, "damageType": "body" },
    "regeneration": { "healthPerRound": 2, "manaPerRound": 0 },
    "reflectDamage": 2,          // damage per intensity reflected back to attacker on any hit (thorns)
    "actionRestriction": {
      "skipTurn": false,
      "blockedActionTypes": [],
      "forcedActionType": null
    },
    "advantageModifier": {
      "grantAdvantage": [],
      "grantDisadvantage": []
    }
  }
}
```

## Stacking Modes

| Mode | Behaviour |
|------|-----------|
| `none` | Stronger instance wins. Equal or weaker new application is ignored. |
| `intensity` | `currentIntensity` increments each application (capped at `MAX_EFFECT_INTENSITY`). Duration resets or extends additively per `ApplyEffectOptions`. |
| `duration` | `remainingDuration` extends by `effect.duration` on reapply. |

## Tier 1 Auto-Effects

Every basic `attack` or `defend` action automatically applies a Tier 1 stance effect.
No resist roll is made — these always land.
Switching action types removes the previous type's self-buff immediately.

| Action | Effect | Target |
|--------|--------|--------|
| Body + Attack | `tier1_body_attack` — physical attack stance | self |
| Body + Defend | `tier1_body_defend` — Briar Stance (`reflectDamage` per intensity on hit) | self |
| Mind + Attack | `tier1_mind_mark` (+1 intensity / +1 duration) — studying mark | opponent |
| Mind + Defend | `tier1_mind_mark` (+3 intensity / +3 duration) | opponent |
| Heart + Attack | `tier1_heart_attack` — emotional pressure | self |
| Heart + Defend | `tier1_heart_defend` — Vital Empathy (`regeneration.healthPerRound`) | self |

## `ActiveEffect` Fields

```typescript
{
  effectId: string;           // reference to Effect.id
  remainingDuration: number;  // rounds left (-1 = permanent)
  currentIntensity: number;   // stack level for intensity-stacking effects
  appliedAtRound: number;     // combat round it was applied
  teir: 'Teir 1' | 'Teir 2' | 'Teir 3';
  resistedBy?: ActionType;    // copied from Effect for quick lookup
  resistDR?: number;          // copied from Effect for quick lookup
  sourceId?: string;          // who applied it (optional, for attribution)
}
```
