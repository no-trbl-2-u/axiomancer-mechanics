# Axiomancer Hazard Minigame Doctrine

> Mechanics-repo copy of SomberSoft CDR-0006. This file is the repo-local source for hazard-minigame design until implementation promotes any rule into code/specs. Mobile may present this system, but mechanics owns the rules, dice lifecycle, card lifecycle, scoring, content set, and tuning targets.

# CDR-0006 — Axiomancer Hazard Minigame v0

Date: 2026-06-09
Status: Accepted mechanics doctrine copy
Owner: T / SomberSoft
Domain: Axiomancer event minigames / mechanics system truth

## Decision

The first true Axiomancer event minigame candidate is the **Hazard minigame**. It should feel closer to **Mage Knight** than to War: a compact tactical puzzle where the player reads a dangerous situation, rolls imperfect mana, draws a hand of action cards, and assembles a solution under pressure.

The system must not become simple card-number comparison. The player should solve the turn through action effects, mana manipulation, card draw/filtering, persistent enchantments, risk, and consequence.

## Design Goals

- Make hazards feel like playable crises, not passive damage popups.
- Give the player visible tactical agency after a bad roll.
- Let danger tempt the player with harder routes and better rewards.
- Keep the round outcome legible: success marks (`O`) and failure marks (`X`).
- Keep early implementation small enough to prototype and tune.
- Support Axiomancer's board-game-like event direction: constrained, legible, punishing, rewarding, and testable.

## Core Loop

1. A map node triggers a hazard event.
2. The game draws/reveals a **Hazard card**.
3. Each round, the player has access to **4 colored mana dice**.
4. The player draws **5 action cards**.
5. The player uses action card effects and available mana to meet the hazard's round requirement.
6. Each round resolves as:
   - `O` = completed / success
   - `X` = failed
7. The minigame lasts **3–5 rounds**.
8. The last round is always somewhat harder.
9. Final score is:

```text
successes O - failures X
```

10. Final score determines outcome, reward, and/or penalty.

## Hazard Cards

A hazard card represents a dangerous situation: traps, starvation, cliff edges, dangerous terrain, corruption, collapsing structures, hostile weather, and similar crises.

Each hazard card has a **top** and **bottom** route:

- **Top route:** easier to clear, safer, lower reward.
- **Bottom route:** harder to clear, better reward, greater temptation/risk.

The hazard card's target numbers and difficulty assumptions should be balanced around a **5-card action hand**.

Hazards should not all be “reach number N.” They should express different threat types and solution pressures.

Example pressure tags:

- Stability
- Escape
- Supply
- Endurance
- Cunning
- Force
- Focus
- Spirit
- Shelter
- Tools

Example hazard skeleton:

```text
Cracked Cliff Path
Scenario: The ledge breaks underfoot and a shrine-cache glints across the split.
Top: Find footing — Clear 5 Stability.
Bottom: Leap for the shrine cache — Clear 8 Escape; better reward, injury on failure.
Rounds: 3
Final round modifier: +2 target or added penalty.
```

## Mana Dice

Each round uses **4 mana dice**.

Faces:

- Red
- Green
- Blue
- Yellow
- Purple
- X

Rules:

- Dice do **not** automatically reroll or refresh between rounds on their own.
- Mana does **not** freely carry over by default.
- Cards and enchantments may explicitly reroll, refresh, preserve, exhaust, discard, lock, or transform dice.
- Specific card text is allowed to violate the default dice law.

This makes dice into board objects, not just random numbers.

A die should be modeled with both color and state:

```ts
type HazardManaDie = {
  color: 'red' | 'green' | 'blue' | 'yellow' | 'purple' | 'x';
  state: 'available' | 'spent' | 'exhausted' | 'discarded' | 'locked' | 'preserved';
};
```

Important clarification:

- `X` is not only failure.
- `X` can become a card hook: bad fate that certain cards exploit.

## Action Cards

Each round, the player draws **5 action cards**.

Each action card has:

- **Top action:** free to play.
- **Bottom action:** costs mana and is stronger, stranger, or more tactical.

The action deck should include different tactical verbs. It must not be only direct progress.

### Action Card Verb Classes

1. **Direct progress**
   - Add typed progress toward clearing the hazard.
   - Example: `+3 Stability`, `+2 Cunning`, `+4 Supply`.

2. **Mana conversion**
   - Change one or more mana colors.
   - Example: `Change 1 mana to blue`.

3. **Mana creation**
   - Create new temporary mana.
   - Example: `Create 1 yellow`.

4. **Card draw / filtering**
   - Draw, discard, look ahead, replace, or play free top actions.
   - Example: `Draw 1 card, discard 1`.

5. **Risk / sacrifice**
   - Gain progress at a cost.
   - Example: `+5 Force; lose 1 VITAE if the round fails`.

6. **Failure mitigation**
   - Reduce or cancel consequences of failure.
   - Example: `If this round fails, ignore 1 damage`.

7. **Synergy / combo**
   - Reward previous plays, matching colors, tags, or board state.
   - Example: `+1 for each card already played this round`.

8. **X-die manipulation**
   - Reroll or exploit `X` mana.
   - Example top: `Reroll 1 X mana die.`
   - Example bottom: `Spend purple: reroll all X mana dice, then create 1 mana of your choice.`

9. **Persistent enchantments**
   - Effects that remain between rounds.
   - Example bottom: `Enchant. Between rounds, reroll 1 discarded/used/exhausted die.`

## Persistent Effects / Enchantments

Persistent cards are allowed and desirable.

They can create a Mage Knight-like rhythm:

- Round 1: establish tools.
- Round 2: exploit or recover dice.
- Final round: cash in the board, spend the debt, or survive the punishment.

Potential persistent effects:

- Reroll one exhausted die between rounds.
- Preserve one die into the next round.
- Refresh one die of a specific color.
- Treat one `X` as purple for one card per round.
- Reduce final-round difficulty.
- Add +1 to a specific progress tag each round.

## Outcome Scoring

Each round produces `O` or `X`.

Final score:

```text
score = count(O) - count(X)
```

Suggested 3-round reward ladder:

- `3 O / 0 X` → strong reward
- `2 O / 1 X` → normal reward
- `1 O / 2 X` → survive, minor/no reward, possible minor penalty
- `0 O / 3 X` → bad outcome, status, damage, or lost opportunity

For 4–5 round hazards, use the same principle but tune thresholds per hazard severity.

## First Prototype Scope

Prototype small. Do not build a giant card game before the taste is proven.

Recommended first content set:

- 10–15 action cards
- 3 hazard cards
- 3 rounds by default
- 4 mana dice
- 5-card hand
- top/bottom hazard route
- success/failure marks
- final score/reward table

T now asks Tobin to expand this into:

- 30 player/action cards
- 15 hazard cards

## Open Questions

1. Are mana dice rolled once for the whole hazard, or set/revealed per round with no automatic refresh? Current language allows dice state to persist and be manipulated between rounds; the exact start-of-round dice lifecycle needs Tobin's recommendation.
2. Are action cards discarded after use for the hazard, or does each round draw from a fresh deck/shuffle? Tobin should recommend the cleanest v0.
3. Should hazards use typed progress tags heavily in v0, or should typed tags be limited to a few categories until the rules prove readable?
4. Should bottom hazard routes be chosen at hazard reveal, chosen per round, or chosen at scoring time by meeting a harder threshold?

## Tobin Assignment

Review the design as RPG Systems Theologian.

Deliver:

1. Tobin's verdict.
2. Where this system creates good player feeling.
3. Where it risks breaking.
4. Recommended v0 rules clarifications.
5. 30 player/action cards.
6. 15 hazard cards.
7. Any card balance notes needed for a first prototype.
---

# Tobin Review and Card Set

---

# CDR-0006 — Tobin's Review: Hazard Minigame v0

## 1. Verdict

**Prototype.**

The bones are right and the direction is honest. Mana dice as board objects with persistent state is the load-bearing idea, and it has not been handled wrong. The top-and-bottom hazard route is clean moral architecture: the player declares who they are before knowing what the world will give them. I have watched systems fail from too much ambition at this stage, and I have watched them fail from too little. This one risks neither yet.

Build the smallest thing that proves the taste. Then cut what tastes wrong.

---

## 2. What the Player Feels

Round one is reconnaissance. The player looks at four dice and five cards and begins asking what kind of hand they were dealt. There is a feeling worth having here — not helplessness, not mastery, but *negotiation*. The dice say what is available. The cards say what might be done with that.

By round two, the mana economy shows its shape. An enchantment played in round one starts returning. A bad roll — three X and a red — becomes an interesting problem rather than a foregone conclusion. The X-manipulation cards are where clever play starts feeling like discovery rather than subtraction.

Round three is debt collection. Everything the player conserved or spent carelessly in the first two rounds comes to judgment. That is the right feeling for this game, and it maps cleanly onto the rest of Axiomancer's moral register.

The top-bottom route choice functions as the session's first theological commitment. The player who chooses the bottom route and fails has no one to blame but their own ambition. That is a satisfying kind of loss.

---

## 3. Where It Breaks

**The dice run dry.** Without refresh cards, by round three there may be zero available mana. That is the intended pressure. But if the final round is simultaneously harder, the player can reach an unwinnable state through misfortune rather than mismanagement. Playtesting must distinguish *harsh* from *unfair*. Watch the top route carefully; the bottom route may legitimately be unwinnable in bad luck.

**Tag proliferation bleeds legibility.** More than five progress tags in v0 turns rounds into bookkeeping. Five tags only: Stability, Escape, Supply, Force, Focus. No more until the system proves readable.

**Homogeneous hands.** A player drawing four direct progress cards and one mana card plays the same round every time: add numbers, check threshold. The enchantment and X-manipulation cards break this flatness, but they must show up. Watch deck ratios. If flat rounds appear twice in a session, the direct progress share is too high.

**Bottom route as tax, not temptation.** If the reward delta between top and bottom routes is not genuinely meaningful — not just larger numbers but things the player *wants* — the choice collapses into a difficulty toggle. Rewards on the bottom route must be worth the risk, or the design is lying to the player.

**STANCE costs in a minigame.** Any card or hazard that routinely drains STANCE sends the player out of the minigame impaired for the rest of the session. Reserve STANCE cost for extraordinary moments. Do not let it become the default risk currency. Cap STANCE loss from a single hazard at –2 total; if effects would push further, they cap at –2.

---

## 4. Comparable Systems

**Mage Knight** is the explicit model and the right one. Siege puzzles, top/bottom card actions, mana dice, persistent effects built in early rounds to cash in late. What Mage Knight does well is that the planning *before* the action is the game. A player who sees their hand and begins assembling the solution in their head — that is the feeling to replicate precisely.

**Arkham Horror: The Card Game** for the chaos bag's relationship to bad outcomes. X dice should carry some of that character: not pure RNG inconvenience, but a sense that the world is antagonistic. The X-manipulation cards give the player a relationship with bad fate rather than a passive receipt of it.

**Gloomhaven** for exhaustion as a meaningful resource. Burning good cards early to build position vs. conserving for later. Mana dice play the same role here: spend early for advantage, or husband them for the final round. The player who spends carelessly in round one should feel it in round three.

**Spirit Island** for constraint-puzzle solving. A good hazard round should feel like assembling a precise combination under pressure — not "did I reach the number" but "did I find the line."

**Slay the Spire** for deck composition as identity. Even in a 30-card shallow deck, certain card combinations reward recognition. The player should occasionally feel that they *built something* within the hazard's three rounds, not just played cards.

---

## 5. Revision — Open Questions

**Q1. Dice lifecycle.**
Roll all four dice once, at hazard reveal. They persist as board objects for the entire hazard. No automatic refresh between rounds. By round three, a player without refresh effects may have zero available mana. This is the design: your starting roll is your starting luck. Cards and enchantments are the only mechanisms for extending, transforming, or recovering that luck. This makes round-one decisions carry weight — an enchantment that refreshes dice is not a convenience, it is insurance against the final round.

**Q2. Action card lifecycle.**
Shuffle all 30 action cards at hazard start. Each round, draw five. Played cards go to a shared hazard discard. If the deck empties mid-round, shuffle the discard and continue. Persistent enchantments are removed from the draw deck when played; they occupy a separate enchantment zone in front of the player and are not reshuffled. No per-round reshuffle by default. In a 3-round hazard, the player sees 15 of 30 cards — half the deck. This makes card-draw effects meaningful: the deck is finite, and what remains unseen matters.

**Q3. Progress tags in v0.**
Five tags only: **Stability, Escape, Supply, Force, Focus.** Color-coded for table speed. Dual-tag requirements (clear 5 Stability + 4 Focus in the same round) are permitted on bottom routes and final rounds, and they are interesting precisely because the player may not have mana in both colors. Do not add tags until the five prove readable under pressure.

**Q4. Bottom route timing.**
The player chooses top or bottom at hazard reveal, before dice are rolled. The commitment is made blind. This is the correct design: the player decides who they are before knowing what the world will give them. Choosing at scoring time is a trick. Choosing per round dilutes the identity of the decision. Choose once. Live with it.

---

## 6. Test Protocol

Prototype scope: all 30 action cards, 10 hazard cards, 3-round default, 4 mana dice, 5-card hand.

**Session 1.** Play top route on all hazards. Measure: how often does a competent player clear all three rounds? Target 70–80% success. Higher — raise thresholds. Lower — reduce.

**Session 2.** Play bottom route on all hazards. Target 40–60% success. If the choice never creates tension, the reward delta is too small or the threshold is too low.

**Session 3.** Mix routes. Measure: does mana exhaustion produce a genuine crisis in round three? Does the final round feel different from rounds one and two, or are all rounds identical?

**Session 4.** Stress-test X dice. Force at least two X dice in the starting roll. Measure: do X-manipulation cards change the calculus? Does exploiting X feel like cleverness or merely reduced misfortune?

Watch for flat rounds — a player who plays numbers without assembling solutions. If it happens twice in a session, the direct progress ratio is too high and the deck needs rebalancing.

---

## 7. Action Cards (30)

Each card has a **top action** (free) and a **bottom action** (costs mana; stronger, stranger, or more tactical). Spending mana marks an available die as spent. Temporary dice expire at end of round unless a card says otherwise. ENCHANT cards are removed from the draw deck when played and occupy the enchantment zone until removed.

---

### Direct Progress (6)

---

**1. Steady Hand**
Class: Direct Progress | Tag: Stability / Focus
*Top:* +3 Stability.
*Bottom (spend 1 any):* +3 Stability, +2 Focus.

---

**2. Force Through**
Class: Direct Progress | Tag: Force
*Top:* +2 Force.
*Bottom (spend 1 red):* +5 Force.

---

**3. Iron Rations**
Class: Direct Progress | Tag: Supply
*Top:* +2 Supply.
*Bottom (spend 1 yellow):* +5 Supply.

---

**4. Scout the Way**
Class: Direct Progress | Tag: Escape
*Top:* +2 Escape.
*Bottom (spend 1 green):* +4 Escape; draw 1 card.

---

**5. Clear Mind**
Class: Direct Progress | Tag: Focus
*Top:* +2 Focus.
*Bottom (spend 1 blue):* +5 Focus.

---

**6. Gut It Through**
Class: Direct Progress | Tag: Any
*Top:* +1 to any tag.
*Bottom (spend 1 red, 1 any):* +5 to any tag.

---

### Mana Conversion (3)

---

**7. Redirect**
Class: Mana Conversion
*Top:* Change 1 available die to red.
*Bottom (spend 1 any):* Change up to 2 available dice to any colors (may differ).

---

**8. Reflow**
Class: Mana Conversion
*Top:* Change 1 available die to blue.
*Bottom (spend 1 blue):* Change all dice of one color to any single other color.

---

**9. Temper**
Class: Mana Conversion
*Top:* Change 1 available die to green.
*Bottom (spend 1 green):* Change 1 spent or exhausted die to any color; it cannot be spent this round.

---

### Mana Creation (3)

---

**10. Find the Vein**
Class: Mana Creation
*Top:* Create 1 yellow die (temporary; expires end of round).
*Bottom (spend 1 yellow):* Create 2 yellow dice (temporary).

---

**11. Draw on Darkness**
Class: Mana Creation
*Top:* Create 1 red die (temporary).
*Bottom (spend 1 purple):* Create 1 die of any color (not X); it persists into the next round as available.

---

**12. Well of Focus**
Class: Mana Creation
*Top:* Create 1 blue die (temporary).
*Bottom (spend 1 blue):* Create 2 blue dice (temporary); +1 Focus.

---

### Card Draw / Filtering (3)

---

**13. Eyes Forward**
Class: Card Draw / Filtering
*Top:* Look at the top 3 cards of the action deck; keep 1 in hand, discard the rest.
*Bottom (spend 1 blue):* Draw 2 cards; discard 1 card from hand.

---

**14. Discard and Press**
Class: Card Draw / Filtering
*Top:* Discard 1 card from hand; draw 1 card.
*Bottom (spend 1 any):* Discard up to 3 cards from hand; draw that many cards.

---

**15. Rapid Assessment**
Class: Card Draw / Filtering
*Top:* Reveal the top card of the action deck; play its top action for free, then discard it.
*Bottom (spend 1 green):* Reveal the top 2 cards of the action deck; play one top action for free; discard both.

---

### Risk / Sacrifice (3)

---

**16. Desperate Surge**
Class: Risk / Sacrifice | Tag: Force
*Top:* +3 Force.
*Bottom (spend 1 red):* +7 Force; if this round fails, lose 1 VITAE.

---

**17. Abandon Caution**
Class: Risk / Sacrifice | Tag: Any
*Top:* +2 to any tag.
*Bottom (spend 1 any):* +5 to any tag; STANCE –1 until end of hazard.

---

**18. Last Reserve**
Class: Risk / Sacrifice | Tag: Escape
*Top:* Discard 1 card from hand; +4 Escape.
*Bottom (no mana cost):* Discard 2 cards from hand; +9 Escape; if this round fails, mark 1 additional X.

---

### Failure Mitigation (3)

---

**19. Brace**
Class: Failure Mitigation
*Top:* If this round fails, ignore 1 VITAE loss from the failure.
*Bottom (spend 1 yellow):* If this round fails, mark X but ignore all VITAE loss and STANCE loss from this round.

---

**20. Retreat to Safety**
Class: Failure Mitigation
*Top:* If this round fails, reduce any single failure penalty by 1 step.
*Bottom (spend 2 yellow):* At end of hazard scoring, convert 1 X mark to O. Discard this card after use.

---

**21. Hold the Line**
Class: Failure Mitigation | Tag: Stability
*Top:* +1 Stability.
*Bottom (spend 1 yellow, 1 any):* If this round would resolve as X, resolve it as O instead; lose 1 VITAE.

---

### Synergy / Combo (3)

---

**22. Momentum**
Class: Synergy / Combo | Tag: Any
*Top:* +1 to any tag.
*Bottom (spend 1 any):* +1 to any tag per card already played this round (minimum +2).

---

**23. Pattern Lock**
Class: Synergy / Combo | Tag: Focus
*Top:* +2 Focus.
*Bottom (spend 1 blue):* +2 Focus per matched pair of available unspent dice sharing a color (minimum +2 Focus).

---

**24. Chain Work**
Class: Synergy / Combo | Tag: Any
*Top:* +2 to any tag.
*Bottom (spend 1 any):* +2 to the same progress tag as the last card played this round. If no card has been played yet, +3 to any tag instead.

---

### X-Die Manipulation (3)

---

**25. Scavenge Fate**
Class: X-Die Manipulation
*Top:* Reroll 1 X die.
*Bottom (spend 1 purple):* Reroll all X dice; for each that remains X after the reroll, create 1 purple die (temporary).

---

**26. Curse Work**
Class: X-Die Manipulation | Tag: Focus
*Top:* Treat 1 X die as purple for the rest of this round.
*Bottom (spend 1 purple):* Treat all X dice as purple for the rest of this round; +2 Focus.

---

**27. Bitter Harvest**
Class: X-Die Manipulation | Tag: Force
*Top:* Exhaust 1 X die; +3 Force.
*Bottom (spend 1 red):* Exhaust up to 2 X dice; +4 Force per exhausted die.

---

### Persistent Enchantments (3)

---

**28. The Watcher's Lamp**
Class: Persistent Enchantment
*Top:* Draw 1 card.
*Bottom (spend 1 blue):* ENCHANT. Between rounds, refresh 1 spent die of your choice (it returns to available, color unchanged).

---

**29. Iron Discipline**
Class: Persistent Enchantment | Tag: Stability
*Top:* +1 Stability.
*Bottom (spend 1 yellow):* ENCHANT. Between rounds, preserve 1 available die of your choice (it carries into the next round still available, color and state unchanged).

---

**30. Marked Ground**
Class: Persistent Enchantment
*Top:* +1 to any tag.
*Bottom (spend 1 purple):* ENCHANT. Once per round, the first X die you would spend counts as any color of your choice instead. Remove this enchantment after the hazard ends.

---

## 8. Hazard Cards (15)

**Route selection:** chosen at hazard reveal, before dice are rolled.
**Final round:** listed separately per card; always harder.
**Tags:** Stability, Escape, Supply, Force, Focus.
**Dual requirements** (e.g., 5 Escape + 4 Force) must both be met in the same round to resolve O.

---

**H01 — Cracked Cliff Path**
*The ledge fails underfoot. A shrine cache glints across the split.*
Rounds: 3

Top (Stability): Rounds 1–2: clear 6. Round 3: clear 8.
Reward: minor supplies, safe advance. Failure: no extra penalty.

Bottom (Escape): Rounds 1–2: clear 9. Round 3: clear 11.
Reward: shrine cache (rare item + 1 VITAE recovered). Failure any round: lose 1 VITAE.

---

**H02 — The Starving Road**
*Three days without resupply. The others watch your pack.*
Rounds: 4

Top (Supply): Rounds 1–3: clear 5. Round 4: clear 7.
Reward: +2 Supply tokens. Failure: no extra penalty.

Bottom (Supply): Rounds 1–3: clear 8. Round 4: clear 10.
Reward: +4 Supply tokens + 1 VITAE recovered. Failure any round: STANCE –1 (cumulative, capped at –2 total for this hazard).

---

**H03 — River in Flood**
*The ford churns red-brown. Something turns in the current that is not a log.*
Rounds: 3

Top (Escape): Rounds 1–2: clear 6. Round 3: clear 8.
Reward: safe crossing. Failure: no extra penalty.

Bottom (Dual — Escape + Force): Rounds 1–2: clear 5 Escape + 5 Force. Round 3: clear 7 Escape + 7 Force.
Reward: salvage from the current + safe crossing. Final round failure: lose 1 VITAE, STANCE –1 for next map node.

---

**H04 — Fever Night**
*Something in the water or the air. By midnight you are burning.*
Rounds: 4

Top (Focus): Rounds 1–3: clear 5. Round 4: clear 7.
Reward: retain full VITAE; minor reagent. Failure: no extra penalty.

Bottom (Focus): Rounds 1–3: clear 8. Round 4: clear 11.
Reward: 1 VITAE recovered + rare reagent. Failure any round: lose 1 VITAE.

---

**H05 — Ash Fields**
*The ash comes to the knee in places. Nothing marks the safe way from the buried way.*
Rounds: 3

Top (Stability): Rounds 1–2: clear 5. Round 3: clear 7.
Reward: advance; minor supply find. Failure: no extra penalty.

Bottom (Dual — Stability + Focus): Rounds 1–2: clear 5 Stability + 4 Focus. Round 3: clear 7 Stability + 5 Focus.
Reward: map fragment + advance. Failure any round: mark 1 additional X.

---

**H06 — The Blocked Pass**
*Three armed men. They are not asking.*
Rounds: 3

Top (Force): Rounds 1–2: clear 6. Round 3: clear 9.
Reward: pass without incident. Failure: no extra penalty.

Bottom (Force): Rounds 1–2: clear 10. Round 3: clear 13.
Reward: take their supplies + rare item. Failure any round: lose 1 VITAE.

---

**H07 — Crumbling Aqueduct**
*The structure is older than the war. It moves when the wind moves.*
Rounds: 3

Top (Stability): Rounds 1–2: clear 6. Round 3: clear 8.
Reward: safe crossing. Failure: no extra penalty.

Bottom (Player's Choice): At hazard reveal, before dice roll, choose Stability or Escape for the entire hazard. Rounds 1–2: clear 9 of chosen tag. Round 3: clear 12.
Reward: rare salvage from the structure. Final round failure: lose 1 VITAE, STANCE –1.

---

**H08 — The Poisoned Spring**
*It tastes wrong but there is nothing else for three days.*
Rounds: 3

Top (Focus): Rounds 1–2: clear 5. Round 3: clear 7.
Reward: partial resupply. Failure: no extra penalty.

Bottom (Dual — Focus + Supply): Rounds 1–2: clear 5 Focus + 4 Supply. Round 3: clear 7 Focus + 6 Supply.
Reward: purify the source (persistent map benefit — next Supply hazard: all thresholds –2). Failure any round: lose 1 VITAE.

---

**H09 — Night Ambush**
*Four of them in the dark. They knew you were coming.*
Rounds: 4

Top (Escape): Rounds 1–3: clear 6. Round 4: clear 8.
Reward: escape without loss. Failure: no extra penalty.

Bottom (Dual — Escape + Force): Rounds 1–3: clear 5 Escape + 5 Force. Round 4: clear 7 Escape + 7 Force.
Reward: defeat ambushers; take their supplies + map clue. Failure any round: lose 1 VITAE.

---

**H10 — Structural Collapse**
*The ceiling lets go in sections. The way out is narrowing.*
Rounds: 3

Top (Escape): Rounds 1–2: clear 7. Round 3: clear 10.
Reward: escape. Failure: no extra penalty.

Bottom (Dual — Stability + Escape): Rounds 1–2: clear 5 Stability + 5 Escape. Round 3: clear 7 Stability + 7 Escape.
Reward: retrieve hidden cache before the structure falls + escape. Final round failure: lose 2 VITAE.

---

**H11 — Cold Crossing**
*The water is black under ice that does not look trustworthy.*
Rounds: 4

Top (Stability): Rounds 1–3: clear 5. Round 4: clear 7.
Reward: cross without hardship. Failure: no extra penalty.

Bottom (Dual — Stability + Supply): Rounds 1–3: clear 7 Stability + 4 Supply. Round 4: clear 10 Stability + 5 Supply.
Reward: +2 VITAE recovered + supply bonus. Failure any round: STANCE –1 (capped at –2 total for this hazard).

---

**H12 — The Riddled Bridge**
*The mechanism is old but someone was maintaining it. That someone is gone.*
Rounds: 3

Top (Focus): Rounds 1–2: clear 6. Round 3: clear 8.
Reward: cross safely. Failure: no extra penalty.

Bottom (Focus): Rounds 1–2: clear 9. Round 3: clear 12.
Reward: leave bridge functional (persistent map benefit: future crossings auto-succeed Stability checks of 6 or less) + rare tool. Final round failure: bridge collapses, lose 1 VITAE, route blocked (alternate path required on map).

---

**H13 — Corpse Road**
*The dead line the old trade road. They have been here longer than the new maps.*
Rounds: 3

Top (Force): Rounds 1–2: clear 5. Round 3: clear 7.
Reward: pass without cost. Failure: no extra penalty.

Bottom (Dual — Force + Focus): Rounds 1–2: clear 5 Force + 4 Focus. Round 3: clear 7 Force + 6 Focus.
Reward: find valuables among the dead. Failure any round: STANCE –1. Final round failure: additionally lose 1 VITAE.

---

**H14 — The Buried Pass**
*The avalanche came through last winter. Something valuable was on the road before it did.*
Rounds: 5

Top (Dual — Stability + Supply): Rounds 1–4: clear 5 Stability + 3 Supply. Round 5: clear 7 Stability + 5 Supply.
Reward: pass; moderate reward cache. Failure any round: lose 1 Supply token.

Bottom (Dual — Stability + Supply): Rounds 1–4: clear 7 Stability + 5 Supply. Round 5: clear 10 Stability + 7 Supply.
Reward: find what was buried (major item + 2 VITAE recovered). Failure any round: lose 1 Supply token. Final round failure: additionally lose 1 VITAE.

---

**H15 — The Dark Narrows**
*The passage is a hand's width wider than a man. Whatever was here before you found it comfortable.*
Rounds: 3

Top (Escape): Rounds 1–2: clear 7. Round 3: clear 10.
Reward: through. Failure: no extra penalty.

Bottom (Dual — Escape + Force): Rounds 1–2: clear 5 Escape + 6 Force. Round 3: clear 7 Escape + 9 Force.
Reward: clear the narrows permanently (map benefit: hazard removed for future passes) + rare salvage. Failure any round: lose 1 VITAE. Final round failure: additionally STANCE –2 (this hazard cap applies normally; total –2).

---

## 9. Balance Notes for First Prototype

### Dice Economy

Starting roll of 4 dice: expected ~0.7 X dice (1-in-6 per die). Expected colored available dice: ~3.3.

Without any refresh effects, and assuming 2 dice spent per round, the player enters round 3 with zero available mana. This is the intended cliff — but it means The Watcher's Lamp and Iron Discipline are not convenience cards, they are survival cards. If neither appears in a hazard, the top route should still be completable on the strength of top-action progress alone (no mana needed). Verify this in Session 1. If top-route final rounds require mana to clear, the thresholds are too high.

### Threshold Calibration

5-card hand baseline (top actions only, no mana spending):

- Expected 2 direct progress cards drawn per round: avg +2–3 each = +4–6 raw progress
- Other cards with incidental progress: +0–1 = +1 max
- Reliable floor without mana: ~5 progress per round

With 1 mana-enabled bottom action: +5 additional = ~10 per round
With 2 bottom actions: ~15 per round (requires 2 available dice)

This validates the threshold targets:
- Top routes at 5–7 per round: clearable on top actions alone — correct
- Bottom routes at 8–11 per round: require at least 1 mana-enabled bottom action — correct
- Final round +2 to +3: requires at least 1 available die entering the final round — this is the design

### X-Die Interaction

Three X-manipulation cards in 30: ~40% probability of at least one appearing in a 5-card draw. Against 2+ X dice showing, this rate may feel too low to deliver the exploitation fantasy. Two options:

**(a)** Increase X-manipulation cards from 3 to 5 in the deck (cut 2 direct progress cards down from 6 to 4).

**(b)** Add a hazard rule: *If 2 or more dice show X at the start of a round, the player may look at the top 2 cards of the action deck and add 1 to their hand before drawing their 5.*

Option (b) is cleaner in v0 — it targets the specific failure condition without changing deck ratios.

### Synergy / Combo Floor

Pattern Lock can produce 0 Focus in a bad dice spread. Revise to: *"+2 Focus per matched pair of available unspent dice sharing a color, minimum +2 Focus."* Without the floor, it is unplayable in roughly 30% of board states.

Momentum gives a floor of +2 on bottom — adequate.
Chain Work gives +3 when played first — adequate.

### STANCE Cost Monitoring

Cards and hazards that can produce STANCE loss in this set: Abandon Caution (card 17), H02, H03, H11, H13, H15. A player taking the bottom route on H15 while playing Abandon Caution twice could theoretically lose STANCE –4 in one hazard. This is too much.

Apply the cap globally: **STANCE loss from a single hazard cannot exceed –2 total, regardless of source.** Once the cap is reached, further STANCE costs from this hazard are ignored. This cap applies to hazard-sourced losses and card-sourced losses within the same hazard combined.

### First Prototype Session Sequence

Session 1 and 2 (top and bottom route baselines):
H01, H02, H04, H05, H06, H07, H10, H12, H13, H15 — covers solo-tag and dual-tag requirements, 3-round and 4-round structures, VITAE and STANCE consequences, and persistent map benefits.

Session 3 (stress test):
Add H03, H09, H11, H14 — 4-round and 5-round structures, compounding dual-tag requirements.

Do not prototype all 15 at once. Tune the first ten before the longer hazards prove whether the mana economy holds over five rounds.

---
