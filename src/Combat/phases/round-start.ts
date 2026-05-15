/**
 * Round-start phase — first sub-phase of `resolveCombatRound`.
 *
 * Runs regen → drain → start-phase DoT for both combatants and emits one
 * `round-start` event per non-zero outcome. If start-phase ticks drop
 * either combatant to 0 HP, the round terminates here: the caller
 * short-circuits the rest of the round and emits the matching `lethal`
 * event before returning.
 */

import { Character } from '../../Character/types';
import { Enemy } from '../../Enemy/types';
import { processRoundStartEffects } from '../effects';
import type { RoundEvent } from '../combat.resolver';

export interface RoundStartResult {
    player: Character;
    enemy: Enemy;
    /** True when start-phase ticks dropped either combatant to 0 HP. */
    lethal: boolean;
}

export function runRoundStartPhase(
    player: Character,
    enemy: Enemy,
    events: RoundEvent[],
): RoundStartResult {
    const pStart = processRoundStartEffects(player);
    const nextPlayer = pStart.target;
    if (pStart.healed    > 0) events.push({ phase: 'round-start', kind: 'regen', actor: 'player', amount: pStart.healed });
    if (pStart.drained   > 0) events.push({ phase: 'round-start', kind: 'drain', actor: 'player', amount: pStart.drained });
    if (pStart.dotDamage > 0) events.push({ phase: 'round-start', kind: 'dot',   actor: 'player', amount: pStart.dotDamage });

    const eStart = processRoundStartEffects(enemy);
    const nextEnemy = eStart.target;
    if (eStart.healed    > 0) events.push({ phase: 'round-start', kind: 'regen', actor: 'enemy', amount: eStart.healed });
    if (eStart.drained   > 0) events.push({ phase: 'round-start', kind: 'drain', actor: 'enemy', amount: eStart.drained });
    if (eStart.dotDamage > 0) events.push({ phase: 'round-start', kind: 'dot',   actor: 'enemy', amount: eStart.dotDamage });

    const lethal = nextPlayer.health <= 0 || nextEnemy.health <= 0;
    if (lethal) {
        if (nextPlayer.health <= 0) events.push({ phase: 'round-start', kind: 'lethal', actor: 'player' });
        if (nextEnemy.health  <= 0) events.push({ phase: 'round-start', kind: 'lethal', actor: 'enemy'  });
    }

    return { player: nextPlayer, enemy: nextEnemy, lethal };
}
