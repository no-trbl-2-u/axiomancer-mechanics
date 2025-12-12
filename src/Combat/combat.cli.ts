#!/usr/bin/env node

import inquirer from 'inquirer';

/* MOCKED DATA */
import { Disatree_01 } from '../Enemy/enemy.library';
import { Player } from '../Character/characters.mock';
import { determineEnemyAction, determinePlayerAdvantage, rollDie } from './index';

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
        'Heart',
        'Body',
        'Mind'
      ]
    },
    {
      type: 'rawlist',
      name: 'actionType',
      message: 'Select the action you want to take...',
      choices: [
        'Attack',
        'Defend'
      ]
    }
  ]);

  /* Compute all steps of the combat turn */
  const enemyAction = determineEnemyAction(Disatree_01.logic);
  const playerAdvantage = determinePlayerAdvantage(answer.reactionType, enemyAction.type);

  // Pseudocode for player result
  // 1) Determine if player decided to attack or defend
  // - If attack, determine if player has advantage
  // - If defend, determine if player has disadvantage
  // 2) Determine if player has advantage or disadvantage
  // - If advantage, determine if player has advantage over enemy
  // - If disadvantage, determine if player has disadvantage over enemy
  // 3) Determine if player has advantage or disadvantage
  // - If advantage, determine if player has advantage over enemy
  // - If disadvantage, determine if player has disadvantage over enemy
  // 4) Determine if player has advantage or disadvantage



  /* Log the player's full decision */
  console.log(`Player decided to ${answer.actionType} with his ${answer.reactionType}`);

  /* Wait 2 seconds to simulate enemy thinking */
  await new Promise(resolve => setTimeout(resolve, 2000));

  /* Log the enemy's decision */
  console.log(`Enemy decided to ${enemyAction.action} with his ${enemyAction.type}`);

  /* Log the advantage */
  console.log(`Player has the ${playerAdvantage}`);

}

main();
