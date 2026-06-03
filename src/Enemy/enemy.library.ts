/**
 * Enemy library — Spec 07 content drop.
 *
 * Per the Spec 07 Q8 split: 3 simple, 6 normal, 3 elite, 2 boss, 1 unique =
 * 15 enemies total. Stat affinities (heart / body / mind) are distributed
 * across each difficulty tier so the encounter generator can offer variety
 * regardless of which stance the player favours.
 *
 * Authoring notes:
 *   - `tier1Overrides` mirrors the canonical Spec 03 Tier 1 buffs / debuffs
 *     so every enemy participates in the stance-effect economy. Variant
 *     procOverrides on elites / bosses give them flavour without rewriting
 *     the global proc table.
 *   - `procUnlocks` bumps the tier cap for elite (T2) and boss (T3) enemies
 *     so their proc rolls reach higher-tier candidates per Spec 03.
 *   - Loot tables follow Spec 07 Q7B — weighted entries with explicit `null`
 *     buckets for "nothing drops".
 *   - `xpReward` is left implicit on most enemies: `createEnemy` falls back
 *     to `level × DEFAULT_XP_BY_DIFFICULTY[difficulty]`. Authors override
 *     only when an enemy should grant unusual XP for narrative reasons.
 */

import { createEnemy } from './index';
import { LootTableEntry } from './types';
import { consumableLibrary, getConsumableById } from '../Items/consumable.library';
import { dropItem } from '../Items/item.factory';
import { Consumable } from '../Items/types';
import { getSkillById } from '../Skills/skill.library';
import type { Skill } from '../Skills/types';

// ─── Skill rotation helpers (Phase 49) ────────────────────────────────────────

/** Returns a fresh copy of the named skill from the library. */
function skill(id: string): Skill {
    const found = getSkillById(id);
    if (!found) {
        throw new Error(`enemy.library: unknown skill id '${id}'.`);
    }
    return found;
}

// ─── Loot helpers ─────────────────────────────────────────────────────────────

/** Returns a fresh copy of the named consumable from the library, q=1. */
function consumable(id: string): Consumable {
    const found = getConsumableById(id);
    if (!found) {
        throw new Error(`enemy.library: unknown consumable id '${id}'.`);
    }
    return { ...found, quantity: 1 };
}

/** No-drop bucket helper — readability sugar over `{ item: null, weight }`. */
function none(weight: number): LootTableEntry {
    return { item: null, weight };
}

/** Drop bucket helper — wraps a consumable id with its weight. */
function drop(id: string, weight: number): LootTableEntry {
    return { item: consumable(id), weight };
}

// ─── Canonical Tier 1 stance overrides ────────────────────────────────────────

/**
 * Every authored enemy plugs the same Spec 03 Tier 1 effect IDs into its
 * `tier1Overrides`. Doing it once here keeps the library definitions
 * focused on stats / personality. Bosses with custom routines can opt out
 * by passing their own `tier1Overrides` object.
 */
const T1_DEFAULT = {
    body:  { attack: 'tier1_body_attack',  defend: 'tier1_body_defend'  },
    mind:  { attack: 'tier1_mind_attack',  defend: 'tier1_mind_defend'  },
    heart: { attack: 'tier1_heart_attack', defend: 'tier1_heart_defend' },
} as const;

// ─── Simple (3) — level 1 fodder ──────────────────────────────────────────────

export const TidepoolCrab = createEnemy({
    id: 'enemy-tidepool-crab',
    name: 'Tidepool Crab',
    description: 'Pinches a claim on the dock pilings; its grievances are mostly territorial.',
    level: 1,
    baseStats: { body: 3, mind: 1, heart: 1 },
    mapName: 'fishing-village',
    difficulty: 'simple',
    logic: 'aggressive',
    tier1Overrides: T1_DEFAULT,
    loot: [none(80), drop('minor-healing-potion', 20)],
    // Phase 45 — mid-mid-individual (Montaigne / Ishmael archetype).
    philosophicalAlignment: { epistemology: 0, outlook: 0, scope: -67 },
    // Phase 74 — territorial / "grievances are mostly territorial" voice.
    finalBlowLines: {
        brutal: 'The claim breaks before the claw does. The piling stays.',
        quiet:  'It folds itself back into the tidepool, smaller than it pinched.',
        ironic: 'A grievance pressed too hard. It pinched itself loose.',
    },
    causeLines: {
        brutal: 'The claw closes on a part of you that does not let go again.',
        broken: 'You wear down on the pinch and the pinch does not.',
        quiet:  'A small grip in a wrong place. You sit down and do not stand.',
    },
});

export const SeaMistWisp = createEnemy({
    id: 'enemy-sea-mist-wisp',
    name: 'Sea-Mist Wisp',
    description: 'A confused thought that drifted in with the fog. It will leave if you let it speak.',
    level: 1,
    baseStats: { body: 1, mind: 3, heart: 1 },
    mapName: 'fishing-village',
    difficulty: 'simple',
    logic: 'defensive',
    tier1Overrides: T1_DEFAULT,
    loot: [none(75), drop('clarity-serum', 20), drop('focus-vial', 5)],
    // Phase 45 — mid-mid-transcendent (Lao Tzu / Siddhartha archetype).
    philosophicalAlignment: { epistemology: 0, outlook: 0, scope: 67 },
    // Phase 74 — confused-thought / "will leave if you let it speak" voice.
    finalBlowLines: {
        brutal: 'The fog parts around a sound that was not there.',
        quiet:  'It dissipates mid-sentence. The fog keeps its half.',
        ironic: 'It came to be spoken to. You answered with a closing.',
    },
    causeLines: {
        brutal: 'The fog thickens until the question is the only thing left.',
        broken: 'You speak to it for too long. The fog gets into the speaking.',
        quiet:  'You forget what you were going to say. The wisp remembers.',
    },
});

export const LullabyMoth = createEnemy({
    id: 'enemy-lullaby-moth',
    name: 'Lullaby Moth',
    description: 'Its wings hum a half-remembered song; you almost forget you are in a fight.',
    level: 1,
    baseStats: { body: 1, mind: 1, heart: 3 },
    mapName: 'northern-forest',
    difficulty: 'simple',
    logic: 'random',
    tier1Overrides: T1_DEFAULT,
    loot: [none(80), drop('heart-draught', 18), drop('minor-healing-potion', 2)],
    // Phase 45 — faith-optimistic-individual (Kierkegaard / Alyosha archetype).
    philosophicalAlignment: { epistemology: -67, outlook: 67, scope: -67 },
    // Phase 74 — half-remembered-song / lullaby voice.
    finalBlowLines: {
        brutal: 'The hum ends on the wrong note. The wings settle anyway.',
        quiet:  'It lands once on your sleeve. The song was almost finished.',
        ironic: 'You hummed back. The moth took that as permission.',
    },
    causeLines: {
        brutal: 'The song wraps you in a sleep you did not choose.',
        broken: 'The hum is patient. You stop noticing it long before it stops.',
        quiet:  'A lullaby for one. You answer it the only way a lullaby asks to be answered.',
    },
});

// ─── Normal (6) — level 2-3 ───────────────────────────────────────────────────

/**
 * Legacy fixture preserved from Spec 02-era tests. Many e2e tests depend on
 * the exact `maxHealth = 10` (level 1 × avg(1, 1) × 10) so the stat block
 * is intentionally kept at 1/1/1. New normal enemies on the forest map
 * (`ForestSprite`, `ArgumentativeCrow`) carry the proper stat-aligned values.
 */
export const Disatree_01 = createEnemy({
    id: 'enemy-disatree',
    name: 'Disatree',
    description: 'A tree who disagrees with you. Its argument is mostly bark.',
    level: 1,
    baseStats: { body: 1, mind: 1, heart: 1 },
    mapName: 'northern-forest',
    difficulty: 'normal',
    logic: 'balanced',
    tier1Overrides: T1_DEFAULT,
    loot: [none(70), drop('minor-healing-potion', 25), drop('healing-potion', 5)],
    // Phase 45 — mid-pessimistic-relational (Zapffe / Ahab archetype).
    philosophicalAlignment: { epistemology: 0, outlook: -67, scope: 0 },
    // Phase 74 — tree-who-disagrees / "argument is mostly bark" voice.
    finalBlowLines: {
        brutal: 'The argument resolves in splinters. The bark does not get the last word.',
        quiet:  'A branch lowers. The tree concedes a small point and leaves it there.',
        ironic: 'You convinced it. It fell over to make its position clear.',
    },
    causeLines: {
        brutal: 'The bark wins by being bark. You were softer than the argument required.',
        broken: 'The disagreement goes on. Eventually the tree is the part still standing.',
        quiet:  'You sit down to think it over and the tree mistakes that for surrender.',
    },
});

export const WetHound = createEnemy({
    id: 'enemy-wet-hound',
    name: 'Wet Hound',
    description: 'Half feral, half pitiful. Its body trembles between bite and beg.',
    level: 2,
    baseStats: { body: 4, mind: 2, heart: 2 },
    mapName: 'fishing-village',
    difficulty: 'normal',
    logic: 'aggressive',
    tier1Overrides: T1_DEFAULT,
    loot: [none(60), drop('body-elixir', 30), drop('healing-potion', 10)],
    // Phase 45 — logic-pessimistic-individual (Schopenhauer / Underground Man archetype).
    philosophicalAlignment: { epistemology: 67, outlook: -67, scope: -67 },
    // Phase 74 — half-feral-half-pitiful / "trembles between bite and beg" voice.
    finalBlowLines: {
        brutal: 'The bite finishes the trembling. The hound goes still in your name.',
        quiet:  'It lowers its head and does not get up. The fur was always going to be wet.',
        ironic: 'You meant to feed it. The hound made a different choice with the offering.',
    },
    causeLines: {
        brutal: 'The bite arrives before the beg finishes. Both were honest in their way.',
        broken: 'You wear down on the trembling. The trembling does not wear down on you.',
        quiet:  'It curls beside you when you stop moving. The fur is still wet.',
    },
});

export const MournfulGull = createEnemy({
    id: 'enemy-mournful-gull',
    name: 'Mournful Gull',
    description: 'It circles overhead, screaming a list of every slight it remembers.',
    level: 2,
    baseStats: { body: 2, mind: 2, heart: 4 },
    mapName: 'fishing-village',
    difficulty: 'normal',
    logic: 'balanced',
    tier1Overrides: T1_DEFAULT,
    loot: [none(60), drop('heart-draught', 30), drop('minor-healing-potion', 10)],
    // Phase 45 — mid-pessimistic-individual (Cioran / Hamlet archetype).
    philosophicalAlignment: { epistemology: 0, outlook: -67, scope: -67 },
    // Phase 57 — heart self-heal fallacy matches "every slight it remembers".
    skills: [skill('appeal-to-pity')],
    // Phase 60 — befriending "every slight it remembers" yields a
    // heart-attuned remembrance gift (1 guaranteed heart-draught + 10 XP).
    // Phase 62 — sets a world flag so downstream dialogue / quests can
    // gate on whether the gull was befriended.
    friendshipReward: {
        items: [{ ...getConsumableById('heart-draught')! }],
        xpBonus: 10,
        narrative:
            'The gull stops circling. It settles on the rail beside you. ' +
            'For a long moment, neither of you speaks the slights you remember.',
        flagSet: 'befriended-mournful-gull',
        // Phase 69 — wistful empathy reading nudges outlook one notch
        // toward optimistic (per the gull's circling-then-settling beat).
        // Inside the Phase 43 ±1..±5 authoring band.
        alignmentDelta: { outlook: +3 },
    },
    // Phase 71 — heart-aspected wistful voice; "slights" / "list" /
    // "catalogue" thread runs across all three line groups (GH#65 ask 1).
    finalBlowLines: {
        brutal: 'The gull falls mid-cry. The list of slights ends on a half-syllable.',
        quiet:  'It folds its wings and lands once, gently, before it stops.',
        ironic: 'A slight it had not catalogued yet, delivered by the listener.',
    },
    pactLines: {
        quiet:   'For a long moment, neither of you speaks the slights you remember.',
        setDown: 'It settles on the rail beside you. The catalogue, for now, is closed.',
        heavy:   'The list goes on inside it. You are listed too. It lands anyway.',
    },
    causeLines: {
        brutal: 'The list resolves in your name. You go down to the next item on it.',
        broken: 'The slights accumulate. Eventually you are one of them.',
        quiet:  'It catalogues a last grievance and you do not stand up from it.',
    },
    // Phase 71 voice continued — Codex entry body extends the catalogue thread
    // into long-form chronicle (GH#65 ask 3).
    journalEntry: {
        id: 'codex-mournful-gull',
        title: 'The Catalogue of Slights',
        body:
            'It keeps the list aloud. Some entries are recent, some predate the harbour wall. ' +
            'It does not insist you remember every one — only that one exists. ' +
            'When you stopped speaking, it stopped circling. ' +
            'That, too, is on the list now, in a different column.',
    },
});

export const ForestSprite = createEnemy({
    id: 'enemy-forest-sprite',
    name: 'Forest Sprite',
    description: 'A small lattice of opinions in flight; it argues itself in and out of visibility.',
    level: 3,
    baseStats: { body: 2, mind: 4, heart: 2 },
    mapName: 'northern-forest',
    difficulty: 'normal',
    logic: 'defensive',
    tier1Overrides: T1_DEFAULT,
    loot: [none(55), drop('clarity-serum', 30), drop('focus-vial', 15)],
    // Phase 45 — mid-optimistic-individual (Rorty / Huck Finn archetype).
    philosophicalAlignment: { epistemology: 0, outlook: 67, scope: -67 },
    // Phase 74 — lattice-of-opinions / arguing-itself-in-and-out voice.
    finalBlowLines: {
        brutal: 'The lattice unweaves. Several opinions go quiet at once.',
        quiet:  'It argues itself out of visibility one last time and stays gone.',
        ironic: 'You agreed with one of its opinions. The lattice did not survive the agreement.',
    },
    causeLines: {
        brutal: 'A whole lattice of small wrongnesses adds up to a single large one.',
        broken: 'The opinions outnumber you. The lattice closes around the difference.',
        quiet:  'A single careful argument lands. You sit down to refute it and do not rise.',
    },
});

export const HollowEyedBeggar = createEnemy({
    id: 'enemy-hollow-eyed-beggar',
    name: 'Hollow-Eyed Beggar',
    description: 'You suspect they have not always been hollow. They want what you carry, not what you are.',
    level: 3,
    baseStats: { body: 2, mind: 2, heart: 4 },
    mapName: 'fishing-village',
    difficulty: 'normal',
    logic: 'strategic',
    tier1Overrides: T1_DEFAULT,
    loot: [none(50), drop('heart-draught', 30), drop('healing-potion', 15), drop('antidote', 5)],
    // Phase 45 — faith-pessimistic-relational (Mainländer / Ferreira archetype).
    philosophicalAlignment: { epistemology: -67, outlook: -67, scope: 0 },
    // Phase 57 — heart self-heal paradox; shares the Saint's archetype at a
    // different tier ("what you carry, not what you are" — survival-wager flavour).
    skills: [skill('pascals-wager')],
    // Phase 60 — "they want what you carry, not what you are" reverses on
    // friendship: they offer what they carry. 2 phials + 15 XP.
    friendshipReward: {
        items: [
            { ...getConsumableById('healing-potion')! },
            { ...getConsumableById('antidote')! },
        ],
        xpBonus: 15,
        narrative:
            'They pull a folded cloth from somewhere inside the rags. ' +
            'Two phials, both still cold. "I was carrying these for someone," ' +
            'they say. "But you stopped. So."',
        // Phase 69 — gravity pulls toward the individual (the moment of
        // reciprocation re-grounds the player on the relational axis).
        // Inside the Phase 43 ±1..±5 authoring band.
        alignmentDelta: { scope: -3 },
    },
    // Phase 71 — faith-pessimistic-relational voice; "carrying" / "rags" /
    // "phials" thread; reversal-of-begging carries into pact + cause (GH#65 ask 1).
    finalBlowLines: {
        brutal: 'You leave them with nothing more to carry.',
        quiet:  'They do not flinch. The rags settle as if they had been waiting.',
        ironic: 'They take what you are. It costs you what you carried.',
    },
    pactLines: {
        quiet:   'They stop reaching. The cloth in their hand is for you now.',
        setDown: 'They lay the phials on the stones between you, slowly, as if returning them.',
        heavy:   '"I was carrying these for someone." A pause. "But you stopped. So."',
    },
    causeLines: {
        brutal: 'They wanted what you carried. They take it from where you fall.',
        broken: 'You carry less and less. Eventually you carry nothing, including yourself.',
        quiet:  'They wait until you have set everything down before they kneel beside you.',
    },
    // Phase 71 voice continued — Codex entry body extends the reversal-of-
    // begging thread (GH#65 ask 3).
    journalEntry: {
        id: 'codex-hollow-eyed-beggar',
        title: 'They Carry What You Set Down',
        body:
            'They were carrying the phials for someone. They no longer say who. ' +
            'The folded cloth came from somewhere inside the rags — there is more in there. ' +
            'They want what you carry, but they also keep what you abandon. ' +
            'There is a difference between the two and they will not explain it to you.',
    },
});

export const ArgumentativeCrow = createEnemy({
    id: 'enemy-argumentative-crow',
    name: 'Argumentative Crow',
    description: 'Caws a sequence of premises that resolve, infuriatingly, in your defeat.',
    level: 3,
    baseStats: { body: 2, mind: 4, heart: 2 },
    mapName: 'northern-forest',
    difficulty: 'normal',
    logic: 'strategic',
    tier1Overrides: T1_DEFAULT,
    loot: [none(50), drop('clarity-serum', 25), drop('focus-vial', 20), drop('philosopher-tea', 5)],
    // Phase 45 — logic-optimistic-individual (Nietzsche / Prometheus archetype).
    philosophicalAlignment: { epistemology: 67, outlook: 67, scope: -67 },
    // Phase 49 — mind-aspected fallacy skill matches the crow's "sequence of premises" voice.
    skills: [skill('false-dilemma')],
    // Phase 74 — sequence-of-premises / "resolve infuriatingly in your defeat" voice.
    finalBlowLines: {
        brutal: 'The premises resolve, infuriatingly, in its own defeat.',
        quiet:  'The conclusion lands soft. The crow nods at it once and does not caw again.',
        ironic: 'It had the argument. You won by interrupting at the right syllable.',
    },
    causeLines: {
        brutal: 'The premises were never about you. The conclusion was.',
        broken: 'Premise after premise. You go down somewhere in the third repetition.',
        quiet:  'It caws once more, gently. You did not see how that one followed.',
    },
});

// ─── Elite (3) — level 4-5 ────────────────────────────────────────────────────

export const TideflukeReaver = createEnemy({
    id: 'enemy-tidefluke-reaver',
    name: 'Tidefluke Reaver',
    description: 'Salt-bound and shore-cursed. Its fists move faster than the surf retreats.',
    level: 4,
    baseStats: { body: 6, mind: 2, heart: 3 },
    mapName: 'fishing-village',
    difficulty: 'elite',
    logic: 'aggressive',
    tier1Overrides: T1_DEFAULT,
    procUnlocks: {
        body: { attack: 2, defend: 2 },
    },
    loot: [none(35), drop('body-elixir', 35), drop('healing-potion', 20), drop('berserker-brew', 10)],
    // Phase 45 — logic-pessimistic-relational (Ligotti / Rust Cohle archetype).
    philosophicalAlignment: { epistemology: 67, outlook: -67, scope: 0 },
    // Phase 57 — body-aspected tier-3 fallacy matches the reaver's "built threat → strike" trope.
    skills: [skill('straw-giant')],
    // Phase 102 — befriendability config: elite tier, empathy required
    befriendabilityConfig: {
        hpGate: { belowPct: 0.3 },
        requiredStances: ['heart'], // empathy
        roundsThreshold: 4
    },
    // Phase 102 — friendship reward: salt-bound reaver's chains dissolve
    friendshipReward: {
        items: [
            { ...getConsumableById('body-elixir')! },
            { ...getConsumableById('healing-potion')! }
        ],
        xpBonus: 35,
        alignmentDelta: { outlook: +2, scope: +1 }, // softens pessimism, opens to relationship
        narrative: "The salt-bound reaver's chains dissolve into foam. For the first time in memory, " +
                  "its fists unclench. 'The surf retreats,' it says, voice rough as barnacles. " +
                  "'But you... you stayed.'",
        flagSet: 'befriended-tidefluke-reaver'
    },
    // Phase 102 — pact lines for friendship outcome
    pactLines: {
        quiet:   'The reaver stops mid-swing. The fists that moved faster than the surf drop to its sides.',
        setDown: 'It sets something small and salt-crusted between you. A chain link, maybe, or a prayer bead worn smooth.',
        heavy:   '"The shore cursed me for staying when I should have gone out with the tide. You stayed when you should have left. Maybe that makes us even."'
    },
    // Phase 102 — journal entry unlocked on befriending
    journalEntry: {
        id: 'codex-tidefluke-reaver',
        title: 'The Salt-Bound Oath',
        body: 'Some debts are paid in water, others in understanding. The reaver carried both ' +
              'until someone showed it the difference between being bound and choosing to stay.'
    },
    // Phase 74 — salt-bound / shore-cursed / "faster than the surf retreats" voice.
    finalBlowLines: {
        brutal: 'The reaver falls in a wash of salt. The fists were faster than the surf retreated; the strike was faster than the fists.',
        quiet:  'A single quiet strike to the salt-bound chest. The shore does not curse louder.',
        ironic: 'The reaver swung at the surf and you stepped between. The surf still arrived; the reaver did not.',
    },
    causeLines: {
        brutal: 'The fists arrive in a sequence the surf is too slow to retreat from.',
        broken: 'You hold for as long as the tide allows. The reaver holds longer.',
        quiet:  'A clean strike from salt-bound hands. The shore claims you on the way down.',
    },
});

export const HushWraith = createEnemy({
    id: 'enemy-hush-wraith',
    name: 'Hush-Wraith',
    description: 'A presence shaped like the silence after a question. Listens until you doubt the answer.',
    level: 5,
    baseStats: { body: 2, mind: 6, heart: 3 },
    mapName: 'northern-forest',
    difficulty: 'elite',
    logic: 'strategic',
    tier1Overrides: T1_DEFAULT,
    procUnlocks: {
        mind: { attack: 2, defend: 2 },
    },
    loot: [none(35), drop('clarity-serum', 25), drop('focus-vial', 25), drop('philosopher-tea', 15)],
    // Phase 45 — mid-pessimistic-transcendent (Lovecraft / Burroughs archetype).
    philosophicalAlignment: { epistemology: 0, outlook: -67, scope: 67 },
    // Phase 57 — mind-aspected paradox; gradual-undoing matches "listens until you doubt the answer".
    skills: [skill('sorites-cascade')],
    // Phase 102 — befriendability config: transcendent silence requires patience
    befriendabilityConfig: {
        hpGate: { belowPct: 0.25 },
        requiredStances: ['heart'],
        roundsThreshold: 6 // longer patience for transcendent silence
    },
    // Phase 102 — friendship reward: wraith's silence breaks into whisper
    friendshipReward: {
        items: [
            { ...getConsumableById('clarity-serum')! },
            { ...getConsumableById('antidote')! }
        ],
        xpBonus: 40,
        alignmentDelta: { outlook: +1 }, // slight hope in cosmic indifference
        narrative: "The wraith's silence breaks into whisper. 'I have been listening to the wrong questions,' " +
                  "it says, voice like wind through forgotten spaces. 'Yours... yours had an answer all along.'",
        flagSet: 'befriended-hush-wraith'
    },
    // Phase 102 — pact lines for friendship outcome
    pactLines: {
        quiet:   'The questions fade. For the first time, the silence feels like rest rather than waiting.',
        setDown: 'The wraith draws something from the air between you — a word, perhaps, or the shape silence makes when it chooses to speak.',
        heavy:   '"I have been the wrong kind of patient. Listening for doubt when I should have listened for certainty. You speak like someone who knows their answers."'
    },
    // Phase 102 — journal entry unlocked on befriending
    journalEntry: {
        id: 'codex-hush-wraith',
        title: 'The Question After Silence',
        body: 'Not all silences are the same. Some wait for answers; others wait for the right person ' +
              'to stop asking. The wraith learned the difference between doubt and patience.'
    },
    // Phase 74 — silence-after-a-question / "listens until you doubt" voice.
    finalBlowLines: {
        brutal: 'The silence breaks first. Then the wraith. Then the question stays.',
        quiet:  'You stop answering. The wraith fades into the room the silence left.',
        ironic: 'You doubted out loud. The wraith took your doubt as its undoing.',
    },
    causeLines: {
        brutal: 'The silence thickens until the answer you would have given does not arrive.',
        broken: 'You answer once, twice, the third time you are not sure. The wraith is patient.',
        quiet:  'The question is the last thing left in the room. You let it have the room.',
    },
});

export const HollowSaint = createEnemy({
    id: 'enemy-hollow-saint',
    name: 'Hollow Saint',
    description: 'A martyr without a cause, looking for one. The wound it offers is your own.',
    level: 5,
    baseStats: { body: 3, mind: 2, heart: 6 },
    mapName: 'northern-forest',
    difficulty: 'elite',
    logic: 'defensive',
    tier1Overrides: T1_DEFAULT,
    procUnlocks: {
        heart: { attack: 2, defend: 2 },
    },
    loot: [none(30), drop('heart-draught', 30), drop('healing-potion', 25), drop('resonance-crystal', 15)],
    // Phase 45 — faith-mid-transcendent (St. John of the Cross / Rodrigues archetype).
    philosophicalAlignment: { epistemology: -67, outlook: 0, scope: 67 },
    // Phase 57 — heart self-heal paradox for the martyr-without-cause seeking a wound to claim.
    skills: [skill('pascals-wager')],
    // Phase 102 — befriendability config: faith-based empathy and prayer connection
    befriendabilityConfig: {
        hpGate: { belowPct: 0.4 },
        requiredStances: ['heart'],
        requiredSkillUse: ['prayer'], // if player has prayer skill
        roundsThreshold: 3
    },
    // Phase 102 — friendship reward: hollow saint finds purpose in witness
    friendshipReward: {
        items: [
            { ...getConsumableById('resonance-crystal')! },
            { ...getConsumableById('heart-draught')! },
            { ...getConsumableById('healing-potion')! }
        ],
        xpBonus: 45,
        alignmentDelta: { scope: -2 }, // turns inward from transcendent to individual
        narrative: "The hollow saint finds purpose in witness. 'I have been looking for a cause to die for,' " +
                  "it says, voice clear for the first time. 'You showed me one to live for instead.'",
        flagSet: 'befriended-hollow-saint'
    },
    // Phase 102 — pact lines for friendship outcome
    pactLines: {
        quiet:   'The saint lowers its hands. The wound it was offering closes.',
        setDown: 'It places something blessed between you — not a relic, but a prayer made tangible.',
        heavy:   '"I thought martyrdom was the only honest witness. You showed me that staying alive to witness another day might be the harder, truer choice."'
    },
    // Phase 102 — journal entry unlocked on befriending
    journalEntry: {
        id: 'codex-hollow-saint',
        title: 'The Witness Who Chose to Stay',
        body: 'There are two kinds of devotion: the kind that seeks an ending, and the kind that ' +
              'chooses to continue. The saint learned that witness requires presence, not sacrifice.'
    },
    // Phase 74 — martyr-without-a-cause / "the wound it offers is your own" voice.
    finalBlowLines: {
        brutal: 'The wound it offered was yours; you returned it with interest.',
        quiet:  'The saint accepts the strike like it was a cause. The cause was not yours.',
        ironic: 'You declined to be its martyr. It found the role anyway, by other means.',
    },
    causeLines: {
        brutal: 'The wound it offered was yours. You took it. It still belongs to you.',
        broken: 'You decline the martyrdom round after round. Eventually you accept it.',
        quiet:  'The saint kneels beside where you fall. The cause it was looking for is here now.',
    },
});

// ─── Boss (2) — level 7-8 ─────────────────────────────────────────────────────

export const CoastalTyrant = createEnemy({
    id: 'enemy-coastal-tyrant',
    name: 'The Coastal Tyrant',
    description:
        'Once a magistrate of the bay; now a king whose subjects are all gulls and grievances. ' +
        'His blade is older than the village charter.',
    level: 6,
    baseStats: { body: 6, mind: 3, heart: 4 },
    mapName: 'fishing-village',
    difficulty: 'boss',
    logic: 'boss',
    tier1Overrides: T1_DEFAULT,
    procUnlocks: {
        body:  { attack: 3, defend: 3 },
        heart: { attack: 2, defend: 2 },
    },
    loot: [
        drop('healing-potion', 50),
        drop('body-elixir', 30),
        drop('heart-draught', 20),
    ],
    // Phase 45 — faith-pessimistic-transcendent (Marcion / Grand Inquisitor archetype).
    philosophicalAlignment: { epistemology: -67, outlook: -67, scope: 67 },
    // Phase 49 — body-aspected paradox skill matches the magistrate's heavy blade.
    skills: [skill('achilles-gambit')],
    // Phase 68 — boss-tier befriend predicate: the fallen-priest's friendship arc
    // opens only after he's been brought low (hpGate 40%), the player has shown
    // empathy at least once (heart stance), and 3 both-defend rounds have passed.
    // Phase 101 — rounds reduced from 5→3 to improve mercy policy decisiveness.
    befriendabilityConfig: {
        hpGate: { belowPct: 0.4 },
        requiredStances: ['heart'],
        roundsThreshold: 3, // Phase 101 — reduced from 5 to improve mercy policy viability
    },
    // Phase 70 — boss-tier friendshipReward demonstrating the full Phase 60
    // + 62 + 68 + 69 stack on one high-stakes encounter. The fallen-priest's
    // recognition + release: he gives up the regalia (Paradox Loop — "a
    // sentence which forever ends without finishing", thematically matching
    // his never-resolved despair) and a pair of healing tokens; the player
    // walks away tilted slightly toward optimism (he gave up his despair)
    // AND toward the individual scope (he saw a person, not a doctrine).
    // Uses a fixed RNG seed (() => 0.5) for the unique spawn so the reward
    // is deterministic across reloads. The unique's `requiredLevel: 15`
    // means the player can hold it from this encounter onward and equip it
    // at endgame — a long-tail reward in addition to the immediate
    // consumables + alignmentShift.
    friendshipReward: {
        items: [
            dropItem('paradox-loop', 15, 'unique', () => 0.5),
            { ...getConsumableById('healing-potion')! },
            { ...getConsumableById('heart-draught')! },
        ],
        xpBonus: 75,
        narrative:
            'For five rounds the magistrate has refused to strike. The sword stays low. ' +
            'You think at first he is preparing some final motion, but his shoulders are ' +
            'wrong for it — they have already given up the weight.\n\n' +
            '"You have not killed me," he says, as though that itself is a verdict he ' +
            'cannot quite parse. "I came here expecting to be killed."\n\n' +
            'He lifts the circlet from his brow and holds it out. The sentence on its ' +
            'inner band keeps ending and starting again, exactly as the old texts said it ' +
            'would. He does not seem surprised that you do not know what to do with it.\n\n' +
            '"Take this. Take the rest." He sets the potion and the draught beside the ' +
            'circlet. "I was the king of nothing. You have made me a man with nothing to ' +
            'be king of. That is closer to honest."',
        flagSet: 'befriended-coastal-tyrant',
        // Phase 70 — combined-axis shift matching the magistrate-fallen-priest
        // archetype's release. He gave up his despair (outlook nudges
        // optimistic +3) and saw a person rather than a doctrine (scope
        // pulls toward the individual -2). Inside the Phase 43 ±1..±5
        // authoring band; the combined-axis weight is heavier than the
        // normal-tier single-axis deltas, befitting boss-tier.
        alignmentDelta: { outlook: +3, scope: -2 },
    },
    // Phase 71 — magistrate-fallen-priest voice; "verdict" / "regalia" /
    // "magistrate" thread; pact lines echo the existing 4-paragraph
    // friendshipReward.narrative voice (boss-tier line length per D11).
    finalBlowLines: {
        brutal: 'The magistrate falls in full regalia. The blade lands beside him, still cold.',
        quiet:  'He lowers the sword before the strike. The strike still arrives.',
        ironic: 'A verdict pronounced on the magistrate, in the magistrate\'s own court.',
    },
    pactLines: {
        quiet:   'The sword stays low. The shoulders are wrong for striking — they have given up the weight.',
        setDown: 'He sets the circlet between you and steps back from it. The sentence on its inner band keeps ending and starting again.',
        heavy:   '"I was the king of nothing. You have made me a man with nothing to be king of. That is closer to honest."',
    },
    causeLines: {
        brutal: 'The old blade was older than the village charter, and it remembers its work.',
        broken: 'You hold the line as long as a man can hold a line. The magistrate holds longer.',
        quiet:  'The verdict is read out in your name. There is no appeal from the bay.',
    },
    // Phase 71 voice continued — Codex entry body extends the magistrate-
    // fallen-priest thread into long-form chronicle (GH#65 ask 3).
    journalEntry: {
        id: 'codex-coastal-tyrant',
        title: 'The Magistrate Who Set Down the Circlet',
        body:
            'He was the magistrate of the bay before he was the king of it. ' +
            'The blade is older than the village charter; the circlet older than the blade. ' +
            'The sentence on the inner band keeps ending and starting again — old texts ' +
            'said it would. He held the line for as long as a man can hold a line. ' +
            'Then he set it down and called that closer to honest.',
    },
});

export const TheDisagreement = createEnemy({
    id: 'enemy-the-disagreement',
    name: 'The Disagreement',
    description:
        'Not a single creature so much as an unresolved argument given thorns and teeth. ' +
        'Its phases are deliberate; it has rehearsed your defeat.',
    level: 8,
    baseStats: { body: 4, mind: 7, heart: 6 },
    mapName: 'northern-forest',
    difficulty: 'boss',
    logic: 'boss',
    tier1Overrides: T1_DEFAULT,
    procUnlocks: {
        mind:  { attack: 3, defend: 3 },
        heart: { attack: 2, defend: 2 },
    },
    loot: [
        drop('philosopher-tea', 40),
        drop('clarity-serum', 30),
        drop('focus-vial', 20),
        drop('revive-crystal', 10),
    ],
    // Phase 45 — logic-mid-individual (Camus / Meursault archetype).
    philosophicalAlignment: { epistemology: 67, outlook: 0, scope: -67 },
    // Phase 57 — mind-mark paradox matches the rehearsed-argument boss whose phases are deliberate.
    skills: [skill('liars-echo')],
    // Phase 102 — befriendability config: boss tier requires reasoned argumentation
    befriendabilityConfig: {
        hpGate: { belowPct: 0.2 },
        requiredStances: ['mind'], // reasoned argumentation
        roundsThreshold: 8 // boss-tier patience
    },
    // Phase 102 — friendship reward: disagreement resolves into dialogue
    friendshipReward: {
        items: [
            { ...getConsumableById('philosopher-tea')! },
            { ...getConsumableById('focus-vial')! },
            { ...getConsumableById('healing-potion')! },
            { ...getConsumableById('clarity-serum')! }
        ],
        xpBonus: 80,
        alignmentDelta: { scope: +1 }, // opens to relational despite absurdism
        narrative: "The disagreement resolves into dialogue. 'You argued back properly,' it says, thorns " +
                  "retracting one by one. 'Every phase. You earned the right to disagree with the conclusion. " +
                  "That makes this the first argument I have ever finished.'",
        flagSet: 'befriended-the-disagreement',
        // Phase 110 — boss befriend faction tradeoff: sparing the Disagreement costs
        // reputation with Merchant's Guild (they valued its philosophical constraints)
        // but gains reputation with Forest Wardens (who appreciate dialectical harmony)
        factionDeltas: {
            'merchant-guild': -10,    // lose: they valued its philosophical constraints
            'forest-wardens': +12,    // gain: appreciate dialectical harmony
        }
    },
    // Phase 102 — pact lines for friendship outcome
    pactLines: {
        quiet:   'The thorns fold. The teeth retract. For the first time, the argument pauses to listen.',
        setDown: 'It offers something paradoxical — not a token of agreement, but a respectful acknowledgment of disagreement.',
        heavy:   '"I have been the same argument for too long. You showed me what it means to argue in good faith, to disagree without hatred. The difference is... illuminating."'
    },
    // Phase 102 — journal entry unlocked on befriending
    journalEntry: {
        id: 'codex-the-disagreement',
        title: 'The Art of Arguing in Good Faith',
        body: 'Not all arguments seek to win; some seek to understand. The disagreement learned ' +
              'that resolution can come not from defeating an opponent, but from respecting the ' +
              'process of disagreement itself.'
    },
    // Phase 74 — unresolved-argument-with-thorns-and-teeth / "rehearsed your defeat" voice.
    finalBlowLines: {
        brutal: 'The argument is over because one party is no longer present to make it. The thorns retract slowly, as if the silence is what they were always for.',
        quiet:  'A point lands that the disagreement had not rehearsed. The thorns fold. The teeth retract. The argument leaves the body it had been wearing.',
        ironic: 'You agreed with one of its phases. The agreement did the work the strikes had not — the disagreement could not survive being agreed with.',
    },
    causeLines: {
        brutal: 'The phases were rehearsed. Your defeat was the conclusion of an argument prepared without you.',
        broken: 'You hold against one phase, then the next. The disagreement has more phases than you have rounds.',
        quiet:  'A single thorn lands in a small place. The argument was not loud about it. You go down quietly anyway.',
    },
});

// ─── Unique (1) — level 10 signature fight ────────────────────────────────────

export const EchoOfPyrrhonia = createEnemy({
    id: 'enemy-echo-of-pyrrhonia',
    name: 'Echo of Pyrrhonia',
    description:
        'Not a being but a recurrence: every doubt anyone has ever raised in this forest, condensed ' +
        'and given a voice. It speaks first in your own.',
    level: 10,
    baseStats: { body: 6, mind: 7, heart: 7 },
    mapName: 'northern-forest',
    difficulty: 'unique',
    logic: 'strategic',
    tier1Overrides: T1_DEFAULT,
    procUnlocks: {
        body:  { attack: 3, defend: 3 },
        mind:  { attack: 3, defend: 3 },
        heart: { attack: 3, defend: 3 },
    },
    loot: [
        drop('void-essence', 60),
        drop('philosopher-tea', 30),
        drop('revive-crystal', 10),
    ],
    // Phase 45 — mid-mid-individual (Montaigne / Ishmael archetype).
    philosophicalAlignment: { epistemology: 0, outlook: 0, scope: -67 },
    // Phase 57 — heart-aspected fallacy; the Pyrrhonian regress IS the classical
    // skeptic move (every claim demands a deeper claim ad infinitum); the
    // Echo's recurrence theme fits.
    skills: [skill('eternal-regress')],
    // Phase 74 — Pyrrhonian-regress / "speaks first in your own voice" tone.
    finalBlowLines: {
        brutal: 'The regress closes on itself. The echo stops being able to ask whether it has stopped.',
        quiet:  'A small certainty lands in the middle of the doubt. The echo cannot accommodate it; the echo falls silent.',
        ironic: 'You doubted whether the strike had landed. The echo doubted with you, and then did not recover.',
    },
    causeLines: {
        brutal: 'The regress takes one of your claims and unmakes it. Then the next. Then the body the claims were standing on.',
        broken: 'Every certainty you offered came back as a question. Eventually you ran out of certainties to be questioned.',
        quiet:  'The echo asks once whether you are still standing. You are not sure, and then you are not.',
    },
});

// ─── Test fixture (legacy, NOT counted toward Spec 07's 15) ───────────────────

/**
 * Punching-bag enemy used by Spec 04b's e2e suite and hermetic tests that
 * need a long-lived combat encounter. Kept separate from the spec-07
 * library so the encounter generator never selects it.
 */
export const Sandbag_01 = createEnemy({
    id: 'sandbag-01',
    name: 'Sandbag',
    description:
        'A practice dummy of stitched arguments, hung from a rope. It mumbles, ' +
        'rarely strikes back, and refuses to die quickly.',
    level: 10,
    baseStats: { body: 1, mind: 1, heart: 1 },
    mapName: 'northern-forest',
    difficulty: 'simple',
    logic: 'random',
    tier1Overrides: T1_DEFAULT,
    // Phase 45 — mid-mid-relational (Buber / Carraway archetype): the witness.
    philosophicalAlignment: { epistemology: 0, outlook: 0, scope: 0 },
});

// ─── Library indices ──────────────────────────────────────────────────────────

/** Spec 07 — all 15 production enemies, in difficulty order. */
export const EnemyLibrary = [
    // Simple
    TidepoolCrab, SeaMistWisp, LullabyMoth,
    // Normal
    Disatree_01, WetHound, MournfulGull, ForestSprite, HollowEyedBeggar, ArgumentativeCrow,
    // Elite
    TideflukeReaver, HushWraith, HollowSaint,
    // Boss
    CoastalTyrant, TheDisagreement,
    // Unique
    EchoOfPyrrhonia,
] as const;

/** Per-map enemy pools used by the encounter generator. */
export const EnemiesByMap = {
    'fishing-village': [
        TidepoolCrab, SeaMistWisp,
        WetHound, MournfulGull, HollowEyedBeggar,
        TideflukeReaver,
        CoastalTyrant,
    ],
    'northern-forest': [
        LullabyMoth,
        Disatree_01, ForestSprite, ArgumentativeCrow,
        HushWraith, HollowSaint,
        TheDisagreement,
        EchoOfPyrrhonia,
    ],
} as const;

/**
 * Slug-keyed registry of enemy fixtures. Useful for hermetic tests or
 * debug entry points that want to look up an enemy by short name. Spec 07
 * keeps the `disatree` and `sandbag` aliases stable for back-compat.
 */
export const ENEMY_REGISTRY = {
    // Legacy aliases.
    disatree: Disatree_01,
    sandbag:  Sandbag_01,
    // Spec 07 additions.
    'tidepool-crab':       TidepoolCrab,
    'sea-mist-wisp':       SeaMistWisp,
    'lullaby-moth':        LullabyMoth,
    'wet-hound':           WetHound,
    'mournful-gull':       MournfulGull,
    'forest-sprite':       ForestSprite,
    'hollow-eyed-beggar':  HollowEyedBeggar,
    'argumentative-crow':  ArgumentativeCrow,
    'tidefluke-reaver':    TideflukeReaver,
    'hush-wraith':         HushWraith,
    'hollow-saint':        HollowSaint,
    'coastal-tyrant':      CoastalTyrant,
    'the-disagreement':    TheDisagreement,
    'echo-of-pyrrhonia':   EchoOfPyrrhonia,
} as const;

export type EnemySlug = keyof typeof ENEMY_REGISTRY;

// Re-export the consumable library so test runners that import this file
// don't accidentally tree-shake the dependency.
void consumableLibrary;
