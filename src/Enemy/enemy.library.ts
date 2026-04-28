/**
 * Enemy Library
 *
 * 15+ thematically-named enemies across three difficulty tiers (simple,
 * normal, elite/boss). Each enemy is stat-aligned so the matchup wheel
 * (Heart > Body > Mind > Heart) feels meaningful: a body-aligned brute
 * is countered by Heart attacks, a mind-aligned schemer by Body, etc.
 *
 * Tier conventions:
 *   - simple: Lv 1–2, low total stats, random AI
 *   - normal: Lv 2–4, moderate stats, balanced/aggressive/defensive AI
 *   - elite : Lv 4–6, high stats, strategic AI, drops a Tier 2 item
 *   - boss  : Lv 6+, highest stats, boss AI, uses skills, drops a Tier 3 item
 */

import { createEnemy } from './index';
import { Enemy } from './types';

const TIER_FALLBACK = {
    body:  { attack: 'tier1_body_attack',  defend: 'tier1_body_defend' },
    mind:  { attack: 'tier1_mind_mark',    defend: 'tier1_mind_mark' },
    heart: { attack: 'tier1_heart_attack', defend: 'tier1_heart_defend' },
};

// ── Tier 1 (simple) — coastal continent encounters ──────────────────────
export const Disatree_01 = createEnemy({
    id: 'ent-disatree-01',
    name: 'Disatree',
    description: 'A tree who disagrees with you.',
    level: 1,
    baseStats: { body: 1, mind: 1, heart: 1 },
    mapLocation: { name: 'northern-forest' },
    enemyTier: 'simple',
    logic: 'random',
    tier1Effects: TIER_FALLBACK,
});

export const Skeptik = createEnemy({
    id: 'ent-skeptik',
    name: 'Skeptik',
    description: 'A cynical wisp that doubts your every word.',
    level: 1,
    baseStats: { body: 1, mind: 3, heart: 1 },
    mapLocation: { name: 'northern-forest' },
    enemyTier: 'simple',
    logic: 'aggressive',
    tier1Effects: TIER_FALLBACK,
});

export const Tantrumlet = createEnemy({
    id: 'ent-tantrumlet',
    name: 'Tantrumlet',
    description: 'A child of unresolved grievances. Makes its case loudly.',
    level: 2,
    baseStats: { body: 2, mind: 1, heart: 3 },
    mapLocation: { name: 'fishing-village' },
    enemyTier: 'simple',
    logic: 'random',
    tier1Effects: TIER_FALLBACK,
});

export const ShoreCrab = createEnemy({
    id: 'ent-shorecrab',
    name: 'Pugilist Crab',
    description: 'A heavily-armored crab with strong opinions about boundaries.',
    level: 2,
    baseStats: { body: 4, mind: 1, heart: 1 },
    mapLocation: { name: 'fishing-village' },
    enemyTier: 'simple',
    logic: 'defensive',
    tier1Effects: TIER_FALLBACK,
});

// ── Tier 2 (normal) — northern continent or elite spawns ────────────────
export const Sophist = createEnemy({
    id: 'ent-sophist',
    name: 'Wandering Sophist',
    description: 'Each argument circles back. You\'re three premises behind.',
    level: 3,
    baseStats: { body: 2, mind: 5, heart: 3 },
    mapLocation: { name: 'caverns' },
    enemyTier: 'normal',
    logic: 'strategic',
    tier1Effects: TIER_FALLBACK,
});

export const Bullroarer = createEnemy({
    id: 'ent-bullroarer',
    name: 'Bullroarer',
    description: 'A brawler whose voice alone bruises.',
    level: 3,
    baseStats: { body: 6, mind: 1, heart: 3 },
    mapLocation: { name: 'caverns' },
    enemyTier: 'normal',
    logic: 'aggressive',
    tier1Effects: TIER_FALLBACK,
});

export const Lamenting_Heart = createEnemy({
    id: 'ent-lamenting-heart',
    name: 'Lamenting Heart',
    description: 'A specter of grief unwilling to fade.',
    level: 3,
    baseStats: { body: 1, mind: 2, heart: 6 },
    mapLocation: { name: 'connecting-river' },
    enemyTier: 'normal',
    logic: 'balanced',
    tier1Effects: TIER_FALLBACK,
});

export const Riddlemaster = createEnemy({
    id: 'ent-riddlemaster',
    name: 'Riddlemaster',
    description: 'Hooded figure that asks impossible questions and counts the silence as answers.',
    level: 4,
    baseStats: { body: 2, mind: 7, heart: 2 },
    mapLocation: { name: 'caverns' },
    enemyTier: 'normal',
    logic: 'strategic',
    tier1Effects: TIER_FALLBACK,
});

export const SwordOfSureness = createEnemy({
    id: 'ent-sword-of-sureness',
    name: 'Sword of Sureness',
    description: 'A possessed blade that argues itself into striking.',
    level: 4,
    baseStats: { body: 7, mind: 2, heart: 2 },
    mapLocation: { name: 'caverns' },
    enemyTier: 'normal',
    logic: 'aggressive',
    tier1Effects: TIER_FALLBACK,
});

// ── Tier 2/3 (elite) ────────────────────────────────────────────────────
export const Demagogue = createEnemy({
    id: 'ent-demagogue',
    name: 'The Demagogue',
    description: 'A charismatic orator who weaponises feeling against reason.',
    level: 5,
    baseStats: { body: 3, mind: 4, heart: 7 },
    mapLocation: { name: 'northern-city' },
    enemyTier: 'elite',
    logic: 'strategic',
    tier1Effects: TIER_FALLBACK,
});

export const Iron_Premise = createEnemy({
    id: 'ent-iron-premise',
    name: 'Iron Premise',
    description: 'A walking syllogism — heavy, slow, immovable.',
    level: 5,
    baseStats: { body: 8, mind: 4, heart: 1 },
    mapLocation: { name: 'caverns' },
    enemyTier: 'elite',
    logic: 'defensive',
    tier1Effects: TIER_FALLBACK,
});

export const Twilight_Truthsayer = createEnemy({
    id: 'ent-twilight-truthsayer',
    name: 'Twilight Truthsayer',
    description: 'A masked figure who only ever tells one truth — and lies about which.',
    level: 5,
    baseStats: { body: 2, mind: 8, heart: 4 },
    mapLocation: { name: 'town-across-river' },
    enemyTier: 'elite',
    logic: 'strategic',
    tier1Effects: TIER_FALLBACK,
});

// ── Tier 3 (bosses) ─────────────────────────────────────────────────────
export const Architect_of_Axioms = createEnemy({
    id: 'ent-architect-of-axioms',
    name: 'Architect of Axioms',
    description: 'Builds and unbuilds reality with a single self-evident claim.',
    level: 7,
    baseStats: { body: 6, mind: 9, heart: 6 },
    mapLocation: { name: 'northern-city' },
    enemyTier: 'boss',
    logic: 'boss',
    tier1Effects: TIER_FALLBACK,
});

export const First_Skeptic = createEnemy({
    id: 'ent-first-skeptic',
    name: 'The First Skeptic',
    description: 'Original doubter. Their disbelief frays the world\'s seams.',
    level: 8,
    baseStats: { body: 5, mind: 10, heart: 7 },
    mapLocation: { name: 'town-across-river' },
    enemyTier: 'boss',
    logic: 'boss',
    tier1Effects: TIER_FALLBACK,
});

export const Heartless_Tyrant = createEnemy({
    id: 'ent-heartless-tyrant',
    name: 'Heartless Tyrant',
    description: 'A king who has chosen efficiency over compassion. Repeatedly.',
    level: 8,
    baseStats: { body: 9, mind: 7, heart: 6 },
    mapLocation: { name: 'northern-city' },
    enemyTier: 'boss',
    logic: 'boss',
    tier1Effects: TIER_FALLBACK,
});

// ── Library exports ─────────────────────────────────────────────────────
export const enemyLibrary: Enemy[] = [
    Disatree_01, Skeptik, Tantrumlet, ShoreCrab,
    Sophist, Bullroarer, Lamenting_Heart, Riddlemaster, SwordOfSureness,
    Demagogue, Iron_Premise, Twilight_Truthsayer,
    Architect_of_Axioms, First_Skeptic, Heartless_Tyrant,
];

const enemyRegistry = new Map<string, Enemy>();
for (const e of enemyLibrary) enemyRegistry.set(e.id, e);

/** O(1) lookup by enemy ID. */
export const lookupEnemy = (id: string): Enemy | undefined => enemyRegistry.get(id);

/** Enemies on a given map. */
export const getEnemiesByMap = (map: string): Enemy[] =>
    enemyLibrary.filter(e => e.mapLocation.name === map);

/** Enemies of a given tier. */
export const getEnemiesByTier = (tier: NonNullable<Enemy['enemyTier']>): Enemy[] =>
    enemyLibrary.filter(e => e.enemyTier === tier);

/**
 * Legacy export used by combat.cli.ts before this expansion.
 * Re-exposes a per-area enemy roster.
 */
export const EnemyLibrary = {
    coastalContinent: [Disatree_01, Tantrumlet, ShoreCrab, Skeptik],
    northernContinent: [Sophist, Bullroarer, Lamenting_Heart, Riddlemaster, SwordOfSureness],
    elite: [Demagogue, Iron_Premise, Twilight_Truthsayer],
    bosses: [Architect_of_Axioms, First_Skeptic, Heartless_Tyrant],
    /** Backwards-compatible alias for early code paths. */
    northernForest: [Disatree_01, Skeptik],
};
