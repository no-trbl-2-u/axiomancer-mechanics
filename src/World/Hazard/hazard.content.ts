/**
 * Hazard Minigame v2 — authored content.
 *
 * Card and reward data is a faithful port of the design-handoff
 * prototype (`hazard-proto-engine.jsx`). Route thresholds are RETUNED
 * for the no-re-cast dice doctrine (the prototype assumed a fresh cast
 * every round; this build rolls 4 dice once per hazard) — tuning
 * evidence lives in `src/World/Hazard/e2e/hazard.balance.sim.test.ts` and
 * the rationale in `docs/hazard-balance-recommendations.md`.
 */

import { HAZARD_TUNING } from './hazard.tuning';
import type {
    HazardCardDef,
    HazardConsequenceId,
    HazardDef,
    HazardKeywordId,
    HazardProgressKey,
    HazardRewardId,
    HazardSubquestDef,
} from './hazard.types';

/** Card stat bands — the magnitudes the library draws from (see tuning). */
const C = HAZARD_TUNING.cards;
const U = C.utility;
/** Reward-pool expansion magnitudes (2026-06-11 roster). */
const X = C.expansion;
/** Sub-quest tuning (reward magnitudes + thresholds). */
const Q = HAZARD_TUNING.subquests;

// ---------------------------------------------------------------------------
// Keyword glossary (tap-to-read detail)
// ---------------------------------------------------------------------------

export const HAZARD_KEYWORDS: Record<HazardKeywordId, { name: string; desc: string }> = {
    surge: { name: 'SURGE', desc: 'Drop a matching-colour die on this card for its stronger, lower effect.' },
    force: { name: 'FORCE', desc: 'Brawn against the rock — fills the FORCE meter.' },
    escape: { name: 'ESCAPE', desc: 'Speed across the gap — fills the ESCAPE meter.' },
    convert: { name: 'CONVERT', desc: 'Turn hostile ✕-dice into wild GOLD dice. Minor turns one; major turns them all.' },
    draw: { name: 'DRAW', desc: 'Pull more cards into your hand — more ways to cross.' },
    recast: { name: 'RE-CAST', desc: 'Re-roll all your unspent dice into fresh faces.' },
    gilded: { name: 'GILDED', desc: 'Yellow cards are rare. They give a major effect for free; apply a yellow die to add their numbers.' },
    salvage: { name: 'SALVAGE', desc: 'Drag this card to the bin to scrap it for a lesser benefit instead of playing it.' },
    crack: { name: 'CRACK', desc: 'Dead weight. This card does nothing and cannot be powered. It only clogs your hand.' },
    twotone: { name: 'TWO-TONE', desc: 'Either of two colours of die can power this card.' },
    enchant: { name: 'ENCHANT', desc: 'A lasting boon — it adds to every matching card you play for the rest of the hazard.' },
    burst: { name: 'BURST', desc: 'A one-round shove — its progress counts THIS round only, then is spent.' },
    rally: { name: 'RALLY', desc: 'Each unspent mana die you still hold adds progress this round.' },
    sacrifice: { name: 'SACRIFICE', desc: 'Pay VITAE now for a surge of progress this round.' },
    vow: { name: 'VOW', desc: 'Primes a one-time boon onto the next wild GOLD die you spend.' },
    choose: { name: 'CHOOSE', desc: 'You pick which meter its powered value feeds when you apply it.' },
};

// ---------------------------------------------------------------------------
// The draw deck. kind = colour. f/e = FREE values; fp/ep = SURGE values.
// weight = relative frequency in the starter draw bag.
// ---------------------------------------------------------------------------

export const HAZARD_DECK: HazardCardDef[] = [
    // RED — pure FORCE numbers (single meter), considerably higher than purple.
    { id: 'steps', name: 'STONE STEPS', kind: 'red', rarity: 'common', weight: 3, f: C.redBlue.common.free, e: 0, fp: C.redBlue.common.powered, ep: 0, salvage: { type: 'progress', key: 'force', amount: 1 }, flavor: 'Kick footholds into the failing rock.', keywords: ['force', 'surge'] },
    { id: 'haul', name: 'DEAD-MAN HAUL', kind: 'red', rarity: 'common', weight: 3, f: C.redBlue.common.free, e: 0, fp: C.redBlue.common.powered, ep: 0, salvage: { type: 'mana' }, flavor: 'Drag yourself up by rope and will.', keywords: ['force', 'surge'] },
    { id: 'grip', name: 'IRON GRIP', kind: 'red', rarity: 'uncommon', weight: 2, f: C.redBlue.uncommon.free, e: 0, fp: C.redBlue.uncommon.powered, ep: 0, salvage: { type: 'progress', key: 'force', amount: 1 }, flavor: 'Hands like a closing vise.', keywords: ['force', 'surge'] },

    // BLUE — pure ESCAPE numbers (single meter).
    { id: 'scram', name: 'SCRAMBLE', kind: 'blue', rarity: 'common', weight: 3, f: 0, e: C.redBlue.common.free, fp: 0, ep: C.redBlue.common.powered, salvage: { type: 'progress', key: 'escape', amount: 1 }, flavor: 'Half-fall, half-fly across the gap.', keywords: ['escape', 'surge'] },
    { id: 'runner', name: 'CLIFFRUNNER', kind: 'blue', rarity: 'common', weight: 3, f: 0, e: C.redBlue.common.free, fp: 0, ep: C.redBlue.common.powered, salvage: { type: 'mana' }, flavor: 'Momentum is the only thing holding you up.', keywords: ['escape', 'surge'] },
    { id: 'leap', name: 'FAITH LEAP', kind: 'blue', rarity: 'uncommon', weight: 2, f: 0, e: C.redBlue.uncommon.free, fp: 0, ep: C.redBlue.uncommon.powered, salvage: { type: 'progress', key: 'escape', amount: 1 }, flavor: 'Close your eyes. Trust the far side.', keywords: ['escape', 'surge'] },

    // PURPLE — low DUAL number (both meters) + a MINOR utility that the die
    // upgrades to MAJOR. The die powers the utility, not the number, so the
    // powered numbers match the free ones by design.
    { id: 'footing', name: 'SURE FOOTING', kind: 'purple', rarity: 'common', weight: 3, f: C.purple.free, e: C.purple.free, fp: C.purple.powered, ep: C.purple.powered, effect: 'draw', drawBase: U.drawMinorBase, drawPowered: U.drawMinorPowered, salvage: { type: 'progress', key: 'force', amount: 1 }, flavor: 'Read the ledge, then send your eyes ahead.', keywords: ['draw', 'surge'] },
    { id: 'windread', name: 'READ THE WIND', kind: 'purple', rarity: 'common', weight: 2, f: C.purple.free, e: C.purple.free, fp: C.purple.powered, ep: C.purple.powered, effect: 'convert', salvage: { type: 'progress', key: 'escape', amount: 1 }, flavor: 'Let the valley turn the hostile gust to your back.', keywords: ['convert', 'surge'] },
    { id: 'pole', name: 'BALANCE POLE', kind: 'purple', rarity: 'uncommon', weight: 2, f: C.purple.strong, e: C.purple.strong, fp: C.purple.strong, ep: C.purple.strong, effect: 'recast', salvage: { type: 'progress', key: 'force', amount: 1 }, flavor: 'Weight in both hands; shake the dice loose and begin again.', keywords: ['recast', 'surge'] },

    // GOLD ("YELLOW") — utility-FIRST: a MAJOR effect for free, and a high
    // DUAL number that only appears once a (wild) gold die is applied. Rare.
    { id: 'oath', name: 'UNBROKEN OATH', kind: 'gold', rarity: 'rare', weight: 1, f: C.gold.free, e: C.gold.free, fp: C.gold.powered, ep: C.gold.powered, effect: 'draw', majorEffect: true, drawBase: U.drawMajor, drawPowered: U.drawMajor, salvage: { type: 'mana' }, flavor: 'You will not fall. You refuse — and the path answers.', keywords: ['gilded', 'draw', 'surge'] },
    { id: 'blessing', name: "PILGRIM'S BLESSING", kind: 'gold', rarity: 'rare', weight: 1, f: C.gold.free, e: C.gold.free, fp: C.gold.strongPowered, ep: C.gold.strongPowered, effect: 'recast', majorEffect: true, salvage: { type: 'mana' }, flavor: 'Something older than the cliff steadies your hand.', keywords: ['gilded', 'recast', 'surge'] },
];

/**
 * Consequence CRACK card — shuffled into the persistent deck by the
 * `deadcard` consequence. Dead: no values, never powerable.
 */
export const HAZARD_CRACK_CARD: HazardCardDef = {
    id: 'crack', name: 'CRACK', kind: 'purple', rarity: 'common', f: 0, e: 0, fp: 0, ep: 0,
    dead: true, flavor: 'The flaw travels with you now.', keywords: ['crack'],
};

// ---------------------------------------------------------------------------
// Reward-card pool (offered after a clear; picked cards join the deck)
// ---------------------------------------------------------------------------

export const HAZARD_REWARD_CARDS: HazardCardDef[] = [
    // commons / uncommons — clean numbers
    { id: 'r_grip', name: 'GREATGRIP', kind: 'red', rarity: 'common', f: C.redBlue.reward.free, e: 0, fp: C.redBlue.reward.powered, ep: 0, salvage: { type: 'progress', key: 'force', amount: 1 }, flavor: 'Hands like vise-iron.', keywords: ['force', 'surge'] },
    { id: 'r_wind', name: 'TAILWIND', kind: 'blue', rarity: 'common', f: 0, e: C.redBlue.reward.free, fp: 0, ep: C.redBlue.reward.powered, salvage: { type: 'progress', key: 'escape', amount: 1 }, flavor: 'The valley breathes you onward.', keywords: ['escape', 'surge'] },
    { id: 'r_even', name: 'EVENKEEL', kind: 'purple', rarity: 'uncommon', f: C.purple.strong, e: C.purple.strong, fp: C.purple.strong, ep: C.purple.strong, effect: 'draw', drawBase: U.drawMinorBase, drawPowered: U.drawMinorPowered, salvage: { type: 'mana' }, flavor: 'Neither rushed nor rooted — and one eye further down the path.', keywords: ['draw', 'surge'] },
    { id: 'r_conv', name: 'HEX-BREAKER', kind: 'purple', rarity: 'uncommon', f: C.purple.free, e: C.purple.free, fp: C.purple.free, ep: C.purple.free, effect: 'convert', salvage: { type: 'mana' }, flavor: 'Unmake the hostile die and steady your feet.', keywords: ['convert', 'surge'] },
    // rare red/blue — number cards that ALSO carry a minor utility (the die
    // still upgrades the number; the small utility fires for free).
    { id: 'r_seer', name: 'FAR-SEER', kind: 'red', rarity: 'rare', f: C.redBlue.uncommon.free, e: 0, fp: C.redBlue.uncommon.powered, ep: 0, effect: 'draw', drawBase: U.drawMinorBase, drawPowered: U.drawMinorBase, salvage: { type: 'progress', key: 'force', amount: 1 }, flavor: 'Strength, and the wit to see where to spend it.', keywords: ['force', 'draw', 'surge'] },
    { id: 'r_gale', name: 'GALE-READER', kind: 'blue', rarity: 'rare', f: 0, e: C.redBlue.uncommon.free, fp: 0, ep: C.redBlue.uncommon.powered, effect: 'draw', drawBase: U.drawMinorBase, drawPowered: U.drawMinorBase, salvage: { type: 'progress', key: 'escape', amount: 1 }, flavor: 'Speed, and the eyes to aim it.', keywords: ['escape', 'draw', 'surge'] },
    // rare gold — utility-first, dual numbers on a wild die
    { id: 'r_oath', name: 'UNBROKEN OATH', kind: 'gold', rarity: 'rare', f: C.gold.free, e: C.gold.free, fp: C.gold.powered, ep: C.gold.powered, effect: 'draw', majorEffect: true, drawBase: U.drawMajor, drawPowered: U.drawMajor, salvage: { type: 'mana' }, flavor: 'You will not fall. You refuse.', keywords: ['gilded', 'draw', 'surge'] },
    { id: 'r_crown', name: 'CROWN RELIC', kind: 'gold', rarity: 'rare', f: C.gold.free, e: C.gold.free, fp: C.gold.strongPowered, ep: C.gold.strongPowered, effect: 'recast', majorEffect: true, salvage: { type: 'mana' }, flavor: 'A king died wearing this on a worse ledge.', keywords: ['gilded', 'recast', 'surge'] },

    // ====================================================================
    // EXPANSION ROSTER (2026-06-11) — all reward-pool; balance sim untouched.
    // ====================================================================

    // --- Two-tone pivots: free one meter, surge the OTHER (bigger). Either a
    //     red OR a blue die powers them. ---
    { id: 'r_pivot', name: 'STORM PIVOT', kind: 'red', colors: ['red', 'blue'], rarity: 'uncommon', f: X.pivot.uncFree, e: 0, fp: 0, ep: X.pivot.uncPowered, salvage: { type: 'progress', key: 'force', amount: 1 }, flavor: 'Plant your feet, then break and run.', keywords: ['force', 'escape', 'twotone', 'surge'] },
    { id: 'r_drop', name: 'DEADWEIGHT DROP', kind: 'blue', colors: ['red', 'blue'], rarity: 'uncommon', f: 0, e: X.pivot.uncFree, fp: X.pivot.uncPowered, ep: 0, salvage: { type: 'progress', key: 'escape', amount: 1 }, flavor: 'Stop running. Set your shoulder.', keywords: ['escape', 'force', 'twotone', 'surge'] },
    { id: 'r_last', name: 'LAST RESORT', kind: 'red', colors: ['red', 'blue'], rarity: 'rare', f: X.pivot.rareFree, e: 0, fp: 0, ep: X.pivot.rarePowered, salvage: { type: 'progress', key: 'force', amount: 1 }, flavor: 'When the rock wins, the gap is the only door.', keywords: ['force', 'escape', 'twotone', 'surge'] },

    // --- Lopsided purple duals (both meters, weighted). ---
    { id: 'r_heave', name: 'HEAVE-TO', kind: 'purple', rarity: 'uncommon', f: X.dual.strong, e: X.dual.weak, fp: X.dual.strongPowered, ep: X.dual.weakPowered, salvage: { type: 'progress', key: 'force', amount: 1 }, flavor: 'Mostly muscle, a little flight.', keywords: ['force', 'escape', 'surge'] },
    { id: 'r_skitter', name: 'SKITTER', kind: 'purple', rarity: 'uncommon', f: X.dual.weak, e: X.dual.strong, fp: X.dual.weakPowered, ep: X.dual.strongPowered, salvage: { type: 'progress', key: 'escape', amount: 1 }, flavor: 'Mostly flight, a little grip.', keywords: ['force', 'escape', 'surge'] },

    // --- Number + utility hybrids. ---
    { id: 'r_path', name: 'PATHFINDER', kind: 'red', rarity: 'rare', f: X.hybrid.flatNumber, e: 0, fp: X.hybrid.flatNumber, ep: 0, effect: 'recast', salvage: { type: 'progress', key: 'force', amount: 1 }, flavor: 'Strength, and the sense to re-throw.', keywords: ['force', 'recast', 'surge'] },
    { id: 'r_windcall', name: 'WINDCALLER', kind: 'blue', rarity: 'rare', f: 0, e: X.hybrid.flatNumber, fp: 0, ep: X.hybrid.flatNumber, effect: 'convert', salvage: { type: 'progress', key: 'escape', amount: 1 }, flavor: 'Run, and bend the curse as you pass.', keywords: ['escape', 'convert', 'surge'] },
    { id: 'r_stone', name: 'STONEREADER', kind: 'red', rarity: 'uncommon', f: X.hybrid.drawFree, e: 0, fp: X.hybrid.drawPowered, ep: 0, effect: 'draw', drawBase: U.drawMinorBase, drawPowered: U.drawMinorPowered, salvage: { type: 'progress', key: 'force', amount: 1 }, flavor: 'A foothold and a glance ahead.', keywords: ['force', 'draw', 'surge'] },
    { id: 'r_tide', name: 'TIDEREADER', kind: 'blue', rarity: 'uncommon', f: 0, e: X.hybrid.drawFree, fp: 0, ep: X.hybrid.drawPowered, effect: 'draw', drawBase: U.drawMinorBase, drawPowered: U.drawMinorPowered, salvage: { type: 'progress', key: 'escape', amount: 1 }, flavor: 'A stride and a glance ahead.', keywords: ['escape', 'draw', 'surge'] },

    // --- Enchantments (auras): persist for the rest of the hazard. ---
    { id: 'r_aggr', name: 'AGGRESSION', kind: 'red', rarity: 'rare', f: X.aura.redBlueFree, e: 0, fp: X.aura.redBluePowered, ep: 0, effect: 'aura', auraBase: { auraForce: X.aura.redBlueAmount }, auraPowered: { auraForce: X.aura.redBlueAmount }, salvage: { type: 'progress', key: 'force', amount: 1 }, flavor: 'Stop climbing carefully. Climb angry.', keywords: ['force', 'enchant', 'surge'] },
    { id: 'r_swift', name: 'SWIFTNESS', kind: 'blue', rarity: 'rare', f: 0, e: X.aura.redBlueFree, fp: 0, ep: X.aura.redBluePowered, effect: 'aura', auraBase: { auraEscape: X.aura.redBlueAmount }, auraPowered: { auraEscape: X.aura.redBlueAmount }, salvage: { type: 'progress', key: 'escape', amount: 1 }, flavor: 'Once you start running you do not stop.', keywords: ['escape', 'enchant', 'surge'] },
    { id: 'r_zeal', name: 'ZEAL', kind: 'purple', rarity: 'rare', f: X.aura.purpleNumber, e: X.aura.purpleNumber, fp: X.aura.purpleNumber, ep: X.aura.purpleNumber, effect: 'aura', auraBase: { auraForce: X.aura.purpleMinor, auraEscape: X.aura.purpleMinor }, auraPowered: { auraForce: X.aura.purpleMajor, auraEscape: X.aura.purpleMajor }, salvage: { type: 'progress', key: 'force', amount: 1 }, flavor: 'Faith carries the whole body forward.', keywords: ['enchant', 'surge'] },
    { id: 'r_martyr', name: "MARTYR'S RESOLVE", kind: 'gold', rarity: 'rare', f: 0, e: 0, fp: X.aura.goldNumber, ep: X.aura.goldNumber, effect: 'aura', majorEffect: true, auraBase: { auraForce: X.aura.goldAmount, auraEscape: X.aura.goldAmount }, auraPowered: { auraForce: X.aura.goldAmount, auraEscape: X.aura.goldAmount }, salvage: { type: 'mana' }, flavor: 'He decided not to die, and the cliff lost its vote.', keywords: ['gilded', 'enchant', 'surge'] },
    { id: 'r_relic', name: 'RELIC OF FURY', kind: 'gold', rarity: 'rare', f: 0, e: 0, fp: X.aura.goldNumber, ep: X.aura.goldNumber, effect: 'aura', majorEffect: true, auraBase: { surgeForce: X.aura.surgeBoost, surgeEscape: X.aura.surgeBoost }, auraPowered: { surgeForce: X.aura.surgeBoost, surgeEscape: X.aura.surgeBoost }, salvage: { type: 'mana' }, flavor: 'Every spell after this one bites harder.', keywords: ['gilded', 'enchant', 'surge'] },

    // --- Gold vow: one-shot priming on the next gold die used. ---
    { id: 'r_vow', name: 'GILDED VOW', kind: 'gold', rarity: 'rare', f: 0, e: 0, fp: 0, ep: 0, effect: 'goldvow', majorEffect: true, goldVow: { force: X.vow.force, escape: X.vow.escape }, salvage: { type: 'mana' }, flavor: 'Swear it on the gold, and the next throw answers.', keywords: ['gilded', 'vow'] },

    // --- Bursts (this-round-only). ---
    { id: 'r_serk', name: 'BERSERK', kind: 'red', rarity: 'uncommon', f: 0, e: 0, fp: 0, ep: 0, effect: 'burst', burstBase: { force: X.burst.base }, burstPowered: { force: X.burst.powered }, salvage: { type: 'progress', key: 'force', amount: 1 }, flavor: 'Everything you have, right now.', keywords: ['force', 'burst', 'surge'] },
    { id: 'r_bolt', name: 'BOLT', kind: 'blue', rarity: 'uncommon', f: 0, e: 0, fp: 0, ep: 0, effect: 'burst', burstBase: { escape: X.burst.base }, burstPowered: { escape: X.burst.powered }, salvage: { type: 'progress', key: 'escape', amount: 1 }, flavor: 'One breath, one sprint.', keywords: ['escape', 'burst', 'surge'] },
    { id: 'r_warcry', name: 'WAR-CRY', kind: 'red', rarity: 'rare', f: 0, e: 0, fp: 0, ep: 0, effect: 'burst', burstPerUnspentDieForce: X.burst.warcryPerDie, salvage: { type: 'progress', key: 'force', amount: 1 }, flavor: 'He counts what is left and throws all of it.', keywords: ['force', 'rally'] },
    { id: 'r_blood', name: 'BLOODPRICE', kind: 'red', rarity: 'rare', f: 0, e: 0, fp: 0, ep: 0, effect: 'burst', burstBase: { force: X.burst.bloodForce }, burstPowered: { force: X.burst.bloodPowered }, vitaeCost: X.burst.bloodVitae, salvage: { type: 'progress', key: 'force', amount: 1 }, flavor: 'The cliff takes its toll early, by arrangement.', keywords: ['force', 'sacrifice', 'surge'] },
    { id: 'r_pwrath', name: "PILGRIM'S WRATH", kind: 'gold', rarity: 'rare', f: 0, e: 0, fp: X.burst.goldNumber, ep: X.burst.goldNumber, effect: 'burst', majorEffect: true, burstBase: { force: X.burst.goldDual, escape: X.burst.goldDual }, burstPowered: { force: X.burst.goldDual, escape: X.burst.goldDual }, salvage: { type: 'mana' }, flavor: 'The meek inherit nothing. He took the path by force.', keywords: ['gilded', 'burst', 'surge'] },

    // --- Choose (TWIN PATHS): powered value feeds one meter you pick. ---
    { id: 'r_twin', name: 'TWIN PATHS', kind: 'gold', rarity: 'rare', f: 0, e: 0, fp: X.choose, ep: X.choose, choose: true, salvage: { type: 'mana' }, flavor: 'Two ways down. Both yours.', keywords: ['gilded', 'choose', 'surge'] },

    // --- Tempo snowball. ---
    { id: 'r_saint', name: "SAINT'S PATIENCE", kind: 'purple', rarity: 'rare', f: X.saint.number, e: X.saint.number, fp: X.saint.number, ep: X.saint.number, effect: 'draw', drawBase: X.saint.draw, drawPowered: X.saint.draw, momentumBonus: X.saint.momentum, salvage: { type: 'mana' }, flavor: 'Bank the lead. Spend it later.', keywords: ['draw', 'surge'] },
];

export function getHazardCardDef(cardId: string): HazardCardDef {
    const def =
        HAZARD_DECK.find((c) => c.id === cardId) ??
        HAZARD_REWARD_CARDS.find((c) => c.id === cardId) ??
        (cardId === HAZARD_CRACK_CARD.id ? HAZARD_CRACK_CARD : undefined);
    if (!def) throw new Error(`Unknown hazard card id: ${cardId}`);
    return def;
}

// ---------------------------------------------------------------------------
// Boon / consequence catalogues
// ---------------------------------------------------------------------------

export const HAZARD_REWARDS: Record<HazardRewardId, { name: string; icon: string; desc: string }> = {
    cache: { name: 'Shrine Cache', icon: 'chest', desc: 'A sealed cache of relics and coin from across the split. +12 shillings.' },
    relic: { name: 'Bonus Relic', icon: 'relic', desc: 'A rare relic — risk-route exclusive. +20 shillings.' },
    vitae: { name: 'Restored Vitae', icon: 'heart', desc: 'Recover 6 Vitae as the danger passes.' },
    token: { name: 'Paradox Token', icon: 'paradox', desc: '+1 banked Paradox token for your next combat.' },
};

export const HAZARD_CONSEQUENCES: Record<HazardConsequenceId, { name: string; icon: string; desc: string }> = {
    tokens: { name: 'Sundered', icon: 'tokens', desc: 'Lose all banked Paradox & Fallacy tokens.' },
    deadcard: { name: 'Dead Weight', icon: 'deadcard', desc: 'A useless CRACK card is shuffled into your deck.' },
    maxhp: { name: 'Scarred', icon: 'maxhp', desc: '−5 Maximum Vitae until you next rest at an inn.' },
    minhp: { name: 'Bleeding', icon: 'minhp', desc: 'Lose 8 Vitae immediately.' },
    curse: { name: 'Hexed', icon: 'curse', desc: 'Begin your next combat with a hostile Curse die.' },
};

// ---------------------------------------------------------------------------
// Sub-quest catalogue — optional per-hazard objectives.
//
// Each hazard rolls `HAZARD_TUNING.subquests.pickCount` of these (seeded,
// independent of the card/dice stream). Completing one on a SURVIVED crossing
// pays its bonus on top of the spoils; a failed crossing forfeits them. The
// engine owns each id's pass/fail logic (`hazardSubquestStatus`); this table
// is pure data.
// ---------------------------------------------------------------------------

const SHILLINGS_REWARD = { kind: 'shillings', amount: Q.shillings } as const;
const VITAE_REWARD = { kind: 'vitae', amount: Q.vitae } as const;
const TOKEN_REWARD = { kind: 'token', amount: Q.token } as const;

export const HAZARD_SUBQUESTS: HazardSubquestDef[] = [
    { id: 'travel-light', name: 'TRAVEL LIGHT', desc: `Commit no more than ${Q.travelLightCap} cards all crossing.`, reward: VITAE_REWARD },
    { id: 'dice-reserve', name: 'DICE IN RESERVE', desc: `Hold ${Q.diceReserveCount}+ dice unspent at the final round.`, reward: SHILLINGS_REWARD },
    { id: 'steady-hand', name: 'STEADY HAND', desc: 'Never empty your hand at a round resolve.', reward: SHILLINGS_REWARD },
    { id: 'flawless', name: 'FLAWLESS', desc: 'Clear every round of the crossing.', reward: TOKEN_REWARD },
    { id: 'surge-master', name: 'SURGE MASTER', desc: `Power ${Q.surgeMasterCount}+ cards with dice.`, reward: SHILLINGS_REWARD },
    { id: 'stormcaller', name: 'STORMCALLER', desc: `Fire ${Q.stormcallerCount}+ re-cast or convert effects.`, reward: SHILLINGS_REWARD },
    { id: 'scavenger', name: 'SCAVENGER', desc: `Salvage ${Q.scavengerCount}+ cards to the bin.`, reward: VITAE_REWARD },
    { id: 'momentum', name: 'MOMENTUM', desc: 'Carry surplus momentum into a later round.', reward: SHILLINGS_REWARD },
    { id: 'fast-start', name: 'FAST START', desc: 'Clear the first round.', reward: SHILLINGS_REWARD },
    { id: 'finisher', name: 'FINISHER', desc: 'Clear the final round.', reward: VITAE_REWARD },
];

export function getHazardSubquestDef(id: string): HazardSubquestDef {
    const def = HAZARD_SUBQUESTS.find((q) => q.id === id);
    if (!def) throw new Error(`Unknown hazard sub-quest id: ${id}`);
    return def;
}

/** Vitae restored by the `vitae` reward. */
export const HAZARD_VITAE_REWARD = HAZARD_TUNING.rewards.vitae;
/** Shillings granted by the `cache` reward. */
export const HAZARD_CACHE_SHILLINGS = HAZARD_TUNING.rewards.cacheShillings;
/** Shillings granted by the `relic` reward. */
export const HAZARD_RELIC_SHILLINGS = HAZARD_TUNING.rewards.relicShillings;
/** Vitae lost to the `minhp` consequence. */
export const HAZARD_MINHP_LOSS = HAZARD_TUNING.rewards.minhpLoss;
/** Maximum-vitae reduction from the `maxhp` consequence. */
export const HAZARD_MAXHP_SCAR = HAZARD_TUNING.rewards.maxhpScar;

// ---------------------------------------------------------------------------
// Progress types & die faces
// ---------------------------------------------------------------------------

export const HAZARD_TYPES: Record<HazardProgressKey, { key: HazardProgressKey; label: string }> = {
    force: { key: 'force', label: 'FORCE' },
    escape: { key: 'escape', label: 'ESCAPE' },
};

/** Die faces: the four colours plus hostile ✕. Authored in the tuning
 *  module (gold is the wild face); re-exported here for existing imports. */
export { HAZARD_DIE_FACES } from './hazard.tuning';

// ---------------------------------------------------------------------------
// Authored hazards.
//
// Thresholds tuned for the no-re-cast doctrine via Monte-Carlo
// simulation (balance.sim.test.ts): one cast of 4 dice must last all
// 3 rounds, so totals sit well below the prototype's per-round values
// (Safe 12/13/14, Risk 7/7→9/10) which assumed a fresh cast each round.
//
// DIFFICULTY PASS (2026-06-12): playtest reported the crossings had grown
// too easy, so every threshold was raised a step (safe +1/+2/+2 per round,
// risk +0/+1/+1 per meter). The greedy bot's safe perfect rate fell from
// ~60-70% to ~30-40% and risk perfect from ~20% to ~10%, while safe stayed
// near-always at least a partial clear. Bands re-blessed in balance.sim.test.ts.
// ---------------------------------------------------------------------------

export const HAZARD_LIBRARY: HazardDef[] = [
    {
        id: 'cracked-cliff',
        title: 'CRACKED CLIFF PATH',
        scenario: 'The ledge fails underfoot. A shrine cache glints across the split.',
        intro: 'The ledge sheds itself into the dark a stone at a time. Below, the valley is paved with pilgrims who trusted this path. He will join them — the cliff has already decided. Unless…',
        boardHeadline: 'THE SPLIT WIDENS',
        safeBoardNote: 'reach the passage mark to cross',
        riskBoardNote: 'clear both meters to cross',
        safeRouteName: 'LEDGE CRAWL',
        riskRouteName: 'THE LEAP',
        safeRouteDesc: 'One combined meter — any progress counts. Forgiving, but the prize is plain.',
        riskRouteDesc: 'Two meters, both required each round — split your hand between FORCE and ESCAPE.',
        rounds: 3,
        safe: { key: 'safe', dual: false, thresholds: [20, 23, 25], rewardLabel: 'Normal reward', penaltyVitae: 2 },
        risk: { key: 'risk', dual: true, thresholds: [[9, 9], [11, 11], [12, 12]], rewardLabel: 'Shrine cache + bonus relic', penaltyVitae: 4 },
    },
    {
        id: 'flooded-undercroft',
        title: 'FLOODED UNDERCROFT',
        scenario: 'Black water climbs the crypt stairs. Something below is still breathing.',
        intro: 'Black water swallows the stairs faster than he can climb them. The cold has his legs; the dark has the rest. No one drowns slowly here — the crypt keeps what it fills. Unless…',
        boardHeadline: 'THE WATER RISES',
        safeBoardNote: 'wade the long gallery before it fills',
        riskBoardNote: 'dive the drowned shortcut — both meters',
        safeRouteName: 'THE LONG GALLERY',
        riskRouteName: 'THE DROWNED DOOR',
        safeRouteDesc: 'One combined meter — slow, cold, survivable. The water takes its toll either way.',
        riskRouteDesc: 'Force the door and out-swim the surge. Both meters, every round.',
        rounds: 3,
        safe: { key: 'safe', dual: false, thresholds: [19, 23, 26], rewardLabel: 'Normal reward', penaltyVitae: 2 },
        risk: { key: 'risk', dual: true, thresholds: [[8, 10], [10, 12], [11, 13]], rewardLabel: 'Reliquary haul + bonus relic', penaltyVitae: 4 },
    },
    {
        id: 'ashfall-crossing',
        title: 'ASHFALL CROSSING',
        scenario: 'The burning field exhales. Each gust strips the path a little barer.',
        intro: 'The ash falls warm as breath and does not stop. It fills his bootprints behind him, then his lungs. The field has buried armies without slowing. It will not even notice him. Unless…',
        boardHeadline: 'THE ASH FALLS',
        safeBoardNote: 'hold the cinder ridge to the far side',
        riskBoardNote: 'run the ashfall flat — both meters',
        safeRouteName: 'CINDER RIDGE',
        riskRouteName: 'THE ASH RUN',
        safeRouteDesc: 'One combined meter — keep to the high stones and grind it out.',
        riskRouteDesc: 'A dead sprint under falling ash. Both meters, and the last round is the worst.',
        rounds: 3,
        safe: { key: 'safe', dual: false, thresholds: [22, 23, 25], rewardLabel: 'Normal reward', penaltyVitae: 2 },
        risk: { key: 'risk', dual: true, thresholds: [[10, 8], [11, 11], [13, 11]], rewardLabel: 'Ember hoard + bonus relic', penaltyVitae: 4 },
    },
    {
        id: 'famine-march',
        title: 'THE FAMINE MARCH',
        scenario: 'The road outlasted the rations days ago. The next well is a rumor.',
        intro: 'Three days since the last crust. His body has begun eating itself — politely, quietly, the way starvation always does. The road ahead is long and the road behind is longer. He dies walking. Unless…',
        boardHeadline: 'THE HUNGER DEEPENS',
        safeBoardNote: 'forage the long way and keep moving',
        riskBoardNote: 'force-march the dry flats — both meters',
        safeRouteName: 'THE FORAGE TRAIL',
        riskRouteName: 'THE DRY FLATS',
        safeRouteDesc: 'One combined meter — grub roots, drink dew, keep your feet moving. Slow starvation against slow progress.',
        riskRouteDesc: 'March straight through on an empty belly. Both meters, every round, or the road keeps you.',
        rounds: 3,
        safe: { key: 'safe', dual: false, thresholds: [20, 23, 25], rewardLabel: 'Normal reward', penaltyVitae: 2 },
        risk: { key: 'risk', dual: true, thresholds: [[9, 9], [11, 11], [12, 12]], rewardLabel: 'Cached provisions + bonus relic', penaltyVitae: 4 },
    },
    {
        id: 'bandit-hunt',
        title: 'HUNTED BY BANDITS',
        scenario: 'Whistles on both ridges. The road behind is already closed.',
        intro: 'They have his scent, his pace, and his road. Bandits do not chase — they herd, and the gully ahead is the pen. Whatever they leave of him will not need burying. Unless…',
        boardHeadline: 'THE NOOSE TIGHTENS',
        safeBoardNote: 'go to ground and slip the cordon',
        riskBoardNote: 'break through the ambush — both meters',
        safeRouteName: 'GO TO GROUND',
        riskRouteName: 'BREAK THE LINE',
        safeRouteDesc: 'One combined meter — ditch, double back, wade the stream. Lose them slowly or not at all.',
        riskRouteDesc: 'Run straight at the thinnest point of the cordon. Both meters, every round — hesitate and they close.',
        rounds: 3,
        safe: { key: 'safe', dual: false, thresholds: [19, 23, 26], rewardLabel: 'Normal reward', penaltyVitae: 2 },
        risk: { key: 'risk', dual: true, thresholds: [[8, 10], [10, 12], [11, 13]], rewardLabel: 'Bandit spoils + bonus relic', penaltyVitae: 4 },
    },
    {
        id: 'fever-rot',
        title: 'THE CREEPING ROT',
        scenario: 'The marsh air carries the fever. It has already found the cut on his arm.',
        intro: 'The fever came in with the marsh water and is already past his elbow, drawing its black lines toward the heart. Men twice his size have died of half this. He has a day, perhaps less. Unless…',
        boardHeadline: 'THE FEVER CLIMBS',
        safeBoardNote: 'sweat it out at the hermit fires',
        riskBoardNote: 'cut for the dry hills — both meters',
        safeRouteName: 'THE HERMIT FIRES',
        riskRouteName: 'THE DRY HILLS',
        safeRouteDesc: 'One combined meter — boil the wound, burn the chill, endure. The slow cure costs all the same.',
        riskRouteDesc: 'Outrun the rot to clean air and high ground. Both meters, every round, on failing legs.',
        rounds: 3,
        safe: { key: 'safe', dual: false, thresholds: [22, 23, 25], rewardLabel: 'Normal reward', penaltyVitae: 2 },
        risk: { key: 'risk', dual: true, thresholds: [[10, 8], [11, 11], [13, 11]], rewardLabel: 'Hermit tinctures + bonus relic', penaltyVitae: 4 },
    },
];

export function getHazardDef(hazardId: string): HazardDef {
    const def = HAZARD_LIBRARY.find((h) => h.id === hazardId);
    if (!def) throw new Error(`Unknown hazard id: ${hazardId}`);
    return def;
}
