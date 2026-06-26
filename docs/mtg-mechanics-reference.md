# MTG Mechanics Reference for Axiomancer Card Design

> Compiled from Scryfall data (2026-06-26). Used during heavy card library design sessions.
> Each mechanic: the pattern, Axiomancer translation notes, example cards with full oracle text.
> Fields referenced: `echoPerCardForce/Escape`, `foretellScour`, `foretellDrawCount`,
> `purgeDrawCount`, `burstMendBase/Powered`, `burstPerUnspentDieForce/Escape`, `effect`,
> `vitaeCost`, `salvage`, `drawBase`, `drawPowered`.

---

## Storm — bonus copies per spell cast before this one

**MTG Rules:** "When you cast this spell, copy it for each spell cast before it this turn."
**Design pattern:** Rewards players who chain many cheap spells in one turn. A single Storm card
played last in a chain of 5 becomes 6 copies. The key tension: you must build the chain first,
then pay off.
**Axiomancer translation → ECHO:** `echoPerCardForce` / `echoPerCardEscape` on a burst card.
Counts `s.play.filter(p => p.applied).length` cards already applied this round. The current card
is in `play` but not yet applied, so the count excludes it — correct Storm semantics. Powered
(die attached) doubles the echo bonus.
**Balance lever:** Echo value per card × typical chain length. At `echoPerCardForce: 3`, a
4-card chain is +12 FORCE — huge, but requires having 3 other cards already down. Gate behind
high rarity; starter decks rarely chain 4+ cards.

### Example cards

#### Grapeshot ({1}{R})
*Sorcery*
Grapeshot deals 1 damage to any target.
Storm (When you cast this spell, copy it for each spell cast before it this turn. You may choose new targets for the copies.)

#### Brain Freeze ({1}{U})
*Instant*
Target player mills three cards.
Storm (When you cast this spell, copy it for each spell cast before it this turn. You may choose new targets for the copies.)

#### Flusterstorm ({U})
*Instant*
Counter target instant or sorcery spell unless its controller pays {1}.
Storm (When you cast this spell, copy it for each spell cast before it this turn. You may choose new targets for the copies.)

#### Amphibian Downpour ({2}{U})
*Enchantment — Aura*
Flash
Storm (When you cast this spell, copy it for each spell cast before it this turn. Copies become tokens.)
Enchant creature. Enchanted creature loses all abilities and is a blue Frog creature with base power and toughness 1/1.

---

## Surveil — look at top N, put any in graveyard (permanent discard)

**MTG Rules:** "Look at the top N cards of your library. You may put any number of them into
your graveyard."
**Design pattern:** More aggressive than Scry — you can remove bad cards permanently instead
of just bottom-decking them. Synergizes with graveyard strategies; the graveyard becomes a
resource.
**Axiomancer translation → SCOUR:** `foretellScour: true` on a foretell card. The
`confirmHazardForetell(s, orderedIds, deckBag)` function treats cards absent from `orderedIds`
as permanently discarded. Non-scour FORETELL only reorders; SCOUR allows removing any subset.
`drawBase` controls how many cards are revealed.
**Balance lever:** Surveil 1 is trivially good (never bad). Surveil 3 is powerful. The Axiomancer
analogue is the number of cards shown (`drawBase`) and whether you pay any cost to get it. Scour
on a rare reward card can reveal 4-5 cards with free permanent discard — strong enough for high
rarity or a vitaeCost rider.

### Example cards

#### Consider ({U})
*Instant*
Surveil 1. (Look at the top card of your library. You may put it into your graveyard.)
Draw a card.

#### Doom Whisperer ({3}{B}{B}) — *not in top results but canonical example*
*Legendary Creature — Nightmare Demon*
Flying, trample
Pay 2 life: Surveil 2.
*(Surveil 2+ as a repeatable activated ability for a life cost — maps to vitaeCost rider on
a scour card.)*

#### Enhanced Surveillance — *canonical payoff*
*Enchantment*
You may surveil 2 rather than 1 whenever you surveil.
Exile Enhanced Surveillance: Shuffle your graveyard into your library.
*(Doubling the reveal count — maps to a high `drawBase` on powered tier.)*

#### Undercity Sewers (Land)
*Land — Island Swamp*
({T}: Add {U} or {B}.) This land enters tapped.
When this land enters, surveil 1.
*(Low-cost triggered surveil — cheapest possible SCOUR delivery: a card with minor stats
that reveals 1 for free.)*

---

## Cycling — discard to draw; some cards trigger on cycling

**MTG Rules:** "{cost}, Discard this card: Draw a card." Many cards add additional effects when
cycled, or other cards trigger when any card is cycled.
**Design pattern:** Every card has a floor: if it's bad in context, you can trade it for a
fresh draw. Cycling payoffs (Astral Slide, Drake Haven) make cycling a proactive strategy.
**Axiomancer translation → SALVAGE + PURGE+DRAW:** The `salvage` field already gives cards a
discard bonus (stat boost or die). The `purgeDrawCount` field (new in v0.32.1) draws N cards
after a PURGE fires — this is the "cycling the whole card" feel: sacrifice a CRACK-clearing
card and immediately draw a replacement. A card with `effect: 'purge', purgeDrawCount: 1` is
a direct Cycling analogue applied to the worst card in the deck.
**Balance lever:** The cycling cost in MTG is paid from hand. In Axiomancer, the "cost" is
playing the purge card itself (spending your action + card). Make `purgeDrawCount` 1 for common,
2 for rare. Decree of Justice shows you can build expensive payoffs on top.

### Example cards

#### Ash Barrens (Land)
*Land*
{T}: Add {C}.
Basic landcycling {1} ({1}, Discard this card: Search your library for a basic land card, reveal it, put it into your hand, then shuffle.)

#### Ketria Triome (Land)
*Land — Forest Island Mountain*
({T}: Add {G}, {U}, or {R}.) This land enters tapped.
Cycling {3} ({3}, Discard this card: Draw a card.)

#### Decree of Justice ({X}{4}{W}{W}) — *canonical cycling payoff*
*Sorcery*
Create X 4/4 white Angel creature tokens with flying.
Cycling {2}{W} — When you cycle Decree of Justice, you may pay {X}. If you do, create X 1/1 white Soldier creature tokens.
*(The cycling mode is weaker but cheaper — maps to the free-tier effect being reduced
vs powered-tier: e.g., purge 1 CRACK free vs purge ALL powered.)*

#### Astral Slide — *payoff engine*
*Enchantment*
Whenever a player cycles a card, you may exile target creature. If you do, return that creature to the battlefield under its owner's control at the beginning of the next end step.
*(Shows that "whenever you cycle" is a strong payoff design space — equivalent to
"whenever you discard/salvage a card" in Axiomancer.)*

---

## Scry — look at top N, keep or bottom-deck any

**MTG Rules:** "Look at the top N cards of your library. Put any number of them on the bottom
of your library and the rest on top in any order."
**Design pattern:** Pure consistency tool. Never removes cards permanently; just improves draw
quality. Even Scry 1 is strong because it converts a bad draw into a known future draw.
**Axiomancer translation → FORETELL:** `effect: 'foretell'`, `drawBase: N` (cards revealed).
`confirmHazardForetell(s, orderedIds, deckBag)` — player reorders the revealed cards back on
top of the draw pile. Non-scour FORETELL is pure Scry: see the top N, reorder them, nothing
discarded. Add `foretellDrawCount: 1` for the "Opt" pattern (Scry then draw).
**Balance lever:** Scry 1 = baseline good but not exciting. Scry 2 = clearly strong. Scry 4+
= rare territory. In Axiomancer, FORETELL 2 at common is fine; FORETELL 4 should be uncommon
or rare with a cost.

### Example cards

#### Opt ({U})
*Instant*
Scry 1. (Look at the top card of your library. You may put that card on the bottom.)
Draw a card.
*(The canonical "Foretell 1, then draw 1" — maps to `drawBase: 1, foretellDrawCount: 1`.)*

#### Preordain ({U})
*Sorcery*
Scry 2, then draw a card. (To scry 2, look at the top two cards of your library, then put any number of them on the bottom and the rest on top in any order.)
*(Scry 2 + draw — maps to `drawBase: 2, foretellDrawCount: 1`. The strongest 1-mana
consistency spell in the game.)*

#### Viscera Seer ({B})
*Creature — Vampire Wizard*
Sacrifice a creature: Scry 1.
*(Repeatable Scry 1 at the cost of a sacrifice — maps to a salvage effect that triggers
foretell: `salvage: { type: 'foretell' }` if we add that pattern.)*

#### Path of Ancestry (Land)
*Land*
This land enters tapped.
{T}: Add one mana of any color in your commander's color identity. When that mana is spent to cast a creature spell that shares a creature type with your commander, scry 1.
*(Conditional Scry 1 — shows that Scry is so good it can be a minor incidental bonus.)*

---

## Flashback — cast again from discard pile (one-time)

**MTG Rules:** "You may cast this card from your graveyard for its flashback cost. Then exile it."
**Design pattern:** Every Flashback card is two cards in one: once from hand, once from discard.
Forces opponents to respect your graveyard. The flashback cost is usually higher or differently
colored.
**Axiomancer translation → TRANSMUTE (existing):** The existing `effect: 'transmute'` already
handles color conversion. A cleaner translation: a card with two rows where `f/e` = the free
play and `fp/ep` = a *second casting* — but the hazard engine applies a card once. Closest
mechanical analog: `salvage` bonus that generates a new card of the same type (no direct
Flashback, but the "discard payoff" feeling is covered by salvage). OR: a future `effect:
'recycle'` that puts the card back in the draw pile when discarded.
**Balance lever:** Flashback cards are intrinsically card-advantageous. Price the second use
at +1 to +3 cost vs the first. The exile-after-second-use rule prevents infinite loops.

### Example cards

#### Faithless Looting ({R})
*Sorcery*
Draw two cards, then discard two cards.
Flashback {2}{R} (You may cast this card from your graveyard for its flashback cost. Then exile it.)

#### Strike It Rich ({R})
*Sorcery*
Create a Treasure token.
Flashback {2}{R}

#### Sevinne's Reclamation ({2}{W})
*Sorcery*
Return target permanent card with mana value 3 or less from your graveyard to the battlefield. If this spell was cast from a graveyard, you may copy this spell.
Flashback {4}{W}

#### Dread Return ({2}{B}{B})
*Sorcery*
Return target creature card from your graveyard to the battlefield.
Flashback — Sacrifice three creatures.
*(Alternative cost as flashback — shows cost can be resource-based rather than mana-based,
maps to vitaeCost or sacrifice requirements.)*

---

## Kicker — pay extra at cast time for an upgraded effect

**MTG Rules:** "Kicker {cost} (You may pay an additional {cost} as you cast this spell.)"
Cards explicitly say "If this spell was kicked, [upgraded effect]."
**Design pattern:** Every Kicker card is two cards in one slot — a baseline and an upgrade.
The baseline is deliberately undercosted; the kicked version is the "real" card. Players choose
at cast time.
**Axiomancer translation → FREE vs POWERED tiers:** This is the core Axiomancer hazard card
model. `f/e` = unkicked (free tier). `fp/ep` = kicked (powered tier, requires die). `effect`
fires at major tier when powered. The entire `major` flag in `applyUtilityEffect` IS the Kicker
pattern. Cards where kicker cost is wildly different (like Rite of Replication: 1x vs 5x tokens)
map to large `fp/ep` deltas vs `f/e`.
**Balance lever:** MTG prices the baseline cheap and the kicker cost fair-to-high. Axiomancer:
free tier should feel useful (not zero), powered tier should feel like a real upgrade. `fp` ≈
`f × 1.5–2.5x` is the sweet spot.

### Example cards

#### Tear Asunder ({1}{G})
*Instant*
Kicker {1}{B}
Exile target artifact or enchantment. If this spell was kicked, exile target nonland permanent instead.
*(Baseline: narrow removal. Kicked: broadens to any permanent. Maps to: free = remove 1
CRACK; powered = remove all CRAKs in hand.)*

#### Rite of Replication ({2}{U}{U})
*Sorcery*
Kicker {5}
Create a token copy of target creature. If this spell was kicked, create five tokens instead.
*(1 copy vs 5 copies — the most dramatic kicker scaling. Maps to burst free=+3 vs
powered=+15, high-rarity explosive design.)*

#### Maddening Cacophony ({1}{U})
*Sorcery*
Kicker {3}{U}
Each opponent mills eight cards. If this spell was kicked, each opponent mills half their library.
*(Flat vs exponential scaling when kicked.)*

#### Galadriel's Dismissal ({W})
*Instant*
Kicker {2}{W}
Target creature phases out. If this spell was kicked, each creature target player controls phases out instead.
*(Single-target → all-targets upgrade, the OVERLOAD pattern but expressed as Kicker.)*

---

## Delve — exile discard pile to reduce the cast cost

**MTG Rules:** "Each card you exile from your graveyard while casting this spell pays for {1}."
**Design pattern:** Delve turns the graveyard (spent resources) into mana. A card with CMC 8
can often be cast for 1-2 mana if you've spent 6 cards already. It rewards players who've
been doing things.
**Axiomancer translation → DISCARD-PILE COST REDUCTION:** No direct field yet. The closest:
a card that costs less vitaeCost per card in the discard pile, or a burst card that gives
bonus equal to discardPile.length. `burstBase: { force: discardCount × N }` — a future dynamic
field. For now, flavor as: a card that gains power proportional to how many rounds you've
already cleared (the discard pile grows with played cards).
**Balance lever:** Delve gets better the longer the game goes. In Axiomancer, this would be
a late-round payoff — cards that scale with `discardPile.length` would be weak round 1,
strong by round 3.

### Example cards

#### Dig Through Time ({6}{U}{U})
*Instant*
Delve.
Look at the top seven cards of your library. Put two of them into your hand and the rest on the bottom in any order.
*(CMC 8, but often cast for {U}{U}. Pure card selection — maps to FORETELL 7, keep 2.)*

#### Treasure Cruise ({7}{U})
*Sorcery*
Delve.
Draw three cards.
*(CMC 8, often {U}. Three card draw for almost nothing — the most-banned Delve card.)*

#### Temporal Trespass ({8}{U}{U}{U})
*Sorcery*
Delve.
Take an extra turn after this one. Exile Temporal Trespass.
*(CMC 11, often {U}{U}{U}. "Extra turn" in Axiomancer = an extra round of play.)*

#### Afterlife from the Loam ({5}{B}{B}{B})
*Sorcery*
Delve.
For each player, choose a creature card in that player's graveyard. Put those cards onto the battlefield under your control.
*(Scaling with opponent graveyards — maps to a card that gains force equal to opponents'
discard counts if we had multiplayer.)*

---

## Miracle — reduced cost if drawn as the first card this turn

**MTG Rules:** "You may cast this card for its miracle cost when you draw it if it's the
first card you drew this turn."
**Design pattern:** Miracle rewards timing. If you draw the right card at the right moment,
you get a massively discounted effect. This creates decision points: when to draw, what to
leave for top-of-deck.
**Axiomancer translation → DRAW-POSITION BONUS:** No direct field. Spirit: a card that gives
a bonus if it's the first card drawn this round (from `drawPile` → `hand`). Implementable as
a card flagged `firstDraw: true` that the engine checks when the card enters hand as the first
draw of the round. Alternatively: maps to FORETELL (you see the top card; if it's good, you
"cast it at miracle cost" by optimizing the draw order).
**Balance lever:** Miracle makes high-cost effects playable. Temporal Mastery at {1}{U} is
broken; at {5}{U}{U} it's fair. The burst equivalent: a card that costs vitaeCost 3 normally
but vitaeCost 0 if it's in position 1 of the draw pile when played.

### Example cards

#### Reforge the Soul ({3}{R}{R})
*Sorcery*
Each player discards their hand, then draws seven cards.
Miracle {1}{R}.
*(Wheel effect at full cost is fair; miracle cost is format-warping. Maps to: draw 3 at
powered tier, DRAW 7 as a "miracle" bonus when drawn first.)*

#### Temporal Mastery ({5}{U}{U})
*Sorcery*
Take an extra turn after this one.
Miracle {1}{U}.
*(Extra turn for {1}{U} if drawn first — huge timing reward.)*

#### Metamorphosis Fanatic ({4}{B}{B})
*Creature — Human Cleric*
Lifelink. When this creature enters, return a creature from your graveyard to the battlefield with a lifelink counter.
Miracle {1}{B}.
*(A 6-drop that comes in for {1}{B} if you top-deck it.)*

---

## Madness — cast at reduced cost when discarded

**MTG Rules:** "If you discard this card, discard it into exile. When you do, cast it for
its madness cost or put it into your graveyard."
**Design pattern:** Turns discard from a punishment into a reward. Cards that discard (Looting
effects) become card-neutral or card-positive when Madness cards are involved. Madness costs
are always lower than normal costs.
**Axiomancer translation → SALVAGE (existing):** Axiomancer's `salvage` field is the direct
analog. When a salvage card is discarded, it immediately provides a bonus (+N force/escape or
conjures a die). Extend this: a `salvage: { type: 'play-free' }` variant that immediately
applies the card's effect at free tier when discarded — "madness" for free effects. Balance:
the salvage effect should be weaker than the played effect.
**Balance lever:** Madness cost must be meaningfully cheaper than normal. The discard must have
a cost (you're spending a card from hand). In Axiomancer, salvage works similarly: discarding
costs you the card, salvage partially recouped.

### Example cards

#### Big Game Hunter ({1}{B}{B})
*Creature — Human Rebel Assassin*
Deathtouch. When this creature enters, destroy target creature with power 4 or greater. It can't be regenerated.
Madness {B}.
*(3-drop that destroys big creatures; {B} when discarded. Maps to: card costs 2 to play,
but if discarded, immediately purges a CRACK for 0 cost.)*

#### Necrogoyf ({3}{B}{B})
*Creature — Lhurgoyf*
Power = creature cards in all graveyards. Each player discards a card at upkeep.
Madness {1}{B}{B}.
*(A self-referential Madness: it forces discards, which enables its own madness cost.
Maps to a card with a triggered "discard a card from hand" effect that then lets you
salvage the discarded card.)*

#### Markov Baron ({2}{B})
*Creature — Vampire Noble*
Convoke. Lifelink. Other Vampires you control get +1/+1.
Madness {2}{B}.
*(Madness at the same cost — this one is more about the convoke interaction.)*

---

## Dredge — replace a draw with a graveyard return

**MTG Rules:** "If you would draw a card, you may mill N cards instead. If you do, return
this card from your graveyard to your hand."
**Design pattern:** Dredge cards perpetually recycle through the graveyard by milling N cards
each time they're dredged. High dredge numbers (5-6) fill the graveyard quickly and are
extremely powerful in graveyard-value decks.
**Axiomancer translation → DRAW-PILE REPLACEMENT:** No direct Dredge equivalent. The spirit:
a card that, when in the discard pile, can "come back" by replacing the next draw. Implementable
as: a card with `effect: 'recycle'` that, when applied, returns itself to a specific position
in the draw pile (instead of going to discard). The "mill N cards" cost maps to `purgeDrawCount`
in reverse — instead of drawing after purge, you mill N cards (add N CRAKs? too punishing).
Better analog: a card that lets you draw from discard pile instead of draw pile.
**Balance lever:** Dredge is broken when the number is high (Golgari Grave-Troll at 6).
In Axiomancer: recycling a card every round would be too strong; gate behind high vitaeCost.

### Example cards

#### Life from the Loam ({1}{G})
*Sorcery*
Return up to three target land cards from your graveyard to your hand.
Dredge 3.
*(Dredge 3 returns 3 lands each time — perpetual engine. Maps to: a card that returns
3 cards from discard to draw pile when "dredged.")*

#### Stinkweed Imp ({2}{B})
*Creature — Imp*
Flying. Whenever this creature deals combat damage, destroy that creature.
Dredge 5.
*(Dredge 5 at a 3-drop — strong enough to fill a graveyard in 2 dredges. Maps to
an aggressive recycler that costs a lot in deck-thinning.)*

#### Golgari Grave-Troll ({4}{G})
*Creature — Troll Skeleton*
Enters with a +1/+1 counter per creature card in your graveyard. {1}, remove a counter: Regenerate.
Dredge 6.
*(The banned Dredge 6. 6 cards milled per draw replacement. Maps to the strongest possible
recycler at rare/gold tier.)*

#### Dakmor Salvage (Land)
*Land*
Enters tapped. {T}: Add {B}.
Dredge 2.
*(A land with Dredge 2 — "disposable" assets that can also recycle. Maps to a utility
card with minor stats + a recycle effect.)*

---

## Investigate — create "Clue" tokens that can be sacrificed to draw

**MTG Rules:** "Create a Clue token. It's an artifact with '{2}, Sacrifice this token: Draw a card.'"
**Design pattern:** Investigate creates deferred card draw — you get a Clue now, cash it in
later for {2}. Tokens accumulate and can be mass-cashed for huge draw. Pairs with "sacrifice
a token" synergies.
**Axiomancer translation → DEFERRED BOUNTY / AURA:** The closest: BOUNTY (`bountyBase: N`)
pays out at claim time. A "Clue" analog would be a card that creates a persistent counter
(like a bounty token), where each counter = +1 card drawn at claim. Or: ENCHANT (`effect: 'aura'`)
with `auraBase: { auraForce: 1 }` — each subsequent card benefits from the enchantment, similar
to how Clues compound draw advantage.
**Balance lever:** Investigate is slow (costs {2} to activate each Clue). In Axiomancer,
deferred draw is balanced by needing to survive to claim it. Make draw-at-claim effects
scale with rounds survived.

### Example cards

#### Tireless Tracker ({2}{G})
*Creature — Human Scout*
Landfall — Whenever a land enters, investigate.
Whenever you sacrifice a Clue, put a +1/+1 counter on this creature.
*(Two triggers interacting: landfall creates Clues, Clues grow the Tracker. Maps to
a card that generates bounty AND grows an enchantment bonus with each bounty sacrifice.)*

#### Forensic Gadgeteer ({2}{U})
*Creature — Vedalken Artificer Detective*
Whenever you cast an artifact spell, investigate.
Activated abilities of artifacts you control cost {1} less.
*(Investigate-on-cast payoff — maps to AURA that triggers on each card applied: `auraBase.auraForce: 1`.)*

#### Tamiyo's Journal ({5})
*Legendary Artifact — Book*
At the beginning of your upkeep, investigate.
{T}, Sacrifice three Clues: Search your library for a card, put it into hand, then shuffle.
*(Slow accumulation + tutor payoff — maps to a card that generates foretell-tokens over
rounds, cashing in for a full-deck search.)*

#### Ethereal Investigator ({3}{U})
*Creature — Spirit*
Flying. When this creature enters, investigate X times (X = number of opponents).
Whenever you draw your second card each turn, create a 1/1 Spirit token.
*(Scales with opponents — in Axiomancer: investigate X = foretell X cards, X = current round.)*

---

## Overload — pay more to upgrade from single-target to all-targets

**MTG Rules:** "You may cast this spell for its overload cost. If you do, change 'target' in
its text to 'each.'"
**Design pattern:** Overload is the most elegant single→all upgrade. Cheap mode: spot removal.
Expensive mode: sweeper or mass effect. The upgrade is always worth paying if you have the mana
and multiple targets.
**Axiomancer translation → FREE vs POWERED TIERS (PURGE / TRANSMUTE):** Already implemented.
`effect: 'purge'` minor = "purge 1 CRACK from hand"; major (powered) = "purge ALL CRAKs from
everywhere." Same for `effect: 'transmute'`: minor = "recolor 1 die"; major = "recolor ALL
off-color dice." This is exactly Overload. The powered tier IS the overload.
Cards like `r_theClean` (purge all) and `r_lastrelic` (gold major purge) are Axiomancer Overloads.
**Balance lever:** Overload cost in MTG is usually 4-7 more than base. In Axiomancer, the
"cost" of powered is having a matching die + opportunity cost of that die.

### Example cards

#### Cyclonic Rift ({1}{U})
*Instant*
Return target nonland permanent you don't control to its owner's hand.
Overload {6}{U}.
*(1 vs 7 mana — the most efficient Overload. Maps to: free-tier purge 1, powered purge all.)*

#### Vandalblast ({R})
*Sorcery*
Destroy target artifact you don't control.
Overload {4}{R}.
*(1 vs 5 mana. The destroy-1 vs destroy-all artifact split.)*

#### Damn ({B}{B})
*Sorcery*
Destroy target creature. A creature destroyed this way can't be regenerated.
Overload {2}{W}{W}.
*(Cross-color Overload — base cost is cheap, overload cost is different color. Maps to
a two-tone Axiomancer card where free tier is one color, powered is another.)*

#### Mizzix's Mastery ({3}{R})
*Sorcery*
Exile target instant/sorcery from your graveyard. Copy it; you may cast the copy without paying its mana cost.
Overload {5}{R}{R}{R}.
*(Replay 1 vs replay ALL instants/sorceries from graveyard.)*

---

## Transmute — discard to tutor for a card of the same cost

**MTG Rules:** "{cost}, Discard this card: Search your library for a card with the same mana
value as this card, reveal it, put it into your hand, then shuffle. Transmute only as a sorcery."
**Design pattern:** Transmute sacrifices one card to find an exact replacement of the same cost.
It's a silver bullet finder — the card itself may be weak, but it finds the card you need.
The "same mana value" restriction makes it precise but limited.
**Axiomancer translation → TRANSMUTE (existing, different meaning):** The hazard `effect:
'transmute'` recolors dice — a color-conversion mechanic, not a tutor. For the MTG Transmute
(tutor) feel: a future `effect: 'tutor'` that lets you search the reward pool for a specific
card, or a salvage effect that fetches a card from the discard pile back to hand (already
partially covered by dredge/recycle concepts above).
**Balance lever:** MTG Transmute is balanced by the discard cost and "same mana value" restriction.
In Axiomancer, a tutor effect would need to be heavily gated — perhaps only from among the top
5 reward cards, at gold rarity.

### Example cards

#### Muddle the Mixture ({U}{U})
*Instant*
Counter target instant or sorcery spell.
Transmute {1}{U}{U}.
*(Base spell is counterspell; the real purpose is Transmuting for a CMC-2 silver bullet.)*

#### Drift of Phantasms ({2}{U})
*Creature — Spirit*
Defender. Flying.
Transmute {1}{U}{U}.
*(A vanilla 0/5 with flying — played ONLY to Transmute for CMC-3 cards. Shows that
weak cards can be designed around their transmute.)*

#### Tolaria West (Land)
*Land*
Enters tapped. {T}: Add {U}.
Transmute {1}{U}{U}.
*(A land that Transmutes for CMC-0 cards — extremely precise tutor for zero-cost utilities.)*

---

## Spectacle — reduced cost if opponent has lost life this turn

**MTG Rules:** "You may cast this spell for its spectacle cost rather than its mana cost if
an opponent lost life this turn."
**Design pattern:** Spectacle rewards aggression — if you've dealt damage this turn, your
next spell is cheaper. Pairs naturally with burn and aggressive creatures. Creates turn-order
dependency: deal damage first, then cast your spectacle card.
**Axiomancer translation → CONDITIONAL COST REDUCTION / TIMING BONUS:** Maps to a card that
gives a bonus if certain conditions are already met this round. "If you have already cleared
any force/escape this round, this card costs 0 vitaeCost." Or: a card whose `f/e` values
are higher if the player has already staged cards this round (`play.length > 0`). The ECHO
mechanic already does this for burst cards; Spectacle is the "cost reduction" version.
**Balance lever:** Spectacle is only relevant in decks that reliably deal damage early. In
Axiomancer, conditional cost reduction would only matter if you can reliably stage 1+ cards
before playing the spectacle card — which in a 3-card hand is very common, making it almost
always active.

### Example cards

#### Light Up the Stage ({2}{R})
*Sorcery*
Spectacle {R}.
Exile the top two cards of your library. Until the end of your next turn, you may play those cards.
*(3-mana becomes 1-mana if opponent took damage. Exiles top 2 for temporary play — maps to
FORETELL 2 with `foretellDrawCount: 2` if spectacle condition met.)*

#### Skewer the Critics ({2}{R})
*Sorcery*
Spectacle {R}.
Skewer the Critics deals 3 damage to any target.
*(3-for-3 damage; 1-for-3 damage with spectacle. Maps to: burst+6 force free, burst+12 force
if played after another card this round — pure ECHO feel.)*

#### Body Count ({2}{B})
*Instant*
Spectacle {B}.
Draw a card for each creature that died under your control this turn.
*(Spectacle + scales with how many creatures died. Maps to: draw N cards where N = cards
in discardPile from this round.)*

#### Spawn of Mayhem ({2}{B}{B})
*Creature — Demon*
Spectacle {1}{B}{B}. Flying, trample.
At the beginning of your upkeep, this creature deals 1 damage to each player. Then if you have 10 or less life, put a +1/+1 counter on this creature.
*(Spectacle creature that also self-damages — maps to a burst card that gives bonus force
AND adds a CRACK to the deck if vitae is low.)*

---
## Replicate — pay extra to copy the same spell N times

**MTG Rules:** "When you cast this spell, you may pay {cost} any number of times. Each time you do, copy this spell."
**Design pattern:** Scales linearly with investment — pay once for baseline, pay again for each additional copy. Rewards resource surplus committed into a single card.
**Axiomancer translation → SCALED BURST:** A burst card where the player optionally commits extra dice to multiply the output. Implement as `replicateForce` / `replicateEscape` fields — per-die multiplier applied at burst resolution. Similar to ECHO but scalar is dice spent, not cards applied.
**Balance lever:** Baseline must justify the one-copy cost. Cap at hand/die ceiling. Uncapped replicate cards snowball hard in late-round stacks.

### Example cards

#### Pyromatics ({2}{R})
*Instant*
Replicate {2}{R}
Pyromatics deals 1 damage to any target.

#### Train of Thought ({1}{U})
*Sorcery*
Replicate {1}{U}
Draw a card.

#### Gigadrowse ({U})
*Instant*
Replicate {U}
Tap target permanent.

#### Vacuumelt ({2}{U})
*Sorcery*
Replicate {2}{U}
Return target creature to its owner's hand.
---
## Buyback — pay extra to return the spell to your hand

**MTG Rules:** "You may pay an additional {cost} as you cast this spell. If you do, put this spell into its owner's hand instead of into the graveyard as it resolves."
**Design pattern:** Creates an engine — weaker baseline that can sustain itself indefinitely with sufficient resources. Punishes scarcity, rewards surplus.
**Axiomancer translation → SELF-SUSTAINING UTILITY:** `salvage` already gestures at this (discard for a bonus). True buyback: when the card is powered by a matching die, return it to hand post-apply instead of discarding. Implement as `buyback: true` on the card def, hooking into the post-apply discard step in the engine.
**Balance lever:** Buyback cost must be genuinely expensive. If too cheap, it loops for free every round. The card's base effect should be slightly below-rate to compensate for the infinite ceiling.

### Example cards

#### Capsize ({1}{U}{U})
*Instant*
Buyback {3}
Return target permanent to its owner's hand.

#### Forbid ({1}{U}{U})
*Instant*
Buyback — Discard two cards.
Counter target spell.

#### Whispers of the Muse ({U})
*Instant*
Buyback {5}
Draw a card.

#### Squee's Revenge ({1}{R})
*Instant*
Buyback {3}
Flip a coin. If you win the flip, Squee's Revenge deals 3 damage to target creature or player.
---
## Rebound — free second cast the following turn

**MTG Rules:** "If you cast this spell from your hand, exile it as it resolves. At the beginning of your next upkeep, you may cast this card from exile without paying its mana cost."
**Design pattern:** Doubles the effect across two turns. Rewards patience — play once, get the effect now, then get it again free next turn.
**Axiomancer translation → DELAYED RE-ACTIVATION:** Maps to a card that fires its utility on apply, then places itself in a "pending rebound" state that re-fires the utility at the start of the next round — before cards are dealt. In the engine, implement as `rebound: true` on the card def. `continueHazardAfterResolve` checks the discard pile for rebound cards and re-applies their utility to the next round's session state.
**Balance lever:** Rebound cards should be slightly below-rate for their cost. The second free cast is the premium. Strong effects with rebound are often too powerful.

### Example cards

#### Distortion Strike ({U})
*Sorcery*
Target creature gets +1/+0 and is unblockable this turn.
Rebound

#### Emerge Unscathed ({W})
*Instant*
Target creature you control gains protection from the color of your choice until end of turn.
Rebound

#### Surreal Memoir ({3}{R})
*Sorcery*
Return a random instant card from your graveyard to your hand.
Rebound

#### Vines of Vastwood ({G})
*Instant*
Kicker {G}
If kicked, target creature gets +4/+4 until end of turn. (Shown for contrast — non-rebound.)
---
## Cipher — encode the spell; trigger a copy on each hit

**MTG Rules:** "Then you may exile this spell card encoded on a creature you control. Whenever that creature deals combat damage to a player, you may copy the encoded card and cast the copy without paying its mana cost."
**Design pattern:** Persistent trigger — pay once, get repeated value each time the carrier connects. Rewards reliable delivery mechanism.
**Axiomancer translation → ON-APPLY AURA TRIGGER:** When this card is applied, it also places an enchantment that gives +N FORCE or +N ESCAPE to each subsequent card applied this round. Maps to `aura` effect type with `auraForce`/`auraEscape`, but fires only for the rest of the current round (not persistent). Alternatively: a `cipherForce/cipherEscape` field that adds a flat bonus to every card applied after this one this round — cheaper to implement than full aura.
**Balance lever:** Cipher in MTG requires combat. In Axiomancer the "delivery" is automatic (you always apply cards), so cipher-analogues must be weaker than standalone effects to avoid being strictly better.

### Example cards

#### Hidden Strings ({1}{U})
*Sorcery*
You may tap or untap target permanent, then tap or untap another target permanent.
Cipher

#### Hands of Binding ({1}{U})
*Sorcery*
Tap target creature an opponent controls. That creature doesn't untap during its controller's next untap step.
Cipher

#### Stolen Identity ({4}{U}{U})
*Sorcery*
Put a token that's a copy of target artifact or creature onto the battlefield.
Cipher

#### Shadow Slice ({3}{B})
*Sorcery*
Target player loses 3 life.
Cipher
---
## Aftermath — split card; back half only castable from graveyard

**MTG Rules:** "[Back half]: Cast this only from your graveyard." The front is cast normally from hand; the back half is dormant in the discard pile until you choose to cast it.
**Design pattern:** Two-act card. Act 1 (hand → discard) is weaker or sets up. Act 2 (discard → resolve) fires later, sometimes much stronger. Rewards planning and discard management.
**Axiomancer translation → SALVAGE / CRACK-AS-RESOURCE:** The `salvage` field already implements single-use discard bonuses. Aftermath is a richer version: the card has a primary effect on apply AND a secondary effect that fires when you choose to "trigger from discard" — either automatically at round end or via a PURGE-like action. Could implement as `aftermathForce/aftermathEscape` — when this card is in the discard pile and a designated trigger fires (e.g., a PURGE card), the aftermath bonus resolves.
**Balance lever:** Front half should be below-rate — you're paying for the combo potential. If both halves are individually good, the card is strictly dominant.

### Example cards

#### Cut // Ribbons ({1}{R} // {X}{B}{B})
*Sorcery // Sorcery*
Cut: Target creature gets -2/-2 until end of turn.
Ribbons: Each opponent loses X life. (Cast only from graveyard.)

#### Farm // Industry ({2}{W} // {4}{G})
*Sorcery // Sorcery*
Farm: Destroy target attacking or blocking creature.
Industry: Create three 1/1 colorless Thopter artifact creature tokens with flying.

#### Refuse // Cooperate ({2}{R} // {2}{U})
*Instant // Instant*
Refuse: This spell deals damage equal to target spell's mana value to that spell's controller.
Cooperate: Copy target instant or sorcery spell. You may choose new targets.

#### Driven // Despair ({1}{G} // {1}{B})
*Sorcery // Sorcery*
Driven: Until end of turn, creatures you control gain trample and "draw a card on damage."
Despair: Until end of turn, creatures you control gain menace and "target player discards on damage."
---

## Quick-Reference: Axiomancer Field → MTG Mechanic

| HazardCardDef field | MTG mechanic(s) | Notes |
|---|---|---|
| `echoPerCardForce/Escape` | Storm | Burst bonus × applied cards this round |
| `foretellScour: true` | Surveil | Reveal N, permanently discard any subset |
| `effect: 'foretell'` | Scry | Reveal N, reorder, nothing discarded |
| `foretellDrawCount: N` | Opt / Preordain | Draw N after foretell resolves |
| `purgeDrawCount: N` | Cycling | Draw N after purge fires |
| `burstMendBase/Powered` | Extort / Exploit | Heal rider on burst; cost = vitaeCost |
| `vitaeCost` | Emerge / Exploit / Delve | Pay life/resource to cast |
| `salvage` | Madness / Cycling | Discard payoff (die conjure or stat bonus) |
| `effect: 'aura'` | Extort / Investigate | Passive bonus per card applied after |
| `carryFloor` (ANCHOR) | Cascade / Dredge | Momentum carries forward into next round |
| `f/e` vs `fp/ep` | Kicker / Overload | Free tier vs powered (kicked) tier |
| `effect: 'purge'` minor/major | Overload | Single CRACK vs all CRAKs |
| `effect: 'transmute'` | *(Axiomancer only: die color)* | Recolor dice; distinct from MTG Transmute |
| `burstPerUnspentDieForce` | Convoke (inverted) | Bonus scales with unspent dice |

---

*Last updated: 2026-06-26. Fetch new mechanics with:*
```bash
curl -s -A "Mozilla/5.0 Axiomancer-CardDesign/1.0" \
  "https://api.scryfall.com/cards/search?q=keyword%3A{mechanic}&order=edhrec" \
  | python3 -c "import json,sys; [print(c['name'],'-',c.get('oracle_text','')[:80]) for c in json.load(sys.stdin)['data'][:5]]"
```
