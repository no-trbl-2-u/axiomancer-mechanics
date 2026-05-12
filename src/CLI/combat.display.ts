/**
 * Combat Display Helpers
 *
 * All console output for the combat CLI lives here — zero game logic.
 * Each function receives plain data and prints it; nothing is calculated here.
 */

import { Stance, Advantage, CombatState } from '../Combat/types';
import { CombatActor, RoundEvent } from '../Combat/combat.resolver';
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
    const intensity = (ae.intensity ?? 1) > 1 ? ` ×${ae.intensity}` : '';
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
    const intensity = ae.intensity ?? 1;
    const dur       = ae.remainingDuration === -1 ? '∞' : `${ae.remainingDuration}r`;
    const typeClr   = typeLabel === 'buff' ? C.brightGreen : C.brightRed;
    const appRound  = ae.appliedAt !== undefined ? `  applied r${ae.appliedAt}` : '';
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
        if (restrict.forcedStance)
            lines.push(`control forced → ${restrict.forcedStance}`);
        if (restrict.blockedStances?.length)
            lines.push(`control blocked [${restrict.blockedStances.join(', ')}]`);
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
 * Announces a stance switch and every buff that dispersed because of it.
 */
export function printBuffsCleared(who: 'player' | 'enemy', label: string, cleared: ActiveEffect[], newType: Stance): void {
    if (cleared.length === 0) return;
    const owner = who === 'player' ? `${C.cyan}You${C.reset}` : `${C.cyan}${label}${C.reset}`;
    console.log(`  ${C.dim}↺${C.reset} ${owner} switched stance → ${typeColor(newType)}`);
    for (const ae of cleared) {
        const name = lookupEffect(ae.effectId)?.name ?? ae.effectId;
        console.log(`    ${C.dim}✕ ${name} disperses.${C.reset}`);
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

/** Announces HP lost to drain (negative regen) at the start of a round. */
export function printDrain(who: 'player' | 'enemy', label: string, amount: number): void {
    if (amount <= 0) return;
    const owner = who === 'player' ? `${C.brightRed}You${C.reset}` : `${C.brightRed}${label}${C.reset}`;
    console.log(`  ${C.brightRed}☠ ${owner}: drained for ${amount} HP.${C.reset}`);
}

/** Announces DoT damage applied at the start or end of a round. */
export function printDotDamage(
    who: 'player' | 'enemy',
    label: string,
    amount: number,
    phase: 'start' | 'end',
): void {
    if (amount <= 0) return;
    const owner = who === 'player' ? `${C.brightRed}You${C.reset}` : `${C.brightRed}${label}${C.reset}`;
    const tag = phase === 'start' ? 'tick' : 'bleed';
    console.log(`  ${C.brightRed}🩸 ${owner}: ${tag} for ${amount} damage.${C.reset}`);
}

/** Announces a stance forced by an effect (e.g. charm) overriding player choice. */
export function printForcedStance(who: 'player' | 'enemy', label: string, requested: Stance | null, forced: Stance): void {
    const owner = who === 'player' ? `${C.cyan}You${C.reset}` : `${C.cyan}${label}${C.reset}`;
    if (requested && requested !== forced) {
        console.log(`  ${C.brightYellow}↯ ${owner}: stance forced to ${typeColor(forced)} (was ${typeColor(requested)}).${C.reset}`);
    } else {
        console.log(`  ${C.brightYellow}↯ ${owner}: stance forced to ${typeColor(forced)}.${C.reset}`);
    }
}

/** Announces a turn skipped due to skipTurn or a fully-blocked stance. */
export function printTurnSkipped(who: 'player' | 'enemy', label: string, reason: string | null): void {
    const owner = who === 'player' ? `${C.cyan}You${C.reset}` : `${C.cyan}${label}${C.reset}`;
    const tag = reason === 'blockedStance' ? 'cannot use that stance' : 'cannot act';
    console.log(`  ${C.brightYellow}⊘ ${owner}: ${tag} this round.${C.reset}`);
}

/** Announces buffs / debuffs removed by a cleanse or dispel. */
export function printPurge(
    who: 'player' | 'enemy',
    label: string,
    purgeKind: 'cleanse' | 'dispel',
    removed: ActiveEffect[],
): void {
    if (removed.length === 0) return;
    const owner = who === 'player' ? `${C.cyan}You${C.reset}` : `${C.cyan}${label}${C.reset}`;
    const verb = purgeKind === 'cleanse' ? 'cleansed' : 'dispelled';
    console.log(`  ${C.brightCyan}✦ ${owner}: ${verb} ${removed.length} effect${removed.length > 1 ? 's' : ''}.${C.reset}`);
    for (const ae of removed) {
        const name = lookupEffect(ae.effectId)?.name ?? ae.effectId;
        console.log(`    ${C.dim}✕ ${name} dispersed.${C.reset}`);
    }
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
    printEffectStateBlock('Active Effects — Player:', state.player.effects);
    console.log(`  Enemy   ${hpBar(state.enemy.health, state.enemy.maxHealth)}  ${enemyHpColor}${enemyHp}${C.reset} / ${state.enemy.maxHealth}`);
    printEffectStateBlock('Active Effects — Enemy:', state.enemy.effects);

    if (state.friendshipCounter > 0) {
        const hearts = '♥'.repeat(state.friendshipCounter) + '♡'.repeat(FRIENDSHIP_COUNTER_MAX - state.friendshipCounter);
        console.log(`  ${C.brightRed}Friendship  ${hearts}${C.reset}  (${state.friendshipCounter} / ${FRIENDSHIP_COUNTER_MAX})`);
    }
    console.log('');
}

// ─── Round Action Declaration ─────────────────────────────────────────────────

export function printRoundActions(
    playerAction: string,
    playerType: Stance,
    enemyAction: string,
    enemyType: Stance,
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
    playerType: Stance,
    enemyType: Stance,
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

// ─── Round-event renderer ─────────────────────────────────────────────────────
//
// `resolveCombatRound` returns `{ state, combatEvents }`. The CLI's job is to
// take the typed event stream and render it one round at a time using the
// helpers above. The renderer owns its own pacing (delays between sections);
// the resolver knows nothing about presentation.
//
// Events arrive grouped by phase (round-start → action-restriction →
// advantage → stance-effects → scenario → round-end), so a single linear
// pass is sufficient. Two events need lightweight buffering: the
// `stance-effects.applied` events (so we can call `printStanceSection` once
// with both sides), and the `scenario.attack-roll` events (so we can decide
// between contest layout and single-attack layout).

export interface RenderRoundParams {
    events: RoundEvent[];
    playerName: string;
    enemyName: string;
    /** Pacing delay; pass `() => Promise.resolve()` to skip animation. */
    delay: (ms: number) => Promise<void>;
}

/** Render one round's worth of resolver events to the CLI. */
export async function renderRoundEvents(p: RenderRoundParams): Promise<void> {
    const { events, playerName, enemyName, delay } = p;
    const label = (a: CombatActor): string => (a === 'player' ? playerName : enemyName);

    // Split events by phase. Order within each phase is preserved.
    const byPhase: Record<RoundEvent['phase'], RoundEvent[]> = {
        'round-start':        [],
        'action-restriction': [],
        'advantage':          [],
        'stance-effects':     [],
        'scenario':           [],
        'skill':              [],
        'item':               [],
        'resources':          [],
        'round-end':          [],
    };
    for (const ev of events) byPhase[ev.phase].push(ev);

    await renderRoundStart(byPhase['round-start'], label, delay);
    renderActionRestriction(byPhase['action-restriction'], label);
    await renderAdvantage(byPhase['advantage'], delay);
    await renderStanceEffects(byPhase['stance-effects'], enemyName, label, delay);
    await renderSkill(byPhase['skill'], delay);
    await renderItem(byPhase['item'], delay);
    await renderScenario(byPhase['scenario'], enemyName, label, delay);
    renderResources(byPhase['resources']);
    await renderRoundEnd(byPhase['round-end'], label, delay);
}

async function renderItem(
    events: RoundEvent[],
    delay: (ms: number) => Promise<void>,
): Promise<void> {
    if (events.length === 0) return;
    console.log(sectionHeader('Item'));
    for (const ev of events) {
        if (ev.phase !== 'item') continue;
        if (ev.kind === 'used') {
            const healStr = ev.healed > 0
                ? `  ${C.brightGreen}+${ev.healed} HP${C.reset}  HP ${ev.hpBefore} → ${C.brightGreen}${ev.hpAfter}${C.reset}`
                : '';
            const effStr = ev.appliedEffectId ? `  effect: ${ev.appliedEffectId}` : '';
            const grant = ev.resourceGrant;
            const grantParts = ([
                ['heart',   grant.heart],
                ['body',    grant.body],
                ['mind',    grant.mind],
                ['fallacy', grant.fallacy],
                ['paradox', grant.paradox],
            ] as const).filter(([, n]) => n !== 0).map(([k, n]) => `+${n} ${k}`);
            const grantStr = grantParts.length > 0
                ? `  ${C.brightYellow}${grantParts.join(', ')}${C.reset}`
                : '';
            console.log(`  ${C.brightGreen}✚ Used ${C.bold}${ev.itemName}${C.reset}${C.brightGreen}.${C.reset}${healStr}${effStr}${grantStr}`);
        } else if (ev.kind === 'blocked') {
            console.log(`  ${C.brightRed}✕ Item action failed: ${ev.reason}${C.reset}`);
        }
    }
    await delay(800);
}

async function renderSkill(
    events: RoundEvent[],
    delay: (ms: number) => Promise<void>,
): Promise<void> {
    if (events.length === 0) return;
    console.log(sectionHeader('Skill'));
    for (const ev of events) {
        if (ev.phase !== 'skill') continue;
        switch (ev.kind) {
            case 'damage':
                console.log(`  ${C.brightRed}⚔ Skill ${ev.skillId} hit for ${ev.amount} damage.${C.reset}  HP ${ev.hpBefore} → ${ev.hpAfter}`);
                break;
            case 'heal':
                console.log(`  ${C.brightGreen}✚ Skill ${ev.skillId} restored ${ev.amount} HP.${C.reset}  HP ${ev.hpBefore} → ${ev.hpAfter}`);
                break;
            case 'effect-applied':
                console.log(`  ${C.brightGreen}✦ ${ev.effect.name} → ${ev.appliedTo}.${C.reset}  ${C.dim}${ev.message}${C.reset}`);
                break;
            case 'effect-resisted':
                console.log(`  ${C.brightRed}✕ ${ev.effect.name} resisted by ${ev.appliedTo}.${C.reset}  ${C.dim}${ev.message}${C.reset}`);
                break;
            case 'effect-rebounded':
                console.log(`  ${C.brightYellow}↩ ${ev.effect.name} rebounded.${C.reset}  ${C.dim}${ev.message}${C.reset}`);
                break;
            case 'resources-spent': {
                const parts = Object.entries(ev.cost).filter(([, v]) => v && v > 0)
                    .map(([k, v]) => `${v} ${k}`).join(', ');
                console.log(`  ${C.dim}Spent ${parts || '(no cost)'}.${C.reset}`);
                break;
            }
            case 'philosophical-generated':
                console.log(`  ${C.brightCyan}+1 ${ev.category} token.${C.reset}`);
                break;
        }
    }
    await delay(800);
}

function renderResources(events: RoundEvent[]): void {
    for (const ev of events) {
        if (ev.phase !== 'resources') continue;
        if (ev.kind !== 'generated') continue;
        const r = ev.resources;
        const verb = ev.outcome === 'defend' ? 'defend' : ev.outcome === 'hit' ? 'hit' : 'miss';
        console.log(
            `  ${C.dim}Tokens (${verb} on ${typeColor(ev.stance)}): ` +
            `♥${r.heart} ⚡${r.body} ★${r.mind} ⚖${r.fallacy} ∞${r.paradox}${C.reset}`,
        );
    }
}

async function renderRoundStart(
    events: RoundEvent[],
    label: (a: CombatActor) => string,
    delay: (ms: number) => Promise<void>,
): Promise<void> {
    if (events.length === 0) return;
    for (const ev of events) {
        if (ev.phase !== 'round-start') continue;
        switch (ev.kind) {
            case 'regen':  printRegenHeal(ev.actor, label(ev.actor), ev.amount); break;
            case 'drain':  printDrain(ev.actor,     label(ev.actor), ev.amount); break;
            case 'dot':    printDotDamage(ev.actor, label(ev.actor), ev.amount, 'start'); break;
            case 'lethal': /* state already reflects the KO; pacing handled below */ break;
        }
    }
    await delay(500);
}

function renderActionRestriction(
    events: RoundEvent[],
    label: (a: CombatActor) => string,
): void {
    for (const ev of events) {
        if (ev.phase !== 'action-restriction') continue;
        switch (ev.kind) {
            case 'forced-stance': printForcedStance(ev.actor, label(ev.actor), ev.requested, ev.forced); break;
            case 'turn-skipped':  printTurnSkipped(ev.actor,  label(ev.actor), ev.reason); break;
        }
    }
}

async function renderAdvantage(
    events: RoundEvent[],
    delay: (ms: number) => Promise<void>,
): Promise<void> {
    if (events.length === 0) return;
    for (const ev of events) {
        if (ev.phase !== 'advantage') continue;
        if (ev.kind === 'actions') {
            printRoundActions(ev.playerAction, ev.playerStance, ev.enemyAction, ev.enemyStance);
        } else if (ev.kind === 'matchup') {
            printTypeMatchup(ev.playerStance, ev.enemyStance, ev.playerAdvantage, ev.enemyAdvantage);
        }
    }
    await delay(1500);
}

async function renderStanceEffects(
    events: RoundEvent[],
    enemyName: string,
    label: (a: CombatActor) => string,
    delay: (ms: number) => Promise<void>,
): Promise<void> {
    if (events.length === 0) return;

    let playerApplied: { effect: Effect; message: string; appliedTo: 'self' | 'opponent' } | null = null;
    let enemyApplied:  { effect: Effect; message: string; appliedTo: 'self' | 'opponent' } | null = null;

    for (const ev of events) {
        if (ev.phase !== 'stance-effects') continue;
        if (ev.kind === 'cleared') {
            printBuffsCleared(ev.actor, label(ev.actor), ev.cleared, ev.newStance);
        } else if (ev.kind === 'applied') {
            const payload = { effect: ev.effect, message: ev.message, appliedTo: ev.appliedTo };
            if (ev.actor === 'player') playerApplied = payload;
            else                       enemyApplied  = payload;
        }
    }

    if (playerApplied || enemyApplied) {
        printStanceSection(playerApplied, enemyName, enemyApplied);
        await delay(1000);
    }
}

async function renderScenario(
    events: RoundEvent[],
    enemyName: string,
    label: (a: CombatActor) => string,
    delay: (ms: number) => Promise<void>,
): Promise<void> {
    if (events.length === 0) return;

    // Attack-roll count drives the layout: 2 → contest, 1 → single-attack, 0 → no attack-section.
    const attackRollCount = events.filter(e => e.phase === 'scenario' && e.kind === 'attack-roll').length;
    const isContest = attackRollCount === 2;

    let firstContestRollPrinted = false;

    for (const ev of events) {
        if (ev.phase !== 'scenario') continue;

        switch (ev.kind) {
            case 'attack-roll': {
                if (isContest) {
                    if (!firstContestRollPrinted) {
                        console.log(sectionHeader('Attack Contest'));
                        firstContestRollPrinted = true;
                    }
                    const lbl = ev.actor === 'player' ? 'You attack:' : 'Enemy attacks:';
                    printRollLine(lbl, ev.rawRoll, ev.statValue, ev.advantage, ev.rollModifier || undefined);
                } else {
                    const banner = ev.actor === 'player' ? '[ Player Attack Roll ]' : '[ Enemy Attack Roll ]';
                    const lbl    = ev.actor === 'player' ? 'Player attack roll:'    : 'Enemy attack roll:';
                    console.log(`\n${banner}`);
                    printRollLine(lbl, ev.rawRoll, ev.statValue, ev.advantage, ev.rollModifier || undefined);
                    await delay(1500);
                }
                break;
            }
            case 'contest-outcome': {
                await delay(1500);
                printContestOutcome(ev.playerTotal, ev.enemyTotal);
                await delay(1500);
                break;
            }
            case 'damage-roll': {
                const banner = ev.actor === 'player' ? '[ Player Damage Roll ]' : '[ Enemy Damage Roll ]';
                const lbl    = ev.actor === 'player' ? 'Player damage roll:'    : 'Enemy damage roll:';
                console.log(`\n${banner}`);
                printRollLine(lbl, ev.rawRoll, ev.statValue, ev.advantage, ev.rollModifier || undefined);
                await delay(800);
                break;
            }
            case 'damage-applied': {
                const headerBase = ev.attacker === 'player' ? 'Player Damage' : 'Enemy Damage';
                const header = ev.defenderActed ? `${headerBase} vs Defending ${ev.defender === 'player' ? 'Player' : 'Enemy'}` : headerBase;
                const defenseStatName = ev.defenderActed ? `${ev.defenseStance} defense` : `${ev.defenseStance} base`;
                printDamageCalc({
                    header,
                    defender:          ev.defender,
                    attackStatName:    `${ev.attackStance} attack`,
                    attackStatValue:   ev.attackStatValue,
                    damageRoll:        ev.damageRoll,
                    damageBonus:       ev.damageBonus || undefined,
                    defenseStatName,
                    baseDefense:       ev.baseDefense,
                    defenseMultiplier: ev.defenseMultiplier,
                    finalDamage:       ev.finalDamage,
                    hpBefore:          ev.hpBefore,
                    hpAfter:           ev.hpAfter,
                });
                break;
            }
            case 'thorns': {
                await delay(500);
                printThornsReflect(label(ev.attacker), ev.thorns, ev.hpBefore, ev.hpAfter);
                break;
            }
            case 'heart-buff-removed': {
                if (!ev.effect) break;
                const targetName = ev.defender === 'player' ? 'You' : enemyName;
                const verb       = ev.defender === 'player' ? 'lose' : 'loses';
                console.log(`  ${C.brightCyan}✦ Fleeting Kindness: ${targetName} ${verb} ${C.bold}${ev.effect.name}${C.reset}${C.brightCyan}.${C.reset}`);
                break;
            }
            case 'heart-buff-extended': {
                if (!ev.effect) break;
                const possessive = ev.attacker === 'player' ? 'your' : `${enemyName}'s`;
                console.log(`  ${C.brightCyan}✦ Fleeting Kindness: ${possessive} ${C.bold}${ev.effect.name}${C.reset}${C.brightCyan} lasts 1 round longer.${C.reset}`);
                break;
            }
            case 'both-defend': {
                await delay(1500);
                printBothDefending(ev.friendshipBefore, ev.friendshipAfter);
                break;
            }
            case 'proc-applied': {
                const owner = ev.actor === 'player' ? 'You' : enemyName;
                const target = ev.appliedTo === 'self'
                    ? (ev.actor === 'player' ? 'yourself' : 'themselves')
                    : (ev.actor === 'player' ? enemyName : 'you');
                const tag = ev.decision === 'crit' ? `${C.brightYellow}CRIT${C.reset} ` : '';
                const tier = `T${ev.tier}`;
                const success = ev.result.success ? C.brightGreen : C.brightRed;
                console.log(
                    `  ${success}⚡ ${owner} proc: ${tag}${C.bold}${ev.effect.name}${C.reset}${success} → ${target} (${tier})${C.reset}  ` +
                    `${C.dim}${ev.result.message}${C.reset}`,
                );
                break;
            }
            case 'proc-fumbled': {
                const owner = ev.actor === 'player' ? 'You' : enemyName;
                console.log(
                    `  ${C.brightRed}✘ ${owner} fumbled — ${C.bold}${ev.effect.name}${C.reset}${C.brightRed} self-applied.${C.reset}  ` +
                    `${C.dim}${ev.result.message}${C.reset}`,
                );
                break;
            }
        }
    }
}

async function renderRoundEnd(
    events: RoundEvent[],
    label: (a: CombatActor) => string,
    delay: (ms: number) => Promise<void>,
): Promise<void> {
    if (events.length === 0) return;

    let anyExpired = false;
    for (const ev of events) {
        if (ev.phase !== 'round-end') continue;
        if (ev.kind === 'dot') {
            printDotDamage(ev.actor, label(ev.actor), ev.amount, 'end');
        } else if (ev.kind === 'expired' && ev.expired.length > 0) {
            anyExpired = true;
        }
    }

    if (anyExpired) {
        await delay(500);
        for (const ev of events) {
            if (ev.phase === 'round-end' && ev.kind === 'expired') {
                printEffectExpiry(ev.actor, label(ev.actor), ev.expired);
            }
        }
    }

    await delay(1500);
}
