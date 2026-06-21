/**
 * Spec 25 — Hazard-Pattern Combat: engine types.
 *
 * The new card-and-dice combat driver, structurally identical to the Hazard
 * minigame (`src/World/Hazard/`). Status effects fill two Pressure Tracks that
 * are the only practical win conditions; basic-attack trading is removed —
 * every verb is a skill card.
 *
 * This subsystem ships ALONGSIDE the legacy `resolveCombatRound` driver (Spec
 * 25 §12 Q4 recommendation (b)): the effects engine, skill engine, and the old
 * resolver are all untouched, so every existing hermetic test keeps passing.
 * The new engine *drives* the same `executeSkill` / `applyEffect` machinery
 * differently — it does not replace it.
 *
 * Doctrine (CLAUDE.md): status effects are the MAIN fun. The Pressure Tracks
 * make the Phase 125 DoT-Erosion / Control-Saturation win conditions visible
 * and foreseeable so the player always *assembles a solution* rather than
 * *trades stats*.
 */

import type { Character } from '../Character/types';
import type { Enemy } from '../Enemy/types';
import type { Effect, ActiveEffect } from '../Effects/types';
import type { CombatResources } from '../Skills/types';
import type { Stance } from './types';

// ---------------------------------------------------------------------------
// Dice — the stance-color economy (Spec 25 §4.2)
// ---------------------------------------------------------------------------

/**
 * Die face colors. Heart / Body / Mind power same-color cards; Wild powers any
 * color; X is the blocked face (cannot power a card unless a card specifically
 * enables X-die interaction). Mirrors the Hazard `HazardDieKind` (colors + hex).
 */
export type CombatDieColor = 'heart' | 'body' | 'mind' | 'wild' | 'x';

/**
 * Die lifecycle. `available` → `spent` on power; `spent` → `available` again
 * via the self-reinforcing status loop (§4.7), RPS advantage (§4.8 waives the
 * cost entirely), or die-manipulation cards. `exhausted` / `preserved` mirror
 * the Hazard state machine for parity; `locked` is reserved for X dice that a
 * card has not yet unlocked.
 */
export type CombatDieState = 'available' | 'spent' | 'exhausted' | 'preserved' | 'locked';

/** A stance die — a tactile board object rolled at combat start. */
export interface CombatManaDie {
    id: string;           // 'die-0' … 'die-3' (and 'die-N' for temporary dice)
    color: CombatDieColor;
    state: CombatDieState;
    /** Created by card effects; expires between phases (display + cleanup). */
    temporary: boolean;
}

// ---------------------------------------------------------------------------
// Cards — skill-card view over a learned Skill (Spec 25 §4.3, §6)
// ---------------------------------------------------------------------------

/**
 * Verb-class taxonomy (adapted from the Hazard card classes, §6). Drives the
 * pressure track a card contributes to and its hand icon.
 */
export type CombatVerbClass =
    | 'direct-dot'        // applies DoT debuffs (Poison, Bleed, Burn…) → dot track
    | 'direct-control'    // applies control debuffs (Stun, Fear, Charm…) → control track
    | 'stat-debuff'       // applies stat-reduction debuffs → control track (smaller)
    | 'buff-self'         // buffs the player (regen, resistance, accuracy) → 0 pressure
    | 'direct-damage'     // raw HP damage, no status effect → 0 pressure
    | 'befriend'          // Befriend skill card → opens the mercy choice (§6 Q6)
    | 'retreat';          // Retreat skill card → leaves combat (§3, §12 Q2)

/** The two pressure tracks a card may feed. `none` = utility / damage only. */
export type PressureTrackKey = 'dot' | 'control' | 'none';

/**
 * A combat card — an adapter VIEW over a learned `Skill` (or a synthetic card
 * like Retreat). Pure projection: never mutated, recomputed from the skill +
 * effect libraries. The `skillId` is the learned-skill id the card executes.
 */
export interface CombatCard {
    /** Card id. For skill-backed cards this is the skill id; synthetic cards
     *  use a `card-` prefix (e.g. `card-retreat`). */
    id: string;
    /** Backing learned-skill id, or null for synthetic cards. */
    skillId: string | null;
    name: string;
    /** Stance color identity (Heart / Body / Mind). Derived from the skill's
     *  `philosophicalAspect`. Synthetic cards may be `wild`. */
    stance: CombatDieColor;
    verbClass: CombatVerbClass;
    /** Which pressure track the bottom action advances. */
    track: PressureTrackKey;
    tier: 1 | 2 | 3;
    /** Fallacy (⚖) or Paradox (∞) flavour — preserved token generation. */
    category: 'fallacy' | 'paradox' | null;
    /** Human-readable description of the FREE top action. */
    topActionText: string;
    /** Human-readable description of the powered BOTTOM action. */
    bottomActionText: string;
    /** Projected pressure if the bottom action lands (preview; §7.1, §7.3). */
    bottomPressurePreview: number;
}

/** A physical card instance in hand / play (uid-tracked, like Hazard). */
export interface CombatHandEntry {
    uid: string;
    cardId: string;
}

/** A single card play submitted to `resolveCombatPhase`. */
export interface CardPlay {
    /** Hand-entry uid (preferred) or card id. */
    uid?: string;
    cardId: string;
    /** Bottom (powered) action when true; free top action when false. */
    useBottom: boolean;
    /** Die spent to power the bottom action (ignored for top actions). */
    dieId?: string;
}

// ---------------------------------------------------------------------------
// Threat phases — the enemy redesign (Spec 25 §4.4, §10)
// ---------------------------------------------------------------------------

/** A single effect an enemy threat action applies to the player when a phase
 *  is not cleared. */
export interface CombatThreatEffect {
    /** Direct HP damage dealt to the player. */
    damage?: number;
    /** Effect id (from the effects library) applied to the player. */
    effectId?: string;
    /** Intensity override for the applied effect (default 1). */
    intensity?: number;
    /** Duration override for the applied effect. */
    duration?: number;
    /** Self-heal the enemy performs (escalation). */
    enemyHeal?: number;
}

export interface CombatThreatAction {
    /** Shown in the threat timeline. */
    description: string;
    /** Applied to the player if the phase is Overwhelmed (not cleared). */
    effects: CombatThreatEffect[];
}

export interface CombatThreatPhase {
    index: number;                            // 1-indexed for display
    enemyStance: Stance;                      // dominant stance — drives RPS advantage
    threatAction: CombatThreatAction;         // fires at phase-end if not controlled
    dotPressureRequired: number;              // DoT contribution to clear this phase
    controlPressureRequired: number;          // Control contribution to clear this phase
    isFinalPhase: boolean;                    // final phase uses harder thresholds
}

export type CombatThreatMark = 'clear' | 'overwhelmed' | 'pending';

export interface CombatPhaseResult {
    phaseIndex: number;
    mark: 'clear' | 'overwhelmed';
    dotContributed: number;
    controlContributed: number;
    enemyActionFired: string;                 // '' when cleared
    penaltiesApplied: CombatThreatEffect[];
}

// ---------------------------------------------------------------------------
// Pressure tracks (Spec 25 §4.1, §5)
// ---------------------------------------------------------------------------

export interface CombatPressureTracks {
    /** Cumulative DoT pressure toward DoT Erosion victory. */
    dot: number;
    /** Cumulative control pressure toward Control Saturation mercy. */
    control: number;
    /** Victory via DoT Erosion when `dot >= dotThreshold`. */
    dotThreshold: number;
    /** Mercy resolution via Saturation when `control >= controlThreshold`. */
    controlThreshold: number;
}

/** Per-skill attribution row for the post-combat summary (§7.7). */
export interface CombatAttributionRow {
    cardId: string;
    name: string;
    /** Total DoT damage projected/dealt by this card's effects. */
    dotDamage: number;
    /** Total pressure this card contributed to its track. */
    pressureContributed: number;
    /** Phases across which the card's effects were active. */
    phases: number;
}

export interface CombatSummary {
    outcome: CombatOutcome;
    /** e.g. 'Victory via DoT Erosion'. */
    headline: string;
    rows: CombatAttributionRow[];
    totalDotDamage: number;
    directDamage: number;
    controlPeak: number;
    controlThreshold: number;
    /** Skill card that contributed most to the winning track ('' if none). */
    bestCard: string;
}

// ---------------------------------------------------------------------------
// Outcome + phase
// ---------------------------------------------------------------------------

export type CombatOutcome =
    | 'victory'    // DoT Erosion threshold reached
    | 'mercy'      // Control Saturation threshold reached (friendship path)
    | 'defeat'     // player HP → 0
    | 'retreat';   // player used Retreat card

export type CombatEncounterPhase =
    | 'reveal'         // enemy + opening hand visible before dice are rolled
    | 'dice-roll'      // player rolls stance dice
    | 'phase-play'     // player plays skill cards
    | 'phase-resolve'  // pressure tracks compared, enemy action fires, Clear/Overwhelmed
    | 'between-phases' // DoT ticks, durations tick, draw 5
    | 'mercy-choice'   // Control Saturation opened the Phase 112 spare/exploit modal
    | 'complete';      // combat over, outcome determined

// ---------------------------------------------------------------------------
// Events — typed stream for UI rendering (Spec 25 §7)
// ---------------------------------------------------------------------------

export type CombatEvent =
    | { kind: 'dice-rolled'; dice: CombatManaDie[] }
    | { kind: 'card-played'; cardId: string; useBottom: boolean; dieId: string | null;
        advantage: 'advantage' | 'neutral' | 'disadvantage' }
    | { kind: 'effect-landed'; cardId: string; effectId: string; target: 'self' | 'enemy';
        track: PressureTrackKey; pressure: number; intensity: number; effect: Effect }
    | { kind: 'effect-fizzled'; cardId: string; effectId: string; message: string }
    | { kind: 'damage-dealt'; cardId: string; target: 'self' | 'enemy'; amount: number }
    | { kind: 'die-refreshed'; dieId: string; color: CombatDieColor }
    | { kind: 'die-spent'; dieId: string; color: CombatDieColor }
    | { kind: 'pressure-updated'; dot: number; control: number }
    | { kind: 'dot-tick'; effectId: string; label: string; amount: number; target: 'self' | 'enemy' }
    | { kind: 'phase-resolved'; phaseIndex: number; mark: 'clear' | 'overwhelmed' }
    | { kind: 'threat-fired'; phaseIndex: number; description: string; effects: CombatThreatEffect[] }
    | { kind: 'hand-drawn'; cards: string[] }
    | { kind: 'momentum-carried'; dot: number; control: number }
    | { kind: 'mercy-opened'; message: string }
    | { kind: 'combat-ended'; outcome: CombatOutcome };

// ---------------------------------------------------------------------------
// Top-level encounter state (Spec 25 §4.1)
// ---------------------------------------------------------------------------

export interface CombatEncounterState {
    phase: CombatEncounterPhase;
    enemy: Enemy;                          // unchanged — HP, effects, stats (deep-cloned)
    player: Character;                     // unchanged — HP, effects, stats (deep-cloned)
    dice: CombatManaDie[];                 // 4 dice; rolled at combat start
    deck: string[];                        // full combat deck (card ids) — reshuffle source
    drawPile: string[];                    // remaining draw order
    discard: string[];                     // used / discarded card ids
    hand: CombatHandEntry[];               // current hand (up to 5)
    persistentZone: string[];              // ENCHANT-equivalent persistent buff cards
    threatPhases: CombatThreatPhase[];     // enemy's authored / generated threat sequence
    threatMarks: CombatThreatMark[];       // O / X ledger per phase
    currentPhaseIndex: number;             // 0-indexed into threatPhases
    pressureTracks: CombatPressureTracks;  // cumulative DoT + Control toward victory/mercy
    /** Pressure accrued DURING the current phase (for the per-phase Clear
     *  check), seeded each phase by the momentum carry. Distinct from the
     *  cumulative `pressureTracks`. */
    phaseProgress: { dot: number; control: number };
    /** Momentum surplus carried into the next phase (⌊surplus/2⌋ capped at 3). */
    momentumCarry: { dot: number; control: number };
    phaseResults: CombatPhaseResult[];     // completed phase records
    combatResources: CombatResources;      // Fallacy/Paradox bank (+ stance scratch)
    round: number;                         // total rounds elapsed
    /** Per-effect attribution accumulator keyed by the card that applied it. */
    attribution: Record<string, CombatAttributionRow>;
    directDamageDealt: number;             // raw HP damage (for the summary)
    log: CombatEvent[];                    // event stream for UI rendering
    finalOutcome: CombatOutcome | null;    // null until combat ends
    /** Phase 112 — set when a successful Befriend / Control Saturation opens the
     *  spare/exploit mercy choice. */
    mercyChoiceActive?: boolean;
    seed?: number;                         // seed used to drive the encounter (sim/tests)
}

/** Return shape of every engine transition (mirrors `SkillResolution`). */
export interface CombatTransition {
    state: CombatEncounterState;
    events: CombatEvent[];
}

/** A snapshot of one live effect for pressure attribution. */
export interface LandedEffect {
    effectId: string;
    effect: Effect;
    active: ActiveEffect;
    target: 'self' | 'enemy';
}
