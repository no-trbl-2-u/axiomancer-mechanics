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
            validate: (input: string) => {
                const trimmed = input.trim();
                if (trimmed.length === 0) {
                    return 'Name cannot be empty';
                }
                if (trimmed.length > 50) {
                    return 'Name must be 50 characters or less';
                }
                return true;
            }
        },
        {
            type: 'number',
            name: 'level',
            message: 'Enter the level of your character (1-100)...',
            default: 1,
            validate: (input: number) => {
                if (!Number.isInteger(input) || input < 1 || input > 100) {
                    return 'Level must be an integer between 1 and 100';
                }
                return true;
            }
        },
        {
            type: 'number',
            name: 'heart',
            message: 'Enter the heart stat of your character (1-20)...',
            default: 1,
            validate: (input: number) => {
                if (!Number.isInteger(input) || input < 1 || input > 20) {
                    return 'Heart must be an integer between 1 and 20';
                }
                return true;
            }
        },
        {
            type: 'number',
            name: 'body',
            message: 'Enter the body stat of your character (1-20)...',
            default: 1,
            validate: (input: number) => {
                if (!Number.isInteger(input) || input < 1 || input > 20) {
                    return 'Body must be an integer between 1 and 20';
                }
                return true;
            }
        },
        {
            type: 'number',
            name: 'mind',
            message: 'Enter the mind stat of your character (1-20)...',
            default: 1,
            validate: (input: number) => {
                if (!Number.isInteger(input) || input < 1 || input > 20) {
                    return 'Mind must be an integer between 1 and 20';
                }
                return true;
            }
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
