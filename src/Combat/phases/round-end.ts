/**
 * Round-end phase — sixth and final sub-phase of `resolveCombatRound`.
 *
 * Runs end-phase DoT and effect-expiry for both combatants and emits
 * `round-end` events when either fires. The orchestrator then composes
 * the new `CombatState` and increments the round counter.
 */

import { Character } from '../../Character/types';
import { Enemy } from '../../Enemy/types';
import { processRoundEndEffects } from '../effects';
import type { RoundEvent } from '../combat.resolver';

export interface RoundEndResult {
    player: Character;
    enemy: Enemy;
}

export function runRoundEndPhase(
    player: Character,
    enemy: Enemy,
    events: RoundEvent[],
): RoundEndResult {
    const pEnd = processRoundEndEffects(player);
    const nextPlayer = pEnd.target;
    if (pEnd.dotDamage    > 0)   events.push({ phase: 'round-end', kind: 'dot',     actor: 'player', amount: pEnd.dotDamage });
    if (pEnd.expired.length > 0) events.push({ phase: 'round-end', kind: 'expired', actor: 'player', expired: pEnd.expired });

    const eEnd = processRoundEndEffects(enemy);
    const nextEnemy = eEnd.target;
    if (eEnd.dotDamage    > 0)   events.push({ phase: 'round-end', kind: 'dot',     actor: 'enemy',  amount: eEnd.dotDamage });
    if (eEnd.expired.length > 0) events.push({ phase: 'round-end', kind: 'expired', actor: 'enemy',  expired: eEnd.expired });

    return { player: nextPlayer, enemy: nextEnemy };
}
