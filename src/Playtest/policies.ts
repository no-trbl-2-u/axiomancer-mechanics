import type { CombatAction, CombatState, Stance } from '../Combat';
import type { PlaytestPolicy } from './types';
import { canUseSkill, getSkillById } from '../Skills';
import { getRng } from '../Utils/rng';

const STANCES: Stance[] = ['heart', 'body', 'mind'];

function pickStance(round: number): Stance {
    return STANCES[(round - 1) % STANCES.length]!;
}

function affordableSkills(combat: CombatState): string[] {
    return combat.player.knownSkills.filter(id => {
        const skill = getSkillById(id);
        return skill !== undefined && canUseSkill(combat.combatResources, skill);
    });
}

function firstConsumableId(combat: CombatState): string | undefined {
    const found = combat.player.inventory.find(item => 'quantity' in item && typeof item.quantity === 'number' && item.quantity > 0);
    return found?.id;
}

function randomIndex(maxExclusive: number): number {
    return Math.floor(getRng().random() * maxExclusive);
}

export function selectPolicyAction(policy: PlaytestPolicy, combat: CombatState): CombatAction {
    if (policy === 'mixed') {
        const rotation: PlaytestPolicy[] = ['aggressive', 'defensive', 'friendship', 'resource-optimal', 'random'];
        return selectPolicyAction(rotation[(combat.round - 1) % rotation.length]!, combat);
    }

    if (policy === 'friendship') {
        return { stance: 'heart', action: 'defend' };
    }

    if (policy === 'defensive') {
        const hpFraction = combat.player.health / combat.player.maxHealth;
        const itemId = hpFraction < 0.45 ? firstConsumableId(combat) : undefined;
        if (itemId) return { stance: 'body', action: 'item', itemId };
        return hpFraction < 0.7
            ? { stance: 'body', action: 'defend' }
            : { stance: 'body', action: 'attack' };
    }

    if (policy === 'resource-optimal') {
        const skills = affordableSkills(combat);
        if (skills.length > 0) {
            return { stance: pickStance(combat.round), action: 'skill', skillId: skills[0] };
        }
        return { stance: pickStance(combat.round), action: 'attack' };
    }

    if (policy === 'random') {
        const stance = STANCES[randomIndex(STANCES.length)]!;
        const skills = affordableSkills(combat);
        const itemId = firstConsumableId(combat);
        const actions: CombatAction[] = [
            { stance, action: 'attack' },
            { stance, action: 'defend' },
        ];
        if (skills.length > 0) actions.push({ stance, action: 'skill', skillId: skills[randomIndex(skills.length)] });
        if (itemId) actions.push({ stance, action: 'item', itemId });
        return actions[randomIndex(actions.length)]!;
    }

    const skills = affordableSkills(combat);
    if (skills.length > 0 && combat.round % 3 === 0) {
        return { stance: 'body', action: 'skill', skillId: skills[0] };
    }
    return { stance: 'body', action: 'attack' };
}
