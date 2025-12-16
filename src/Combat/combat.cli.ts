#!/usr/bin/env node

import inquirer from 'inquirer';

/* MOCKED DATA */
import { Disatree_01 } from '../Enemy/enemy.library';
import { Player } from '../Character/characters.mock';
import { BaseStats } from '../Character/types';
import { determineEnemyAction, determineAdvantage } from './index';
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
    const playerRollTotal = playerDieRoll() + playerRollModifier;

    /* Enemy chose to Attack */
    if (enemyAction.action === 'attack') {
      /* Calculate the enemy's roll */
      const enemyDieRoll = createDieRoll(enemyAdvantage);
      const enemyRollModifier = getEnemyRelatedStat(Disatree_01, enemyAction.type, false);
      const enemyRollTotal = enemyDieRoll() + enemyRollModifier;

      /* Log the player's roll, wait, then log the enemy's roll */
      console.log('Player rolls a: ', playerRollTotal);
      await new Promise(resolve => setTimeout(resolve, 2000));
      console.log('Enemy rolls a: ', enemyRollTotal);
      await new Promise(resolve => setTimeout(resolve, 2000));

      /* Both player and enemy roll for attack */
      if (playerRollTotal > enemyRollTotal) {
        /* Player wins the attack */
        console.log('Player wins the battle of wit!');
        await new Promise(resolve => setTimeout(resolve, 2000));
        // Roll the player's damage
        const playersDamageRoll = playerDieRoll() + playerRollModifier;
        const enemyDefenseStat = getEnemyRelatedStat(Disatree_01, enemyAction.type, true);
        const playerDamage = playersDamageRoll - enemyDefenseStat;
        Disatree_01.health -= playerDamage;
        console.log(`Player rolls a ${playersDamageRoll} against the enemy's ${enemyDefenseStat} ${enemyAction.type} defense, dealing ${playerDamage} damage`);
      } else if (playerRollTotal < enemyRollTotal) {
        /* Enemy wins the attack */
        /* Roll the enemy's damage
         * determine the player's defense stat
         * calculate the damage
         * apply the damage to the player
         */
        console.log('Enemy wins the attack!');
        await new Promise(resolve => setTimeout(resolve, 2000));
        const enemiesDamageRoll = enemyDieRoll() + enemyRollModifier;
        const playerDefenseStat = Player.baseStats[answer.reactionType as keyof BaseStats];
        const enemyDamage = enemiesDamageRoll - playerDefenseStat;
        Player.health -= enemyDamage;
        console.log(`Enemy rolls a ${enemiesDamageRoll} against the player's ${playerDefenseStat} ${answer.reactionType} defense, dealing ${enemyDamage} damage`);
      } else {
        /* It's a tie */
        console.log("Your wit clashes with the enemy's wit, you both miss!");
      }


      /* Enemy chose to Defend */
    } else if (enemyAction.action === 'defend') {
      /* Calculate the enemy's defense stat */
      const enemyDefenseStat = getEnemyRelatedStat(Disatree_01, enemyAction.type, true) * 1.5;

      /* Determine the player's damage roll */
      const playersDamageRoll = playerDieRoll() + playerRollModifier;

      /* Calculate how much damage the player deals */
      const playerDamage = playersDamageRoll - enemyDefenseStat;

      /* Apply the damage to the enemy */
      Disatree_01.health -= playerDamage;

      /* Log the player's roll, wait, then log the enemy's roll and damage */
      console.log('Player rolls a: ', playerRollTotal);
      await new Promise(resolve => setTimeout(resolve, 2000));
      console.log(`Player rolls a ${playersDamageRoll} against the enemy's ${enemyDefenseStat} ${enemyAction.type} defense, dealing ${playerDamage} damage`);
    }
    // TODO: Calculate the player's damage if enemy chose defend
  } else if (answer.actionType === 'defend') {
    /* Enemy chose to Attack */
    if (enemyAction.action === 'attack') {
      /* Calculate the enemy's roll */
      const enemyDieRoll = createDieRoll(enemyAdvantage);
      const enemyRollModifier = getEnemyRelatedStat(Disatree_01, enemyAction.type, false);
      const enemyRollTotal = enemyDieRoll() + enemyRollModifier;

      /* Calculate the player's defense stat */
      const playerDefenseStat = Player.baseStats[answer.reactionType as keyof BaseStats] * 1.5;

      /* Determine the enemy's damage roll */
      const enemiesDamageRoll = enemyDieRoll() + enemyRollModifier;
      const enemyDamage = enemiesDamageRoll - playerDefenseStat;

      /* Apply the damage to the player */
      Player.health -= enemyDamage;

      /* Log the enemy's roll, wait, then log the player's roll and damage */
      console.log('Enemy rolls a: ', enemyRollTotal);
      await new Promise(resolve => setTimeout(resolve, 2000));
      console.log(`Enemy rolls a ${enemiesDamageRoll} against the player's ${playerDefenseStat} ${answer.reactionType} defense, dealing ${enemyDamage} damage`);
    }
    /* Both Enemy and Player chose to Defend */
    else if (enemyAction.action === 'defend') {
      /* SIMULATE friendship counter system */
      friendshipCounter++;
      await new Promise(resolve => setTimeout(resolve, 2000));
      console.log(`The player feels closer to the enemy and feel as if the enemy may become less of an enemy and more of a friend. Friendship counter: ${friendshipCounter}`);
    }
  }
}

// TODO: Figure out a way to loop the combat turn until one of the characters is defeated
// --> Will likely need to create an external state in order for this to track
main();
