/**
 * Named sandbox card SETS — curated experiment bundles the playtest CLI and
 * the `/deck-tuning` skill load with one flag (`--sandbox=<setId>`).
 *
 * A set bundles new experimental cards and/or numeric overrides of library
 * cards. Applying a set registers everything into the sandbox registry
 * (`cards.sandbox.ts`), which `getCardById` consults first — so the set is
 * live across deck building, projection, and execution for that process.
 *
 * Doctrine check for every card added here: does it make applying and
 * exploiting status effects more central and more satisfying? Effect ids MUST
 * be real ids from the Effects library (`src/Effects/*.library.json`) — a
 * made-up id silently lands nothing.
 *
 * Promotion path: a sandbox card that proves out across stages/policies moves
 * its literal into `cards.library.ts` in the same PR as the evidence table.
 */

import type { Card } from './types';
import {
    registerSandboxCards,
    registerSandboxOverride,
    type SandboxCardPatch,
} from './cards.sandbox';

export interface SandboxCardSet {
    id: string;
    name: string;
    description: string;
    cards: readonly Card[];
    overrides?: ReadonlyArray<{ cardId: string; patch: SandboxCardPatch }>;
}

// ─── forge-example — the reference experiment ────────────────────────────────

/** Direct-dot experiment: Burn (a real DoT — `debuff_burn` ticks 4 HP/round
 *  and saps heart) on a mid-tier mind card. Status is the efficient path;
 *  this card exists to test whether a second mid-tier Burn source deepens
 *  DoT-weaving without outshining `slippery-slope`. */
const emberSyllogism: Card = {
    id: 'sandbox-ember-syllogism',
    name: 'Ember Syllogism',
    category: 'fallacy',
    philosophicalAspect: 'mind',
    description:
        'A conclusion reached too fast generates heat. You hand them the '
        + 'shortcut and let it smoulder — the argument keeps burning long '
        + 'after you have stopped speaking.',
    tier: 2,
    targetType: 'enemy',
    basePower: 10,
    scalingStat: 'mind',
    combatEffects: [
        { effectId: 'debuff_burn', appliedTo: 'opponent', intensity: 2, duration: 3 },
    ],
    learningRequirement: { level: 10 },
    addedIn: '2026-07-02',
    tags: ['sandbox', 'experimental', 'dot', 'mid-game'],
};

/** Defend/guard hybrid experiment: a solid Guard plus a small lingering
 *  self-buff (`buff_minor_fortitude`), probing whether defence that ALSO
 *  advances a status board state beats flat guard (`brace-for-impact`). */
const temperedDoubt: Card = {
    id: 'sandbox-tempered-doubt',
    name: 'Tempered Doubt',
    category: 'paradox',
    philosophicalAspect: 'body',
    description:
        'You do not deny the blow — you doubt its premises until it lands '
        + 'softer. What survives the doubting is harder than certainty ever was.',
    tier: 2,
    targetType: 'self',
    basePower: 0,
    scalingStat: 'body',
    specialMechanics: [{ kind: 'guard', amount: 14 }],
    combatEffects: [
        { effectId: 'buff_minor_fortitude', appliedTo: 'self', intensity: 1, duration: 2 },
    ],
    learningRequirement: { level: 10 },
    addedIn: '2026-07-02',
    tags: ['sandbox', 'experimental', 'defense', 'guard', 'mid-game'],
};

// ─── early-dot-pilot — plugging the tier-1 DoT gap ───────────────────────────

/**
 * `/deck-tuning --focus="Early"` finding: `stageEligibleCardIds(early)` has
 * ZERO `direct-dot` verb-class cards — every DoT effect in the library
 * (`debuff_bleed`, `debuff_poison`, `debuff_burn`, ...) is tier >= 2, so the
 * tier-1-gated early pool cannot draft or draw a single DoT line. Measured:
 * `dotFrac` = 0% across every early cell/policy (baseline matrix,
 * `npm run combat-playtest -- --stage=early --policy=all --runs=60 --seed=1
 * --cards`, 2026-07-02). This composes the EXISTING `debuff_bleed` effect
 * (already used by `slippery-slope`) at a deliberately weak intensity/
 * duration onto a new tier-1 card — a light early-game DoT opener, not a
 * tier-2 card in early's clothing.
 */
const paperCutArgument: Card = {
    id: 'sandbox-paper-cut-argument',
    name: 'Paper Cut Argument',
    category: 'fallacy',
    philosophicalAspect: 'body',
    description:
        'A nick, not a wound — you barely felt it land. But the argument '
        + 'keeps reopening the same thin line, and thin lines add up.',
    tier: 1,
    targetType: 'enemy',
    basePower: 3,
    scalingStat: 'body',
    combatEffects: [
        { effectId: 'debuff_bleed', appliedTo: 'opponent', intensity: 1, duration: 2 },
    ],
    learningRequirement: { level: 1 },
    addedIn: '2026-07-02',
    tags: ['sandbox', 'experimental', 'dot', 'early-game'],
};

export const SANDBOX_CARD_SETS: Record<string, SandboxCardSet> = {
    'forge-example': {
        id: 'forge-example',
        name: 'The Forge — Example Set',
        description:
            'Reference experiment: a second mid-tier Burn DoT source, a guard/'
            + 'buff hybrid, and a +1 basePower nudge to Ad Hominem Strike. Shows '
            + 'the full sandbox grammar (new cards + a library override).',
        cards: [emberSyllogism, temperedDoubt],
        overrides: [
            // Example numeric A/B: library value is 8 — does +1 on the weak
            // baseline strike change anything? (It should not: status play must
            // stay the efficient path.)
            { cardId: 'ad-hominem-strike', patch: { basePower: 9 } },
        ],
    },
    'early-dot-pilot': {
        id: 'early-dot-pilot',
        name: 'Early DoT Pilot',
        description:
            'Plugs the tier-1 DoT gap: a single weak-bleed opener '
            + '(`sandbox-paper-cut-argument`) so the early stage has a live DoT '
            + 'line instead of zero. A/B against the early-stage baseline '
            + '(dotFrac 0% everywhere) across blind/dot-weaver/greedy.',
        cards: [paperCutArgument],
    },
};

/** All registered sandbox sets, in declaration order. */
export function listSandboxSets(): SandboxCardSet[] {
    return Object.values(SANDBOX_CARD_SETS);
}

/**
 * Applies a set: registers its new cards and overrides into the sandbox
 * registry. Returns the set, or `undefined` for an unknown id. Applying the
 * same set twice throws (its card ids are then already registered) — call
 * `clearSandboxCards()` between experiments.
 */
export function applySandboxSet(setId: string): SandboxCardSet | undefined {
    const set = SANDBOX_CARD_SETS[setId];
    if (!set) return undefined;
    registerSandboxCards(set.cards);
    for (const override of set.overrides ?? []) {
        registerSandboxOverride(override.cardId, override.patch);
    }
    return set;
}
