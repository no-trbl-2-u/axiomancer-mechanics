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
import { ActiveEffect, Effect } from '../Effects/types';
import { lookupEffect } from '../Effects/effects.library';

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

// ─── Active Effects Display ───────────────────────────────────────────────────

/**
 * Formats a single ActiveEffect into a short coloured tag.
 *   Buff  → green   e.g.  [Ad Baculum ×2 2r]
 *   Debuff → red    e.g.  [Wither ×1 3r]
 *   Unknown ID      e.g.  [??? 1r]
 */
function formatEffectTag(ae: ActiveEffect): string {
    const def      = lookupEffect(ae.effectId);
    const name     = def?.name ?? '???';
    const isBuff   = def?.type === 'buff';
    const color    = isBuff ? C.brightGreen : C.brightRed;
    const intensity = (ae.currentIntensity ?? 1) > 1 ? ` ×${ae.currentIntensity}` : '';
    const dur       = ae.remainingDuration === -1 ? '∞' : `${ae.remainingDuration}r`;
    return `${color}[${name}${intensity} ${dur}]${C.reset}`;
}

/**
 * Prints a compact row of active effect tags.
 * Skips expired effects (duration 0) that haven't been cleaned up yet.
 * Does nothing if the list is empty.
 */
export function printActiveEffects(label: string, effects: ActiveEffect[]): void {
    const live = effects.filter(e => e.remainingDuration !== 0);
    if (live.length === 0) return;
    const tags = live.map(formatEffectTag).join('  ');
    console.log(`  ${C.dim}${label.padEnd(8)}${C.reset}  ${tags}`);
}

/**
 * Prints a full mechanical breakdown for one ActiveEffect.
 *
 * Every payload field is expanded:
 *   - statModifiers   → flat value (engine does not scale these with intensity yet)
 *   - rollModifier    → flat bonus / penalty to attack rolls
 *   - rollModifierPerIntensity → per-stack roll modifier, shown as total and formula
 *   - defenseModifier → flat bonus / penalty to defense
 *   - reflectDamage   → thorns damage per hit, scaled by intensity
 *   - regeneration    → HP restored per round, scaled by intensity
 *   - damageOverTime  → DoT per round, scaled by intensity
 *   - actionRestriction, advantageModifier → control/advantage flags
 */
function printEffectDetail(ae: ActiveEffect): void {
    const def       = lookupEffect(ae.effectId);
    const name      = def?.name ?? '???';
    const typeLabel = def?.type ?? 'unknown';
    const intensity = ae.currentIntensity ?? 1;
    const dur       = ae.remainingDuration === -1 ? '∞' : `${ae.remainingDuration}r`;
    const typeClr   = typeLabel === 'buff' ? C.brightGreen : C.brightRed;
    const appRound  = ae.appliedAtRound !== undefined ? `  applied r${ae.appliedAtRound}` : '';
    const srcNote   = ae.sourceId ? `  src: ${ae.sourceId}` : '';

    console.log(
        `    ${typeClr}[${typeLabel}]${C.reset}  ${C.bold}${name.padEnd(22)}${C.reset}` +
        `  ${C.dim}id: ${ae.effectId}${C.reset}` +
        `  ×${intensity}  ${dur}` +
        `${C.dim}${appRound}${srcNote}${C.reset}`,
    );

    if (!def) return;

    const lines: string[] = [];

    // Stat modifiers — flat (engine not yet scaling these with intensity)
    for (const m of def.payload.statModifiers ?? []) {
        const sign = m.value >= 0 ? '+' : '';
        lines.push(`stat    ${sign}${m.value} ${m.stat}`);
    }

    // Roll modifiers
    const flat   = def.payload.rollModifier ?? 0;
    const perInt = def.payload.rollModifierPerIntensity ?? 0;
    if (flat !== 0 || perInt !== 0) {
        const parts: string[] = [];
        if (flat   !== 0) parts.push(`${flat >= 0 ? '+' : ''}${flat} flat`);
        if (perInt !== 0) parts.push(`${perInt >= 0 ? '+' : ''}${perInt * intensity} (${perInt >= 0 ? '+' : ''}${perInt}/intensity × ${intensity})`);
        const total = flat + perInt * intensity;
        lines.push(`roll    ${parts.join('  ')}  = ${total >= 0 ? '+' : ''}${total} total`);
    }

    // Defense modifier
    const defMod = def.payload.defenseModifier;
    if (defMod !== undefined && defMod !== 0) {
        lines.push(`defense ${defMod >= 0 ? '+' : ''}${defMod}`);
    }

    // Reflect (scales with intensity)
    const reflect = def.payload.reflectDamage;
    if (reflect !== undefined && reflect !== 0) {
        lines.push(`reflect ${reflect * intensity} per hit  (${reflect} × intensity ${intensity})`);
    }

    // Regen (scales with intensity)
    const regen = def.payload.regeneration?.healthPerRound;
    if (regen !== undefined && regen !== 0) {
        lines.push(`regen   +${regen * intensity} HP/round  (${regen} × intensity ${intensity})`);
    }

    // Damage over time (scales with intensity)
    const dot = def.payload.damageOverTime;
    if (dot !== undefined) {
        lines.push(`DoT     ${dot.damagePerRound * intensity} ${dot.damageType}/round  (${dot.damagePerRound} × intensity ${intensity})`);
    }

    // Action restrictions
    const restrict = def.payload.actionRestriction;
    if (restrict) {
        if (restrict.skipTurn)
            lines.push(`control skip turn`);
        if (restrict.forcedActionType)
            lines.push(`control forced → ${restrict.forcedActionType}`);
        if (restrict.blockedActionTypes?.length)
            lines.push(`control blocked [${restrict.blockedActionTypes.join(', ')}]`);
    }

    // Advantage modifiers
    const advMod = def.payload.advantageModifier;
    if (advMod) {
        if (advMod.grantAdvantage?.length)
            lines.push(`adv     +adv on [${advMod.grantAdvantage.join(', ')}]`);
        if (advMod.grantDisadvantage?.length)
            lines.push(`adv     −adv on [${advMod.grantDisadvantage.join(', ')}]`);
    }

    for (const line of lines) {
        console.log(`         ${C.dim}${line}${C.reset}`);
    }
}

/**
 * Prints a full mechanical state block for every active effect on a combatant.
 * Used in the round header so logs contain the complete effect picture each round.
 */
export function printEffectStateBlock(label: string, effects: ActiveEffect[]): void {
    const live = effects.filter(e => e.remainingDuration !== 0);
    if (live.length === 0) return;
    console.log(`  ${C.dim}${label}${C.reset}`);
    for (const ae of live) {
        printEffectDetail(ae);
    }
}

// ─── Stance / Effect Event Display ───────────────────────────────────────────

/**
 * Summarises what a Tier 1 effect actually does from its payload.
 * e.g.  "+1 physicalAttack, +1 roll"
 */
function formatEffectModifiers(effect: Effect): string {
    const parts: string[] = [];
    for (const mod of effect.payload.statModifiers ?? []) {
        const sign = mod.value >= 0 ? '+' : '';
        parts.push(`${sign}${mod.value} ${mod.stat}`);
    }
    const roll = effect.payload.rollModifier;
    if (roll !== undefined && roll !== 0) {
        parts.push(`${roll >= 0 ? '+' : ''}${roll} roll`);
    }
    const rollPerInt = effect.payload.rollModifierPerIntensity;
    if (rollPerInt !== undefined && rollPerInt !== 0) {
        parts.push(`${rollPerInt >= 0 ? '+' : ''}${rollPerInt} roll/intensity`);
    }
    const def = effect.payload.defenseModifier;
    if (def !== undefined && def !== 0) {
        parts.push(`${def >= 0 ? '+' : ''}${def} def`);
    }
    const ref = effect.payload.reflectDamage;
    if (ref !== undefined && ref !== 0) {
        parts.push(`${ref} reflect/intensity`);
    }
    const regen = effect.payload.regeneration?.healthPerRound;
    if (regen !== undefined && regen !== 0) {
        parts.push(`+${regen} HP/round/intensity`);
    }
    return parts.length ? `${C.dim}[${parts.join(', ')}]${C.reset}` : '';
}

/**
 * Prints a section showing what Tier 1 stance effects fired this round.
 * Handles both self-applied buffs and opponent-applied debuffs (e.g. Mind mark).
 *
 * @param playerEvent  - { effect, message, appliedTo } from applyTier1CombatEffectWithResult, or null
 * @param enemyName    - The enemy's display name
 * @param enemyEvent   - Same structure for the enemy
 */
export function printStanceSection(
    playerEvent: { effect: Effect; message: string; appliedTo: 'self' | 'opponent' } | null,
    enemyName: string,
    enemyEvent: { effect: Effect; message: string; appliedTo: 'self' | 'opponent' } | null,
): void {
    if (!playerEvent && !enemyEvent) return;

    console.log(sectionHeader('Stance Effects'));

    if (playerEvent) {
        const mods   = formatEffectModifiers(playerEvent.effect);
        const target = playerEvent.appliedTo === 'opponent'
            ? `${C.dim}→ ${enemyName}${C.reset}`
            : `${C.dim}→ You${C.reset}`;
        console.log(`  ${C.brightYellow}⚡ You:${C.reset}    ${C.bold}${playerEvent.effect.name}${C.reset}  ${target}  — ${playerEvent.message}  ${mods}`);
    }
    if (enemyEvent) {
        const mods   = formatEffectModifiers(enemyEvent.effect);
        const target = enemyEvent.appliedTo === 'opponent'
            ? `${C.dim}→ You${C.reset}`
            : `${C.dim}→ ${enemyName}${C.reset}`;
        console.log(`  ${C.brightYellow}⚡ ${enemyName}:${C.reset}  ${C.bold}${enemyEvent.effect.name}${C.reset}  ${target}  — ${enemyEvent.message}  ${mods}`);
    }
}

/**
 * Announces buffs that were cleared because the combatant switched action types.
 */
export function printBuffsCleared(who: 'player' | 'enemy', label: string, cleared: ActiveEffect[]): void {
    if (cleared.length === 0) return;
    const owner = who === 'player' ? `${C.cyan}You${C.reset}` : `${C.cyan}${label}${C.reset}`;
    for (const ae of cleared) {
        const name = lookupEffect(ae.effectId)?.name ?? ae.effectId;
        console.log(`  ${C.dim}✕ ${owner}: ${name} disperses (stance changed).${C.reset}`);
    }
}

/**
 * Announces HP restored by regen at the start of a round.
 */
export function printRegenHeal(who: 'player' | 'enemy', label: string, amount: number): void {
    if (amount <= 0) return;
    const owner = who === 'player' ? `${C.brightGreen}You${C.reset}` : `${C.brightGreen}${label}${C.reset}`;
    console.log(`  ${C.brightGreen}❤ ${owner}: regenerated ${amount} HP.${C.reset}`);
}

/**
 * Announces thorns reflect damage dealt back to an attacker.
 */
export function printThornsReflect(
    attackerLabel: string,
    thorns: number,
    attackerHpBefore: number,
    attackerHpAfter: number,
): void {
    if (thorns <= 0) return;
    console.log(
        `  ${C.brightRed}⟲ Thorns: ${attackerLabel} takes ${thorns} reflect damage.${C.reset}  ` +
        `HP  ${attackerHpBefore} → ${C.brightRed}${attackerHpAfter}${C.reset}`,
    );
}

/**
 * Announces Heart/Attack special interactions.
 */
export function printHeartAttackSpecials(
    removedBuffName: string | null,
    enemyName: string,
    extendedBuffName: string | null,
): void {
    if (removedBuffName) {
        console.log(`  ${C.brightCyan}✦ Fleeting Kindness: ${enemyName} loses ${C.bold}${removedBuffName}${C.reset}${C.brightCyan}.${C.reset}`);
    }
    if (extendedBuffName) {
        console.log(`  ${C.brightCyan}✦ Fleeting Kindness: your ${C.bold}${extendedBuffName}${C.reset}${C.brightCyan} lasts 1 round longer.${C.reset}`);
    }
}

/**
 * Prints effects that just expired for a combatant.
 * Call this at the end of a round after tickAllEffects.
 */
export function printEffectExpiry(
    who: 'player' | 'enemy',
    label: string,
    expired: ActiveEffect[],
): void {
    if (expired.length === 0) return;
    for (const ae of expired) {
        const name = lookupEffect(ae.effectId)?.name ?? ae.effectId;
        const owner = who === 'player' ? `${C.cyan}You${C.reset}` : `${C.cyan}${label}${C.reset}`;
        console.log(`  ${C.dim}⤓ ${owner}: ${name} fades.${C.reset}`);
    }
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
    const enemyPct  = Math.max(0, state.enemy.health)  / state.enemy.maxHealth;
    const playerHpColor = playerPct > 0.5 ? C.brightGreen : playerPct > 0.25 ? C.brightYellow : C.brightRed;
    const enemyHpColor  = enemyPct  > 0.5 ? C.brightGreen : enemyPct  > 0.25 ? C.brightYellow : C.brightRed;

    const playerHp = Math.max(0, state.player.health);
    const enemyHp  = Math.max(0, state.enemy.health);

    console.log(`\n${HR_MAJOR}`);
    console.log(`  ${C.bold}Round ${state.round}${C.reset}`);
    console.log(HR_MAJOR);
    console.log(`  Player  ${hpBar(state.player.health, state.player.maxHealth)}  ${playerHpColor}${playerHp}${C.reset} / ${state.player.maxHealth}`);
    printEffectStateBlock('Active Effects — Player:', state.player.currentActiveEffects as ActiveEffect[]);
    console.log(`  Enemy   ${hpBar(state.enemy.health, state.enemy.maxHealth)}  ${enemyHpColor}${enemyHp}${C.reset} / ${state.enemy.maxHealth}`);
    printEffectStateBlock('Active Effects — Enemy:', state.enemy.currentActiveEffects as ActiveEffect[]);

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

// ─── Signed Number Formatting ─────────────────────────────────────────────────

/** Formats a signed term as "op abs(value) label", e.g. "+ 3 stat" or "− 5 roll". */
function signedTerm(value: number, label: string): string {
    const op = value >= 0 ? '+' : '−';
    return `${op} ${Math.abs(value)} ${label}`;
}

// ─── Roll Display ─────────────────────────────────────────────────────────────

export function printRollLine(label: string, rawRoll: number, modifier: number, advantage: Advantage, rollMod?: number): void {
    const diceDesc     = advantage === 'neutral' ? '1d20' : `2d20 ${advantage}`;
    const total        = rawRoll + modifier + (rollMod ?? 0);
    const rollModColor = rollMod && rollMod < 0 ? C.brightRed : C.brightGreen;
    const rollModStr   = rollMod ? `  ${rollModColor}${signedTerm(rollMod, 'roll')}${C.reset}` : '';
    console.log(`  ${label.padEnd(24)} ${C.bold}${total}${C.reset}  (${rawRoll} [${diceDesc}]  ${signedTerm(modifier, 'stat')}${rollModStr})`);
}

// ─── Attack Contest ───────────────────────────────────────────────────────────

export function printContestHeader(
    playerRaw: number, playerMod: number, playerAdv: Advantage,
    enemyRaw: number,  enemyMod: number,  enemyAdv: Advantage,
    playerRollMod?: number,
    enemyRollMod?: number,
): void {
    console.log(sectionHeader('Attack Contest'));
    printRollLine('You attack:',    playerRaw, playerMod, playerAdv, playerRollMod);
    printRollLine('Enemy attacks:', enemyRaw,  enemyMod,  enemyAdv,  enemyRollMod);
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
 * @property damageBonus       - Extra flat damage added on top of the roll (e.g. Exposed Reasoning mark).
 *                               Shown as a separate "+ n" term in the formula when non-zero.
 * @property finalDamage       - Already-clamped value (≥ 0) written into the HP line.
 */
export interface DamageCalcParams {
    header: string;
    defender: 'player' | 'enemy';
    attackStatName: string;
    attackStatValue: number;
    damageRoll: number;
    damageBonus?: number;
    defenseStatName: string;
    baseDefense: number;
    defenseMultiplier: number;
    finalDamage: number;
    hpBefore: number;
    hpAfter: number;
}

export function printDamageCalc(p: DamageCalcParams): void {
    const defenderLabel  = p.defender === 'player' ? 'You' : 'Enemy';
    const dmgColor       = p.finalDamage > 0 ? C.brightRed : C.dim;
    const bonusStr       = p.damageBonus
        ? ` ${C.brightYellow}${signedTerm(p.damageBonus, 'mark')}${C.reset}`
        : '';

    console.log(sectionHeader(p.header));
    console.log(
        `  ${defenderLabel} defends with ${C.bold}${p.defenseStatName}${C.reset}. ` +
        `( ${p.damageRoll}${bonusStr} − ( ${p.baseDefense} × ${p.defenseMultiplier} ) ) = ` +
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
    console.log(`  Enemy HP   ${hpBar(state.enemy.health,  state.enemy.maxHealth)}  ${Math.max(0, state.enemy.health)} / ${state.enemy.maxHealth}`);
    console.log(`  Rounds     ${state.round - 1}`);
    console.log(HR_MAJOR);
    console.log('');
}
