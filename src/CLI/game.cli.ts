#!/usr/bin/env node

/**
 * Game CLI — demonstrational full-loop driver (Spec 09 Q7).
 *
 * Wires every public verb on the game store into a tabbed inquirer prompt
 * so the engine can be exercised by hand. Five tabs:
 *
 *   • Map        — list adjacent nodes, dispatch MOVE_TO_NODE, then
 *                  PROCESS_NODE to trigger the node's authored event.
 *   • Combat     — drives `resolveCombatRound` against the active
 *                  encounter. Skipped when no combat is in progress.
 *   • Journal    — read-only: active / completed quests + alignment stub.
 *   • Skills     — read-only: known + equipped skills.
 *   • Inventory  — read-only listing of carried items.
 *
 * Logic stays in the store / reducer. This file only formats and dispatches.
 *
 * Run with: `npm run game` (which invokes `ts-node src/CLI/game.cli.ts`).
 */

import fs from 'fs';
import { parseArgv, prompt, emit, log, setIoMode, setOutputMode } from './io';

import { characterPresets, getPresetById, buildCharacterFromPreset } from '../Character';
import { ENEMY_REGISTRY, type EnemySlug } from '../Enemy/enemy.library';
import { createGameStore } from '../Game/store';
import { createEventEmitter } from '../Game/events';
import { nullAdapter } from '../Game/persistence/null.adapter';
import { getMapDefinition } from '../World/map.registry';
import { resolveMapEvent } from '../World';
import type { ResolvedEvent } from '../World';
import { isCombatOngoing, determineEnemyAction, resolveCombatRound } from '../Combat';
import { Stance, CombatState, CombatAction, Action } from '../Combat/types';
import { getSkillById } from '../Skills/skill.library';
import { canUseSkill } from '../Skills/skill.engine';
import { isConsumable } from '../Items/types';
import { CombatEndReport } from '../Game/store';

type Tab = 'map' | 'combat' | 'journal' | 'skills' | 'inventory' | 'character' | 'debug' | 'quit';

type GameStoreHandle = ReturnType<typeof createGameStore>;

const skillLookup = (id: string) => getSkillById(id);

async function bootstrapStore(): Promise<GameStoreHandle> {
    const events = createEventEmitter();
    events.onAny(emit);

    const { presetId } = await prompt<{ presetId: string }>([{
        type: 'rawlist', name: 'presetId',
        message: 'Pick a character preset:',
        choices: characterPresets.map(p => ({
            name: `${p.name} (lvl ${p.level}) — ${p.summary}`,
            value: p.id,
        })),
    }]);

    const preset = getPresetById(presetId);
    if (!preset) throw new Error(`Unknown preset: ${presetId}`);

    const player = buildCharacterFromPreset(preset);
    log(`\nSelected: ${preset.name} (level ${preset.level}).\n`);

    return createGameStore(nullAdapter, { player }, events);
}

async function pickTab(canFight: boolean): Promise<Tab> {
    const tabs: Array<{ name: string; value: Tab }> = [
        { name: 'Map        — travel + resolve node events', value: 'map' },
        ...(canFight ? [{ name: 'Combat     — resume the active fight', value: 'combat' as Tab }] : []),
        { name: 'Journal    — quests + alignment', value: 'journal' },
        { name: 'Skills     — known + equipped', value: 'skills' },
        { name: 'Inventory  — items in pack', value: 'inventory' },
        { name: 'Character  — full stats + equipment + effects sheet', value: 'character' },
        { name: 'Debug      — spawn any enemy into combat', value: 'debug' },
        { name: 'Quit',                                 value: 'quit' },
    ];
    const { tab } = await prompt<{ tab: Tab }>([
        { type: 'rawlist', name: 'tab', message: 'Where to?', choices: tabs },
    ]);
    return tab;
}

async function mapTab(store: GameStoreHandle): Promise<void> {
    const state   = store.getState();
    const current = state.world.currentMap.currentNode;
    const def     = getMapDefinition(state.world.currentMap.continent, state.world.currentMap.name);
    const node    = def.nodes.find(n => n.id === current);

    log(`\n— Map: ${def.name} —`);
    log(`You are at ${current}.`);

    const available = state.world.currentMap.availableNodes;
    const reachable = (node?.connectedNodes ?? []).filter(id => available.includes(id));
    if (reachable.length === 0) {
        log('No adjacent nodes are open right now.');
        return;
    }

    const autoTarget = reachable[0];
    const { target } = await prompt<{ target: string }>([
        {
            type: 'rawlist',
            name: 'target',
            message: 'Move to which node?',
            choices: [
                { name: `Auto-advance: next node (${autoTarget})`, value: autoTarget },
                ...reachable.map(id => ({ name: id, value: id })),
                { name: 'Stay put', value: '' },
            ],
        },
    ]);
    if (!target) return;

    store.getState().moveToNode(target);
    log(`Moved to ${target}.`);

    // Spec 23 — resolve the node's MapEvent from the registered pools.
    const before = store.getState();
    const result = resolveMapEvent(before);
    store.setState({
        player: result.state.player,
        world:  result.state.world,
        quests: result.state.quests,
        flags:  result.state.flags,
    });
    log(describeResolvedEvent(result.event));

    if (result.event.kind === 'encounter') {
        // The CLI consumer is responsible for pushing the encounter into
        // combat. Driving combat here lets the player feel the loop close.
        store.getState().startCombat(result.event.encounter);
        await combatTab(store);
    }
}

function describeResolvedEvent(event: ResolvedEvent): string {
    switch (event.kind) {
        case 'encounter':   return `Encounter! ${event.isBoss ? '(boss) ' : ''}${event.encounter.enemies.map(e => e.name).join(', ')}`;
        case 'interaction': return `You meet ${event.npcName}.`;
        case 'gathering':   return `You gather ${event.items.map(i => i.name).join(', ')}.`;
        case 'rest':        return `You rest. (+${event.healed} HP)`;
        case 'village':     return `Village: ${event.villageName} (${event.merchants.length} merchant${event.merchants.length === 1 ? '' : 's'}).`;
        case 'cutscene':    return event.lines.join(' ');
        case 'hazard':      return `Hazard! (-${event.damage} HP${event.effects.length > 0 ? `, ${event.effects.length} effect${event.effects.length === 1 ? '' : 's'}` : ''})`;
        case 'loot-cache':  return `Loot cache: ${event.items.length} item${event.items.length === 1 ? '' : 's'}, ${event.currency} currency.`;
        case 'none':        return 'Nothing of note happens.';
    }
}

async function chooseCombatAction(
    store: GameStoreHandle,
    combat: CombatState,
): Promise<CombatAction> {
    const { stance } = await prompt<{ stance: Stance }>([
        { type: 'rawlist', name: 'stance', message: 'Stance?',
          choices: ['heart', 'body', 'mind'] },
    ]);

    // Only offer the skill option when the player has at least one
    // equipped skill they can afford. Keeps the prompt clean for the
    // common case.
    const player = combat.player;
    const affordableSkillIds = player.equippedSkills.filter(id => {
        const def = skillLookup(id);
        return def !== undefined && canUseSkill(combat.combatResources, def);
    });
    const actionChoices: Action[] = ['attack', 'defend'];
    if (affordableSkillIds.length > 0) actionChoices.push('skill');

    const { action } = await prompt<{ action: Action }>([
        { type: 'rawlist', name: 'action', message: 'Action?',
          choices: actionChoices },
    ]);

    if (action !== 'skill') {
        return { stance, action };
    }

    // Pick which equipped skill to fire. Show name + cost so the
    // player can read the trade-off before committing.
    const skillChoices = affordableSkillIds.map(id => {
        const def = skillLookup(id)!;
        const cost = Object.entries(def.resourceCost ?? {})
            .filter(([_k, v]) => (v as number) > 0)
            .map(([k, v]) => `${v} ${k}`)
            .join(', ') || 'free';
        return { name: `${def.name}  (${cost})`, value: id };
    });
    const { skillId } = await prompt<{ skillId: string }>([
        { type: 'rawlist', name: 'skillId', message: 'Which skill?', choices: skillChoices },
    ]);
    return { stance, action: 'skill', skillId };
}

async function combatTab(store: GameStoreHandle): Promise<void> {
    let combat = store.getState().combat;
    if (!combat) {
        log('No combat in progress — pick the Map tab to trigger an encounter.');
        return;
    }

    while (combat && isCombatOngoing(combat)) {
        const playerAction = await chooseCombatAction(store, combat);
        const enemyAction = determineEnemyAction(combat.enemy, combat);
        const { state: next } = resolveCombatRound(
            combat,
            playerAction,
            enemyAction,
            skillLookup,
        );
        store.getState().updateCombat(next);
        combat = store.getState().combat;
        log(
            `  player HP ${combat?.player.health}/${combat?.player.maxHealth}` +
            `  ·  enemy HP ${combat?.enemy.health}/${combat?.enemy.maxHealth}`,
        );
    }

    const report: CombatEndReport = store.getState().endCombat();
    log(`\nCombat ended: ${report.outcome}  ·  XP +${report.xpGained}  ·  loot ×${report.loot.length}`);
    if (report.outcome === 'victory') store.getState().levelUp();
}

function journalTab(store: GameStoreHandle): void {
    const { quests, flags } = store.getState();
    log('\n— Journal —');
    log(`Active quests   : ${quests.active.map(q => q.name).join(', ') || '(none)'}`);
    log(`Completed quests: ${quests.completed.join(', ') || '(none)'}`);
    log(`World flags     : ${flags.join(', ') || '(none)'}`);
    // Alignment / philosophy meter is the Phase 10 hook — print a placeholder
    // so the tab is reachable today.
    log('Alignment       : neutral (Spec 10 will compute this)');
}

function skillsTab(store: GameStoreHandle): void {
    const { player } = store.getState();
    log('\n— Skills —');
    log('Known skills:');
    for (const id of player.knownSkills) {
        const s = getSkillById(id);
        log(`  • ${s?.name ?? id}${player.equippedSkills.includes(id) ? '  (equipped)' : ''}`);
    }
}

function inventoryTab(store: GameStoreHandle): void {
    const { inventory } = store.getState().player;
    log('\n— Inventory —');
    if (inventory.length === 0) {
        log('(empty)');
        return;
    }
    for (const item of inventory) {
        const qty = isConsumable(item) ? `  ×${item.quantity}` : '';
        log(`  • ${item.name}${qty}  — ${item.description}`);
    }
}

function characterTab(store: GameStoreHandle): void {
    const state = store.getState();
    const p = state.player;

    log('\n— Character Sheet —');
    log(`Name:     ${p.name}`);
    log(`Level:    ${p.level}  (XP ${p.experience}/${p.experienceToNextLevel})`);
    log(`Health:   ${p.health}/${p.maxHealth}`);
    log(`Currency: ${p.currency}`);
    log(`Moral:    ${state.moralMeter}`);

    log('\nBase stats:');
    log(`  heart ${p.baseStats.heart}   body ${p.baseStats.body}   mind ${p.baseStats.mind}`);

    log('\nDerived stats:');
    const ds = p.derivedStats;
    log(`  physical  attack ${ds.physicalAttack}    skill ${ds.physicalSkill}    defense ${ds.physicalDefense}`);
    log(`  mental    attack ${ds.mentalAttack}      skill ${ds.mentalSkill}      defense ${ds.mentalDefense}`);
    log(`  emotional attack ${ds.emotionalAttack}   skill ${ds.emotionalSkill}   defense ${ds.emotionalDefense}`);
    log(`  luck      ${ds.luck}`);

    log('\nNon-combat stats:');
    const nc = p.nonCombatStats;
    log(`  physical  save ${nc.physicalSave}    test ${nc.physicalTest}`);
    log(`  mental    save ${nc.mentalSave}      test ${nc.mentalTest}`);
    log(`  emotional save ${nc.emotionalSave}   test ${nc.emotionalTest}`);

    log('\nEquipment:');
    const slots = ['weapon', 'armor', 'accessory', 'head', 'body', 'hands', 'feet'] as const;
    for (const slot of slots) {
        const eq = p.equipment[slot];
        if (!eq) {
            log(`  ${slot.padEnd(10)} (empty)`);
        } else {
            const rarity = eq.rarity ? ` [${eq.rarity}]` : '';
            log(`  ${slot.padEnd(10)} ${eq.name}${rarity}`);
        }
    }

    log('\nActive effects:');
    if (p.effects.length === 0) {
        log('  (none)');
    } else {
        for (const e of p.effects) {
            log(`  • ${e.effectId}  intensity ${e.intensity}  remaining ${e.remainingDuration}`);
        }
    }

    log('\nSkills:');
    log(`  Known:    ${p.knownSkills.length > 0 ? p.knownSkills.join(', ') : '(none)'}`);
    log(`  Equipped: ${p.equippedSkills.length > 0 ? p.equippedSkills.join(', ') : '(none)'}`);

    log('\nInventory summary:');
    const grouped = new Map<string, number>();
    for (const item of p.inventory) {
        const qty = isConsumable(item) ? item.quantity : 1;
        grouped.set(item.category, (grouped.get(item.category) ?? 0) + qty);
    }
    if (grouped.size === 0) {
        log('  (empty)');
    } else {
        for (const [cat, count] of grouped) {
            log(`  ${cat}: ${count}`);
        }
    }
}

async function debugTab(store: GameStoreHandle): Promise<void> {
    const slugs = Object.keys(ENEMY_REGISTRY) as EnemySlug[];
    const { slug } = await prompt<{ slug: EnemySlug }>([{
        type: 'rawlist', name: 'slug',
        message: 'Spawn which enemy?',
        choices: slugs.map(s => ({ name: `${s} — ${ENEMY_REGISTRY[s].name}`, value: s })),
    }]);
    const enemy = ENEMY_REGISTRY[slug];
    store.getState().startCombat({ enemies: [enemy] });
    log(`\nSpawned ${enemy.name}. Resolving combat...\n`);
    await combatTab(store);
}

async function main(): Promise<void> {
    const flags = parseArgv(process.argv.slice(2));
    if (flags.jsonEvents) setOutputMode('json');
    if (flags.scriptPath) {
        const raw = fs.readFileSync(flags.scriptPath, 'utf-8');
        const answers = JSON.parse(raw);
        if (!Array.isArray(answers)) {
            throw new Error('--script JSON must be a top-level array of answer objects.');
        }
        setIoMode({ kind: 'script', answers });
    } else if (flags.stdin) {
        setIoMode({ kind: 'stdin' });
    }

    log('Axiomancer — game loop demo.\n');
    const store = await bootstrapStore();

    try {
        while (true) {
            const tab = await pickTab(store.getState().combat !== null);
            switch (tab) {
                case 'map':       await mapTab(store);       break;
                case 'combat':    await combatTab(store);    break;
                case 'journal':   journalTab(store);         break;
                case 'skills':    skillsTab(store);          break;
                case 'inventory': inventoryTab(store);       break;
                case 'character': characterTab(store);       break;
                case 'debug':     await debugTab(store);     break;
                case 'quit':
                    log('Goodbye.');
                    emit({ type: 'cli:exit', payload: { reason: 'quit' } });
                    return;
            }
        }
    } catch (err) {
        emit({ type: 'cli:exit', payload: { reason: 'error', message: String(err) } });
        throw err;
    }
}

main();
