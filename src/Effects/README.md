# Effects Module

The Effects module manages buffs, debuffs, and status effects that modify character or enemy stats and behavior. All effects are themed around philosophical paradoxes and logical fallacies.

## Core Concepts

- **Buffs**: Positive effects that enhance capabilities (e.g., stat boosts, regeneration)
- **Debuffs**: Negative effects that hinder (e.g., damage over time, stat penalties, crowd control)
- **Stacking**: Effects can stack by intensity, duration, or not at all
- **Categories**: stat, damage, defense, control, regeneration, advantage

## Files

| File | Purpose |
|------|---------|
| `index.ts` | Effect application, ticking, expiration, and stacking logic |
| `types.d.ts` | Type definitions for effects, modifiers, and payloads |
| `buff.library.ts` | Buff lookup functions and the full buff library |
| `debuff.library.ts` | Debuff lookup functions and the full debuff library |
| `buffs.library.json` | Static JSON data for all buff definitions |
| `debuffs.library.json` | Static JSON data for all debuff definitions |
| `effects.test.ts` | Unit tests for effect functions and library data |

## Key Functions

- **`applyEffect(effect, sourceId, currentRound)`** - Creates an active effect instance
- **`tickEffect(activeEffect)`** - Reduces duration by 1, returns null if expired
- **`isEffectExpired(activeEffect)`** - Checks if an effect has expired
- **`stackEffect(existing, effect)`** - Applies stacking rules to an existing effect
- **`getBuffById(id)` / `getDebuffById(id)`** - Look up effects by ID
- **`getBuffsByCategory(category)` / `getDebuffsByCategory(category)`** - Filter by category

## Effect Payload System

Effects use a flexible payload system with optional modifier types:

| Modifier | Description |
|----------|-------------|
| `statModifiers` | Array of stat changes (flat or multiplier) |
| `damageOverTime` | Damage dealt each round |
| `regeneration` | Health/mana restored each round |
| `actionRestriction` | Limits on actions (skip turn, forced type, blocked types) |
| `advantageModifier` | Grants or removes combat advantage |
| `rollModifier` | Flat bonus/penalty to dice rolls |
| `defenseModifier` | Flat bonus/penalty to defense |

## Example Buffs

- **Achilles' Momentum** - Body attack boost with roll modifier
- **Hilbert's Shelter** - All-around defense boost
- **Twin's Dilation** - Haste: advantage on all types

## Example Debuffs

- **Buridan's Paralysis** - Stun: skip turn
- **Curry's Corruption** - Poison: body damage over time
- **Two Envelope Delirium** - Confusion: disadvantage on all types
