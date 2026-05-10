/**
 * RNG stubs for hermetic tests.
 *
 * These helpers wrap `vi.spyOn(Math, 'random')` so that test files can keep
 * their own setup short and consistent. Always pair the helper with
 * `afterEach(() => vi.restoreAllMocks())` (or the matching `mockReturnValue`
 * cleanup) to keep tests isolated.
 *
 * When Spec 11 lands a seedable PRNG, swap the underlying implementation
 * here; call sites should not need to change.
 *
 * Excluded from the published build via `tsconfig.json` `exclude`.
 */

import { vi, type MockInstance } from 'vitest';

/**
 * Returns 0.9 / 0.1 alternating on each `Math.random()` call.
 *
 * Useful for deterministic 2d20 rolls:
 *   - With `randomInt(1, 20)`, successive calls yield 19 then 3.
 *   - For "advantage" (keep max): 19. For "disadvantage" (keep min): 3.
 *
 * This is the convention used in `src/Combat/e2e/combat.engine.test.ts`.
 */
export function mockAlternatingRng(): MockInstance<() => number> {
    let n = 0;
    return vi.spyOn(Math, 'random').mockImplementation(() => {
        n++;
        return n % 2 === 1 ? 0.9 : 0.1;
    });
}

/**
 * Returns the supplied values in order on each `Math.random()` call. Once the
 * sequence is exhausted, throws — so tests fail loudly rather than silently
 * falling back to real randomness.
 */
export function mockFixedRng(values: readonly number[]): MockInstance<() => number> {
    let i = 0;
    return vi.spyOn(Math, 'random').mockImplementation(() => {
        if (i >= values.length) {
            throw new Error(
                `mockFixedRng exhausted after ${values.length} call(s); ` +
                'extend the sequence or switch helpers.',
            );
        }
        return values[i++]!;
    });
}

/**
 * Returns the same value on every `Math.random()` call. Use sparingly — most
 * tests should encode the dependency on individual rolls explicitly via
 * `mockFixedRng`.
 */
export function mockSequentialRng(value: number): MockInstance<() => number> {
    return vi.spyOn(Math, 'random').mockReturnValue(value);
}
