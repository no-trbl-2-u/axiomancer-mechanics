import { NPC, DialogueTree } from '../../../NPCs/types';

// ─── Captain Blackwater (Pragmatic merchant with trade ethics) ──────────────

const captainBlackwaterTree: DialogueTree = {
    id: 'captain-blackwater',
    rootId: 'greet',
    nodes: {
        greet: {
            id: 'greet',
            text: "Captain Blackwater looks up from tallying cargo manifests, weather-beaten hands steady despite the coastal wind. \"Another traveler at the docks? If you've coin for quality goods, we'll do business. If you're here to waste time, move along.\"",
            choices: [
                {
                    text: "What goods are you trading?",
                    nextNodeId: 'trading_goods',
                },
                {
                    text: "I'm interested in fair trade practices.",
                    nextNodeId: 'fair_trade',
                    requires: { requiresAlignment: { axis: 'scope', op: 'gte', value: 20 } },
                    effect: { alignmentDelta: { scope: 1, outlook: 1 } },
                },
                {
                    text: "What's the quickest profit to be made here?",
                    nextNodeId: 'quick_profit',
                    requires: { requiresAlignment: { axis: 'scope', op: 'lte', value: -10 } },
                    effect: { alignmentDelta: { scope: -1, outlook: -1 } },
                },
                {
                    text: "Just looking around the docks.",
                    nextNodeId: 'browsing',
                },
                {
                    text: "(The captain's eyes narrow with recognition—your approach to commerce has shifted.)",
                    nextNodeId: 'merchant_recognition',
                    requires: { playerAlignmentCellChangedSince: true },
                    effect: { alignmentDelta: { outlook: 1 } },
                },
            ],
        },
        trading_goods: {
            id: 'trading_goods',
            text: "\"Northern timber, coastal salt, artisan tools from the inland settlements. I deal in quality—no shoddy goods that fall apart after a fortnight. Reputation matters more than quick silver.\"",
            choices: [
                {
                    text: "That's an admirable business philosophy.",
                    nextNodeId: 'admire_philosophy',
                    effect: { 
                        alignmentDelta: { outlook: 1, scope: 1 },
                        moralDelta: 1 
                    },
                },
                {
                    text: "But surely quick profits tempt any merchant?",
                    nextNodeId: 'temptation_question',
                    effect: { alignmentDelta: { outlook: -1 } },
                },
                {
                    text: "Show me what you have for sale.",
                    nextNodeId: 'show_wares',
                },
            ],
        },
        fair_trade: {
            id: 'fair_trade',
            text: "\"Finally, someone who understands! Fair dealing builds lasting partnerships. I pay artisans properly, price goods honestly, treat dock workers with respect. Costs more upfront, pays more in trust.\"",
            choices: [
                {
                    text: "How do you maintain that in a competitive market?",
                    nextNodeId: 'competitive_ethics',
                    effect: { 
                        alignmentDelta: { scope: 2, epistemology: 1 },
                        setFlag: 'captain_respects_ethics'
                    },
                },
                {
                    text: "Would you support a traders' guild based on these principles?",
                    nextNodeId: 'guild_proposal',
                    effect: { 
                        alignmentDelta: { scope: 2 },
                        setFlag: 'guild_support_secured'
                    },
                },
            ],
        },
        quick_profit: {
            id: 'quick_profit',
            text: "\"Quick profit? Ha! Cut corners, sell cheap goods, exploit desperate workers—sure, you'll make silver fast. You'll also burn every bridge you cross. I've seen those merchants. They don't last.\"",
            choices: [
                {
                    text: "Sometimes survival requires harsh choices.",
                    nextNodeId: 'harsh_necessity',
                    effect: { 
                        alignmentDelta: { outlook: -1, scope: -1 },
                        moralDelta: -1 
                    },
                },
                {
                    text: "Perhaps you're right about the long-term view.",
                    nextNodeId: 'long_term_wisdom',
                    effect: { 
                        alignmentDelta: { outlook: 2, scope: 1 },
                        moralDelta: 2 
                    },
                },
            ],
        },
        browsing: {
            id: 'browsing',
            text: "\"Fair enough. The docks teach their own lessons to those who watch and listen. Maritime commerce shapes communities—for better or worse, depending on the merchants.\"",
        },
        admire_philosophy: {
            id: 'admire_philosophy',
            text: "\"Aye, learned it from my father and his father before him. 'Build reputation like a seawall,' he'd say. 'Storm by storm, stone by stone. When the tempest comes, you'll need every block placed true.'\"",
        },
        temptation_question: {
            id: 'temptation_question',
            text: "\"Of course they do! Every merchant faces the choice—quick silver or lasting trust. The sea's taught me patience. Tides that seem distant always return. So do consequences.\"",
        },
        show_wares: {
            id: 'show_wares',
            text: "\"Now we're talking business! I've fine northern pine, sea salt from the southern reaches, and these tools—see the craftsmanship? Made to outlast their maker.\"",
            choices: [
                {
                    text: "Your goods reflect your values.",
                    nextNodeId: undefined,
                    effect: { 
                        alignmentDelta: { scope: 1 },
                        moralDelta: 1,
                        grantCurrency: 5 
                    },
                },
            ],
        },
        competitive_ethics: {
            id: 'competitive_ethics',
            text: "\"Simple—I compete on quality and service, not price-cutting. Customers pay for reliability. Artisans work for respect. Everyone profits when the foundation's solid.\"",
        },
        guild_proposal: {
            id: 'guild_proposal',
            text: "\"A guild of ethical merchants? Interesting. It would need teeth—standards, enforcement, consequences for those who break faith. But yes, I'd support such an effort.\"",
        },
        harsh_necessity: {
            id: 'harsh_necessity',
            text: "\"Harsh choices, aye—but exploiting others isn't survival, it's choosing which soul you want to keep. I'd rather be poor with honor than rich with shame.\"",
        },
        long_term_wisdom: {
            id: 'long_term_wisdom',
            text: "\"Good to hear wisdom recognized! Short-term thinking sinks more ships than storms. The merchant who thinks beyond the next tide will weather any tempest.\"",
        },
        merchant_recognition: {
            id: 'merchant_recognition',
            text: "\"Interesting—your manner of doing business has shifted since we last talked. Experience changes how we value profit versus principles, doesn't it? The wise merchant adapts without abandoning core values.\"",
        },
    },
};

const captainBlackwater: NPC = {
    name: 'Captain Blackwater',
    description: 'A pragmatic merchant captain who built his reputation on ethical trading practices and long-term thinking.',
    dialogueTree: captainBlackwaterTree,
};

// ─── Fisherman's Daughter (Young idealist with mentorship themes) ───────────

const fishermansDaughterTree: DialogueTree = {
    id: 'fishermans-daughter',
    rootId: 'greet',
    nodes: {
        greet: {
            id: 'greet',
            text: "A young woman tends fishing nets near the harbor, her movements quick and determined. She looks up with bright, curious eyes. \"You're not from the village—I know everyone here. Are you a traveler? Do you have stories from beyond the coast?\"",
            choices: [
                {
                    text: "What stories would you like to hear?",
                    nextNodeId: 'story_interest',
                },
                {
                    text: "I've seen much of the world. What do you wish to know?",
                    nextNodeId: 'worldly_wisdom',
                    effect: { alignmentDelta: { scope: 1, epistemology: 1 } },
                },
                {
                    text: "You seem too bright for just mending nets.",
                    nextNodeId: 'bright_observation',
                    requires: { requiresAlignment: { axis: 'scope', op: 'gte', value: 10 } },
                    effect: { 
                        alignmentDelta: { scope: 1, outlook: 1 },
                        moralDelta: 1 
                    },
                },
                {
                    text: "Focus on your work, child.",
                    nextNodeId: 'dismissive_response',
                    requires: { requiresAlignment: { axis: 'outlook', op: 'lte', value: -15 } },
                    effect: { 
                        alignmentDelta: { outlook: -1, scope: -1 },
                        moralDelta: -2 
                    },
                },
                {
                    text: "(She studies you with new recognition, sensing the changes in your character.)",
                    nextNodeId: 'growth_recognition',
                    requires: { playerAlignmentCellChangedSince: true },
                    effect: { alignmentDelta: { epistemology: 1 } },
                },
            ],
        },
        story_interest: {
            id: 'story_interest',
            text: "\"Stories of distant places, different ways of living! Father says the world beyond our harbor is dangerous, but I think it must be wondrous too. How do people live in the great cities? The mountain villages?\"",
            choices: [
                {
                    text: "The world is full of both wonder and danger.",
                    nextNodeId: 'balanced_view',
                    effect: { 
                        alignmentDelta: { epistemology: 1, outlook: 1 },
                        setFlag: 'daughter_appreciates_honesty'
                    },
                },
                {
                    text: "Your father is wise—the world can be cruel.",
                    nextNodeId: 'protective_warning',
                    effect: { alignmentDelta: { outlook: -1, scope: -1 } },
                },
                {
                    text: "Dream big! The world awaits those brave enough to explore.",
                    nextNodeId: 'encourage_dreams',
                    requires: { requiresAlignment: { axis: 'outlook', op: 'gte', value: 15 } },
                    effect: { 
                        alignmentDelta: { outlook: 2, scope: 1 },
                        moralDelta: 2 
                    },
                },
            ],
        },
        worldly_wisdom: {
            id: 'worldly_wisdom',
            text: "\"Really? Oh, tell me—what's the most important lesson the world taught you? Something I should know before... well, before I decide what kind of life I want to live.\"",
            choices: [
                {
                    text: "Every person has wisdom worth learning.",
                    nextNodeId: 'wisdom_everywhere',
                    effect: { 
                        alignmentDelta: { scope: 2, epistemology: 1 },
                        setFlag: 'mentored_fishermans_daughter_wisdom'
                    },
                },
                {
                    text: "Stay true to your values, no matter the pressure.",
                    nextNodeId: 'stay_true',
                    effect: { 
                        alignmentDelta: { epistemology: 1, outlook: 1 },
                        moralDelta: 2 
                    },
                },
                {
                    text: "Learn to adapt—the rigid tree breaks in the storm.",
                    nextNodeId: 'adaptability_lesson',
                    effect: { alignmentDelta: { epistemology: -1, outlook: 1 } },
                },
                {
                    text: "Trust yourself, but verify what others tell you.",
                    nextNodeId: 'critical_thinking',
                    effect: { alignmentDelta: { epistemology: 2 } },
                },
            ],
        },
        bright_observation: {
            id: 'bright_observation',
            text: "\"You notice things! Yes, I love learning—about people, about how things work, about the patterns in tides and weather. Father thinks I should be content with fishing, but I feel called to... more.\"",
            choices: [
                {
                    text: "What kind of 'more' calls to you?",
                    nextNodeId: 'calling_exploration',
                    effect: { alignmentDelta: { scope: 1, epistemology: 1 } },
                },
                {
                    text: "Knowledge and growth are worthy pursuits.",
                    nextNodeId: 'knowledge_validation',
                    effect: { 
                        alignmentDelta: { epistemology: 2, scope: 1 },
                        moralDelta: 2,
                        setFlag: 'encouraged_daughters_learning'
                    },
                },
                {
                    text: "Perhaps you could study while still helping your father.",
                    nextNodeId: 'balanced_path',
                    effect: { alignmentDelta: { scope: 1 } },
                },
            ],
        },
        dismissive_response: {
            id: 'dismissive_response',
            text: "Her bright expression dims, and she returns to the nets with quiet resignation. \"Of course. Sorry to bother you.\"",
        },
        balanced_view: {
            id: 'balanced_view',
            text: "\"That's honest—I appreciate that more than pretty lies. If I'm going to make choices about my future, I need to understand what I'm choosing between, don't I?\"",
        },
        protective_warning: {
            id: 'protective_warning',
            text: "\"I know he means well, but sometimes protection becomes a cage. How do you know if you're being wise or just afraid?\"",
        },
        encourage_dreams: {
            id: 'encourage_dreams',
            text: "\"You really believe that? Sometimes I look at the horizon and feel like I could sail right off the edge of the map—not recklessly, but with purpose. Maybe courage isn't the absence of fear but the choice to grow despite it.\"",
        },
        wisdom_everywhere: {
            id: 'wisdom_everywhere',
            text: "\"Even from the youngest villager or the oldest salt? That's beautiful—it means no conversation is wasted, no person is without value. I'll remember that.\"",
        },
        stay_true: {
            id: 'stay_true',
            text: "\"Yes! Father raised me with strong values, but I want to test them—not to abandon them, but to make them truly mine through choice rather than inheritance.\"",
        },
        adaptability_lesson: {
            id: 'adaptability_lesson',
            text: "\"Like the fisherman who reads the weather and adjusts the sail? I understand—strength through flexibility, not stubborn resistance.\"",
        },
        critical_thinking: {
            id: 'critical_thinking',
            text: "\"Trust but verify—I like that. It means staying open without being naive. Learning to question without becoming cynical.\"",
        },
        calling_exploration: {
            id: 'calling_exploration',
            text: "\"Maybe becoming a scholar, or a trader who builds connections between distant communities. Something that lets me learn about the world while contributing to it.\"",
        },
        knowledge_validation: {
            id: 'knowledge_validation',
            text: "\"Thank you for saying that! Sometimes I wonder if wanting to learn makes me selfish—but you're right. Knowledge can serve others, not just satisfy curiosity.\"",
        },
        balanced_path: {
            id: 'balanced_path',
            text: "\"A path that honors both family duty and personal growth? That would be ideal—if I can find a way to make it work.\"",
        },
        growth_recognition: {
            id: 'growth_recognition',
            text: "\"Something's different about you since we last talked—the way you carry yourself, how you listen. Experience really does change people, doesn't it? I hope I'll grow with such purpose.\"",
        },
    },
};

const fishermansDaughter: NPC = {
    name: "Fisherman's Daughter",
    description: 'A bright young woman torn between family tradition and personal aspirations, seeking guidance on forging her own path.',
    dialogueTree: fishermansDaughterTree,
};

export {
    captainBlackwater,
    fishermansDaughter,
};