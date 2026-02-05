#!/usr/bin/env node

/**
 * Library Editor CLI
 *
 * An interactive questionnaire tool for adding new entries to the game's
 * data libraries:
 * - Skills (fallacies and paradoxes)
 * - Effects (buffs and debuffs)
 *
 * Entries are saved to their respective JSON/TS library files.
 *
 * Usage: npm run library:editor
 */

import inquirer from 'inquirer';
import fs from 'fs';
import path from 'path';
import {
    LIBRARY_ART,
    divider,
    boxHeader,
    bold,
    dim,
    red,
    green,
    yellow,
    blue,
    cyan,
    gray,
    magenta,
    boldGreen,
    boldCyan,
    clearScreen,
} from './display';

// ============================================================================
// PATHS
// ============================================================================

const BUFFS_PATH = path.resolve(__dirname, '../Effects/buffs.library.json');
const DEBUFFS_PATH = path.resolve(__dirname, '../Effects/debuffs.library.json');
const SKILLS_PATH = path.resolve(__dirname, '../Skills/skill.library.ts');

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function readJsonFile<T>(filePath: string): T {
    const raw = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(raw);
}

function writeJsonFile<T>(filePath: string, data: T): void {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n');
}

function generateId(prefix: string, name: string): string {
    return `${prefix}_${name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/_+$/, '')}`;
}

// ============================================================================
// SKILL CREATION QUESTIONNAIRE
// ============================================================================

async function createSkillQuestionnaire(): Promise<void> {
    console.log('');
    console.log(boxHeader('CREATE NEW SKILL'));
    console.log('');
    console.log(dim('  Skills in Axiomancer are named after logical fallacies and paradoxes.'));
    console.log(dim('  They align with one of the three aspects: Heart, Body, or Mind.'));
    console.log('');

    const answers = await inquirer.prompt<{
        name: string;
        category: 'fallacy' | 'paradox';
        philosophicalAspect: 'heart' | 'body' | 'mind';
        description: string;
        level: number;
        manaCost: number;
        hasLearningReq: boolean;
        reqLevel?: number;
        reqStatType?: 'heart' | 'body' | 'mind';
        reqStatValue?: number;
        prerequisiteSkill?: string;
        damageCalculation?: string;
        effect?: string;
    }>([
        {
            type: 'input',
            name: 'name',
            message: `${cyan('Skill name')} (e.g., "Ad Hominem Strike"):`,
            validate: (input: string) => input.trim().length > 0 || 'Name cannot be empty',
        },
        {
            type: 'list',
            name: 'category',
            message: `${yellow('Category')}:`,
            choices: [
                { name: `Fallacy ${dim('- Based on a logical fallacy')}`, value: 'fallacy' },
                { name: `Paradox ${dim('- Based on a philosophical paradox')}`, value: 'paradox' },
            ],
        },
        {
            type: 'list',
            name: 'philosophicalAspect',
            message: `${magenta('Philosophical Aspect')} (which stat it scales with):`,
            choices: [
                { name: `${red('Heart')}  ${dim('- Emotion, willpower, charisma')}`, value: 'heart' },
                { name: `${yellow('Body')}   ${dim('- Physical strength, constitution')}`, value: 'body' },
                { name: `${cyan('Mind')}   ${dim('- Intelligence, reflexes, perception')}`, value: 'mind' },
            ],
        },
        {
            type: 'input',
            name: 'description',
            message: `${green('Description')} (flavor text):`,
            validate: (input: string) => input.trim().length > 0 || 'Description cannot be empty',
        },
        {
            type: 'number',
            name: 'level',
            message: `${cyan('Skill level')} (power tier, 1-10):`,
            default: 1,
            validate: (input: number) => {
                if (!Number.isInteger(input) || input < 1 || input > 10) {
                    return 'Level must be between 1 and 10';
                }
                return true;
            },
        },
        {
            type: 'number',
            name: 'manaCost',
            message: `${blue('Mana cost')} (1-100):`,
            default: 10,
            validate: (input: number) => {
                if (!Number.isInteger(input) || input < 1 || input > 100) {
                    return 'Mana cost must be between 1 and 100';
                }
                return true;
            },
        },
        {
            type: 'input',
            name: 'damageCalculation',
            message: `${yellow('Damage formula')} ${dim('(optional, e.g., "2d6 + mind")')}:`,
            default: '',
        },
        {
            type: 'input',
            name: 'effect',
            message: `${magenta('Effect')} ${dim('(optional, e.g., "apply_burn_3_rounds")')}:`,
            default: '',
        },
        {
            type: 'confirm',
            name: 'hasLearningReq',
            message: 'Does this skill have learning requirements?',
            default: false,
        },
        {
            type: 'number',
            name: 'reqLevel',
            message: `  ${gray('>')} Minimum character level to learn:`,
            default: 1,
            when: (answers: { hasLearningReq: boolean }) => answers.hasLearningReq,
            validate: (input: number) => {
                if (!Number.isInteger(input) || input < 1 || input > 100) {
                    return 'Level must be between 1 and 100';
                }
                return true;
            },
        },
        {
            type: 'list',
            name: 'reqStatType',
            message: `  ${gray('>')} Required stat type:`,
            choices: [
                { name: 'None', value: undefined },
                { name: 'Heart', value: 'heart' },
                { name: 'Body', value: 'body' },
                { name: 'Mind', value: 'mind' },
            ],
            when: (answers: { hasLearningReq: boolean }) => answers.hasLearningReq,
        },
        {
            type: 'number',
            name: 'reqStatValue',
            message: `  ${gray('>')} Required stat minimum value:`,
            default: 5,
            when: (answers: { hasLearningReq: boolean; reqStatType?: string }) =>
                answers.hasLearningReq && !!answers.reqStatType,
            validate: (input: number) => {
                if (!Number.isInteger(input) || input < 1 || input > 20) {
                    return 'Value must be between 1 and 20';
                }
                return true;
            },
        },
        {
            type: 'input',
            name: 'prerequisiteSkill',
            message: `  ${gray('>')} Prerequisite skill ID ${dim('(leave empty for none)')}:`,
            default: '',
            when: (answers: { hasLearningReq: boolean }) => answers.hasLearningReq,
        },
    ]);

    // Build the skill object
    const skillId = generateId('skill', answers.name);
    const skill: Record<string, unknown> = {
        id: skillId,
        name: answers.name.trim(),
        category: answers.category,
        philosophicalAspect: answers.philosophicalAspect,
        description: answers.description.trim(),
        level: answers.level,
        manaCost: answers.manaCost,
    };

    if (answers.damageCalculation && answers.damageCalculation.trim()) {
        skill.damageCalculation = answers.damageCalculation.trim();
    }
    if (answers.effect && answers.effect.trim()) {
        skill.effect = answers.effect.trim();
    }
    if (answers.hasLearningReq) {
        const learningReq: Record<string, unknown> = {
            level: answers.reqLevel ?? 1,
        };
        if (answers.reqStatType) {
            learningReq.statRequirementType = answers.reqStatType;
            learningReq.statRequirementValue = answers.reqStatValue;
        }
        if (answers.prerequisiteSkill && answers.prerequisiteSkill.trim()) {
            learningReq.prerequisiteSkill = answers.prerequisiteSkill.trim();
        }
        skill.learningRequirement = learningReq;
    }

    // Preview
    console.log('');
    console.log(divider());
    console.log(boldCyan('  SKILL PREVIEW'));
    console.log(divider());
    console.log(JSON.stringify(skill, null, 2));
    console.log(divider());

    const { confirm } = await inquirer.prompt<{ confirm: boolean }>([
        {
            type: 'confirm',
            name: 'confirm',
            message: 'Save this skill to the library?',
            default: true,
        },
    ]);

    if (confirm) {
        appendSkillToLibrary(skill);
        console.log(boldGreen(`  Skill "${answers.name}" saved to skill.library.ts!`));
    } else {
        console.log(yellow('  Skill creation cancelled.'));
    }
}

function appendSkillToLibrary(skill: Record<string, unknown>): void {
    const currentContent = fs.readFileSync(SKILLS_PATH, 'utf-8');
    const exportLine = `\nexport const ${String(skill.id).replace(/[^a-zA-Z0-9_]/g, '_')}: Skill = ${JSON.stringify(skill, null, 4)};\n`;

    // If the file only has the TODO comment, replace it
    if (currentContent.trim() === '// TODO: Add Skill Library') {
        const newContent = `import { Skill } from './types';\n${exportLine}`;
        fs.writeFileSync(SKILLS_PATH, newContent);
    } else {
        // Check if import exists
        let content = currentContent;
        if (!content.includes("import { Skill }")) {
            content = `import { Skill } from './types';\n\n${content}`;
        }
        content += exportLine;
        fs.writeFileSync(SKILLS_PATH, content);
    }
}

// ============================================================================
// EFFECT (BUFF/DEBUFF) CREATION QUESTIONNAIRE
// ============================================================================

async function createEffectQuestionnaire(): Promise<void> {
    console.log('');
    console.log(boxHeader('CREATE NEW EFFECT'));
    console.log('');
    console.log(dim('  Effects are named after paradoxes and philosophical concepts.'));
    console.log(dim('  Buffs enhance, debuffs hinder. They modify stats, deal DoT, restrict actions, etc.'));
    console.log('');

    // Step 1: Basic info
    const basicInfo = await inquirer.prompt<{
        name: string;
        type: 'buff' | 'debuff';
        category: string;
        description: string;
        duration: number;
        stacking: string;
    }>([
        {
            type: 'input',
            name: 'name',
            message: `${cyan('Effect name')} (e.g., "Achilles' Momentum"):`,
            validate: (input: string) => input.trim().length > 0 || 'Name cannot be empty',
        },
        {
            type: 'list',
            name: 'type',
            message: `${yellow('Effect type')}:`,
            choices: [
                { name: `${green('Buff')}   ${dim('- Positive, enhances capabilities')}`, value: 'buff' },
                { name: `${red('Debuff')} ${dim('- Negative, hinders target')}`, value: 'debuff' },
            ],
        },
        {
            type: 'list',
            name: 'category',
            message: `${magenta('Category')}:`,
            choices: [
                { name: `stat          ${dim('- Modifies base or derived stats')}`, value: 'stat' },
                { name: `damage        ${dim('- Deals or modifies damage (DoT)')}`, value: 'damage' },
                { name: `defense       ${dim('- Modifies defensive capabilities')}`, value: 'defense' },
                { name: `control       ${dim('- Restricts actions or forces behavior')}`, value: 'control' },
                { name: `regeneration  ${dim('- Restores health or mana over time')}`, value: 'regeneration' },
                { name: `advantage     ${dim('- Grants or removes combat advantage')}`, value: 'advantage' },
            ],
        },
        {
            type: 'input',
            name: 'description',
            message: `${green('Description')} (paradox-themed flavor text):`,
            validate: (input: string) => input.trim().length > 0 || 'Description cannot be empty',
        },
        {
            type: 'number',
            name: 'duration',
            message: `${cyan('Duration')} in rounds (0=instant, -1=permanent):`,
            default: 3,
            validate: (input: number) => {
                if (!Number.isInteger(input) || input < -1 || input > 20) {
                    return 'Duration must be between -1 and 20';
                }
                return true;
            },
        },
        {
            type: 'list',
            name: 'stacking',
            message: `${yellow('Stacking behavior')}:`,
            choices: [
                { name: `none      ${dim('- Only strongest instance applies')}`, value: 'none' },
                { name: `intensity ${dim('- Stack count increases power')}`, value: 'intensity' },
                { name: `duration  ${dim('- Reset or extend duration')}`, value: 'duration' },
            ],
        },
    ]);

    // Step 2: Payload modifiers
    const payloadChoices = await inquirer.prompt<{
        payloadTypes: string[];
    }>([
        {
            type: 'checkbox',
            name: 'payloadTypes',
            message: `Select ${bold('payload components')} for this effect:`,
            choices: [
                { name: 'Stat Modifiers (change stat values)', value: 'statModifiers' },
                { name: 'Damage Over Time (periodic damage)', value: 'damageOverTime' },
                { name: 'Regeneration (heal HP/MP per round)', value: 'regeneration' },
                { name: 'Action Restriction (limit actions)', value: 'actionRestriction' },
                { name: 'Advantage Modifier (grant/remove advantage)', value: 'advantageModifier' },
                { name: 'Roll Modifier (flat bonus/penalty to rolls)', value: 'rollModifier' },
                { name: 'Defense Modifier (flat bonus/penalty to defense)', value: 'defenseModifier' },
            ],
        },
    ]);

    const payload: Record<string, unknown> = {};

    // Stat Modifiers
    if (payloadChoices.payloadTypes.includes('statModifiers')) {
        const statMods = await collectStatModifiers();
        if (statMods.length > 0) {
            payload.statModifiers = statMods;
        }
    }

    // Damage Over Time
    if (payloadChoices.payloadTypes.includes('damageOverTime')) {
        const dot = await inquirer.prompt<{
            damagePerRound: number;
            damageType: string;
        }>([
            {
                type: 'number',
                name: 'damagePerRound',
                message: `  ${red('DoT damage per round')}:`,
                default: 3,
                validate: (input: number) => Number.isInteger(input) && input >= 1 || 'Must be >= 1',
            },
            {
                type: 'list',
                name: 'damageType',
                message: `  ${yellow('Damage type')}:`,
                choices: ['body', 'mind', 'heart'],
            },
        ]);
        payload.damageOverTime = dot;
    }

    // Regeneration
    if (payloadChoices.payloadTypes.includes('regeneration')) {
        const regen = await inquirer.prompt<{
            healthPerRound: number;
            manaPerRound: number;
        }>([
            {
                type: 'number',
                name: 'healthPerRound',
                message: `  ${green('Health per round')} (negative for drain):`,
                default: 3,
            },
            {
                type: 'number',
                name: 'manaPerRound',
                message: `  ${blue('Mana per round')} (0 for none):`,
                default: 0,
            },
        ]);
        const regenConfig: Record<string, number> = {};
        if (regen.healthPerRound !== 0) regenConfig.healthPerRound = regen.healthPerRound;
        if (regen.manaPerRound !== 0) regenConfig.manaPerRound = regen.manaPerRound;
        if (Object.keys(regenConfig).length > 0) {
            payload.regeneration = regenConfig;
        }
    }

    // Action Restriction
    if (payloadChoices.payloadTypes.includes('actionRestriction')) {
        const restriction = await inquirer.prompt<{
            skipTurn: boolean;
            forcedActionType?: string;
            blockedActionTypes?: string[];
        }>([
            {
                type: 'confirm',
                name: 'skipTurn',
                message: `  Skip turn entirely?`,
                default: false,
            },
            {
                type: 'list',
                name: 'forcedActionType',
                message: `  Force action type:`,
                choices: [
                    { name: 'None', value: '' },
                    { name: 'Heart', value: 'heart' },
                    { name: 'Body', value: 'body' },
                    { name: 'Mind', value: 'mind' },
                ],
                when: (answers: { skipTurn: boolean }) => !answers.skipTurn,
            },
            {
                type: 'checkbox',
                name: 'blockedActionTypes',
                message: `  Blocked action types:`,
                choices: ['heart', 'body', 'mind'],
                when: (answers: { skipTurn: boolean }) => !answers.skipTurn,
            },
        ]);
        const actionRestriction: Record<string, unknown> = {};
        if (restriction.skipTurn) actionRestriction.skipTurn = true;
        if (restriction.forcedActionType) actionRestriction.forcedActionType = restriction.forcedActionType;
        if (restriction.blockedActionTypes && restriction.blockedActionTypes.length > 0) {
            actionRestriction.blockedActionTypes = restriction.blockedActionTypes;
        }
        if (Object.keys(actionRestriction).length > 0) {
            payload.actionRestriction = actionRestriction;
        }
    }

    // Advantage Modifier
    if (payloadChoices.payloadTypes.includes('advantageModifier')) {
        const advMod = await inquirer.prompt<{
            grantAdvantage?: string[];
            grantDisadvantage?: string[];
        }>([
            {
                type: 'checkbox',
                name: 'grantAdvantage',
                message: `  ${green('Grant advantage')} on types:`,
                choices: ['body', 'mind', 'heart'],
            },
            {
                type: 'checkbox',
                name: 'grantDisadvantage',
                message: `  ${red('Grant disadvantage')} on types:`,
                choices: ['body', 'mind', 'heart'],
            },
        ]);
        const advantageModifier: Record<string, string[]> = {};
        if (advMod.grantAdvantage && advMod.grantAdvantage.length > 0) {
            advantageModifier.grantAdvantage = advMod.grantAdvantage;
        }
        if (advMod.grantDisadvantage && advMod.grantDisadvantage.length > 0) {
            advantageModifier.grantDisadvantage = advMod.grantDisadvantage;
        }
        if (Object.keys(advantageModifier).length > 0) {
            payload.advantageModifier = advantageModifier;
        }
    }

    // Roll Modifier
    if (payloadChoices.payloadTypes.includes('rollModifier')) {
        const { rollModifier } = await inquirer.prompt<{ rollModifier: number }>([
            {
                type: 'number',
                name: 'rollModifier',
                message: `  ${cyan('Roll modifier')} (positive = bonus, negative = penalty):`,
                default: 2,
            },
        ]);
        if (rollModifier !== 0) payload.rollModifier = rollModifier;
    }

    // Defense Modifier
    if (payloadChoices.payloadTypes.includes('defenseModifier')) {
        const { defenseModifier } = await inquirer.prompt<{ defenseModifier: number }>([
            {
                type: 'number',
                name: 'defenseModifier',
                message: `  ${yellow('Defense modifier')} (positive = bonus, negative = penalty):`,
                default: 2,
            },
        ]);
        if (defenseModifier !== 0) payload.defenseModifier = defenseModifier;
    }

    // Build the effect
    const effectId = generateId(basicInfo.type, basicInfo.name);
    const effect = {
        id: effectId,
        name: basicInfo.name.trim(),
        description: basicInfo.description.trim(),
        type: basicInfo.type,
        category: basicInfo.category,
        duration: basicInfo.duration,
        stacking: basicInfo.stacking,
        payload,
    };

    // Preview
    console.log('');
    console.log(divider());
    console.log(boldCyan('  EFFECT PREVIEW'));
    console.log(divider());
    console.log(JSON.stringify(effect, null, 2));
    console.log(divider());

    const { confirm } = await inquirer.prompt<{ confirm: boolean }>([
        {
            type: 'confirm',
            name: 'confirm',
            message: 'Save this effect to the library?',
            default: true,
        },
    ]);

    if (confirm) {
        saveEffect(effect);
        const targetFile = basicInfo.type === 'buff' ? 'buffs.library.json' : 'debuffs.library.json';
        console.log(boldGreen(`  Effect "${basicInfo.name}" saved to ${targetFile}!`));
    } else {
        console.log(yellow('  Effect creation cancelled.'));
    }
}

async function collectStatModifiers(): Promise<Array<{ stat: string; value: number; isMultiplier?: boolean }>> {
    const modifiers: Array<{ stat: string; value: number; isMultiplier?: boolean }> = [];
    let addMore = true;

    const statOptions = [
        'body', 'mind', 'heart',
        'physicalSkill', 'physicalDefense', 'physicalSave', 'physicalTest',
        'mentalSkill', 'mentalDefense', 'mentalSave', 'mentalTest',
        'emotionalSkill', 'emotionalDefense', 'emotionalSave', 'emotionalTest',
        'luck',
    ];

    while (addMore) {
        const mod = await inquirer.prompt<{
            stat: string;
            value: number;
            isMultiplier: boolean;
        }>([
            {
                type: 'list',
                name: 'stat',
                message: `  ${cyan('Target stat')}:`,
                choices: statOptions,
            },
            {
                type: 'number',
                name: 'value',
                message: `  ${yellow('Value')} (positive = buff, negative = debuff; for multiplier, e.g. 1.5):`,
                default: 2,
            },
            {
                type: 'confirm',
                name: 'isMultiplier',
                message: `  Is this a multiplier? ${dim('(false = flat additive)')}`,
                default: false,
            },
        ]);

        const modifier: { stat: string; value: number; isMultiplier?: boolean } = {
            stat: mod.stat,
            value: mod.value,
        };
        if (mod.isMultiplier) modifier.isMultiplier = true;
        modifiers.push(modifier);

        const { more } = await inquirer.prompt<{ more: boolean }>([
            {
                type: 'confirm',
                name: 'more',
                message: '  Add another stat modifier?',
                default: false,
            },
        ]);
        addMore = more;
    }

    return modifiers;
}

function saveEffect(effect: Record<string, unknown>): void {
    const isBuffType = effect.type === 'buff';
    const filePath = isBuffType ? BUFFS_PATH : DEBUFFS_PATH;
    const key = isBuffType ? 'buffs' : 'debuffs';

    let data: Record<string, unknown[]>;
    try {
        data = readJsonFile<Record<string, unknown[]>>(filePath);
    } catch {
        data = { [key]: [] };
    }

    if (!Array.isArray(data[key])) {
        data[key] = [];
    }

    data[key].push(effect);
    writeJsonFile(filePath, data);
}

// ============================================================================
// BROWSE LIBRARY
// ============================================================================

async function browseLibrary(): Promise<void> {
    console.log('');
    console.log(boxHeader('BROWSE LIBRARY'));
    console.log('');

    const { libraryType } = await inquirer.prompt<{ libraryType: string }>([
        {
            type: 'list',
            name: 'libraryType',
            message: 'Which library would you like to browse?',
            choices: [
                { name: `${green('Buffs')}   ${dim(`(${BUFFS_PATH})`)}`, value: 'buffs' },
                { name: `${red('Debuffs')} ${dim(`(${DEBUFFS_PATH})`)}`, value: 'debuffs' },
                { name: `${cyan('Skills')}  ${dim(`(${SKILLS_PATH})`)}`, value: 'skills' },
            ],
        },
    ]);

    if (libraryType === 'buffs') {
        try {
            const data = readJsonFile<{ buffs: Array<{ id: string; name: string; description: string; type: string; category: string; duration: number }> }>(BUFFS_PATH);
            console.log('');
            console.log(boldGreen(`  Found ${data.buffs.length} buffs:`));
            console.log(divider());
            for (const buff of data.buffs) {
                console.log(`  ${green(buff.name)} ${gray(`[${buff.id}]`)} ${dim(`${buff.category} | ${buff.duration} rounds`)}`);
                console.log(`    ${dim(buff.description.substring(0, 80))}${buff.description.length > 80 ? dim('...') : ''}`);
            }
        } catch {
            console.log(yellow('  No buffs found or file does not exist.'));
        }
    } else if (libraryType === 'debuffs') {
        try {
            const data = readJsonFile<{ debuffs: Array<{ id: string; name: string; description: string; type: string; category: string; duration: number }> }>(DEBUFFS_PATH);
            console.log('');
            console.log(boldGreen(`  Found ${data.debuffs.length} debuffs:`));
            console.log(divider());
            for (const debuff of data.debuffs) {
                console.log(`  ${red(debuff.name)} ${gray(`[${debuff.id}]`)} ${dim(`${debuff.category} | ${debuff.duration} rounds`)}`);
                console.log(`    ${dim(debuff.description.substring(0, 80))}${debuff.description.length > 80 ? dim('...') : ''}`);
            }
        } catch {
            console.log(yellow('  No debuffs found or file does not exist.'));
        }
    } else if (libraryType === 'skills') {
        try {
            const content = fs.readFileSync(SKILLS_PATH, 'utf-8');
            if (content.trim() === '// TODO: Add Skill Library') {
                console.log(yellow('  No skills in the library yet. Create one!'));
            } else {
                console.log('');
                console.log(boldCyan('  Skills Library Contents:'));
                console.log(divider());
                console.log(dim(content));
            }
        } catch {
            console.log(yellow('  Skills file not found.'));
        }
    }

    console.log('');
    console.log(divider());
}

// ============================================================================
// MAIN MENU
// ============================================================================

async function mainMenu(): Promise<string> {
    const { action } = await inquirer.prompt<{ action: string }>([
        {
            type: 'list',
            name: 'action',
            message: 'What would you like to do?',
            choices: [
                { name: `${cyan('Create a new Skill')}   ${dim('- Add a fallacy/paradox skill')}`, value: 'skill' },
                { name: `${green('Create a new Effect')}  ${dim('- Add a buff or debuff')}`, value: 'effect' },
                { name: `${magenta('Browse Libraries')}    ${dim('- View existing entries')}`, value: 'browse' },
                new inquirer.Separator(),
                { name: `${gray('Exit')}`, value: 'exit' },
            ],
        },
    ]);

    return action;
}

// ============================================================================
// MAIN
// ============================================================================

async function main(): Promise<void> {
    clearScreen();
    console.log(LIBRARY_ART);
    console.log(boxHeader('LIBRARY EDITOR'));
    console.log('');
    console.log(dim('  Add skills and effects to the Axiomancer game libraries.'));
    console.log(dim('  Skills are named after logical fallacies and paradoxes.'));
    console.log(dim('  Effects (buffs/debuffs) are themed around philosophical concepts.'));
    console.log('');
    console.log(divider());

    let running = true;

    while (running) {
        const action = await mainMenu();

        switch (action) {
            case 'skill':
                await createSkillQuestionnaire();
                break;
            case 'effect':
                await createEffectQuestionnaire();
                break;
            case 'browse':
                await browseLibrary();
                break;
            case 'exit':
                running = false;
                break;
        }
    }

    console.log('');
    console.log(dim('  Thanks for using the Library Editor!'));
    console.log('');
}

main().catch(console.error);
