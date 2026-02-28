/**
 * Combat Display Helpers
 *
 * All console output for the combat CLI lives here — zero game logic.
 * Each function receives plain data and prints it; nothing is calculated here.
 */

import { ActionType, Advantage, CombatState } from './types';
import {
    DEFENSE_MULTIPLIERS,
    FRIENDSHIP_COUNTER_MAX,
} from '../Game/game-mechanics.constants';

// ─── ANSI Colour Helpers ──────────────────────────────────────────────────────

export const C = {
    reset:        '\x1b[0m',
    bold:         '\x1b[1m',
    dim:          '\x1b[2m',
    red:          '\x1b[31m',
    green:        '\x1b[32m',
    yellow:       '\x1b[33m',
    blue:         '\x1b[34m',
    cyan:         '\x1b[36m',
    white:        '\x1b[37m',
    brightRed:    '\x1b[91m',
    brightGreen:  '\x1b[92m',
    brightYellow: '\x1b[93m',
    brightBlue:   '\x1b[94m',
    brightCyan:   '\x1b[96m',
    brightWhite:  '\x1b[97m',
} as const;

/** Colour a type label: heart=red, body=green, mind=blue */
export function typeColor(type: string, text?: string): string {
    const label = text ?? type.toUpperCase();
    switch (type) {
        case 'heart': return `${C.brightRed}${label}${C.reset}`;
        case 'body':  return `${C.brightGreen}${label}${C.reset}`;
        case 'mind':  return `${C.brightBlue}${label}${C.reset}`;
        default:      return label;
    }
}

// ─── Layout Helpers ───────────────────────────────────────────────────────────

export const HR_MAJOR = `${C.dim}${'═'.repeat(50)}${C.reset}`;
export const HR_MINOR = `${C.dim}${'─'.repeat(50)}${C.reset}`;

export function sectionHeader(title: string): string {
    return `\n${C.bold}${C.cyan}┌─ ${title} ${C.dim}${'─'.repeat(Math.max(0, 46 - title.length))}${C.reset}`;
}

/** Renders an ASCII HP bar (filled = █, empty = ░). */
export function hpBar(current: number, max: number, width = 20): string {
    const clamped = Math.max(0, current);
    const filled  = Math.round((clamped / max) * width);
    const empty   = width - filled;
    const pct     = clamped / max;
    const color   = pct > 0.5 ? C.brightGreen : pct > 0.25 ? C.brightYellow : C.brightRed;
    return `${color}${'█'.repeat(filled)}${C.dim}${'░'.repeat(empty)}${C.reset}`;
}

// ─── Advantage Label ──────────────────────────────────────────────────────────

const ADVANTAGE_LABEL: Record<Advantage, string> = {
    advantage:    `${C.brightGreen}ADVANTAGE   (+)${C.reset}`,
    neutral:      `${C.yellow}NEUTRAL      (=)${C.reset}`,
    disadvantage: `${C.brightRed}DISADVANTAGE (-)${C.reset}`,
};

// ─── Intro & Rules ────────────────────────────────────────────────────────────

export function printCombatIntro(
    playerName: string,
    playerLevel: number,
    enemyName: string,
    enemyLevel: number,
): void {
    console.log(`\n${HR_MAJOR}`);
    console.log(`  ${C.bold}${C.brightCyan}AXIOMANCER  —  Combat Simulator${C.reset}`);
    console.log(`  ${C.dim}${playerName} (Lv.${playerLevel})  vs  ${enemyName} (Lv.${enemyLevel})${C.reset}`);
    console.log(HR_MAJOR);
}

export function printCombatRules(): void {
    console.log(`\n${C.bold}Rules${C.reset}`);
    console.log(`  ${typeColor('heart')} > ${typeColor('body')} > ${typeColor('mind')} > ${typeColor('heart')}  (type advantage cycle)`);
    console.log(`  Advantage → roll 2d20 keep ${C.brightGreen}HIGHER${C.reset}  |  Disadvantage → roll 2d20 keep ${C.brightRed}LOWER${C.reset}`);
    console.log(`  Defending multipliers  →  advantage: ${C.brightGreen}×${DEFENSE_MULTIPLIERS.advantage}${C.reset}  |  neutral: ${C.yellow}×${DEFENSE_MULTIPLIERS.neutral}${C.reset}  |  disadvantage: ${C.brightRed}×${DEFENSE_MULTIPLIERS.disadvantage}${C.reset}`);
    console.log(`  Damage = roll − ( defense × multiplier )  (min 0)\n`);
}

// ─── Status Display ───────────────────────────────────────────────────────────

export function printStatus(state: CombatState): void {
    const playerPct = Math.max(0, state.player.health) / state.player.maxHealth;
    const enemyPct  = Math.max(0, state.enemy.health)  / state.enemy.enemyStats.maxHealth;
    const playerHpColor = playerPct > 0.5 ? C.brightGreen : playerPct > 0.25 ? C.brightYellow : C.brightRed;
    const enemyHpColor  = enemyPct  > 0.5 ? C.brightGreen : enemyPct  > 0.25 ? C.brightYellow : C.brightRed;

    const playerHp = Math.max(0, state.player.health);
    const enemyHp  = Math.max(0, state.enemy.health);

    console.log(`\n${HR_MAJOR}`);
    console.log(`  ${C.bold}Round ${state.round}${C.reset}`);
    console.log(HR_MAJOR);
    console.log(`  Player  ${hpBar(state.player.health, state.player.maxHealth)}  ${playerHpColor}${playerHp}${C.reset} / ${state.player.maxHealth}`);
    console.log(`  Enemy   ${hpBar(state.enemy.health,  state.enemy.enemyStats.maxHealth)}  ${enemyHpColor}${enemyHp}${C.reset} / ${state.enemy.enemyStats.maxHealth}`);

    if (state.friendshipCounter > 0) {
        const hearts = '♥'.repeat(state.friendshipCounter) + '♡'.repeat(FRIENDSHIP_COUNTER_MAX - state.friendshipCounter);
        console.log(`  ${C.brightRed}Friendship  ${hearts}${C.reset}  (${state.friendshipCounter} / ${FRIENDSHIP_COUNTER_MAX})`);
    }
    console.log('');
}

// ─── Round Action Declaration ─────────────────────────────────────────────────

export function printRoundActions(
    playerAction: string,
    playerType: ActionType,
    enemyAction: string,
    enemyType: ActionType,
): void {
    console.log(HR_MINOR);
    console.log(`  You    ${C.bold}${playerAction.toUpperCase()}${C.reset} with ${typeColor(playerType)}`);
    console.log(`  Enemy  ${C.bold}${enemyAction.toUpperCase()}${C.reset} with ${typeColor(enemyType)}`);
}

// ─── Type Matchup ─────────────────────────────────────────────────────────────

function advantageReason(attacker: string, defender: string, advantage: Advantage): string {
    if (advantage === 'neutral')   return `${attacker} = ${defender} (same type)`;
    if (advantage === 'advantage') return `${attacker} > ${defender}`;
    return `${attacker} < ${defender}`;
}

export function printTypeMatchup(
    playerType: ActionType,
    enemyType: ActionType,
    playerAdvantage: Advantage,
    enemyAdvantage: Advantage,
): void {
    console.log(sectionHeader('Type Matchup'));

    if (playerAdvantage === 'neutral') {
        console.log(`  Same type (${typeColor(playerType)}) — ${ADVANTAGE_LABEL['neutral']} for both sides`);
    } else {
        console.log(`  You     ${ADVANTAGE_LABEL[playerAdvantage]}  — ${advantageReason(playerType, enemyType, playerAdvantage)}`);
        console.log(`  Enemy   ${ADVANTAGE_LABEL[enemyAdvantage]}  — ${advantageReason(enemyType, playerType, enemyAdvantage)}`);
    }
}

// ─── Roll Display ─────────────────────────────────────────────────────────────

export function printRollLine(label: string, rawRoll: number, modifier: number, advantage: Advantage): void {
    const diceDesc = advantage === 'neutral' ? '1d20' : `2d20 ${advantage}`;
    const total    = rawRoll + modifier;
    console.log(`  ${label.padEnd(24)} ${C.bold}${total}${C.reset}  (${rawRoll} [${diceDesc}] + ${modifier} stat)`);
}

// ─── Attack Contest ───────────────────────────────────────────────────────────

export function printContestHeader(
    playerRaw: number, playerMod: number, playerAdv: Advantage,
    enemyRaw: number,  enemyMod: number,  enemyAdv: Advantage,
): void {
    console.log(sectionHeader('Attack Contest'));
    printRollLine('You attack:',   playerRaw, playerMod, playerAdv);
    printRollLine('Enemy attacks:', enemyRaw,  enemyMod,  enemyAdv);
}

export function printContestOutcome(playerTotal: number, enemyTotal: number): void {
    if (playerTotal > enemyTotal) {
        console.log(`\n  ${C.brightGreen}${C.bold}→ You win the contest!${C.reset} (${playerTotal} vs ${enemyTotal})`);
    } else if (playerTotal < enemyTotal) {
        console.log(`\n  ${C.brightRed}${C.bold}→ Enemy wins the contest!${C.reset} (${enemyTotal} vs ${playerTotal})`);
    } else {
        console.log(`\n  ${C.yellow}→ Tied! (${playerTotal} vs ${enemyTotal}) — wits clash, both miss.${C.reset}`);
    }
}

// ─── Damage Calculation ───────────────────────────────────────────────────────

/**
 * Parameters for displaying a damage calculation.
 * @property defender          - Who is absorbing the hit ('player' → "You", 'enemy' → "Enemy").
 * @property baseDefense       - Raw defense stat BEFORE the multiplier is applied.
 * @property defenseMultiplier - How hard the defender is defending (PASSIVE=1, NEUTRAL=2×, ADV=3×).
 *                               printDamageCalc multiplies it for the display line automatically.
 * @property finalDamage       - Already-clamped value (≥ 0) written into the HP line.
 */
export interface DamageCalcParams {
    header: string;
    defender: 'player' | 'enemy';
    attackStatName: string;
    attackStatValue: number;
    damageRoll: number;
    defenseStatName: string;
    baseDefense: number;
    defenseMultiplier: number;
    finalDamage: number;
    hpBefore: number;
    hpAfter: number;
}

export function printDamageCalc(p: DamageCalcParams): void {
    const effectiveDefense = p.baseDefense * p.defenseMultiplier;
    const defenderLabel    = p.defender === 'player' ? 'You' : 'Enemy';
    const dmgColor         = p.finalDamage > 0 ? C.brightRed : C.dim;

    console.log(sectionHeader(p.header));
    console.log(
        `  ${defenderLabel} defends with ${C.bold}${p.defenseStatName}${C.reset}. ` +
        `( ${p.damageRoll} − ( ${p.baseDefense} × ${p.defenseMultiplier} ) ) = ` +
        `${dmgColor}${C.bold}${p.finalDamage}${C.reset} Damage`,
    );
    console.log(`  HP  ${p.hpBefore} → ${C.brightRed}${p.hpAfter}${C.reset}`);
}

// ─── Special Outcomes ─────────────────────────────────────────────────────────

export function printBothDefending(before: number, after: number): void {
    const hearts = '♥'.repeat(after) + '♡'.repeat(FRIENDSHIP_COUNTER_MAX - after);
    console.log(sectionHeader('Both Defending'));
    console.log(`  No attack is made. A moment of stillness passes...`);
    console.log(
        `  ${C.brightRed}Friendship  ${hearts}${C.reset}  (${before} → ${after} / ${FRIENDSHIP_COUNTER_MAX})` +
        (after >= FRIENDSHIP_COUNTER_MAX ? `  ${C.brightYellow}← bond formed!${C.reset}` : ''),
    );
}

export function printCombatEnd(state: CombatState): void {
    console.log(`\n${HR_MAJOR}`);

    if (state.enemy.health <= 0) {
        console.log(`  ${C.brightGreen}${C.bold}VICTORY — you defeated the enemy!${C.reset}`);
    } else if (state.player.health <= 0) {
        console.log(`  ${C.brightRed}${C.bold}DEFEAT — you were overcome.${C.reset}`);
    } else if (state.friendshipCounter >= FRIENDSHIP_COUNTER_MAX) {
        console.log(`  ${C.brightYellow}${C.bold}BOND FORMED — your enemy becomes an ally.${C.reset}`);
    }

    console.log(HR_MAJOR);
    console.log(`  ${C.bold}Final results${C.reset}`);
    console.log(`  Your HP    ${hpBar(state.player.health, state.player.maxHealth)}  ${Math.max(0, state.player.health)} / ${state.player.maxHealth}`);
    console.log(`  Enemy HP   ${hpBar(state.enemy.health,  state.enemy.enemyStats.maxHealth)}  ${Math.max(0, state.enemy.health)} / ${state.enemy.enemyStats.maxHealth}`);
    console.log(`  Rounds     ${state.round - 1}`);
    console.log(HR_MAJOR);
    console.log('');
}
