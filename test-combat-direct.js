#!/usr/bin/env node

// Direct test of combat with Body and attack choices
const { Disatree_01 } = require('./dist/Enemy/enemy.library');
const { Player } = require('./dist/Character/characters.mock');
const { determineEnemyAction, determineAdvantage } = require('./dist/Combat/index');
const { createDieRoll } = require('./dist/Utils');
const { getEnemyRelatedStat } = require('./dist/Enemy');

async function runCombat() {
  console.log('Player:', JSON.stringify(Player, null, 2));
  console.log('Simulating combat as mocked player vs. mocked enemy...');

  // Hardcode the choices: Body and attack
  const answer = {
    reactionType: 'body',
    actionType: 'attack'
  };

  console.log(`\nPlayer selected: ${answer.reactionType} - ${answer.actionType}`);

  // Compute all steps of the combat turn
  const enemyAction = determineEnemyAction(Disatree_01.logic);
  const playerAdvantage = determineAdvantage(answer.reactionType, enemyAction.type);
  const enemyAdvantage = determineAdvantage(enemyAction.type, answer.reactionType);

  console.log(`Player decided to ${answer.actionType} with his ${answer.reactionType}`);

  // Player Chose to Attack
  if (answer.actionType === 'attack') {
    const playerDieRoll = createDieRoll(playerAdvantage);
    const playerRollModifier = Player.baseStats[answer.reactionType];
    const playerRollTotal = playerDieRoll() + playerRollModifier;

    // Enemy chose to Attack
    if (enemyAction.action === 'attack') {
      const enemyDieRoll = createDieRoll(enemyAdvantage);
      const enemyRollModifier = getEnemyRelatedStat(Disatree_01, enemyAction.type, false);
      const enemyRollTotal = enemyDieRoll() + enemyRollModifier;

      console.log('Player rolls a:', playerRollTotal);
      await new Promise(resolve => setTimeout(resolve, 1000));
      console.log('Enemy rolls a:', enemyRollTotal);
      await new Promise(resolve => setTimeout(resolve, 1000));

      if (playerRollTotal > enemyRollTotal) {
        console.log('Player wins the battle of wit!');
        await new Promise(resolve => setTimeout(resolve, 1000));
        const playersDamageRoll = playerDieRoll() + playerRollModifier;
        const enemyDefenseStat = getEnemyRelatedStat(Disatree_01, enemyAction.type, true);
        const playerDamage = playersDamageRoll - enemyDefenseStat;
        Disatree_01.health -= playerDamage;
        console.log(`Player rolls a ${playersDamageRoll} against the enemy's ${enemyDefenseStat} ${enemyAction.type} defense, dealing ${playerDamage} damage`);
      } else if (playerRollTotal < enemyRollTotal) {
        console.log('Enemy wins the attack!');
        await new Promise(resolve => setTimeout(resolve, 1000));
        const enemiesDamageRoll = enemyDieRoll() + enemyRollModifier;
        const playerDefenseStat = Player.baseStats[answer.reactionType];
        const enemyDamage = enemiesDamageRoll - playerDefenseStat;
        Player.health -= enemyDamage;
        console.log(`Enemy rolls a ${enemiesDamageRoll} against the player's ${playerDefenseStat} ${answer.reactionType} defense, dealing ${enemyDamage} damage`);
      } else {
        console.log("Your wit clashes with the enemy's wit, you both miss!");
      }
    } else if (enemyAction.action === 'defend') {
      const enemyDefenseStat = getEnemyRelatedStat(Disatree_01, enemyAction.type, true) * 1.5;
      const playersDamageRoll = playerDieRoll() + playerRollModifier;
      const playerDamage = playersDamageRoll - enemyDefenseStat;
      Disatree_01.health -= playerDamage;

      console.log('Player rolls a:', playerRollTotal);
      await new Promise(resolve => setTimeout(resolve, 1000));
      console.log(`Player rolls a ${playersDamageRoll} against the enemy's ${enemyDefenseStat} ${enemyAction.type} defense, dealing ${playerDamage} damage`);
    }
  }

  console.log('\n=== Combat Result ===');
  console.log(`Player Health: ${Player.health}/${Player.maxHealth}`);
  console.log(`Enemy Health: ${Disatree_01.health}`);
}

runCombat().catch(console.error);
