# Skill: hazard-tuning

> **High autonomy within hard guardrails.** Analyse the hazard minigame's
> mana economy, card ratios, threshold ladder, and scoring bands against
> published design targets. Deliver findings and any numeric changes on ONE
> new branch + PR. Nothing auto-lands on `main`.

## North star — playable crises, not passive damage popups

Per `docs/hazard-minigame.md` (CDR-0006), the hazard minigame must feel like
a **Mage Knight-style tactical puzzle**, not a stat check. The player should
assemble a solution under pressure — not just sum numbers until they exceed a
threshold. The witness for this path is a round where the player uses
**enchantments, X-interaction cards, mana conversion, or combo effects** to
solve a crisis they could not have cleared on direct progress alone.

A change that makes flat rounds (play numbers, check threshold) the dominant
pattern works against this vision. Treat high flat-round rate as a balance
failure even when clear rates look healthy. The design targets
from the PRD are the objective function.

## 1. Purpose

`/hazard-tuning` is the hazard balance loop. It reads the shipped content
libraries, exercises the hermetic e2e suite (`npm test`), interprets results
against CDR-0006 design targets, and delivers a report — with any auto-applied
numeric changes and any propose-only structural findings — together on one branch
and PR.

**No hazard tuning CLI exists today.** `npm run tune` is the combat engine;
there is no `npm run hazard-tune`. The first version of this skill is an
**evidence-and-report workflow**: read the libraries, run the test suite,
analyse the numbers, apply numeric changes directly to the library files, and
deliver. If the absence of a simulation harness blocks meaningful tuning of a
specific axis, the skill files a harness-gap entry in `plan/PHASE_CANDIDATES.md`
instead of pretending automation exists.

## 2. Invocation

```
/hazard-tuning
/hazard-tuning --focus="top-route clear rate"
/hazard-tuning --focus="X-die economy"
/hazard-tuning --focus="final-round pressure"
/hazard-tuning --focus="deck ratios"
/hazard-tuning --focus="bottom-route reward delta"
/hazard-tuning --focus="mana exhaustion cliff"
```

`--focus` narrows which tuning axis the skill prioritises in its analysis
and its change set. Without `--focus`, the skill runs a full sweep of all
axes in the quick-reference table below.

## 3. Autonomy contract

- **Numeric and content-level only.** The skill may change card top/bottom
  effect values, bottom mana costs, hazard card round thresholds, round counts,
  and reward/penalty magnitudes in the library files. Structural rules changes
  (new progress types, new die states, new card verb classes, changes to the
  state machine or engine functions) are **propose-only** — they are written
  to the suggestions section but never applied without T approval.
- **Baseline before delta.** Every proposed change is compared against the
  current shipped values. The report records `old → new` with a one-line
  rationale for each change. No change is applied without a documented reason
  grounded in the design targets below.
- **The verify gate is non-negotiable.** After any change, `npm run verify`
  must pass before the change is staged. If a change breaks any test, revert
  it and record it under "Considered but not applied".
- **Known engine gaps are not tuning levers.** Several engine behaviours differ
  from CDR-0006 doctrine or carry explicit TODO markers (see §6). Do not tune
  numbers to compensate for unimplemented engine behaviour. Flag the gap in the
  report instead.
- **One PR carries everything.** The findings report, the suggestions (with
  library snapshots), and any applied numeric changes all ride a single new
  branch + PR. The PR is ready for review, never draft, never auto-merged.
- **Ambiguity → document and proceed.** If a focus target is unclear or a
  propose-only idea is architecturally significant, make the most reasonable
  assumption, document it under `## Open questions` in the suggestions file,
  and continue.

## 4. Design targets (the objective function)

These are the shipped design targets from CDR-0006 and the PRD. The skill
measures reported evidence against them; deviations are candidates for tuning.

| Axis | Target |
|---|---|
| Top route clear rate (sessions 1–2) | 70–80% |
| Bottom route clear rate (sessions 1–2) | 40–60% |
| Final round mana crisis rate | >50% of runs enter the final round with ≤1 available die |
| Flat round rate | <2 per session |
| X-interaction card appearance rate against 2+ X dice | >40% |
| Top-route final round completable without mana | Always (top-action progress floor ≥ threshold) |

Threshold calibration baseline (from CDR-0006 §Balance Notes):

- **Top actions only, no mana:** reliable floor ~5–7 progress per round.
- **1 mana-enabled bottom action:** ~10–12 per round.
- **2 bottom actions:** ~14–16 per round.

This means top-route thresholds of 5–7 clear without mana (correct), and
bottom-route thresholds of 8–11 require at least one available die (correct).
Final-round +2–+3 uplift requires at least one die entering the final round
(the intended cliff).

## 5. The procedure

### Step 0 — Sync & sanity

- Ensure a clean working tree. Note the base branch (usually `main`).
- `npm ci` if `node_modules` is absent.
- Run `npm test` cold. If any test fails before you touch anything, stop
  and report the pre-existing failure — do not proceed.

### Step 1 — Read the libraries

Read these files in full before forming any hypothesis:

- `src/World/Hazard/hazard.cards.library.ts` — all 30 action cards with their
  effect values, bottom costs, rarity, and class.
- `src/World/Hazard/hazard.hazards.library.ts` — all 15 hazard cards with
  their top/bottom route thresholds, round counts, and penalty tables.
- `src/World/Hazard/hazard.cards.ts` — card effect factories and constants.
- `src/World/Hazard/hazard.dice.ts` — die face distribution and mana validation.

Identify the current values for every axis in the design targets table.

### Step 2 — Map evidence against targets

For each design target:

1. **Compute expected rates from the current numbers.** Apply the threshold
   calibration baseline. For each hazard card on each route, determine whether
   the round-by-round thresholds are clearable at the top-action floor, at
   one-bottom-action level, and at two-bottom-action level. Flag any round that
   falls outside its intended range.

2. **Compute X-interaction draw probability.** Given the current count of
   X-interaction cards in the 30-card pool, calculate the probability of
   drawing at least one in a 5-card hand. Compare against the 40% target.
   The current pool has 3 X-interaction cards; expected draw probability ≈ 43%
   against a 5-card draw from 30. Flag if a changed ratio drops below 40%.

3. **Map deck ratios.** Tally cards by class (direct-progress, focus,
   mana-conversion, mana-creation, card-draw, risk-sacrifice,
   failure-mitigation, synergy-combo, x-die-interaction, persistent-enchantment).
   Flag if direct-progress cards exceed 50% of the pool (flat-round risk per
   CDR-0006 §Design Tensions).

4. **Identify mana-cliff hazards.** For hazards with ≥3 rounds and no
   automatic refresh: after 2 dice spent per round, entering round 3 with zero
   available mana is the intended cliff. Identify any hazard where the final
   round threshold is clearable only with mana, on the top route — this is a
   balance failure per CDR-0006.

### Step 3 — Propose and apply numeric changes

For each axis that deviates from its target:

1. **Draft a change:** specify the file, the card or hazard ID, the old value,
   the new value, and a one-line rationale referencing the target.

2. **Apply the change** to the library file.

3. **Re-run `npm test`.** If any test fails: revert the change, record it
   under "Considered but not applied" with the failure mode.

4. **Re-evaluate the target** with the new numbers. Record the updated
   expected rate.

Do not apply more than one change per axis at a time. Measure each change
before the next.

### Step 4 — Record known engine gaps

Before closing the report, cross-check the following known gaps between CDR-0006
doctrine and the shipped engine. Do not tune numbers around them — flag them.

| Gap | Shipped state | CDR-0006 doctrine |
|---|---|---|
| Per-round failure penalties | Not yet applied (`penaltiesApplied: []` TODO in `hazard.engine.ts:221`) | Applied per round on X resolution |
| Dice refresh between rounds | `refreshDiceBetweenRounds` resets all spent dice to available | No auto-refresh; only enchantments can refresh dice |
| Dual-type round resolution | Not verified against full dual-type check | Both types must be met to score O |
| Persistent map benefits | Types defined but not wired to world state | H08, H12, H15 emit map events |

If a gap materially affects a tuning axis (e.g., the penalty gap means VITAE
drain cannot be measured), file a harness-gap entry in
`plan/PHASE_CANDIDATES.md` with the blocking axis noted, and exclude that axis
from the applied changes.

### Step 5 — Deliver on ONE PR

- Create a branch off base: `git checkout -b balance/hazard-<ts>`.
- Stage the findings report, the suggestions writeup, and any changed library
  files.
- Commit: `balance(hazard): <ts> report + suggestions (<n> changes applied)`.
- Push and open a PR (ready for review):
  - Title: `balance(hazard): tuning <ts> (<n> applied)`
  - Body: headline deviation from targets; each applied change with `old → new`
    and one-line rationale; the propose-only section for structural findings;
    the engine-gap table for known blockers.
- If no numeric changes are applied but there are new propose-only findings or
  newly-flagged engine gaps, open the PR carrying the report only. Do not open
  a no-op PR if nothing has changed from the previous tick's findings.

### Step 6 — Harness gap filing

If the absence of a simulation harness blocks any tuning axis, file an entry
in `plan/PHASE_CANDIDATES.md` following the existing candidate format:

```markdown
### Hazard simulation harness
**Why:** Without a Monte Carlo harness analogous to `src/Tuning/`, route clear
rates and mana-cliff frequencies cannot be measured empirically — only estimated
from probability calculations against fixed decks. The hazard-tuning skill is
blocked on the [axis] target.
**Scope:** `src/World/Hazard/cli.ts` + simulation loop over the
`src/World/Hazard/` engine functions with stubbed RNG; report in the format of
the existing tuning reports.
**Unlocks:** `/hazard-tuning --runs=N` flag; empirical rather than analytic
evidence for all design targets.
```

Do not invent a fake harness invocation. Do not claim a measurement was taken
that was not.

## 6. Hard rules

- **Never push to `main` automatically.** Report, suggestions, and any applied
  changes all ride the PR branch. A human merges.
- **Never auto-merge the PR.** T approves.
- **Never bypass `npm run verify`.** A change that does not survive the verify
  gate is not applied.
- **Never edit `src/World/Hazard/hazard.engine.ts` or `hazard.types.ts`
  for tuning purposes.** Engine logic and type contracts are structural — changes
  require T sign-off. The tuning surface is the library files only:
  `hazard.cards.library.ts`, `hazard.hazards.library.ts`.
- **Never add new progress types, die states, or card verb classes.** These are
  structural additions, not numeric tuning.
- **Preserve canonical terms VITAE and STANCE** in all authored text.
  VITAE is the player's life resource. STANCE is a combat term. Do not rename
  either to HEALTH/GUARD. Do not invent new STANCE semantics beyond what
  shipped hazard content already uses — but hazard content may impose STANCE
  penalties per the shipped docs; that is correct usage, not an error.
- **UI issues are not hazard balance evidence.** Do not treat UI rendering
  issues as balance failures or factor them into tuning quality. `/hazard-tuning`
  never approves, merges, or releases anything — it opens a PR for T review
  only. If known UI blockers exist at the time of the run, note them separately
  in the PR body; they do not invalidate the findings, but T may withhold
  approval until they are resolved.
- **No emojis. No `Co-Authored-By:` trailers.** Commit style:
  `<type>(<scope>): <description>`.

## 7. Failure modes

1. **`npm test` fails before any change.** Stop. Report the pre-existing
   failure. Do not proceed with tuning until the test suite is green.

2. **A library file cannot be parsed / IDs are inconsistent.** Read the file
   directly and verify card IDs against the exported constants. Report the
   inconsistency before touching values.

3. **A proposed change breaks a test.** Revert immediately. Record the failed
   change under "Considered but not applied" with the test name and failure
   message. Continue with other axes.

4. **An engine gap blocks measurement of a target axis.** File a harness-gap
   entry in `plan/PHASE_CANDIDATES.md`. Exclude the axis from applied changes.
   Report it clearly in the PR body.

5. **No axis deviates from target / no change is warranted.** Open a PR with
   the report only if the analysis surfaces anything new (a freshly-identified
   gap, a changed ratio from a prior change). Skip the PR if nothing differs
   from the previous tick.

6. **Focus matches no hazard or card content.** Run the full sweep. Note that
   the focus filter was empty and the full sweep was used instead.

## 8. Quick reference

**Content libraries:**
- Action cards: `src/World/Hazard/hazard.cards.library.ts`
  (30 cards: A01–A30, IDs per file; `STARTER_DECK_CARD_IDS` exported)
- Hazard cards: `src/World/Hazard/hazard.hazards.library.ts`
  (15 hazards: H01–H15)
- Card effect factories: `src/World/Hazard/hazard.cards.ts`

**Engine:**
- Core: `src/World/Hazard/hazard.engine.ts`
- Dice: `src/World/Hazard/hazard.dice.ts`
- Deck: `src/World/Hazard/hazard.deck.ts`
- Public barrel: `src/World/Hazard/index.ts`

**Tests:**
- Hermetic e2e: `src/World/Hazard/e2e/hazard.engine.test.ts`
- Run: `npm test` (vitest run — includes all e2e suites)

**Design doctrine:**
- CDR-0006 rules + card set: `docs/hazard-minigame.md`
- PRD + success metrics: `docs/hazard-minigame-prd.md`
- Technical types + state machine: `docs/hazard-minigame-tdd.md`
- BDD scenarios: `docs/hazard-minigame-bdd.md`

**Tunable axes and CDR-0006 targets:**

| Axis | Files | Target |
|---|---|---|
| Hazard card thresholds (per round, top + bottom) | `hazard.hazards.library.ts` | Top: 5–7/round; bottom: 8–11/round; final +2–+3 |
| Hazard round counts | `hazard.hazards.library.ts` | 3 (default), 4–5 (select hazards) |
| Action card top effect values | `hazard.cards.library.ts` | Top-action floor: 5–7 total progress per round |
| Action card bottom effect values | `hazard.cards.library.ts` | 1 bottom action: +5–+8 additional progress |
| Action card bottom mana costs | `hazard.cards.library.ts` | Validate 'any' vs specific color against die color distribution |
| Focus buff values | `hazard.cards.library.ts` (A05, A07, A08) | Clear Mind top +2, bottom +5; adjust if top-route floor is wrong |
| Deck class ratios (direct-progress share) | `hazard.cards.library.ts` | Direct progress ≤ 50% of pool (30 cards) |
| X-interaction card count | `hazard.cards.library.ts` | ≥3 cards; draw ≥40% against 2+ X dice per 5-card hand |
| Route reward magnitudes (VITAE, supply, items) | `hazard.hazards.library.ts` | Bottom reward must be genuinely better than top |
| Per-round failure penalty magnitudes | `hazard.hazards.library.ts` | **Blocked — engine gap; penalty application not yet wired** |
| Scoring bands / reward tables | `hazard.hazards.library.ts` | 3-round: 3O→strong, 2O→normal, 1O→minor, 0O→penalty |

**Known engine gaps (do not tune around; flag only):**

| Gap | File | Marker |
|---|---|---|
| Per-round failure penalties not applied | `hazard.engine.ts:221` | `TODO: Apply penalties for failed rounds` |
| Dice refresh between rounds (resets all spent) | `hazard.engine.ts` `advanceToNextRound` | Contradicts CDR-0006 §Mana Dice |
| Dual-type round resolution incomplete | `hazard.engine.ts` `resolveRound` | Single-type check only |
| Persistent map benefits not wired | `hazard.types.ts` | `⚑ future phase` comments |
