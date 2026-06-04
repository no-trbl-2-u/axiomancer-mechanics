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

function strategicSkillPriority(combat: CombatState, skillId: string): number {
    const skill = getSkillById(skillId);
    if (!skill) return 0;

    let score = 0;
    if (skill.combatEffects?.length) score += 10;
    if (skill.synergy) score += 8;
    if (skill.specialMechanics?.length) score += 5;
    if (skill.incrementsFriendship) score += 2;

    const predicate = skill.synergy?.predicate;
    if (predicate) {
        const effects = predicate.on === 'caster' ? combat.player.effects : combat.enemy.effects;
        const satisfied = effects.some(effect =>
            effect.effectId === predicate.effectId
            && effect.intensity >= (predicate.intensityMin ?? 0)
            && effect.remainingDuration >= (predicate.durationMin ?? 0),
        );
        if (satisfied) score += 20;
    }

    return score;
}

function bestStrategistSkill(combat: CombatState): string | undefined {
    return affordableSkills(combat)
        .map(skillId => ({ skillId, score: strategicSkillPriority(combat, skillId) }))
        .sort((a, b) => b.score - a.score || a.skillId.localeCompare(b.skillId))[0]?.skillId;
}

function firstConsumableId(combat: CombatState): string | undefined {
    const found = combat.player.inventory.find(item => 'quantity' in item && typeof item.quantity === 'number' && item.quantity > 0);
    return found?.id;
}

function randomIndex(maxExclusive: number): number {
    return Math.floor(getRng().random() * maxExclusive);
}

export function selectPolicyAction(policy: PlaytestPolicy, combat: CombatState): CombatAction {
    if (combat.phase === 'mercy_choice' || combat.mercyChoiceActive) {
        return {
            stance: 'heart',
            action: policy === 'mercy-exploit' ? 'exploit' : 'spare',
        };
    }

    if (policy === 'mixed') {
        const rotation: PlaytestPolicy[] = ['aggressive', 'defensive', 'strategist'];
        return selectPolicyAction(rotation[(combat.round - 1) % rotation.length]!, combat);
    }

    if (policy === 'friendship') {
        return { stance: 'heart', action: 'defend' };
    }

    if (policy === 'mercy' || policy === 'mercy-exploit') {
        const enemyHpPct = combat.enemy.health / combat.enemy.maxHealth;
        // Check if enemy has befriendability config with HP gate
        const hpGate = combat.enemy.befriendabilityConfig?.hpGate?.belowPct ?? 0.4;
        
        // If enemy is above HP gate, damage them
        if (enemyHpPct > hpGate) {
            return { stance: 'body', action: 'attack' };
        }
        
        const befriend = getSkillById('befriend');
        if (befriend && combat.player.knownSkills.includes('befriend') && canUseSkill(combat.combatResources, befriend)) {
            return { stance: 'heart', action: 'skill', skillId: 'befriend' };
        }

        // Once below HP gate, build Heart tokens toward Befriend.
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

    if (policy === 'strategist') {
        const enemyHpPct = combat.enemy.health / combat.enemy.maxHealth;
        const hpGate = combat.enemy.befriendabilityConfig?.hpGate?.belowPct;
        const befriend = getSkillById('befriend');
        if (befriend
            && hpGate !== undefined
            && enemyHpPct <= hpGate
            && combat.player.knownSkills.includes('befriend')
            && canUseSkill(combat.combatResources, befriend)) {
            return { stance: 'heart', action: 'skill', skillId: 'befriend' };
        }

        const skillId = bestStrategistSkill(combat);
        if (skillId) {
            const skill = getSkillById(skillId);
            return { stance: skill?.philosophicalAspect ?? pickStance(combat.round), action: 'skill', skillId };
        }
        return { stance: pickStance(combat.round), action: 'defend' };
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
