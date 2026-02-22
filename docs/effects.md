# Effects

Effects are temporary modifiers applied to combatants during battle. Each effect has a `rating` field that quantizes its overall strength — the lower the number, the weaker the effect.

## Rating Scale

Ratings run from **1** (negligible) to **10** (game-changing). They account for the combination of stat modifiers, roll bonuses/penalties, defense changes, control restrictions, duration, and breadth of impact.

---

## Buffs

| Rating | Description | Examples |
|--------|-------------|---------|
| **1** | Barely perceptible — +1 to a single minor stat with no other effect; negligible in any single engagement | Petitio Principii Pulse, Gettier's Flicker, Ad Hoc Patch |
| **2** | A marginal improvement — +1 to two stats, or +1 to one stat paired with a tiny roll bonus; noticeable only over many turns | *(reserved for future effects)* |
| **3** | Narrow utility with minimal direct combat impact | Taunt (minor defense + body), Buff Duration Up |
| **4** | Single-stat offensive or defensive boost, minor roll bonus, or single-type advantage | Attack Up (Body/Mind/Heart), Defense Up (Body/Mind/Heart), Critical Rate Up, Counter, Life Steal, Advantage (Body/Mind/Heart), Status Chance Up |
| **5** | Moderate accuracy boost, solid regeneration, or situational utility | Accuracy Up, Regeneration, Reflect, Cleanse |
| **6** | Broad all-defense boost, strong evasion, type-specific resistance, or max HP multiplier | All Defense Up, Evasion Up, Resistance (Body/Mind/Heart), Barrier, Damage Reduction, Max HP Up |
| **7** | Raises all stats simultaneously, or dramatically amplifies critical damage | All Stats Up, Critical Damage Up, Stealth |
| **8** | Grants advantage on all attack types with a large roll bonus | Haste |
| **9** | Near-total immunity to damage for a turn | Invincibility |

---

## Debuffs

| Rating | Description | Examples |
|--------|-------------|---------|
| **1** | Barely perceptible — −1 to a single minor stat or roll modifier; effectively ignorable in isolation | Straw Man's Echo, Post Hoc Tremor, Affirming the Consequent |
| **2** | A marginal nuisance — −1 to two stats, or −1 to one stat paired with a tiny roll penalty; only relevant when stacked | *(reserved for future effects)* |
| **3** | Light damage-over-time or trivial stat dip | Bleed, Hex, Fatigue, Root |
| **4** | Moderate single-type DoT, mild stat/roll penalty, or minor action restriction | Poison, Frostbite, Shock, Disease, Wound, Slow, Moral Blindness, Transformative Terror |
| **5** | Broad stat reduction, long-lasting curse, heavy single-attack-type reduction, or instant dispel | All Stats Down, Curse, Burn, Daze, Fear, Berserk, Knockdown, Attack Down (Body/Mind/Heart), Evasion Down, Accuracy Down, Defense Down, Dispel, Rational Disagreement, Causal Emergence |
| **6** | Strong poison, turn-skipping stun, silence, action hijack, type vulnerability, or HP decay | Strong Poison, Stun, Charm, Silence, Exhaustion, Vulnerability (Body/Mind/Heart), Mark, HP Decay |
| **7** | Multi-turn turn skip with defense penalty, or disadvantage applied to all attack types | Sleep, Confusion, Blind |
| **8** | Extended turn skip paired with severe defense penalty | Petrify |

---

## Field Reference

```jsonc
{
  "id": "effect_id",
  "name": "Effect Name",
  "description": "Flavor text.",
  "type": "buff" | "debuff",
  "category": "stat" | "damage" | "defense" | "advantage" | "control" | "regeneration",
  "duration": 3,         // turns active; 0 = instant
  "stacking": "none" | "intensity" | "duration",
  "rating": 5,           // 1 (weakest) – 10 (strongest)
  "payload": { ... }
}
```
