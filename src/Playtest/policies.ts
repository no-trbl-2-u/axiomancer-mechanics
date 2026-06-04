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
    
    // Basic skill value assessment
    if (skill.combatEffects?.length) score += 10;
    if (skill.synergy) score += 8;
    if (skill.specialMechanics?.length) score += 5;
    if (skill.incrementsFriendship) score += 2;

    // Synergy predicate satisfaction
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

    // Enemy state considerations
    const enemyHpPct = combat.enemy.health / combat.enemy.maxHealth;
    const playerHpPct = combat.player.health / combat.player.maxHealth;

    // Prioritize damage skills when enemy is healthy and player isn't in danger
    if (skill.targetType === 'enemy' && skill.basePower > 0 && enemyHpPct > 0.6 && playerHpPct > 0.4) {
        score += 5;
    }

    // Prioritize healing skills when player is low HP
    if (skill.targetType === 'self' && skill.basePower > 0 && playerHpPct < 0.4) {
        score += 15;
    }

    // Status effect considerations
    const enemyHasDebuffs = combat.enemy.effects.some(effect => 
        effect.effectId.includes('debuff') || effect.effectId.includes('weaken') || 
        effect.effectId.includes('poison') || effect.effectId.includes('slow')
    );
    const playerHasBuffs = combat.player.effects.some(effect =>
        effect.effectId.includes('buff') || effect.effectId.includes('strengthen') || 
        effect.effectId.includes('haste') || effect.effectId.includes('shield')
    );

    // Prioritize self-buffing when player lacks beneficial effects
    if (skill.combatEffects?.some(effect => effect.appliedTo === 'self' && effect.effectId.includes('buff')) && !playerHasBuffs) {
        score += 8;
    }

    // Prioritize enemy debuffing when enemy lacks debuffs
    if (skill.combatEffects?.some(effect => effect.appliedTo === 'opponent' && effect.effectId.includes('debuff')) && !enemyHasDebuffs) {
        score += 6;
    }

    // Resource efficiency considerations
    const totalResourceCost = Object.values(skill.resourceCost || {}).reduce((sum, cost) => sum + cost, 0);
    const availableResources = combat.combatResources.heart + combat.combatResources.body + combat.combatResources.mind;
    
    // Prefer skills that use available resources efficiently
    if (totalResourceCost > 0 && totalResourceCost <= availableResources * 0.5) {
        score += 3; // Efficient resource usage
    } else if (totalResourceCost > availableResources * 0.8) {
        score -= 5; // Too expensive relative to available resources
    }

    // Mercy opportunity assessment
    const hpGate = combat.enemy.befriendabilityConfig?.hpGate?.belowPct;
    if (hpGate && enemyHpPct <= hpGate + 0.1) { // Near HP gate
        if (skillId === 'befriend') {
            score += 30; // Strongly prioritize befriend near mercy opportunity
        } else if (skill.targetType === 'enemy' && skill.basePower > 0) {
            score -= 10; // Deprioritize damage near mercy opportunity
        }
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
        const playerHpPct = combat.player.health / combat.player.maxHealth;
        const hpGate = combat.enemy.befriendabilityConfig?.hpGate?.belowPct;
        const befriend = getSkillById('befriend');
        
        // Prioritize befriend when mercy opportunity is available
        if (befriend
            && hpGate !== undefined
            && enemyHpPct <= hpGate
            && combat.player.knownSkills.includes('befriend')
            && canUseSkill(combat.combatResources, befriend)) {
            return { stance: 'heart', action: 'skill', skillId: 'befriend' };
        }

        // Consider using items when critically low on health
        const itemId = playerHpPct < 0.25 ? firstConsumableId(combat) : undefined;
        if (itemId) return { stance: 'body', action: 'item', itemId };

        // Use best strategic skill if available and worthwhile
        const skillId = bestStrategistSkill(combat);
        if (skillId) {
            const skill = getSkillById(skillId);
            const skillScore = strategicSkillPriority(combat, skillId);
            
            // Only use skill if it has significant strategic value (score > 10)
            if (skillScore > 10) {
                return { stance: skill?.philosophicalAspect ?? pickStance(combat.round), action: 'skill', skillId };
            }
        }

        // Strategic basic action selection based on situation
        if (playerHpPct < 0.5) {
            // Defensive play when low health
            return { stance: 'body', action: 'defend' };
        } else if (enemyHpPct > 0.8) {
            // Aggressive play when enemy is healthy
            return { stance: 'body', action: 'attack' };
        } else if (combat.combatResources.heart + combat.combatResources.body + combat.combatResources.mind < 3) {
            // Build resources when low
            return { stance: pickStance(combat.round), action: 'defend' };
        } else {
            // Default to attack for pressure
            return { stance: 'body', action: 'attack' };
        }
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
