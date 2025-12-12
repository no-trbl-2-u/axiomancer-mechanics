// ================================
// Enemy Module
// ================================

import { ActionType } from "Combat/types";
import { Enemy } from "./types";

/**
 * Gets the enemy's related stat for the given base and action type
 * @param enemy - The enemy to get the stat for 
 * @param base - Decision enemy made (body, mind, heart)
 * @param isDefending - Whether the enemy is defending
 * @returns 
 */
export const getEnemyRelatedStat = (enemy: Enemy, base: ActionType, isDefending: boolean) => {
  if (!isDefending) {
    switch (base) {
      case 'body':
        return enemy.enemyStats.physicalAttack;
      case 'mind':
        return enemy.enemyStats.mentalAttack;
      case 'heart':
        return enemy.enemyStats.emotionalAttack;
    }
  } else {
    switch (base) {
      case 'body':
        return enemy.enemyStats.physicalDefense;
      case 'mind':
        return enemy.enemyStats.mentalDefense;
      case 'heart':
        return enemy.enemyStats.emotionalDefense;
    }
  }
}