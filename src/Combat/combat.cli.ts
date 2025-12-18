#!/usr/bin/env node

import inquirer from 'inquirer';

/* MOCKED DATA */
import { Disatree_01 } from '../Enemy/enemy.library';
import { Player } from '../Character/characters.mock';
import { BaseStats } from '../Character/types';
import {
  determineEnemyAction,
  determineAdvantage,
  resolveAttackVsAttack,
  resolvePlayerAttackVsEnemyDefend,
  resolveEnemyAttackVsPlayerDefend,
  resolveDefendVsDefend,
} from './index';
import { createDieRoll } from '../Utils';
import { getEnemyRelatedStat } from '../Enemy';

/* SIMULATION of friendship counter state */
let friendshipCounter = 0;

async function main() {
  console.log('Simulating combat as mocked player vs. mocked enemy...');

  /* Questions to ask the user */
  const answer = await inquirer.prompt<{
    reactionType: 'heart' | 'body' | 'mind';
    actionType: 'attack' | 'defend';
  }>([
    // TODO: Have simulator ask the user to select their character (Provide list of characters)
    // TODO: Have simulator ask the user to select their enemy (Provide list of enemies)
    {
      type: 'rawlist',
      name: 'reactionType',
      message: 'Select which part of yourself you choose to respond with...',
      choices: [
        { name: 'Heart', value: 'heart' },
        { name: 'Body', value: 'body' },
        { name: 'Mind', value: 'mind' }
      ]
    },
    {
      type: 'rawlist',
      name: 'actionType',
      message: 'Select the action you want to take...',
      choices: [
        'attack',
        'defend'
      ]
    }
  ]);

  /* Compute all steps of the combat turn */
  const enemyAction = determineEnemyAction(Disatree_01.logic);
  const playerAdvantage = determineAdvantage(answer.reactionType, enemyAction.type);
  const enemyAdvantage = determineAdvantage(enemyAction.type, answer.reactionType);

  /* Log the player's decision */
  console.log(`Player decided to ${answer.actionType} with his ${answer.reactionType}`);

  /* Player Chose to Attack */
  if (answer.actionType === 'attack') {
    /* Create the player's die roll */
    const playerDieRoll = createDieRoll(playerAdvantage);
    const playerRollModifier = Player.baseStats[answer.reactionType as keyof BaseStats]
    const playerRoll = playerDieRoll();

    /* Enemy chose to Attack */
    if (enemyAction.action === 'attack') {
      /* Calculate the enemy's roll */
      const enemyDieRoll = createDieRoll(enemyAdvantage);
      const enemyRollModifier = getEnemyRelatedStat(Disatree_01, enemyAction.type, false);
      const enemyRoll = enemyDieRoll();

      /* Log the player's roll, wait, then log the enemy's roll */
      console.log('Player rolls a: ', playerRoll + playerRollModifier);
      await new Promise(resolve => setTimeout(resolve, 2000));
      console.log('Enemy rolls a: ', enemyRoll + enemyRollModifier);
      await new Promise(resolve => setTimeout(resolve, 2000));

      /* Use abstracted combat logic */
      const result = resolveAttackVsAttack({
        playerRoll,
        playerRollModifier,
        playerDamageRoll: playerDieRoll() + playerRollModifier,
        enemyRoll,
        enemyRollModifier,
        enemyDamageRoll: enemyDieRoll() + enemyRollModifier,
        playerDefenseStat: Player.baseStats[answer.reactionType as keyof BaseStats],
        enemyDefenseStat: getEnemyRelatedStat(Disatree_01, enemyAction.type, true),
      });

      console.log(result.description);
      
      /* Apply damage based on result */
      if (result.winner === 'player') {
        Disatree_01.health -= result.damageToEnemy;
      } else if (result.winner === 'enemy') {
        Player.health -= result.damageToPlayer;
      }

    /* Enemy chose to Defend */
    } else if (enemyAction.action === 'defend') {
      /* Determine the player's damage roll */
      const playersDamageRoll = playerDieRoll() + playerRollModifier;
      const enemyDefenseStat = getEnemyRelatedStat(Disatree_01, enemyAction.type, true);

      /* Use abstracted combat logic */
      const result = resolvePlayerAttackVsEnemyDefend(
        playersDamageRoll,
        enemyDefenseStat
      );

      /* Log the player's roll, wait, then log the result */
      console.log('Player rolls a: ', playerRoll + playerRollModifier);
      await new Promise(resolve => setTimeout(resolve, 2000));
      console.log(result.description);

      /* Apply the damage to the enemy */
      Disatree_01.health -= result.damageToEnemy;
    }

  } else if (answer.actionType === 'defend') {
    /* Enemy chose to Attack */
    if (enemyAction.action === 'attack') {
      /* Calculate the enemy's roll */
      const enemyDieRoll = createDieRoll(enemyAdvantage);
      const enemyRollModifier = getEnemyRelatedStat(Disatree_01, enemyAction.type, false);
      const enemyRoll = enemyDieRoll();

      /* Determine the enemy's damage roll */
      const enemiesDamageRoll = enemyDieRoll() + enemyRollModifier;
      const playerDefenseStat = Player.baseStats[answer.reactionType as keyof BaseStats];

      /* Use abstracted combat logic */
      const result = resolveEnemyAttackVsPlayerDefend(
        enemiesDamageRoll,
        playerDefenseStat
      );

      /* Log the enemy's roll, wait, then log the result */
      console.log('Enemy rolls a: ', enemyRoll + enemyRollModifier);
      await new Promise(resolve => setTimeout(resolve, 2000));
      console.log(result.description);

      /* Apply the damage to the player */
      Player.health -= result.damageToPlayer;
    }
    /* Both Enemy and Player chose to Defend */
    else if (enemyAction.action === 'defend') {
      /* Use abstracted friendship logic */
      const result = resolveDefendVsDefend(friendshipCounter);
      friendshipCounter = result.newFriendship;

      await new Promise(resolve => setTimeout(resolve, 2000));
      console.log(result.description);
    }
  }
}

// TODO: Figure out a way to loop the combat turn until one of the characters is defeated
// --> Will likely need to create an external state in order for this to track
main();
