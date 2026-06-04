import { NPC, DialogueTree } from '../../../NPCs/types';

// ─── The Shrine Keeper (Transcendent-leaning mystic) ─────────────────────────

const shrineKeeperTree: DialogueTree = {
    id: 'shrine-keeper',
    rootId: 'greet',
    nodes: {
        greet: {
            id: 'greet',
            text: "The Shrine Keeper turns from tending ancient carved stones, eyes bright with otherworldly knowing. \"Seeker, the patterns speak of your approach. The veil grows thin here—do you feel it?\"",
            choices: [
                {
                    text: "What patterns do you see?",
                    nextNodeId: 'patterns',
                },
                {
                    text: "I sense something... different about this place.",
                    nextNodeId: 'veil_thin',
                    requires: { requiresAlignment: { axis: 'epistemology', op: 'gte', value: 20 } },
                    effect: { alignmentDelta: { epistemology: 2, scope: 1 } },
                },
                {
                    text: "Just looking around. No mystical nonsense.",
                    nextNodeId: 'skeptic_response',
                    requires: { requiresAlignment: { axis: 'epistemology', op: 'lte', value: -20 } },
                    effect: { alignmentDelta: { epistemology: -1, outlook: -1 } },
                },
                {
                    text: "Leave quietly.",
                    nextNodeId: undefined,
                },
                {
                    text: "(The keeper studies you with renewed interest—something has shifted in your essence.)",
                    nextNodeId: 'observer_transformation',
                    requires: { playerAlignmentCellChangedSince: true },
                    effect: { alignmentDelta: { scope: 2 } },
                },
            ],
        },
        patterns: {
            id: 'patterns',
            text: "\"The stones remember all who pass. Your spirit-trail weaves through probability and purpose—a seeker's path, but toward what?\"",
            choices: [
                {
                    text: "I seek understanding of the deeper truths.",
                    nextNodeId: 'truth_seeker',
                    effect: { 
                        alignmentDelta: { epistemology: 3, scope: 2 },
                        setFlag: 'shrine_keeper_recognizes_seeker' 
                    },
                },
                {
                    text: "I'm searching for practical knowledge.",
                    nextNodeId: 'practical_seeker',
                    effect: { alignmentDelta: { epistemology: -1, outlook: 1 } },
                },
                {
                    text: "That sounds like fortune-telling nonsense.",
                    nextNodeId: 'dismiss_mysticism',
                    effect: { alignmentDelta: { epistemology: -2, scope: -1 } },
                },
            ],
        },
        veil_thin: {
            id: 'veil_thin',
            text: "\"Yes! The boundary weakens where ancient powers once walked. Here, seeker, take this—a lens to see beyond the mere physical.\" The keeper offers a crystalline fragment that hums with inner light.",
            choices: [
                {
                    text: "Accept the crystal gratefully.",
                    nextNodeId: undefined,
                    effect: { 
                        setFlag: 'shrine_keeper_crystal_gift',
                        alignmentDelta: { epistemology: 2, scope: 1 },
                        moralDelta: 1 
                    },
                },
                {
                    text: "I cannot accept such a precious gift.",
                    nextNodeId: undefined,
                    effect: { 
                        alignmentDelta: { scope: -1, outlook: 1 },
                        moralDelta: 2 
                    },
                },
            ],
        },
        skeptic_response: {
            id: 'skeptic_response',
            text: "The keeper's expression grows sad but understanding. \"The material world weighs heavy on some shoulders. When you're ready to see beyond stone and sinew, the shrine will remain.\"",
        },
        truth_seeker: {
            id: 'truth_seeker',
            text: "\"Ah, a kindred spirit! The ancients left wisdom carved in symbol and stone. Study the northern glyphs—they speak of cycles within cycles, of balance made manifest.\"",
            choices: [
                {
                    text: "Will you teach me to read them?",
                    nextNodeId: undefined,
                    effect: { 
                        setFlag: 'shrine_keeper_teaching_offered',
                        alignmentDelta: { epistemology: 2, scope: 1 }
                    },
                },
            ],
        },
        practical_seeker: {
            id: 'practical_seeker',
            text: "\"Even practical paths may lead to transcendence, seeker. The ancient builders understood both stone and spirit—perhaps their techniques might serve you.\"",
        },
        dismiss_mysticism: {
            id: 'dismiss_mysticism',
            text: "\"Even skeptics serve the pattern, though they know it not. The stones care little for belief—they simply are.\"",
        },
        observer_transformation: {
            id: 'observer_transformation',
            text: "\"The constellation of your spirit has shifted since our last meeting. Change is the only constant—but this change carries purpose. The shrine blesses your new becoming.\"",
        },
    },
};

const shrineKeeper: NPC = {
    name: 'Shrine Keeper',
    description: 'A mystical guardian of ancient shrine stones, keeper of transcendent wisdom and otherworldly perception.',
    dialogueTree: shrineKeeperTree,
};

// ─── The Chronicler (Scholarly NPC with Chronicle integration) ───────────────

const chroniclerTree: DialogueTree = {
    id: 'chronicler',
    rootId: 'greet',
    nodes: {
        greet: {
            id: 'greet',
            text: "The Chronicler looks up from leather-bound tomes and scattered parchments. \"A fellow seeker of knowledge? These northern lands hold secrets that predate the coastal settlements. Care to contribute to the Chronicle?\"",
            choices: [
                {
                    text: "What are you chronicling here?",
                    nextNodeId: 'chronicling_purpose',
                },
                {
                    text: "I've seen strange things in my travels.",
                    nextNodeId: 'share_observations',
                    effect: { 
                        alignmentDelta: { epistemology: 1, scope: 1 },
                        setFlag: 'chronicler_met'
                    },
                },
                {
                    text: "I don't have time for scholarly pursuits.",
                    nextNodeId: 'no_time',
                    effect: { alignmentDelta: { outlook: -1, scope: -1 } },
                },
                {
                    text: "Move along without disturbing their work.",
                    nextNodeId: undefined,
                },
                {
                    text: "(The scholar glances up, noting how your bearing has changed since your last encounter.)",
                    nextNodeId: 'scholar_observation',
                    requires: { playerAlignmentCellChangedSince: true },
                    effect: { alignmentDelta: { epistemology: 1 } },
                },
            ],
        },
        chronicling_purpose: {
            id: 'chronicling_purpose',
            text: "\"I document the forgotten histories—the pre-coastal civilizations, ancient migration patterns, the old alliances between folk and forest. Each traveler adds another thread to the tapestry.\"",
            choices: [
                {
                    text: "How can I contribute to this work?",
                    nextNodeId: 'contribution_offer',
                    effect: { 
                        alignmentDelta: { epistemology: 2, scope: 1 },
                        setFlag: 'chronicle_contributor'
                    },
                },
                {
                    text: "Why preserve the past? Focus on the present.",
                    nextNodeId: 'present_focus',
                    requires: { requiresAlignment: { axis: 'scope', op: 'lte', value: -10 } },
                    effect: { alignmentDelta: { scope: -1, outlook: 1 } },
                },
            ],
        },
        share_observations: {
            id: 'share_observations',
            text: "\"Excellent! Every observation matters. What you call 'strange' might be echoes of the old ways—patterns the ancients left as guideposts for future generations.\"",
            choices: [
                {
                    text: "Tell me more about these ancient patterns.",
                    nextNodeId: 'ancient_patterns',
                    effect: { 
                        alignmentDelta: { epistemology: 1, scope: 1 }
                    },
                },
                {
                    text: "I've documented my travels carefully.",
                    nextNodeId: 'documented_travels',
                    effect: { 
                        alignmentDelta: { epistemology: 1, scope: 2 },
                        moralDelta: 1 
                    },
                },
            ],
        },
        no_time: {
            id: 'no_time',
            text: "\"I understand—the present demands attention. But remember: today's actions become tomorrow's history. Perhaps our paths will cross when urgency gives way to reflection.\"",
        },
        contribution_offer: {
            id: 'contribution_offer',
            text: "\"Document what you witness in the northern reaches—unusual flora, remnant structures, local folklore. Each detail helps complete the Chronicle's tapestry.\"",
            choices: [
                {
                    text: "I accept this scholarly responsibility.",
                    nextNodeId: undefined,
                    effect: { 
                        setFlag: 'chronicler_scholarly_mission',
                        alignmentDelta: { epistemology: 2, scope: 2 }
                    },
                },
            ],
        },
        present_focus: {
            id: 'present_focus',
            text: "\"A pragmatic view—yet even pragmatists benefit from understanding historical patterns. The past informs present choices, whether we acknowledge it or not.\"",
        },
        ancient_patterns: {
            id: 'ancient_patterns',
            text: "\"The ancients understood cycles—seasonal, generational, spiritual. They built with this knowledge, aligning settlements and sacred sites to greater rhythms. The northern forest bears their mark still.\"",
        },
        documented_travels: {
            id: 'documented_travels',
            text: "\"A scholar's approach! Your records could fill gaps in the Chronicle. The systematic documentation of experience serves both personal growth and collective wisdom.\"",
        },
        scholar_observation: {
            id: 'scholar_observation',
            text: "\"Fascinating—your intellectual posture has evolved since our last discussion. Experience truly is the greatest teacher. Your journey itself becomes worthy of chronicle.\"",
        },
    },
};

const chronicler: NPC = {
    name: 'The Chronicler',
    description: 'A dedicated scholar documenting forgotten histories and ancient wisdom of the northern lands.',
    dialogueTree: chroniclerTree,
};

// ─── The Wandering Philosopher (Traveling NPC with diverse philosophical positions) ───

const wanderingPhilosopherTree: DialogueTree = {
    id: 'wandering-philosopher',
    rootId: 'greet',
    nodes: {
        greet: {
            id: 'greet',
            text: "A weathered figure in simple robes sits contemplating the forest canopy. \"Ah, a fellow traveler! I find the northern woods excellent for philosophical contemplation. What brings you to walk these thoughtful paths?\"",
            choices: [
                {
                    text: "I'm seeking my place in the world.",
                    nextNodeId: 'seeking_place',
                    effect: { alignmentDelta: { scope: 1, epistemology: 1 } },
                },
                {
                    text: "Just passing through.",
                    nextNodeId: 'passing_through',
                },
                {
                    text: "The forest offers peace for reflection.",
                    nextNodeId: 'reflective_peace',
                    requires: { requiresAlignment: { axis: 'outlook', op: 'gte', value: 10 } },
                    effect: { alignmentDelta: { outlook: 1, scope: 1 } },
                },
                {
                    text: "I've no patience for philosophical rambling.",
                    nextNodeId: 'impatient_response',
                    requires: { requiresAlignment: { axis: 'outlook', op: 'lte', value: -10 } },
                    effect: { alignmentDelta: { outlook: -1, scope: -1 } },
                },
                {
                    text: "(The philosopher's eyes light with recognition at your transformed bearing.)",
                    nextNodeId: 'philosophical_recognition',
                    requires: { playerAlignmentCellChangedSince: true },
                    effect: { alignmentDelta: { epistemology: 1 } },
                },
            ],
        },
        seeking_place: {
            id: 'seeking_place',
            text: "\"A noble quest! Tell me—do you believe our place is determined by fate, forged by will, or discovered through relationship with others?\"",
            choices: [
                {
                    text: "Fate guides us toward our destined role.",
                    nextNodeId: 'fate_perspective',
                    requires: { requiresAlignment: { axis: 'epistemology', op: 'gte', value: 15 } },
                    effect: { alignmentDelta: { epistemology: 2, scope: -1 } },
                },
                {
                    text: "We forge our own destiny through determination.",
                    nextNodeId: 'will_perspective', 
                    requires: { requiresAlignment: { axis: 'scope', op: 'lte', value: 0 } },
                    effect: { alignmentDelta: { scope: -2, outlook: 1 } },
                },
                {
                    text: "We find ourselves through community and connection.",
                    nextNodeId: 'community_perspective',
                    requires: { requiresAlignment: { axis: 'scope', op: 'gte', value: 15 } },
                    effect: { alignmentDelta: { scope: 2, outlook: 1 } },
                },
                {
                    text: "I'm not sure—that's why I'm searching.",
                    nextNodeId: 'uncertain_seeker',
                    effect: { 
                        alignmentDelta: { epistemology: 1 },
                        moralDelta: 1,
                        setFlag: 'philosopher_appreciates_honesty'
                    },
                },
            ],
        },
        passing_through: {
            id: 'passing_through',
            text: "\"Ah, but are any of us truly 'just passing through'? Every step changes both traveler and terrain. Your presence here ripples outward in ways you may never know.\"",
            choices: [
                {
                    text: "I hadn't considered the impact of my journey.",
                    nextNodeId: 'impact_realization',
                    effect: { alignmentDelta: { scope: 2, epistemology: 1 } },
                },
                {
                    text: "Sometimes a walk is just a walk.",
                    nextNodeId: 'simple_acceptance',
                    effect: { alignmentDelta: { epistemology: -1, outlook: 1 } },
                },
            ],
        },
        reflective_peace: {
            id: 'reflective_peace',
            text: "\"Yes! The forest teaches patience—each tree growing in its season, each creature following ancient rhythms. In stillness, we hear what urgency drowns out.\"",
            choices: [
                {
                    text: "What have the trees taught you?",
                    nextNodeId: 'tree_wisdom',
                    effect: { alignmentDelta: { epistemology: 1, outlook: 2 } },
                },
            ],
        },
        impatient_response: {
            id: 'impatient_response',
            text: "\"I understand—action calls louder than contemplation for some souls. Yet even the most practical pursuits rest on philosophical foundations. Safe travels, friend.\"",
        },
        fate_perspective: {
            id: 'fate_perspective',
            text: "\"A transcendent view! Yet consider—if fate writes our story, do we bear responsibility for our choices? Perhaps fate provides the stage while we perform the play.\"",
        },
        will_perspective: {
            id: 'will_perspective',
            text: "\"The voice of the self-determined! Yet pure individualism can become isolation. Even the strongest will benefits from wisdom gathered, from hands offered in aid.\"",
        },
        community_perspective: {
            id: 'community_perspective',
            text: "\"Beautifully spoken! We become ourselves through relationship—yet beware losing the self in the collective. True community honors both unity and individual authenticity.\"",
        },
        uncertain_seeker: {
            id: 'uncertain_seeker',
            text: "\"Honest uncertainty opens more doors than false certainty closes. Your willingness to seek—to question—already marks you as a philosopher at heart.\"",
        },
        impact_realization: {
            id: 'impact_realization',
            text: "\"Each conversation plants seeds in both minds. Your questions change my answers; my words reshape your journey. We co-create meaning through encounter.\"",
        },
        simple_acceptance: {
            id: 'simple_acceptance',
            text: "\"Perhaps you're right—sometimes simplicity contains its own wisdom. Not every moment requires deep analysis to hold deep value.\"",
        },
        tree_wisdom: {
            id: 'tree_wisdom',
            text: "\"Trees teach patience, interconnection through root-networks, the wisdom of seasons—knowing when to grow, when to rest, when to let go. They model existence without anxiety.\"",
        },
        philosophical_recognition: {
            id: 'philosophical_recognition',
            text: "\"Remarkable—your philosophical stance has evolved since our last discourse. Growth of mind shows in posture and presence. You embody philosophy in motion!\"",
        },
    },
};

const wanderingPhilosopher: NPC = {
    name: 'The Wandering Philosopher',
    description: 'A contemplative traveler who explores diverse philosophical perspectives through Socratic dialogue.',
    dialogueTree: wanderingPhilosopherTree,
};

export {
    shrineKeeper,
    chronicler, 
    wanderingPhilosopher,
};