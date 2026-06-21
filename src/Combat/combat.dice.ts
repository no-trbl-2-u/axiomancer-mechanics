/**
 * Spec 25 — Hazard-Pattern Combat: stance dice (§4.2).
 *
 * Adapts the Hazard die state-machine (`src/World/Hazard/hazard.dice` patterns)
 * to the combat stance economy. Four dice are rolled at combat start and persist
 * as board objects; spent dice stay spent (no auto-reset between threat phases —
 * the same doctrine as Hazard). Card effects and the self-reinforcing status
 * loop are the only normal ways to reclaim a spent die.
 *
 * Randomness flows through the seedable global RNG singleton (`src/Utils/rng`),
 * exactly like the rest of the combat/skills/effects engine, so hermetic tests
 * pin rolls via `mockFixedRng` / `setSeed` and the Monte-Carlo sim is
 * reproducible. Every public roll accepts an explicit `rng: () => number`
 * (Spec 25 §9) that defaults to the singleton.
 */

import { getRng } from '../Utils/rng';
import type { Stance } from './types';
import type { CombatDieColor, CombatManaDie } from './combat.encounter.types';

/** Dice rolled once at combat start. */
export const COMBAT_DICE_COUNT = 4;

/**
 * The die-face bag (Spec 25 §4.2): Heart / Body / Mind / Wild at 1/6 each, and
 * X (blocked) at 2/6. Wild powers any color; X powers nothing unless a card
 * enables X-die interaction.
 */
export const COMBAT_DIE_FACES: readonly CombatDieColor[] = Object.freeze([
    'heart', 'body', 'mind', 'wild', 'x', 'x',
]);

const defaultRng = (): number => getRng().random();

/** Rolls a single die face from the bag. */
export function rollCombatDieColor(rng: () => number = defaultRng): CombatDieColor {
    const idx = Math.min(COMBAT_DIE_FACES.length - 1, Math.floor(rng() * COMBAT_DIE_FACES.length));
    return COMBAT_DIE_FACES[idx];
}

/** Rolls the opening pool of `count` stance dice. */
export function rollCombatDice(
    count: number = COMBAT_DICE_COUNT,
    rng: () => number = defaultRng,
): CombatManaDie[] {
    const dice: CombatManaDie[] = [];
    for (let i = 0; i < count; i++) {
        const color = rollCombatDieColor(rng);
        dice.push({
            id: `die-${i}`,
            color,
            // X faces start locked (need a card to enable); all others available.
            state: color === 'x' ? 'locked' : 'available',
            temporary: false,
        });
    }
    return dice;
}

/**
 * True if `die` can power a card of `cardColor`: a matching-color die, or the
 * WILD die (powers any color). X is never usable (unless an x-die-interaction
 * card has flipped it to `available`, in which case it acts wild). Mirrors the
 * Hazard `dieCanPower` contract.
 */
export function combatDieCanPower(die: CombatManaDie, cardColor: CombatDieColor): boolean {
    if (die.state !== 'available') return false;
    if (die.color === 'x') return false;
    if (cardColor === 'wild') return true;          // wild cards accept any usable die
    return die.color === 'wild' || die.color === cardColor;
}

/** All dice currently spendable for a card of `cardColor`. */
export function availableDiceFor(
    dice: readonly CombatManaDie[],
    cardColor: CombatDieColor,
): CombatManaDie[] {
    return dice.filter(d => combatDieCanPower(d, cardColor));
}

/** Count of non-X dice still available (used by Reserve-bonus / sim policy). */
export function availableDieCount(dice: readonly CombatManaDie[]): number {
    return dice.filter(d => d.state === 'available' && d.color !== 'x').length;
}

/** Sets the named dice to `spent`. Returns a new dice array. */
export function spendDice(dice: readonly CombatManaDie[], dieIds: readonly string[]): CombatManaDie[] {
    const ids = new Set(dieIds);
    return dice.map(d => (ids.has(d.id) ? { ...d, state: 'spent' as const } : d));
}

/**
 * Refreshes one spent die of `color` back to `available` (the self-reinforcing
 * status loop, §4.7). Wild dice are refreshed in preference to leaving a
 * matching colored die spent only when no same-color spent die exists. Returns
 * the same array reference (no refresh) when nothing matches.
 */
export function refreshOneDie(
    dice: readonly CombatManaDie[],
    color: CombatDieColor,
): { dice: CombatManaDie[]; refreshedId: string | null } {
    // Prefer an exact-color spent die; fall back to a spent wild die.
    const exact = dice.find(d => d.state === 'spent' && d.color === color);
    const target = exact ?? dice.find(d => d.state === 'spent' && d.color === 'wild');
    if (!target) return { dice: dice.slice(), refreshedId: null };
    return {
        dice: dice.map(d => (d.id === target.id ? { ...d, state: 'available' as const } : d)),
        refreshedId: target.id,
    };
}

/** Maps a player card stance (heart/body/mind) to its die color. */
export function stanceToDieColor(stance: Stance): CombatDieColor {
    return stance;
}
