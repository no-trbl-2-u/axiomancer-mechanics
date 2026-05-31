/**
 * Action-restriction phase — second sub-phase of `resolveCombatRound`.
 *
 * Resolves `forcedStance` / `blockedStances` / `skipTurn` effects via
 * `canAct` and produces the actor-final stance and action for the round.
 * Emits `forced-stance` events when an effect overrode the player or
 * enemy's chosen stance, and `turn-skipped` events when a combatant is
 * blocked from acting at all.
 */

import { Character } from '../../Character/types';
import { Enemy } from '../../Enemy/types';
import { canAct } from '../effect-modifiers';
import type { CombatAction, Stance, Action } from '../types';
import type { RoundEvent } from '../combat.resolver';

export interface ActionRestrictionResult {
    playerStance: Stance;
    enemyStance: Stance;
    playerActionFinal: Action | 'skip';
    enemyActionFinal:  Action | 'skip';
    playerCanAct: boolean;
    enemyCanAct: boolean;
}

export function runActionRestrictionPhase(
    player: Character,
    enemy: Enemy,
    playerAction: CombatAction,
    enemyAction: CombatAction,
    events: RoundEvent[],
): ActionRestrictionResult {
    const playerCan = canAct(player.effects, playerAction.stance);
    const enemyCan  = canAct(enemy.effects,  enemyAction.stance);
    const playerStance = playerCan.resolvedStance ?? playerAction.stance;
    const enemyStance  = enemyCan.resolvedStance  ?? enemyAction.stance;
    const playerActionFinal: Action | 'skip' = playerCan.canAct ? playerAction.action : 'skip';
    const enemyActionFinal:  Action | 'skip' = enemyCan.canAct  ? enemyAction.action  : 'skip';

    if (playerCan.resolvedStance && playerCan.resolvedStance !== playerAction.stance) {
        events.push({
            phase: 'action-restriction', kind: 'forced-stance', actor: 'player',
            requested: playerAction.stance, forced: playerCan.resolvedStance,
        });
    }
    if (enemyCan.resolvedStance && enemyCan.resolvedStance !== enemyAction.stance) {
        events.push({
            phase: 'action-restriction', kind: 'forced-stance', actor: 'enemy',
            requested: enemyAction.stance, forced: enemyCan.resolvedStance,
        });
    }
    if (!playerCan.canAct) {
        events.push({
            phase: 'action-restriction', kind: 'turn-skipped', actor: 'player',
            reason: playerCan.reason as 'skipTurn' | 'blockedStance' | null,
        });
    }
    if (!enemyCan.canAct) {
        events.push({
            phase: 'action-restriction', kind: 'turn-skipped', actor: 'enemy',
            reason: enemyCan.reason as 'skipTurn' | 'blockedStance' | null,
        });
    }

    return {
        playerStance,
        enemyStance,
        playerActionFinal,
        enemyActionFinal,
        playerCanAct: playerCan.canAct,
        enemyCanAct: enemyCan.canAct,
    };
}
