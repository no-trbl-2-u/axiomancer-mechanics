/**
 * Advantage phase — third sub-phase of `resolveCombatRound`.
 *
 * Computes per-side advantage from the stance matchup, folds in any
 * effect-granted overrides via `resolveEffectiveAdvantage`, and emits
 * the `actions` + `matchup` events the scenario phase reads from.
 */

import { Character } from '../../Character/types';
import { Enemy } from '../../Enemy/types';
import {
    determineAdvantage,
    resolveEffectiveAdvantage,
} from '../advantage';
import type { Stance, Action, Advantage } from '../types';
import type { RoundEvent } from '../combat.resolver';

export interface AdvantagePhaseResult {
    playerAdvantage: Advantage;
    enemyAdvantage:  Advantage;
}

export function runAdvantagePhase(
    player: Character,
    enemy: Enemy,
    playerStance: Stance,
    enemyStance: Stance,
    playerActionFinal: Action | 'skip',
    enemyActionFinal:  Action | 'skip',
    events: RoundEvent[],
): AdvantagePhaseResult {
    const playerAdvantage = resolveEffectiveAdvantage(
        determineAdvantage(playerStance, enemyStance), player.effects, playerStance,
    );
    const enemyAdvantage = resolveEffectiveAdvantage(
        determineAdvantage(enemyStance, playerStance), enemy.effects, enemyStance,
    );

    events.push({
        phase: 'advantage', kind: 'actions',
        playerStance, playerAction: playerActionFinal,
        enemyStance,  enemyAction:  enemyActionFinal,
    });
    events.push({
        phase: 'advantage', kind: 'matchup',
        playerStance, enemyStance,
        playerAdvantage, enemyAdvantage,
    });

    return { playerAdvantage, enemyAdvantage };
}
