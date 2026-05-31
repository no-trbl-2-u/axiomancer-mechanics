/**
 * Stance-effects phase — fourth sub-phase of `resolveCombatRound`.
 *
 * Clears stale Tier 1 stance buffs whose stance no longer matches the
 * actor's stance this round, then applies the actor's new Tier 1 buff
 * for combatants who can act and chose `attack` or `defend`. Emits
 * `stance-effects` `cleared` / `applied` events.
 */

import { Character } from '../../Character/types';
import { Enemy } from '../../Enemy/types';
import { applyTier1CombatEffect, clearTier1EffectsForStance } from '../../Effects';
import type { Tier1EffectOverrides } from '../../Enemy/types';
import type { Stance, Action } from '../types';
import type { RoundEvent } from '../combat.resolver';

export interface StanceEffectsResult {
    player: Character;
    enemy: Enemy;
}

export function runStanceEffectsPhase(
    playerIn: Character,
    enemyIn: Enemy,
    playerStance: Stance,
    enemyStance: Stance,
    playerActionFinal: Action | 'skip',
    enemyActionFinal:  Action | 'skip',
    playerCanAct: boolean,
    enemyCanAct: boolean,
    round: number,
    enemyTier1Overrides: Tier1EffectOverrides | undefined,
    events: RoundEvent[],
): StanceEffectsResult {
    let player = playerIn;
    let enemy  = enemyIn;

    const playerClear = clearTier1EffectsForStance(player.effects, playerStance);
    player = { ...player, effects: playerClear.activeEffects };
    if (playerClear.cleared.length > 0) {
        events.push({
            phase: 'stance-effects', kind: 'cleared', actor: 'player',
            cleared: playerClear.cleared, newStance: playerStance,
        });
    }

    const enemyClear = clearTier1EffectsForStance(enemy.effects, enemyStance);
    enemy = { ...enemy, effects: enemyClear.activeEffects };
    if (enemyClear.cleared.length > 0) {
        events.push({
            phase: 'stance-effects', kind: 'cleared', actor: 'enemy',
            cleared: enemyClear.cleared, newStance: enemyStance,
        });
    }

    if (playerCanAct && (playerActionFinal === 'attack' || playerActionFinal === 'defend')) {
        const t1 = applyTier1CombatEffect(
            player.effects, enemy.effects,
            { stance: playerStance, action: playerActionFinal }, round,
        );
        player = { ...player, effects: t1.actorEffects };
        enemy  = { ...enemy,  effects: t1.opponentEffects };
        if (t1.effect && t1.message && t1.appliedTo) {
            events.push({
                phase: 'stance-effects', kind: 'applied', actor: 'player',
                effect: t1.effect, message: t1.message, appliedTo: t1.appliedTo,
            });
        }
    }
    if (enemyCanAct && (enemyActionFinal === 'attack' || enemyActionFinal === 'defend')) {
        const t1 = applyTier1CombatEffect(
            enemy.effects, player.effects,
            { stance: enemyStance, action: enemyActionFinal }, round,
            enemyTier1Overrides,
        );
        enemy  = { ...enemy,  effects: t1.actorEffects };
        player = { ...player, effects: t1.opponentEffects };
        if (t1.effect && t1.message && t1.appliedTo) {
            events.push({
                phase: 'stance-effects', kind: 'applied', actor: 'enemy',
                effect: t1.effect, message: t1.message, appliedTo: t1.appliedTo,
            });
        }
    }

    return { player, enemy };
}
