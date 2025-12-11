#!/usr/bin/env node

import inquirer from 'inquirer';

/* MOCKED DATA */
import { Disatree_01 } from '../Enemy/enemy.library';
import { Player } from '../Character/characters.mock';
import { determineEnemyAction, determinePlayerAdvantage } from './index';

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

  // Pseudocode for combat logic:
  // 1. Generate the enemy's action -- determineEnemyAction
  const enemyAction = determineEnemyAction(Disatree_01.logic);

  // 2. Determine the player's advantage -- determinePlayerAdvantage
  const playerAdvantage = determinePlayerAdvantage(answer.reactionType, enemyAction.type);

  console.log("Player's decision:", answer.reactionType);
  console.log("Enemy's decision:", enemyAction.type);
  console.log("Player has the ", playerAdvantage);

  console.log("--------------------------------");

  console.log("Player is going to ", answer.actionType);
  console.log("Enemy is going to ", enemyAction.action);

  console.log("--------------------------------");

  // 3. If Player attacks, determine player's roll based on advantage and action type
  // --> Use Player's stats and decision to determine bonus to roll
  console.log("Player's roll: ");

  // 4. If Enemy attacks, determine enemy's roll
  // --> Use Enemy's stats and decision to determine bonus to roll
  console.log("Enemy's roll: ")
}

main();
