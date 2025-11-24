#!/usr/bin/env node

import inquirer from 'inquirer';
import { Character } from './types';
import { createCharacter } from './index';

async function main() {
    console.log('Simulating character creation...');

    /* Questions to ask the user */
    const answer = await inquirer.prompt<{
        name: string;
        level: number;
        heart: number;
        body: number;
        mind: number;
    }>([
        {
            type: 'input',
            name: 'name',
            message: 'Enter the name of your character...',
        },
        {
            type: 'input',
            name: 'level',
            message: 'Enter the level of your character...',
        },
        {
            type: 'input',
            name: 'heart',
            message: 'Enter the heart stat of your character...',
        },
        {
            type: 'input',
            name: 'body',
            message: 'Enter the body stat of your character...',
        },
        {
            type: 'input',
            name: 'mind',
            message: 'Enter the mind stat of your character...',
        }
    ]);

    const ResultingCharacter: Character = createCharacter({
        name: answer.name,
        level: answer.level,
        baseStats: {
            heart: answer.heart,
            body: answer.body,
            mind: answer.mind,
        },
    })

    console.log("Here is your character:", JSON.stringify(ResultingCharacter, null, 2));

}

main();
