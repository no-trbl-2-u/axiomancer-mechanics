/**
 * Hazard Minigame — Public API (v2).
 *
 * Faithful port of the mobile v2 Hazard engine, the living rules source
 * (`../axiomancer-mobile/state/hazard/`). The package exports the exact
 * mobile surface so mobile can delete its local engine and consume these
 * exports instead. See `docs/hazard-v2-vs-mechanics-divergence.md`.
 */

// ── Engine types ───────────────────────────────────────────────────────────
export type {
    HazardColor,
    HazardDieKind,
    HazardProgressKey,
    HazardDieState,
    HazardDie,
    HazardCardRarity,
    HazardUtilityEffect,
    HazardKeywordId,
    HazardSalvage,
    HazardCardDef,
    HazardHandEntry,
    HazardRouteKey,
    HazardSafeRouteDef,
    HazardRiskRouteDef,
    HazardRouteDef,
    HazardDef,
    HazardMark,
    HazardResolveInfo,
    HazardOutcomeTier,
    HazardRewardId,
    HazardConsequenceId,
    HazardOutcome,
    HazardPhase,
    HazardSessionState,
} from './hazard.types';

export {
    HAZARD_DICE_COUNT,
    HAZARD_HAND_SIZE,
    HAZARD_MOMENTUM_CAP,
} from './hazard.types';

// ── Seeded RNG ─────────────────────────────────────────────────────────────
export type { HazardRngState } from './hazard.rng';
export { seedRng, nextFloat, nextInt, shuffle } from './hazard.rng';

// ── Tuning ─────────────────────────────────────────────────────────────────
export { HAZARD_TUNING, HAZARD_DIE_FACES } from './hazard.tuning';

// ── Authored content (cards, rewards, hazards, keywords, catalogues) ────────
export {
    HAZARD_KEYWORDS,
    HAZARD_DECK,
    HAZARD_CRACK_CARD,
    HAZARD_REWARD_CARDS,
    getHazardCardDef,
    HAZARD_REWARDS,
    HAZARD_CONSEQUENCES,
    HAZARD_VITAE_REWARD,
    HAZARD_CACHE_SHILLINGS,
    HAZARD_RELIC_SHILLINGS,
    HAZARD_MINHP_LOSS,
    HAZARD_MAXHP_SCAR,
    HAZARD_TYPES,
    HAZARD_LIBRARY,
    getHazardDef,
} from './hazard.content';

// ── Deck persistence (GameState.flags codec) ────────────────────────────────
export {
    HAZARD_CARD_FLAG_PREFIX,
    hazardStarterBag,
    decodeAcquiredCards,
    hazardDeckBag,
    appendAcquiredCard,
} from './hazard.deck-flags';

// ── Pure engine transitions ─────────────────────────────────────────────────
export {
    // selectors
    hazardCardValue,
    hazardStagedProgress,
    hazardProjectedProgress,
    dieCanPower,
    hazardTierOf,
    // lifecycle
    createHazardSession,
    selectHazardRoute,
    finishHazardRolling,
    // round play
    stageHazardCard,
    unstageHazardCard,
    powerHazardCard,
    applyHazardCard,
    discardHazardCard,
    // resolve / outcome / rewards
    resolveHazardRound,
    continueHazardAfterResolve,
    acknowledgeHazardOutcome,
    claimHazardRewards,
} from './hazard.engine';

// ── Divergence audit (Phase 140) ───────────────────────────────────────────
export type {
    DivergenceItem,
    ImplementationGap,
    VerificationResult,
} from './audit/divergence.verification';

export {
    verifyHazardDivergence,
    formatDivergenceReport,
} from './audit/divergence.verification';

export type { GapAnalysis } from './audit/gap.report';

export {
    analyzeHazardGaps,
    formatGapReport,
    executeGapAudit,
} from './audit/gap.report';
