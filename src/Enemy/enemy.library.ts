/**
 * Enemy library — Spec 07 content drop.
 *
 * Per the Spec 07 Q8 split: 3 simple, 6 normal, 3 elite, 2 boss, 1 unique =
 * 15 enemies total. Stat affinities (heart / body / mind) are distributed
 * across each difficulty tier so the encounter generator can offer variety
 * regardless of which stance the player favours.
 *
 * Authoring notes:
 *   - `tier1Overrides` mirrors the canonical Spec 03 Tier 1 buffs / debuffs
 *     so every enemy participates in the stance-effect economy. Variant
 *     procOverrides on elites / bosses give them flavour without rewriting
 *     the global proc table.
 *   - `procUnlocks` bumps the tier cap for elite (T2) and boss (T3) enemies
 *     so their proc rolls reach higher-tier candidates per Spec 03.
 *   - Loot tables follow Spec 07 Q7B — weighted entries with explicit `null`
 *     buckets for "nothing drops".
 *   - `xpReward` is left implicit on most enemies: `createEnemy` falls back
 *     to `level × DEFAULT_XP_BY_DIFFICULTY[difficulty]`. Authors override
 *     only when an enemy should grant unusual XP for narrative reasons.
 */

import { createEnemy } from './index';
import { LootTableEntry } from './types';
import { consumableLibrary, getConsumableById } from '../Items/consumable.library';
import { Consumable } from '../Items/types';

// ─── Loot helpers ─────────────────────────────────────────────────────────────

/** Returns a fresh copy of the named consumable from the library, q=1. */
function consumable(id: string): Consumable {
    const found = getConsumableById(id);
    if (!found) {
        throw new Error(`enemy.library: unknown consumable id '${id}'.`);
    }
    return { ...found, quantity: 1 };
}

/** No-drop bucket helper — readability sugar over `{ item: null, weight }`. */
function none(weight: number): LootTableEntry {
    return { item: null, weight };
}

/** Drop bucket helper — wraps a consumable id with its weight. */
function drop(id: string, weight: number): LootTableEntry {
    return { item: consumable(id), weight };
}

// ─── Canonical Tier 1 stance overrides ────────────────────────────────────────

/**
 * Every authored enemy plugs the same Spec 03 Tier 1 effect IDs into its
 * `tier1Overrides`. Doing it once here keeps the library definitions
 * focused on stats / personality. Bosses with custom routines can opt out
 * by passing their own `tier1Overrides` object.
 */
const T1_DEFAULT = {
    body:  { attack: 'tier1_body_attack',  defend: 'tier1_body_defend'  },
    mind:  { attack: 'tier1_mind_attack',  defend: 'tier1_mind_defend'  },
    heart: { attack: 'tier1_heart_attack', defend: 'tier1_heart_defend' },
} as const;

// ─── Simple (3) — level 1 fodder ──────────────────────────────────────────────

export const TidepoolCrab = createEnemy({
    id: 'enemy-tidepool-crab',
    name: 'Tidepool Crab',
    description: 'Pinches a claim on the dock pilings; its grievances are mostly territorial.',
    level: 1,
    baseStats: { body: 3, mind: 1, heart: 1 },
    mapName: 'fishing-village',
    difficulty: 'simple',
    logic: 'aggressive',
    tier1Overrides: T1_DEFAULT,
    loot: [none(80), drop('minor-healing-potion', 20)],
});

export const SeaMistWisp = createEnemy({
    id: 'enemy-sea-mist-wisp',
    name: 'Sea-Mist Wisp',
    description: 'A confused thought that drifted in with the fog. It will leave if you let it speak.',
    level: 1,
    baseStats: { body: 1, mind: 3, heart: 1 },
    mapName: 'fishing-village',
    difficulty: 'simple',
    logic: 'defensive',
    tier1Overrides: T1_DEFAULT,
    loot: [none(75), drop('clarity-serum', 20), drop('focus-vial', 5)],
});

export const LullabyMoth = createEnemy({
    id: 'enemy-lullaby-moth',
    name: 'Lullaby Moth',
    description: 'Its wings hum a half-remembered song; you almost forget you are in a fight.',
    level: 1,
    baseStats: { body: 1, mind: 1, heart: 3 },
    mapName: 'northern-forest',
    difficulty: 'simple',
    logic: 'random',
    tier1Overrides: T1_DEFAULT,
    loot: [none(80), drop('heart-draught', 18), drop('minor-healing-potion', 2)],
});

// ─── Normal (6) — level 2-3 ───────────────────────────────────────────────────

/**
 * Legacy fixture preserved from Spec 02-era tests. Many e2e tests depend on
 * the exact `maxHealth = 10` (level 1 × avg(1, 1) × 10) so the stat block
 * is intentionally kept at 1/1/1. New normal enemies on the forest map
 * (`ForestSprite`, `ArgumentativeCrow`) carry the proper stat-aligned values.
 */
export const Disatree_01 = createEnemy({
    id: 'enemy-disatree',
    name: 'Disatree',
    description: 'A tree who disagrees with you. Its argument is mostly bark.',
    level: 1,
    baseStats: { body: 1, mind: 1, heart: 1 },
    mapName: 'northern-forest',
    difficulty: 'normal',
    logic: 'balanced',
    tier1Overrides: T1_DEFAULT,
    loot: [none(70), drop('minor-healing-potion', 25), drop('healing-potion', 5)],
});

export const WetHound = createEnemy({
    id: 'enemy-wet-hound',
    name: 'Wet Hound',
    description: 'Half feral, half pitiful. Its body trembles between bite and beg.',
    level: 2,
    baseStats: { body: 4, mind: 2, heart: 2 },
    mapName: 'fishing-village',
    difficulty: 'normal',
    logic: 'aggressive',
    tier1Overrides: T1_DEFAULT,
    loot: [none(60), drop('body-elixir', 30), drop('healing-potion', 10)],
});

export const MournfulGull = createEnemy({
    id: 'enemy-mournful-gull',
    name: 'Mournful Gull',
    description: 'It circles overhead, screaming a list of every slight it remembers.',
    level: 2,
    baseStats: { body: 2, mind: 2, heart: 4 },
    mapName: 'fishing-village',
    difficulty: 'normal',
    logic: 'balanced',
    tier1Overrides: T1_DEFAULT,
    loot: [none(60), drop('heart-draught', 30), drop('minor-healing-potion', 10)],
});

export const ForestSprite = createEnemy({
    id: 'enemy-forest-sprite',
    name: 'Forest Sprite',
    description: 'A small lattice of opinions in flight; it argues itself in and out of visibility.',
    level: 3,
    baseStats: { body: 2, mind: 4, heart: 2 },
    mapName: 'northern-forest',
    difficulty: 'normal',
    logic: 'defensive',
    tier1Overrides: T1_DEFAULT,
    loot: [none(55), drop('clarity-serum', 30), drop('focus-vial', 15)],
});

export const HollowEyedBeggar = createEnemy({
    id: 'enemy-hollow-eyed-beggar',
    name: 'Hollow-Eyed Beggar',
    description: 'You suspect they have not always been hollow. They want what you carry, not what you are.',
    level: 3,
    baseStats: { body: 2, mind: 2, heart: 4 },
    mapName: 'fishing-village',
    difficulty: 'normal',
    logic: 'strategic',
    tier1Overrides: T1_DEFAULT,
    loot: [none(50), drop('heart-draught', 30), drop('healing-potion', 15), drop('antidote', 5)],
});

export const ArgumentativeCrow = createEnemy({
    id: 'enemy-argumentative-crow',
    name: 'Argumentative Crow',
    description: 'Caws a sequence of premises that resolve, infuriatingly, in your defeat.',
    level: 3,
    baseStats: { body: 2, mind: 4, heart: 2 },
    mapName: 'northern-forest',
    difficulty: 'normal',
    logic: 'strategic',
    tier1Overrides: T1_DEFAULT,
    loot: [none(50), drop('clarity-serum', 25), drop('focus-vial', 20), drop('philosopher-tea', 5)],
});

// ─── Elite (3) — level 4-5 ────────────────────────────────────────────────────

export const TideflukeReaver = createEnemy({
    id: 'enemy-tidefluke-reaver',
    name: 'Tidefluke Reaver',
    description: 'Salt-bound and shore-cursed. Its fists move faster than the surf retreats.',
    level: 4,
    baseStats: { body: 6, mind: 2, heart: 3 },
    mapName: 'fishing-village',
    difficulty: 'elite',
    logic: 'aggressive',
    tier1Overrides: T1_DEFAULT,
    procUnlocks: {
        body: { attack: 2, defend: 2 },
    },
    loot: [none(35), drop('body-elixir', 35), drop('healing-potion', 20), drop('berserker-brew', 10)],
});

export const HushWraith = createEnemy({
    id: 'enemy-hush-wraith',
    name: 'Hush-Wraith',
    description: 'A presence shaped like the silence after a question. Listens until you doubt the answer.',
    level: 5,
    baseStats: { body: 2, mind: 6, heart: 3 },
    mapName: 'northern-forest',
    difficulty: 'elite',
    logic: 'strategic',
    tier1Overrides: T1_DEFAULT,
    procUnlocks: {
        mind: { attack: 2, defend: 2 },
    },
    loot: [none(35), drop('clarity-serum', 25), drop('focus-vial', 25), drop('philosopher-tea', 15)],
});

export const HollowSaint = createEnemy({
    id: 'enemy-hollow-saint',
    name: 'Hollow Saint',
    description: 'A martyr without a cause, looking for one. The wound it offers is your own.',
    level: 5,
    baseStats: { body: 3, mind: 2, heart: 6 },
    mapName: 'northern-forest',
    difficulty: 'elite',
    logic: 'defensive',
    tier1Overrides: T1_DEFAULT,
    procUnlocks: {
        heart: { attack: 2, defend: 2 },
    },
    loot: [none(30), drop('heart-draught', 30), drop('healing-potion', 25), drop('resonance-crystal', 15)],
});

// ─── Boss (2) — level 7-8 ─────────────────────────────────────────────────────

export const CoastalTyrant = createEnemy({
    id: 'enemy-coastal-tyrant',
    name: 'The Coastal Tyrant',
    description:
        'Once a magistrate of the bay; now a king whose subjects are all gulls and grievances. ' +
        'His blade is older than the village charter.',
    level: 7,
    baseStats: { body: 7, mind: 3, heart: 6 },
    mapName: 'fishing-village',
    difficulty: 'boss',
    logic: 'boss',
    tier1Overrides: T1_DEFAULT,
    procUnlocks: {
        body:  { attack: 3, defend: 3 },
        heart: { attack: 2, defend: 2 },
    },
    loot: [
        drop('healing-potion', 50),
        drop('body-elixir', 30),
        drop('heart-draught', 20),
    ],
});

export const TheDisagreement = createEnemy({
    id: 'enemy-the-disagreement',
    name: 'The Disagreement',
    description:
        'Not a single creature so much as an unresolved argument given thorns and teeth. ' +
        'Its phases are deliberate; it has rehearsed your defeat.',
    level: 8,
    baseStats: { body: 4, mind: 7, heart: 6 },
    mapName: 'northern-forest',
    difficulty: 'boss',
    logic: 'boss',
    tier1Overrides: T1_DEFAULT,
    procUnlocks: {
        mind:  { attack: 3, defend: 3 },
        heart: { attack: 2, defend: 2 },
    },
    loot: [
        drop('philosopher-tea', 40),
        drop('clarity-serum', 30),
        drop('focus-vial', 20),
        drop('revive-crystal', 10),
    ],
});

// ─── Unique (1) — level 10 signature fight ────────────────────────────────────

export const EchoOfPyrrhonia = createEnemy({
    id: 'enemy-echo-of-pyrrhonia',
    name: 'Echo of Pyrrhonia',
    description:
        'Not a being but a recurrence: every doubt anyone has ever raised in this forest, condensed ' +
        'and given a voice. It speaks first in your own.',
    level: 10,
    baseStats: { body: 6, mind: 7, heart: 7 },
    mapName: 'northern-forest',
    difficulty: 'unique',
    logic: 'strategic',
    tier1Overrides: T1_DEFAULT,
    procUnlocks: {
        body:  { attack: 3, defend: 3 },
        mind:  { attack: 3, defend: 3 },
        heart: { attack: 3, defend: 3 },
    },
    loot: [
        drop('void-essence', 60),
        drop('philosopher-tea', 30),
        drop('revive-crystal', 10),
    ],
});

// ─── Test fixture (legacy, NOT counted toward Spec 07's 15) ───────────────────

/**
 * Punching-bag enemy used by Spec 04b's e2e suite and the
 * `auto:combat` / manual CLI testers that need a long-lived combat encounter.
 * Kept separate from the spec-07 library so the encounter generator never
 * selects it. CLI clients can opt in via `COMBAT_ENEMY=sandbag`.
 */
export const Sandbag_01 = createEnemy({
    id: 'sandbag-01',
    name: 'Sandbag',
    description:
        'A practice dummy of stitched arguments, hung from a rope. It mumbles, ' +
        'rarely strikes back, and refuses to die quickly.',
    level: 10,
    baseStats: { body: 1, mind: 1, heart: 1 },
    mapName: 'northern-forest',
    difficulty: 'simple',
    logic: 'random',
    tier1Overrides: T1_DEFAULT,
});

// ─── Library indices ──────────────────────────────────────────────────────────

/** Spec 07 — all 15 production enemies, in difficulty order. */
export const EnemyLibrary = [
    // Simple
    TidepoolCrab, SeaMistWisp, LullabyMoth,
    // Normal
    Disatree_01, WetHound, MournfulGull, ForestSprite, HollowEyedBeggar, ArgumentativeCrow,
    // Elite
    TideflukeReaver, HushWraith, HollowSaint,
    // Boss
    CoastalTyrant, TheDisagreement,
    // Unique
    EchoOfPyrrhonia,
] as const;

/** Per-map enemy pools used by the encounter generator. */
export const EnemiesByMap = {
    'fishing-village': [
        TidepoolCrab, SeaMistWisp,
        WetHound, MournfulGull, HollowEyedBeggar,
        TideflukeReaver,
        CoastalTyrant,
    ],
    'northern-forest': [
        LullabyMoth,
        Disatree_01, ForestSprite, ArgumentativeCrow,
        HushWraith, HollowSaint,
        TheDisagreement,
        EchoOfPyrrhonia,
    ],
} as const;

/**
 * CLI-friendly slugs to enemy fixtures. Used by `combat.cli.ts` and
 * `auto:combat` to let testers pick the opponent at the command line.
 * Spec 07 keeps the `disatree` and `sandbag` aliases stable for back-compat.
 */
export const ENEMY_REGISTRY = {
    // Legacy aliases.
    disatree: Disatree_01,
    sandbag:  Sandbag_01,
    // Spec 07 additions.
    'tidepool-crab':       TidepoolCrab,
    'sea-mist-wisp':       SeaMistWisp,
    'lullaby-moth':        LullabyMoth,
    'wet-hound':           WetHound,
    'mournful-gull':       MournfulGull,
    'forest-sprite':       ForestSprite,
    'hollow-eyed-beggar':  HollowEyedBeggar,
    'argumentative-crow':  ArgumentativeCrow,
    'tidefluke-reaver':    TideflukeReaver,
    'hush-wraith':         HushWraith,
    'hollow-saint':        HollowSaint,
    'coastal-tyrant':      CoastalTyrant,
    'the-disagreement':    TheDisagreement,
    'echo-of-pyrrhonia':   EchoOfPyrrhonia,
} as const;

export type EnemySlug = keyof typeof ENEMY_REGISTRY;

// Re-export the consumable library so test runners that import this file
// don't accidentally tree-shake the dependency.
void consumableLibrary;
