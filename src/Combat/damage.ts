/**
 * Damage math: critical multipliers, final damage calculation, and the simple
 * higher-roll-wins comparator.
 */

/** Doubles raw damage on a critical hit. Adjust here to rebalance crits. */
export function applyCriticalMultiplier(baseDamage: number): number {
    return baseDamage * 2;
}

/**
 * Final damage after crits and defence reduction (clamped to 0).
 *
 * @param baseDamage      - Pre-reduction damage.
 * @param damageReduction - Defence value to subtract (already multiplied).
 * @param isCritical      - When true, base damage is doubled before defence.
 * @param damageBonus     - Optional flat bonus added before defence (e.g. marks).
 */
export function calculateFinalDamage(
    baseDamage: number,
    damageReduction: number,
    isCritical: boolean,
    damageBonus = 0,
): number {
    const damage = isCritical ? applyCriticalMultiplier(baseDamage) : baseDamage;
    return Math.ceil(Math.max(0, damage + damageBonus - damageReduction));
}

/** True iff `attackRoll` strictly exceeds `defenseRoll`. */
export function isAttackSuccessful(attackRoll: number, defenseRoll: number): boolean {
    return attackRoll > defenseRoll;
}
