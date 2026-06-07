import type { CombatAction, CombatState, Stance } from '../Combat';
import type { PlaytestPolicy, PolicyContext } from './types';
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

    let score = skill.tier * 6;
    const enemyHpPct = combat.enemy.health / combat.enemy.maxHealth;
    const playerHpPct = combat.player.health / combat.player.maxHealth;

    if (skill.targetType === 'enemy') {
        score += skill.basePower * 2;
        if (enemyHpPct > 0.2) score += 6;
    }

    if (skill.targetType === 'self') {
        score += playerHpPct < 0.45 ? 24 : -12;
        if (skill.basePower > 0 || skill.scalingMultiplier) score += 8;
    }

    if (skill.combatEffects?.length) score += 12;
    if (skill.specialMechanics?.length) score += 8;
    if (skill.incrementsFriendship) score += 2;

    const predicate = skill.synergy?.predicate;
    if (skill.synergy) score += 8;
    if (predicate) {
        const effects = predicate.on === 'caster' ? combat.player.effects : combat.enemy.effects;
        const satisfied = effects.some(effect =>
            effect.effectId === predicate.effectId
            && effect.intensity >= (predicate.intensityMin ?? 0)
            && effect.remainingDuration >= (predicate.durationMin ?? 0),
        );
        score += satisfied ? 28 : -10;
    } else if (skill.synergy) {
        score += 18;
    }

    const totalResourceCost = Object.values(skill.resourceCost || {}).reduce((sum, cost) => sum + cost, 0);
    score -= totalResourceCost;

    const hpGate = combat.enemy.befriendabilityConfig?.hpGate?.belowPct;
    if (hpGate && enemyHpPct <= hpGate + 0.1) {
        if (skillId === 'befriend') score += 30;
        else if (skill.targetType === 'enemy' && skill.basePower > 0) score -= 10;
    }

    return score;
}

function bestStrategistSkill(combat: CombatState): string | undefined {
    return affordableSkills(combat)
        .map(skillId => ({ skillId, score: strategicSkillPriority(combat, skillId) }))
        .filter(candidate => candidate.score > 0)
        .sort((a, b) => b.score - a.score || a.skillId.localeCompare(b.skillId))[0]?.skillId;
}

function bestPressureSkill(combat: CombatState): string | undefined {
    return affordableSkills(combat)
        .map(skillId => ({ skillId, score: strategicSkillPriority(combat, skillId) }))
        .filter(({ skillId }) => getSkillById(skillId)?.targetType === 'enemy')
        .sort((a, b) => b.score - a.score || a.skillId.localeCompare(b.skillId))[0]?.skillId;
}

function stanceToBuildForStrategist(combat: CombatState): Stance {
    const resources = combat.combatResources;
    if (resources.fallacy > 0 && resources.body < 3) return 'body';
    if (resources.paradox > 0 && resources.mind < 2) return 'mind';
    if (resources.body < 3) return 'body';
    if (resources.mind < 3) return 'mind';
    if (resources.heart < 3) return 'heart';
    return pickStance(combat.round);
}

function firstConsumableId(combat: CombatState): string | undefined {
    const found = combat.player.inventory.find(item => 'quantity' in item && typeof item.quantity === 'number' && item.quantity > 0);
    return found?.id;
}

function randomIndex(maxExclusive: number): number {
    return Math.floor(getRng().random() * maxExclusive);
}

export function selectPolicyAction(
    policy: PlaytestPolicy,
    combat: CombatState,
    ctx?: PolicyContext,
): CombatAction {
    if (combat.phase === 'mercy_choice' || combat.mercyChoiceActive) {
        return {
            stance: 'heart',
            action: policy === 'mercy-exploit' ? 'exploit' : 'spare',
        };
    }

    if (policy === 'mixed') {
        const rotation: PlaytestPolicy[] = ['aggressive', 'defensive', 'strategist'];
        return selectPolicyAction(rotation[(combat.round - 1) % rotation.length]!, combat, ctx);
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
        const pressureSkill = hpFraction > 0.55 ? bestPressureSkill(combat) : undefined;
        if (pressureSkill) {
            return { stance: getSkillById(pressureSkill)?.philosophicalAspect ?? 'body', action: 'skill', skillId: pressureSkill };
        }
        return hpFraction < 0.55
            ? { stance: 'heart', action: 'defend' }
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

        // Cross-run knowledge (tuning workflow): if the advisor recommends a
        // learned-effective skill that is affordable, prefer it. This lets the
        // strategist exploit weaknesses discovered in earlier matrix runs.
        const advisorKey = ctx?.enemyKey ?? combat.enemy.id;
        const learnedSkillId = ctx?.strategist?.recommendSkill(advisorKey);
        if (learnedSkillId
            && combat.player.knownSkills.includes(learnedSkillId)) {
            const learned = getSkillById(learnedSkillId);
            if (learned && canUseSkill(combat.combatResources, learned)
                && strategicSkillPriority(combat, learnedSkillId) > 0) {
                return { stance: learned.philosophicalAspect, action: 'skill', skillId: learnedSkillId };
            }
        }

        // Use best strategic skill if available and worthwhile
        const skillId = bestStrategistSkill(combat);
        if (skillId) {
            const skill = getSkillById(skillId);
            const skillScore = strategicSkillPriority(combat, skillId);

            // The strategist is the skill/status witness: spend resources on
            // meaningful effects instead of hoarding them while basic-attacking.
            if (skillScore > 8) {
                return { stance: skill?.philosophicalAspect ?? pickStance(combat.round), action: 'skill', skillId };
            }
        }

        // Bias basic-action stance toward the enemy's learned-weak stance when
        // the advisor has one; otherwise fall back to the resource-building stance.
        const learnedStance = ctx?.strategist?.recommendStance(advisorKey);
        const buildStance = learnedStance ?? stanceToBuildForStrategist(combat);

        // Strategic basic action selection based on situation
        if (playerHpPct < 0.5) {
            return { stance: buildStance, action: 'defend' };
        } else if (combat.combatResources.heart + combat.combatResources.body + combat.combatResources.mind < 3) {
            return { stance: buildStance, action: 'attack' };
        } else if (enemyHpPct > 0.8) {
            return { stance: buildStance, action: 'attack' };
        } else {
            return { stance: buildStance, action: 'attack' };
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

    const pressureSkill = bestPressureSkill(combat);
    if (pressureSkill) {
        return { stance: getSkillById(pressureSkill)?.philosophicalAspect ?? 'body', action: 'skill', skillId: pressureSkill };
    }
    return { stance: 'body', action: 'attack' };
}
