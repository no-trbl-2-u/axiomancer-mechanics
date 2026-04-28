#!/usr/bin/env node

import inquirer from 'inquirer';
import { Character, BaseStats } from '../Character/types';
import {
    createCharacter,
    grantExperience,
    levelUp,
    allocateStatPoint,
    calculateExperienceToNextLevel,
    equipSkill,
    unequipSkill,
    learnSkill,
    getAvailableSkills,
    MAX_EQUIPPED_SKILLS,
} from '../Character/index';

function characterStatBlock(c: Character): string {
    return [
        `  ${c.name}  (Lv.${c.level})  XP ${c.experience}/${c.experienceToNextLevel}`,
        `  HP ${c.health}/${c.maxHealth}   MP ${c.mana}/${c.maxMana}`,
        `  Stats: heart ${c.baseStats.heart}  body ${c.baseStats.body}  mind ${c.baseStats.mind}`,
        `  Stat points: ${c.availableStatPoints ?? 0}`,
        `  Known skills: ${(c.knownSkills ?? []).length}     Equipped: ${(c.equippedSkills ?? []).join(', ') || '—'}`,
    ].join('\n');
}

async function manageProgression(c: Character): Promise<Character> {
    let working = c;
    while (true) {
        console.log('\n' + characterStatBlock(working));
        const { action } = await inquirer.prompt<{ action: string }>([{
            type: 'rawlist',
            name: 'action',
            message: 'Manage character...',
            choices: [
                { name: 'Grant XP', value: 'xp' },
                { name: 'Attempt level up', value: 'level' },
                { name: 'Allocate stat point', value: 'stat' },
                { name: 'Show available skills', value: 'available' },
                { name: 'Manage equipped skills', value: 'manage' },
                { name: 'Exit', value: 'exit' },
            ],
        }]);

        if (action === 'exit') return working;

        if (action === 'xp') {
            const { amount } = await inquirer.prompt<{ amount: number }>([{
                type: 'number',
                name: 'amount',
                message: 'How much XP?',
                default: 1000,
            }]);
            working = grantExperience(working, amount);
            console.log(`+${amount} XP. Now ${working.experience}/${working.experienceToNextLevel}.`);
        } else if (action === 'level') {
            let leveled = 0;
            while (working.experience >= calculateExperienceToNextLevel(working.level)) {
                working = levelUp(working);
                leveled++;
            }
            console.log(leveled > 0
                ? `Levelled up ${leveled}× — now ${working.level} with ${working.availableStatPoints ?? 0} stat points.`
                : 'Not enough XP to level up.');
        } else if (action === 'stat') {
            if ((working.availableStatPoints ?? 0) <= 0) {
                console.log('No stat points available.');
                continue;
            }
            const { stat } = await inquirer.prompt<{ stat: keyof BaseStats }>([{
                type: 'rawlist',
                name: 'stat',
                message: 'Allocate to which stat?',
                choices: [
                    { name: 'heart', value: 'heart' },
                    { name: 'body', value: 'body' },
                    { name: 'mind', value: 'mind' },
                ],
            }]);
            working = allocateStatPoint(working, stat);
            console.log(`+1 ${stat}. Now ${working.baseStats[stat]}.`);
        } else if (action === 'available') {
            type SkillLib = {
                skillLibrary: import('../Skills/types').Skill[];
                lookupSkill: (id: string) => import('../Skills/types').Skill | undefined;
            };
            let lib: SkillLib | null = null;
            try {
                // eslint-disable-next-line @typescript-eslint/no-require-imports
                lib = require('../Skills/skill.library') as SkillLib;
            } catch {
                lib = null;
            }
            if (!lib) {
                console.log('Skill library not available in this build.');
                continue;
            }
            const eligible = getAvailableSkills(working, lib.skillLibrary);
            if (eligible.length === 0) {
                console.log('No skills available to learn.');
            } else {
                console.log(`Eligible skills: ${eligible.map(s => s.name).join(', ')}`);
                const { learn } = await inquirer.prompt<{ learn: string }>([{
                    type: 'rawlist', name: 'learn', message: 'Learn which?',
                    choices: [...eligible.map(s => ({ name: s.name, value: s.id })), { name: '— skip —', value: '' }],
                }]);
                if (learn) {
                    const sk = lib.lookupSkill(learn);
                    if (sk) working = learnSkill(working, sk);
                }
            }
        } else if (action === 'manage') {
            const known = working.knownSkills ?? [];
            if (known.length === 0) {
                console.log('No skills known yet.');
                continue;
            }
            const { which } = await inquirer.prompt<{ which: string }>([{
                type: 'rawlist', name: 'which', message: `Manage equipped (max ${MAX_EQUIPPED_SKILLS})...`,
                choices: known.map(id => ({
                    name: `${(working.equippedSkills ?? []).includes(id) ? '★ ' : '  '}${id}`,
                    value: id,
                })),
            }]);
            working = (working.equippedSkills ?? []).includes(which)
                ? unequipSkill(working, which)
                : equipSkill(working, which);
        }
    }
}

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

    let ResultingCharacter: Character = createCharacter({
        name: answer.name,
        level: answer.level,
        baseStats: {
            heart: answer.heart,
            body: answer.body,
            mind: answer.mind,
        },
    })

    console.log('\n' + characterStatBlock(ResultingCharacter));

    const { proceed } = await inquirer.prompt<{ proceed: boolean }>([{
        type: 'confirm', name: 'proceed', message: 'Manage progression now?', default: true,
    }]);

    if (proceed) {
        ResultingCharacter = await manageProgression(ResultingCharacter);
    }

    console.log("\nFinal character:", JSON.stringify(ResultingCharacter, null, 2));
}

main();
