#!/usr/bin/env node

import inquirer from 'inquirer';

async function main() {
  console.log('Simulating combat...');

  /* Questions to ask the user */
  const answer = await inquirer.prompt<{
    reactionType: 'heart' | 'body' | 'mind';
    actionType: 'attack' | 'defend';
  }>([
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

  console.log(`You have chosen to respond with your ${answer.reactionType} and ${answer.actionType}.`);


}

main();
