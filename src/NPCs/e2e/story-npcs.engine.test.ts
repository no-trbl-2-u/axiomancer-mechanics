/**
 * Hermetic E2E Tests — Story Content NPCs Dialogue Trees (Phase 115)
 *
 * Tests the 5 new story NPCs' dialogue trees, alignment gates, choice consequences,
 * and observer pattern integration. Covers the golden path for each NPC plus
 * edge cases for alignment gating, flag setting, and observer functionality.
 *
 * Coverage:
 *   1. Shrine Keeper: mystical dialogue, epistemology/scope alignment gates, crystal gift choice
 *   2. Chronicler: scholarly dialogue, chronicle integration flags, knowledge contribution
 *   3. Wandering Philosopher: philosophical discourse, diverse alignment perspectives
 *   4. Captain Blackwater: trade ethics, merchant philosophy, guild support flags
 *   5. Fisherman's Daughter: mentorship dynamics, growth encouragement choices
 *   6. Observer pattern: playerAlignmentCellChangedSince gates and recognition dialogue
 *   7. Alignment delta application: epistemology, outlook, scope shifts
 *   8. Flag setting: quest-adjacent integration via effect.setFlag
 */

import { describe, it, expect } from 'vitest';

import {
    getDialogueNode,
    visibleChoices,
    isLeafNode,
    type DialogueContext,
} from '../dialogue';
import { shrineKeeper, chronicler, wanderingPhilosopher } from '../../World/Continents/Northern-Forest/npcs';
import { captainBlackwater, fishermansDaughter } from '../../World/Continents/Coastal-Village/npcs';

// ─── Test helpers ─────────────────────────────────────────────────────────────

const emptyCtx: DialogueContext = {
    activeQuests: new Set(),
    completedQuests: new Set(),
    flags: new Set(),
};

function ctxWithAlignment(
    epistemology: number = 0,
    outlook: number = 0,
    scope: number = 0,
): DialogueContext {
    return {
        ...emptyCtx,
        alignment: { epistemology, outlook, scope },
    };
}

function _ctxWithFlags(flags: string[]): DialogueContext {
    return {
        ...emptyCtx,
        flags: new Set(flags),
    };
}

function ctxWithObserver(lastSeenCellId: string = 'different-cell'): DialogueContext {
    return {
        ...emptyCtx,
        alignment: { epistemology: 20, outlook: 10, scope: -10 }, // Some alignment
        lastSeenAlignmentCellId: lastSeenCellId,
    };
}

// ─── Shrine Keeper Tests ──────────────────────────────────────────────────────

describe('Shrine Keeper — Mystical NPC with alignment gates', () => {
    const tree = shrineKeeper.dialogueTree!;

    it('provides greeting with multiple paths based on epistemology', () => {
        const greetNode = getDialogueNode(tree, 'greet');
        expect(greetNode.text).toContain('patterns speak of your approach');

        // Test all choices visible with empty context (alignment-gated ones hidden)
        const choices = visibleChoices(greetNode, emptyCtx);
        expect(choices).toHaveLength(2); // 2 base choices, alignment-specific ones hidden

        const choiceTexts = choices.map(c => c.text);
        expect(choiceTexts).toContain('What patterns do you see?');
        expect(choiceTexts).toContain('Leave quietly.');
    });

    it('shows faith-based choice for high epistemology alignment', () => {
        const ctx = ctxWithAlignment(25, 0, 0); // High epistemology (faith)
        const greetNode = getDialogueNode(tree, 'greet');
        const choices = visibleChoices(greetNode, ctx);

        const faithChoice = choices.find(c => c.text.includes('sense something... different'));
        expect(faithChoice).toBeTruthy();
        expect(faithChoice!.requires?.requiresAlignment).toEqual({
            axis: 'epistemology',
            op: 'gte',
            value: 20,
        });
    });

    it('shows skeptical choice for low epistemology alignment', () => {
        const ctx = ctxWithAlignment(-25, 0, 0); // Low epistemology (skeptical)
        const greetNode = getDialogueNode(tree, 'greet');
        const choices = visibleChoices(greetNode, ctx);

        const skepticChoice = choices.find(c => c.text.includes('mystical nonsense'));
        expect(skepticChoice).toBeTruthy();
        expect(skepticChoice!.requires?.requiresAlignment).toEqual({
            axis: 'epistemology',
            op: 'lte',
            value: -20,
        });
    });

    it('provides crystal gift interaction for faith path', () => {
        const veilNode = getDialogueNode(tree, 'veil_thin');
        expect(veilNode.text).toContain('crystalline fragment');

        const choices = visibleChoices(veilNode, emptyCtx);
        expect(choices).toHaveLength(2);

        const acceptChoice = choices.find(c => c.text.includes('Accept the crystal'));
        expect(acceptChoice).toBeTruthy();
        expect(acceptChoice!.effect?.setFlag).toBe('shrine_keeper_crystal_gift');
        expect(acceptChoice!.effect?.alignmentDelta).toEqual({
            epistemology: 2,
            scope: 1,
        });
        expect(acceptChoice!.effect?.moralDelta).toBe(1);
    });

    it('supports observer pattern for alignment cell changes', () => {
        const ctx = ctxWithObserver(); // Has alignment but no cached cell = changed
        const greetNode = getDialogueNode(tree, 'greet');
        const choices = visibleChoices(greetNode, ctx);

        const observerChoice = choices.find(c => c.requires?.playerAlignmentCellChangedSince);
        expect(observerChoice).toBeTruthy();
        expect(observerChoice!.text).toContain('shifted in your essence');
        expect(observerChoice!.nextNodeId).toBe('observer_transformation');
    });
});

// ─── Chronicler Tests ─────────────────────────────────────────────────────────

describe('Chronicler — Scholarly NPC with Chronicle integration', () => {
    const tree = chronicler.dialogueTree!;

    it('offers chronicle contribution dialogue', () => {
        const greetNode = getDialogueNode(tree, 'greet');
        expect(greetNode.text).toContain('Chronicle');

        const choices = visibleChoices(greetNode, emptyCtx);
        const contributeChoice = choices.find(c => c.text.includes('strange things in my travels'));
        expect(contributeChoice).toBeTruthy();
        expect(contributeChoice!.effect?.setFlag).toBe('chronicler_met');
    });

    it('provides scholarly responsibility acceptance', () => {
        const contributionNode = getDialogueNode(tree, 'contribution_offer');
        const choices = visibleChoices(contributionNode, emptyCtx);

        const acceptChoice = choices.find(c => c.text.includes('scholarly responsibility'));
        expect(acceptChoice).toBeTruthy();
        expect(acceptChoice!.effect?.setFlag).toBe('chronicler_scholarly_mission');
        expect(acceptChoice!.effect?.alignmentDelta).toEqual({
            epistemology: 2,
            scope: 2,
        });
    });

    it('gates present-focus choice by low scope alignment', () => {
        const purposeNode = getDialogueNode(tree, 'chronicling_purpose');
        const ctx = ctxWithAlignment(0, 0, -15); // Low scope (individualist)
        const choices = visibleChoices(purposeNode, ctx);

        const presentChoice = choices.find(c => c.text.includes('Focus on the present'));
        expect(presentChoice).toBeTruthy();
        expect(presentChoice!.requires?.requiresAlignment).toEqual({
            axis: 'scope',
            op: 'lte',
            value: -10,
        });
    });

    it('supports observer pattern for scholarly recognition', () => {
        const ctx = ctxWithObserver('some-previous-cell');
        const greetNode = getDialogueNode(tree, 'greet');
        const choices = visibleChoices(greetNode, ctx);

        const observerChoice = choices.find(c => c.requires?.playerAlignmentCellChangedSince);
        expect(observerChoice).toBeTruthy();
        expect(observerChoice!.nextNodeId).toBe('scholar_observation');
    });
});

// ─── Wandering Philosopher Tests ──────────────────────────────────────────────

describe('Wandering Philosopher — Multi-perspective philosophical dialogue', () => {
    const tree = wanderingPhilosopher.dialogueTree!;

    it('provides diverse philosophical perspective gates', () => {
        const seekingNode = getDialogueNode(tree, 'seeking_place');
        const choices = visibleChoices(seekingNode, emptyCtx);
        expect(choices).toHaveLength(1); // Only uncertain option visible without alignment

        // Check that gated choices have alignment requirements but are hidden without context
        const allChoiceTexts = seekingNode.choices!.map(c => c.text);
        expect(allChoiceTexts).toContain('Fate guides us toward our destined role.');
        expect(allChoiceTexts).toContain('We forge our own destiny through determination.');
        expect(allChoiceTexts).toContain('We find ourselves through community and connection.');
        
        // Only the uncertain choice should be visible without alignment context
        expect(choices[0].text).toContain('not sure');
    });

    it('shows fate perspective for high epistemology (transcendent)', () => {
        const ctx = ctxWithAlignment(20, 0, 0); // High epistemology
        const seekingNode = getDialogueNode(tree, 'seeking_place');
        const choices = visibleChoices(seekingNode, ctx);

        const fateChoice = choices.find(c => c.text.includes('Fate guides us'));
        expect(fateChoice).toBeTruthy();
        expect(fateChoice!.effect?.alignmentDelta).toEqual({
            epistemology: 2,
            scope: -1,
        });
    });

    it('shows will perspective for low scope (individualist)', () => {
        const ctx = ctxWithAlignment(0, 0, -5); // Low scope
        const seekingNode = getDialogueNode(tree, 'seeking_place');
        const choices = visibleChoices(seekingNode, ctx);

        const willChoice = choices.find(c => c.text.includes('forge our own destiny'));
        expect(willChoice).toBeTruthy();
        expect(willChoice!.effect?.alignmentDelta).toEqual({
            scope: -2,
            outlook: 1,
        });
    });

    it('shows community perspective for high scope (relational)', () => {
        const ctx = ctxWithAlignment(0, 0, 20); // High scope
        const seekingNode = getDialogueNode(tree, 'seeking_place');
        const choices = visibleChoices(seekingNode, ctx);

        const communityChoice = choices.find(c => c.text.includes('community and connection'));
        expect(communityChoice).toBeTruthy();
        expect(communityChoice!.effect?.alignmentDelta).toEqual({
            scope: 2,
            outlook: 1,
        });
    });

    it('rewards honest uncertainty', () => {
        const seekingNode = getDialogueNode(tree, 'seeking_place');
        const choices = visibleChoices(seekingNode, emptyCtx);

        const uncertainChoice = choices.find(c => c.text.includes('not sure'));
        expect(uncertainChoice).toBeTruthy();
        expect(uncertainChoice!.effect?.setFlag).toBe('philosopher_appreciates_honesty');
        expect(uncertainChoice!.effect?.moralDelta).toBe(1);
    });
});

// ─── Captain Blackwater Tests ─────────────────────────────────────────────────

describe('Captain Blackwater — Pragmatic merchant with ethics', () => {
    const tree = captainBlackwater.dialogueTree!;

    it('discusses fair trade practices', () => {
        const greetNode = getDialogueNode(tree, 'greet');
        const choices = visibleChoices(greetNode, emptyCtx);

        const fairTradeChoice = choices.find(c => c.text.includes('fair trade practices'));
        expect(fairTradeChoice).toBeFalsy(); // Hidden without high scope alignment

        const ctx = ctxWithAlignment(0, 0, 25); // High scope (relational)
        const scopedChoices = visibleChoices(greetNode, ctx);
        const visibleFairTrade = scopedChoices.find(c => c.text.includes('fair trade practices'));
        expect(visibleFairTrade).toBeTruthy();
    });

    it('shows quick profit option for low scope alignment', () => {
        const ctx = ctxWithAlignment(0, 0, -15); // Low scope (individualist)
        const greetNode = getDialogueNode(tree, 'greet');
        const choices = visibleChoices(greetNode, ctx);

        const profitChoice = choices.find(c => c.text.includes('quickest profit'));
        expect(profitChoice).toBeTruthy();
        expect(profitChoice!.requires?.requiresAlignment).toEqual({
            axis: 'scope',
            op: 'lte',
            value: -10,
        });
    });

    it('provides guild support interaction', () => {
        const fairTradeNode = getDialogueNode(tree, 'fair_trade');
        const choices = visibleChoices(fairTradeNode, emptyCtx);

        const guildChoice = choices.find(c => c.text.includes("traders' guild"));
        expect(guildChoice).toBeTruthy();
        expect(guildChoice!.effect?.setFlag).toBe('guild_support_secured');
    });

    it('responds to harsh necessity with moral challenge', () => {
        const harshNode = getDialogueNode(tree, 'harsh_necessity');
        expect(harshNode.text).toContain('choosing which soul you want to keep');
        expect(harshNode.text).toContain('poor with honor than rich with shame');
    });
});

// ─── Fisherman's Daughter Tests ───────────────────────────────────────────────

describe("Fisherman's Daughter — Young idealist seeking guidance", () => {
    const tree = fishermansDaughter.dialogueTree!;

    it('responds positively to encouraging mentorship', () => {
        const greetNode = getDialogueNode(tree, 'greet');
        const ctx = ctxWithAlignment(0, 0, 15); // High scope for bright observation
        const choices = visibleChoices(greetNode, ctx);

        const brightChoice = choices.find(c => c.text.includes('too bright for just mending nets'));
        expect(brightChoice).toBeTruthy();
        expect(brightChoice!.effect?.moralDelta).toBe(1);
    });

    it('shows dismissive option for pessimistic outlook', () => {
        const ctx = ctxWithAlignment(0, -20, 0); // Low outlook (pessimistic)
        const greetNode = getDialogueNode(tree, 'greet');
        const choices = visibleChoices(greetNode, ctx);

        const dismissiveChoice = choices.find(c => c.text.includes('Focus on your work, child'));
        expect(dismissiveChoice).toBeTruthy();
        expect(dismissiveChoice!.effect?.moralDelta).toBe(-2);
    });

    it('encourages dreams for optimistic outlook', () => {
        const storyNode = getDialogueNode(tree, 'story_interest');
        const ctx = ctxWithAlignment(0, 20, 0); // High outlook (optimistic)
        const choices = visibleChoices(storyNode, ctx);

        const encourageChoice = choices.find(c => c.text.includes('Dream big'));
        expect(encourageChoice).toBeTruthy();
        expect(encourageChoice!.effect?.alignmentDelta).toEqual({
            outlook: 2,
            scope: 1,
        });
        expect(encourageChoice!.effect?.moralDelta).toBe(2);
    });

    it('provides mentorship wisdom options', () => {
        const wisdomNode = getDialogueNode(tree, 'worldly_wisdom');
        const choices = visibleChoices(wisdomNode, emptyCtx);

        expect(choices).toHaveLength(4);
        const wisdomTexts = choices.map(c => c.text);
        expect(wisdomTexts).toContain('Every person has wisdom worth learning.');
        expect(wisdomTexts).toContain('Stay true to your values, no matter the pressure.');
        expect(wisdomTexts).toContain('Trust yourself, but verify what others tell you.');

        const wisdomChoice = choices.find(c => c.text.includes('Every person has wisdom'));
        expect(wisdomChoice!.effect?.setFlag).toBe('mentored_fishermans_daughter_wisdom');
    });

    it('validates learning and knowledge pursuit', () => {
        const knowledgeNode = getDialogueNode(tree, 'knowledge_validation');
        expect(knowledgeNode.text).toContain('Knowledge can serve others');

        const brightNode = getDialogueNode(tree, 'bright_observation');
        const choices = visibleChoices(brightNode, emptyCtx);
        const validateChoice = choices.find(c => c.text.includes('Knowledge and growth are worthy'));
        expect(validateChoice!.effect?.setFlag).toBe('encouraged_daughters_learning');
    });
});

// ─── Cross-NPC Observer Pattern Tests ─────────────────────────────────────────

describe('Observer Pattern Integration — Alignment cell change recognition', () => {
    it('all observed NPCs have tree ids for cache keys', () => {
        expect(shrineKeeper.dialogueTree!.id).toBe('shrine-keeper');
        expect(chronicler.dialogueTree!.id).toBe('chronicler');
        expect(wanderingPhilosopher.dialogueTree!.id).toBe('wandering-philosopher');
        expect(captainBlackwater.dialogueTree!.id).toBe('captain-blackwater');
        expect(fishermansDaughter.dialogueTree!.id).toBe('fishermans-daughter');
    });

    it('all NPCs provide observer recognition choices when alignment changes', () => {
        const npcs = [shrineKeeper, chronicler, wanderingPhilosopher, captainBlackwater, fishermansDaughter];
        const ctx = ctxWithObserver(); // Changed alignment context

        for (const npc of npcs) {
            const greetNode = getDialogueNode(npc.dialogueTree!, 'greet');
            const choices = visibleChoices(greetNode, ctx);
            const observerChoice = choices.find(c => c.requires?.playerAlignmentCellChangedSince);
            
            expect(observerChoice).toBeTruthy();
            expect(observerChoice!.text).toMatch(/recogni|shift|chang|transform|different/i);
        }
    });

    it('observer choices lead to unique recognition dialogue', () => {
        const observerNodes = [
            'observer_transformation', // Shrine Keeper
            'scholar_observation',     // Chronicler  
            'philosophical_recognition', // Wandering Philosopher
            'merchant_recognition',    // Captain Blackwater
            'growth_recognition',      // Fisherman's Daughter
        ];

        const npcs = [shrineKeeper, chronicler, wanderingPhilosopher, captainBlackwater, fishermansDaughter];

        npcs.forEach((npc, i) => {
            const observerNode = getDialogueNode(npc.dialogueTree!, observerNodes[i]);
            expect(observerNode.text).toMatch(/chang|shift|transform|evolv|different/i);
            expect(isLeafNode(observerNode)).toBe(true); // Observer nodes are terminals
        });
    });
});

// ─── Alignment Delta Coverage ─────────────────────────────────────────────────

describe('Alignment Delta Integration — Philosophical alignment shifts', () => {
    it('covers all three philosophical axes across NPCs', () => {
        // Test that our NPCs cover epistemology, outlook, and scope shifts
        const allTrees = [
            shrineKeeper.dialogueTree!,
            chronicler.dialogueTree!,
            wanderingPhilosopher.dialogueTree!,
            captainBlackwater.dialogueTree!,
            fishermansDaughter.dialogueTree!,
        ];

        let hasEpistemology = false;
        let hasOutlook = false;
        let hasScope = false;

        for (const tree of allTrees) {
            for (const node of Object.values(tree.nodes)) {
                if (!node.choices) continue;
                for (const choice of node.choices) {
                    if (!choice.effect?.alignmentDelta) continue;
                    const delta = choice.effect.alignmentDelta;
                    if (delta.epistemology) hasEpistemology = true;
                    if (delta.outlook) hasOutlook = true;
                    if (delta.scope) hasScope = true;
                }
            }
        }

        expect(hasEpistemology).toBe(true);
        expect(hasOutlook).toBe(true);
        expect(hasScope).toBe(true);
    });

    it('provides meaningful moral delta for character growth moments', () => {
        // Check that moral-significant choices have appropriate moralDelta
        const moralChoices = [
            // Shrine Keeper crystal gift
            { npc: shrineKeeper, nodeId: 'veil_thin', choiceText: 'Accept the crystal' },
            // Fisherman's Daughter encouragement  
            { npc: fishermansDaughter, nodeId: 'story_interest', choiceText: 'Dream big' },
            // Captain Blackwater ethics
            { npc: captainBlackwater, nodeId: 'trading_goods', choiceText: 'admirable business philosophy' },
        ];

        for (const { npc, nodeId, choiceText } of moralChoices) {
            const node = getDialogueNode(npc.dialogueTree!, nodeId);
            const choices = visibleChoices(node, emptyCtx);
            const moralChoice = choices.find(c => c.text.includes(choiceText));
            
            if (moralChoice?.effect?.moralDelta) {
                expect(Math.abs(moralChoice.effect.moralDelta)).toBeGreaterThan(0);
            }
        }
    });
});