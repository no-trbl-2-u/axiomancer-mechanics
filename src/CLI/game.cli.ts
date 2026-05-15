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
import { parseArgv, prompt, emit, log, logState, setIoMode, setOutputMode, setStateLogPath } from './io';

import { characterPresets, getPresetById, buildCharacterFromPreset } from '../Character';
import { ENEMY_REGISTRY, type EnemySlug } from '../Enemy/enemy.library';
import { createGameStore } from '../Game/store';
import { createEventEmitter } from '../Game/events';
import { nullAdapter } from '../Game/persistence/null.adapter';
import { createNodeAdapter } from '../Game/persistence/node.adapter';
import type { PersistenceAdapter } from '../Game/persistence/types';
import { getMapDefinition } from '../World/map.registry';
import { resolveMapEvent } from '../World';
import type { ResolvedEvent } from '../World';
import { isCombatOngoing, determineEnemyAction, resolveCombatRound } from '../Combat';
import { Stance, CombatState, CombatAction, Action } from '../Combat/types';
import { getSkillById } from '../Skills/skill.library';
import { canUseSkill } from '../Skills/skill.engine';
import { isConsumable } from '../Items/types';
import { CombatEndReport } from '../Game/store';

type Tab = 'map' | 'combat' | 'journal' | 'skills' | 'inventory' | 'character' | 'debug' | 'save' | 'load' | 'quit';

type GameStoreHandle = ReturnType<typeof createGameStore>;

const skillLookup = (id: string) => getSkillById(id);

async function bootstrapStore(adapter: PersistenceAdapter): Promise<GameStoreHandle> {
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

    const store = createGameStore(adapter, { player }, events);
    logState('bootstrap', null, store.getState(), { presetId: preset.id });
    return store;
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
        { name: 'Save       — write the current state to the save file', value: 'save' },
        { name: 'Load       — restore state from the save file', value: 'load' },
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

    const beforeMove = store.getState();
    store.getState().moveToNode(target);
    log(`Moved to ${target}.`);
    logState('moveToNode', beforeMove, store.getState(), { target });

    // Spec 23 — resolve the node's MapEvent from the registered pools.
    const before = store.getState();
    const result = resolveMapEvent(before);
    store.setState({
        player: result.state.player,
        world:  result.state.world,
        quests: result.state.quests,
        flags:  result.state.flags,
    });
    logState('resolveMapEvent', before, store.getState(), result.event);
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
    // equipped skill they can afford. Only offer the item option when
    // the player carries at least one consumable. Keeps the prompt
    // clean for the common case.
    const player = combat.player;
    const affordableSkillIds = player.equippedSkills.filter(id => {
        const def = skillLookup(id);
        return def !== undefined && canUseSkill(combat.combatResources, def);
    });
    const consumables = player.inventory.filter(isConsumable);
    const actionChoices: Action[] = ['attack', 'defend'];
    if (affordableSkillIds.length > 0) actionChoices.push('skill');
    if (consumables.length > 0) actionChoices.push('item');

    const { action } = await prompt<{ action: Action }>([
        { type: 'rawlist', name: 'action', message: 'Action?',
          choices: actionChoices },
    ]);

    if (action === 'skill') {
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

    if (action === 'item') {
        // Pick which consumable to use. Show name + remaining quantity
        // so the player can budget across the fight.
        const itemChoices = consumables.map(c => ({
            name: `${c.name}  ×${c.quantity}`,
            value: c.id,
        }));
        const { itemId } = await prompt<{ itemId: string }>([
            { type: 'rawlist', name: 'itemId', message: 'Which item?', choices: itemChoices },
        ]);
        return { stance, action: 'item', itemId };
    }

    return { stance, action };
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
        const before = store.getState();
        const { state: next, combatEvents } = resolveCombatRound(
            combat,
            playerAction,
            enemyAction,
            skillLookup,
        );
        store.getState().updateCombat(next);
        logState('combatRound', before, store.getState(), {
            playerAction, enemyAction, eventCount: combatEvents.length,
        });
        combat = store.getState().combat;
        log(
            `  player HP ${combat?.player.health}/${combat?.player.maxHealth}` +
            `  ·  enemy HP ${combat?.enemy.health}/${combat?.enemy.maxHealth}`,
        );
    }

    const beforeEnd = store.getState();
    const report: CombatEndReport = store.getState().endCombat();
    logState('endCombat', beforeEnd, store.getState(), report);
    log(`\nCombat ended: ${report.outcome}  ·  XP +${report.xpGained}  ·  loot ×${report.loot.length}`);
    if (report.outcome === 'victory') {
        const beforeLevel = store.getState();
        store.getState().levelUp();
        logState('levelUp', beforeLevel, store.getState());
    }
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

async function characterTab(store: GameStoreHandle): Promise<void> {
    const state = store.getState();
    const p = state.player;

    log('\n— Character Sheet —');
    log(`Name:     ${p.name}`);
    log(`Level:    ${p.level}  (XP ${p.experience}/${p.experienceToNextLevel})`);
    log(`Health:   ${p.health}/${p.maxHealth}`);
    log(`Currency: ${p.currency}`);
    log(`Moral:    ${state.moralMeter}`);
    if (p.availableStatPoints > 0) {
        log(`Points:   ${p.availableStatPoints} available to allocate`);
    }

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

    // Spec 06 Q3 + Q8 — deferred allocation. Prompt only when there are
    // points to spend; loop until the player either spends them all or
    // picks "leave them unspent". Each allocation is a dispatch so the
    // autosave + state-log records reflect the change.
    while (store.getState().player.availableStatPoints > 0) {
        const pool = store.getState().player.availableStatPoints;
        const { stat } = await prompt<{ stat: 'heart' | 'body' | 'mind' | 'skip' }>([{
            type: 'rawlist', name: 'stat',
            message: `Allocate stat point (${pool} remaining)?`,
            choices: [
                { name: 'heart  — emotion / willpower / charisma', value: 'heart' },
                { name: 'body   — physical / constitution',         value: 'body'  },
                { name: 'mind   — intelligence / reflexes',         value: 'mind'  },
                { name: 'leave them unspent',                       value: 'skip'  },
            ],
        }]);
        if (stat === 'skip') break;
        const before = store.getState();
        store.getState().allocateStatPoint(stat);
        logState('allocateStatPoint', before, store.getState(), { stat });
        log(`Allocated 1 point to ${stat}.`);
    }
}

function saveTab(store: GameStoreHandle, snapshotAdapter: PersistenceAdapter | null): void {
    // The Save tab writes the current state to the snapshot slot
    // (a separate adapter from any autosave path). This keeps explicit
    // save / load decoupled from the dispatch-time autosave, so a Load
    // can roll the player back to a labelled checkpoint even after
    // subsequent dispatches have written newer autosave state.
    if (!snapshotAdapter) {
        log('\nNo save slot — pass --save-file <path> to enable Save / Load.');
        logState('save', store.getState(), store.getState(), { result: 'no-slot' });
        return;
    }
    const before = store.getState();
    const { currentEncounter: _drop, ...persistable } = before;
    snapshotAdapter.save(persistable);
    logState('save', before, store.getState());
    emit({ type: 'game:saved', payload: { state: store.getState() } });
    log('\nGame saved.');
}

function loadTab(store: GameStoreHandle, snapshotAdapter: PersistenceAdapter | null): void {
    if (!snapshotAdapter) {
        log('\nNo save slot — pass --save-file <path> to enable Save / Load.');
        logState('load', store.getState(), store.getState(), { result: 'no-slot' });
        return;
    }
    const saved = snapshotAdapter.load();
    if (!saved) {
        log('\nNo save file to load — Save first.');
        logState('load', store.getState(), store.getState(), { result: 'no-save' });
        return;
    }
    const before = store.getState();
    store.setState({
        version:    saved.version,
        player:     saved.player,
        world:      saved.world,
        combat:     saved.combat,
        quests:     saved.quests,
        flags:      saved.flags,
        moralMeter: saved.moralMeter,
        rngState:   saved.rngState,
    });
    logState('load', before, store.getState());
    emit({ type: 'game:loaded', payload: { state: store.getState() } });
    log('\nGame loaded.');
}

async function debugTab(store: GameStoreHandle): Promise<void> {
    const slugs = Object.keys(ENEMY_REGISTRY) as EnemySlug[];
    const { slug } = await prompt<{ slug: EnemySlug }>([{
        type: 'rawlist', name: 'slug',
        message: 'Spawn which enemy?',
        choices: slugs.map(s => ({ name: `${s} — ${ENEMY_REGISTRY[s].name}`, value: s })),
    }]);
    const enemy = ENEMY_REGISTRY[slug];
    const before = store.getState();
    store.getState().startCombat({ enemies: [enemy] });
    logState('debugSpawn', before, store.getState(), { slug, enemyName: enemy.name });
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
    if (flags.stateLogPath) {
        setStateLogPath(flags.stateLogPath);
    }

    log('Axiomancer — game loop demo.\n');

    // The Save / Load tabs use a dedicated snapshot adapter pointed at
    // the user-supplied --save-file path. The store itself uses
    // nullAdapter so dispatch-time autosaves don't overwrite an explicit
    // snapshot between Save and Load tabs (this is what makes Load a
    // meaningful rollback rather than a re-read of the latest dispatch).
    const snapshotAdapter: PersistenceAdapter | null = flags.saveFile
        ? createNodeAdapter(flags.saveFile)
        : null;

    const store = await bootstrapStore(nullAdapter);

    try {
        while (true) {
            const tab = await pickTab(store.getState().combat !== null);
            switch (tab) {
                case 'map':       await mapTab(store);                       break;
                case 'combat':    await combatTab(store);                    break;
                case 'journal':   journalTab(store);                         break;
                case 'skills':    skillsTab(store);                          break;
                case 'inventory': inventoryTab(store);                       break;
                case 'character': await characterTab(store);                 break;
                case 'debug':     await debugTab(store);                     break;
                case 'save':      saveTab(store, snapshotAdapter);           break;
                case 'load':      loadTab(store, snapshotAdapter);           break;
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
