/**
 * Loadout builder — turns a matrix cell into a real `Character`.
 *
 * "Authored base + procedural fill": each (playstyle) carries an authored
 * stat-distribution intent; the builder distributes the `level × 5` budget by
 * that intent, then procedurally fills equipment slots with the best
 * level-appropriate templates and grants every level-appropriate skill so the
 * policy has a full toolkit to choose from.
 */

import { createCharacter } from '../Character';
import type { Character, BaseStats } from '../Character/types';
import { equipmentTemplates } from '../Items/equipment.templates';
import { dropItem } from '../Items/item.factory';
import type { Equipment, EquipmentSlot, ItemRarity } from '../Items/types';
import { skillLibrary, getSkillById } from '../Skills';
import type { PlaytestPolicy } from '../Playtest/types';
import type { MatrixCell } from './types';

const SLOTS: EquipmentSlot[] = ['weapon', 'armor', 'accessory', 'head', 'body', 'hands', 'feet'];

/** Authored stat-distribution intent per playstyle (heart/body/mind weights). */
const PLAYSTYLE_WEIGHTS: Record<string, BaseStats> = {
    aggressive: { heart: 1, body: 3, mind: 1 },
    defensive: { heart: 2, body: 2, mind: 1 },
    mixed: { heart: 1, body: 1, mind: 1 },
    strategist: { heart: 1, body: 1, mind: 3 },
};

const PLAYER_STAT_PER_LEVEL = 5;

/** Distribute a total budget across heart/body/mind by weights (exact sum). */
function distribute(total: number, weights: BaseStats): BaseStats {
    const sum = weights.heart + weights.body + weights.mind || 1;
    const floored: BaseStats = {
        heart: Math.floor((weights.heart / sum) * total),
        body: Math.floor((weights.body / sum) * total),
        mind: Math.floor((weights.mind / sum) * total),
    };
    let remainder = total - (floored.heart + floored.body + floored.mind);
    const order = (['body', 'mind', 'heart'] as (keyof BaseStats)[])
        .sort((a, b) => weights[b] - weights[a]);
    let i = 0;
    while (remainder > 0) {
        floored[order[i % order.length]!] += 1;
        remainder -= 1;
        i += 1;
    }
    return floored;
}

function rarityForLevel(level: number): ItemRarity {
    if (level >= 25) return 'rare';
    if (level >= 8) return 'uncommon';
    return 'common';
}

/** Best (highest requiredLevel ≤ level) template for a slot, if any. */
function bestTemplateForSlot(slot: EquipmentSlot, level: number): string | undefined {
    const candidates = equipmentTemplates
        .filter(t => t.slot === slot && t.requiredLevel <= level)
        .sort((a, b) => b.requiredLevel - a.requiredLevel);
    return candidates[0]?.id;
}

/** Every skill the character is high enough level to know, biased by playstyle. */
function eligibleSkills(level: number, playstyle: PlaytestPolicy): string[] {
    const eligible = skillLibrary.filter(s => (s.learningRequirement?.level ?? 1) <= level);
    // Light playstyle bias: sort preferred skills first so the legacy ≤4
    // equipped rotation leans into the playstyle. The full set stays known.
    const score = (id: string): number => {
        const s = getSkillById(id);
        if (!s) return 0;
        switch (playstyle) {
            case 'aggressive': return s.targetType === 'enemy' ? s.basePower : -5;
            case 'defensive': return s.targetType === 'self' ? 10 : 0;
            case 'strategist': return (s.synergy ? 8 : 0) + (s.combatEffects?.length ? 6 : 0);
            default: return s.tier;
        }
    };
    return eligible
        .map(s => s.id)
        .sort((a, b) => score(b) - score(a) || a.localeCompare(b));
}

/**
 * Build the `Character` for a cell. Deterministic given `rng`.
 */
export function buildLoadoutCharacter(cell: MatrixCell, rng: () => number = Math.random): Character {
    const weights = PLAYSTYLE_WEIGHTS[cell.playstyle] ?? PLAYSTYLE_WEIGHTS.mixed!;
    const baseStats = distribute(cell.level * PLAYER_STAT_PER_LEVEL, weights);

    const equipment: Partial<Record<EquipmentSlot, Equipment>> = {};
    for (const slot of SLOTS) {
        const templateId = bestTemplateForSlot(slot, cell.level);
        if (!templateId) continue;
        // Try the level-appropriate rarity; fall back to common if the slot's
        // procedural mod pool can't supply enough mods at this level.
        try {
            equipment[slot] = dropItem(templateId, cell.level, rarityForLevel(cell.level), rng);
        } catch {
            equipment[slot] = dropItem(templateId, cell.level, 'common', rng);
        }
    }

    const known = eligibleSkills(cell.level, cell.playstyle);
    const equipped = known.slice(0, 4);

    return createCharacter({
        name: `Tuning L${cell.level} ${cell.playstyle}`,
        level: cell.level,
        baseStats,
        equipment,
        knownSkills: known,
        equippedSkills: equipped,
    });
}
