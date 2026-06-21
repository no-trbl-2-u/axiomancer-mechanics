# Skill: combat-tuning

> **Tunes the Hazard-Pattern Combat (Spec 25) — the card-and-dice driver
> (`resolveCombatPhase`) where status effects fill two Pressure Tracks that are
> the only practical win conditions.** This is the primary combat system going
> forward. The legacy turn-based combat (`resolveCombatRound`, attack/defend,
> the playstyle matrix) has its own tuner, **`/legacy-combat-tuning`**, and
> remains until live encounters migrate off it.

> **High autonomy within hard guardrails.** Analyse the new combat's pressure
> economy — threat thresholds, the stance-die bag, the self-reinforcing loop,
> RPS die-cost scaling, momentum, and per-effect pressure — against design
> targets using the Monte-Carlo sim as the witness. Deliver findings and any
> numeric changes on ONE new branch + PR. Nothing auto-lands on `main`.

## North star — status effects are the ONLY win path

Per `VISION.md` / `CLAUDE.md`, **status effects are the MAIN fun of combat.**
In the legacy system this was an *engagement weight* the optimiser balanced
against basic-attack trading. Spec 25 makes it **structural**: there is no
attack/defend verb — every card is a skill, and the two ways to win are **DoT
Erosion** (the `dot` track) and **Control Saturation** (the `control` track).
So the tuning question is no longer "did status play out-resolve basic
attacks?" — that contest no longer exists. The new questions are:

1. **Is the fight an assembled solution, not a one-card spam?** The Slay-the-
   Spire failure mode (the braindump flagged it) is "one-card-combo sameness":
   one DoT card spammed every turn trivialises the fight. The witness for a
   healthy fight is **varied** card play that exploits the dice economy (the
   self-reinforcing refresh loop), reads the enemy phase stance (RPS), and
   uses BOTH tracks situationally — not a single dominant line.
2. **Is HP-only attrition infeasible?** Spec 25 §4.4 guard: direct-damage
   cards must NOT be able to win on their own inside the authored window
   (~20+ phases). If a damage-only line wins, thresholds are mis-tuned.
3. **Are both win paths live?** DoT and Control should each be reachable; an
   enemy weak to one (lower threshold on that track) should be *winnable on
   that track*, not forced onto the other.

A change that makes a single DoT card the dominant line, or that lets a
damage-only line win, or that collapses one win path, is a balance failure even
when win rates look healthy.

## 1. Purpose

`/combat-tuning` is the balance loop for the Hazard-Pattern Combat. It reads
the shipped engine constants + authored threat sequences, exercises the
**Monte-Carlo sim** (`simulateHazardPatternCombat`), interprets results against
the design targets below, and delivers a report — with any auto-applied numeric
changes and any propose-only structural findings — together on one branch and
PR.

It does NOT reimplement combat or invent metrics — the engine and the sim do
that. The skill is the orchestrator + the delivery layer.

**Player-feel / mobile witness.** When the task asks about phone-interaction,
card readability, track legibility, or playtest feel, also drive the mobile
combat board as a live witness — the dev tools route (`SELF → DEV MENU →
DEBUG · HAZARD COMBAT → ASSEMBLE`, `data-testid="debug-combat-encounter-button"`,
or navigate straight to `/combat-encounter`). Seed it with
`globalThis.__AXM_COMBAT_SEED__` for reproducible sessions. CLI/sim evidence
alone does not answer phone-interaction questions.

## 2. Invocation

```
/combat-tuning
/combat-tuning --focus="boss threat thresholds"
/combat-tuning --focus="X-die frequency"
/combat-tuning --focus="control-path viability"
/combat-tuning --focus="momentum carry"
/combat-tuning --focus="top-action pressure floor"
/loop 6h /combat-tuning            # periodic autonomous tuning
```

`--focus` narrows which axis the skill prioritises. Without `--focus`, it runs
a full sweep of the axes in the quick-reference table below.

## 3. Autonomy contract

- **Numeric and content-level only.** The skill may change the tunable
  constants and authored threat-sequence factors listed in §8. **Structural
  rules changes** — new die states, new verb classes, the pressure-contribution
  formula (`effectPressure`), the self-reinforcing-loop rule, the RPS cost
  ladder, the state machine, or any engine function — are **propose-only**:
  written to the suggestions section, never applied without T approval.
- **Sim evidence before edits.** Before applying any numeric change, run the
  Monte-Carlo sim across the relevant enemy × seed matrix and record the
  before-state (win/mercy/defeat split, per-phase clear rates, avg rounds,
  status-engagement). After the change, re-run the SAME matrix (same seeds) and
  record the delta. Cite exact invocations and counts.
- **Baseline before delta.** Every change records `old → new` with a one-line
  rationale grounded in a design target. One change per axis at a time; measure
  each before the next.
- **The verify gate is non-negotiable.** After any change, `npm run verify`
  (type-check + tests + lint + build) must pass before staging. A change that
  breaks a test — including the balance-sim witness
  (`src/Combat/e2e/hazard-pattern-combat.balance.sim.test.ts`) — is reverted and
  recorded under "Considered but not applied".
- **Never tune around an engine gap.** If an axis can't be measured (the sim's
  greedy bot doesn't exercise it, e.g. the persistent-buff zone or the mercy
  exploit line), flag it — do not move numbers to compensate for behaviour the
  bot never triggers.
- **One PR carries everything.** Findings report + suggestions (with sim
  evidence) + any applied numeric changes ride a single new branch + PR, ready
  for review, never draft, never auto-merged.
- **Standing law.** Unknown is an acceptable terminal state; false certainty is
  not. **Fail together** — verified failure beats unverified success; never
  fabricate a sim measurement, PR state, or test output.
- **Ambiguity → document and proceed.** Unclear focus or an architecturally
  significant propose-only idea: make the most reasonable assumption, document
  it under `## Open questions` in the suggestions file, and continue. In a CI
  container there is no user to answer.

## 4. Design targets (the objective function)

Measured by the sim (`simulateHazardPatternCombat(player, enemy, runs, seed)`),
which reports `{ winRate, victories, mercies, defeats, retreats,
clearRateByPhase, avgRounds, statusEngagement }`. Run with a **competent
strategist loadout** (a deck spanning DoT, control, direct-damage, and befriend
across stances) at a level appropriate to the enemy.

| Axis | Target |
|---|---|
| Win rate vs a same-tier strategist loadout — simple/normal | 80–95% |
| Win rate — elite | 50–70% |
| Win rate — boss (fixed-level starting bosses excepted) | 30–55% |
| Status-effect win share (victories via DoT + mercies via Control) | **100%** of wins — HP-only attrition must NOT win in-window |
| Both-track viability (enemy weak to a track is winnable on it) | DoT-weak enemy wins ≥60% via the dot path; control-weak via control |
| Avg phases to resolve | 3–8 (boss up to ~10); not a drag |
| Per-phase clear distribution | not all-clear — early phases sometimes Overwhelmed (tension); see `clearRateByPhase` |
| Single-card-spam check (propose-only metric) | no single skill id should account for >70% of a typical win's pressure |

**Stance-die calibration baseline (Spec 25 §4.2):** 6-face bag = Heart/Body/
Mind/Wild at 1/6 each + X at 2/6 → expected ~1.3 X and ~0.67 Wild per opening
4-dice roll. The self-reinforcing loop refreshes one matching die when a status
effect lands, so an effective status line is largely die-sustaining; a
direct-damage line is not (no refresh). RPS advantage waives the bottom-action
die cost entirely, neutral costs 1, disadvantage costs 2 — so phase-stance
reading is the primary die-economy lever.

**Threshold derivation (Spec 25 §5.3):** per-phase `dotPressureRequired` /
`controlPressureRequired` come from `combat.threat.ts` factors × enemy HP; the
global victory/mercy thresholds are their sums. A DoT card contributes
`damagePerRound × intensity`; control contributes `intensity + min(remaining
duration, 3)` while actively restricting. Use these to predict whether a phase
is clearable before running the sim.

## 5. The procedure

### Step 0 — Sync & sanity
- Clean working tree. Note the base branch (usually `main`).
- `npm ci` if `node_modules` is absent.
- Run the new-combat suites cold:
  `npx vitest run src/Combat/e2e/hazard-pattern-combat.engine.test.ts src/Combat/e2e/hazard-pattern-combat.balance.sim.test.ts`.
- `npm test` cold. If anything fails before you touch a file, stop and report.

### Step 1 — Read the tuning surface
Read in full before forming a hypothesis:
- `src/Combat/combat.threat.ts` — `DEFAULT_DOT_FACTOR`, `DEFAULT_CONTROL_FACTOR`,
  `ESCALATION`, the authored `AUTHORED_THREAT_SEQUENCES` factors + threat-action
  damage.
- `src/Combat/combat.dice.ts` — `COMBAT_DIE_FACES` (the X/Wild frequency).
- `src/Combat/combat.engine.ts` — `TOP_ACTION_PRESSURE`,
  `BEFRIEND_THRESHOLD_REDUCTION` (+ the loop / RPS logic, which is propose-only).
- `src/Combat/combat.pressure.ts` — `MOMENTUM_CAP` (+ `effectPressure` import,
  propose-only).
- `src/Combat/combat.cards.ts` — `effectPressure` (the per-effect contribution
  math; **propose-only**).

### Step 2 — Run the sim evidence matrix
The sim is the witness. Drive it via a throwaway vitest in `src/Combat/e2e/`
(so path aliases resolve) or a node script — never commit the throwaway. Sweep:
- the authored enemies in scope (`AUTHORED_THREAT_ENEMY_IDS`) + a default-
  sequence enemy for the generator path;
- a fixed strategist loadout (DoT + control + damage + befriend, level-matched);
- `simulateHazardPatternCombat(player, enemy, 300, startSeed)` — 300 seeded runs
  is the default; raise for noisy cells.

Record per enemy: `winRate`, the V/M/D/R split, `clearRateByPhase`, `avgRounds`,
`statusEngagement`. For the both-track check, run a DoT-only loadout and a
control-only loadout separately and confirm each path wins on its weak enemy.

### Step 3 — Map evidence against targets
For each target: measure the sim rate, compute the expected rate from the
constants (use the §4 calibration), and flag any cell outside its band. Pay
special attention to the **status-win-share = 100%** invariant (any HP/attrition
win = a threshold-too-low failure) and the **single-card-spam** check (does one
skill dominate the pressure? — read the post-combat attribution / `buildCombatSummary`).

### Step 4 — Propose and apply numeric changes
For each off-band axis: draft the change (file, constant/sequence, old → new,
one-line rationale referencing the target); apply ONE; re-run the SAME sim
matrix with the SAME seeds; record before/after; `npm run verify`. If verify
(or the balance-sim witness) fails, revert and record under "Considered but not
applied". Re-evaluate the target with the new numbers.

### Step 5 — Deliver on ONE PR
- Branch off base: `git checkout -b balance/combat-<ts>`.
- Stage the findings report, the suggestions writeup, and any changed engine
  constant files.
- Commit: `balance(combat): <ts> report + suggestions (<n> applied)`.
- Push and open a PR (ready for review):
  - Title: `balance(combat): tuning <ts> (<n> applied)`
  - Body: headline deviation from targets; the sim matrix (enemies, seeds, run
    counts); before/after win/clear/engagement deltas; each applied change with
    `old → new` + rationale; the propose-only section for structural findings.
- No applied changes but a new propose-only finding → PR with the report only.
  Do **not** open a no-op PR that repeats the previous tick's findings.

### Step 6 — Report back
One concise message: the PR URL and the headline win-rate / status-share delta.

## 6. Hard rules

- **Never push to `main` automatically.** Report + suggestions + changes ride
  the PR branch. A human merges. **Never auto-merge.**
- **Never bypass `npm run verify`,** including the balance-sim witness.
- **Never edit the engine logic for tuning** — `combat.engine.ts`,
  `combat.cards.ts` (`effectPressure`), `combat.pressure.ts` math,
  `combat.dice.ts` rules, or any state-machine / `executeSkill` / `applyEffect`
  path. The tuning surface is the constants + authored threat-sequence factors
  in §8 only. Logic changes are propose-only.
- **Never add new die states, verb classes, tracks, or change the pressure
  formula.** Structural, not numeric.
- **The effects engine is untouchable.** All 112 effects + `applyEffect` +
  Phase 125 resolution are shared with the legacy combat and the rest of the
  game — never tune them here.
- **Preserve canonical terms** (VITAE, STANCE, the track names DoT Erosion /
  Control Saturation).
- **No emojis. No `Co-Authored-By:` trailers.** Commit style:
  `<type>(<scope>): <description>`.

## 7. Failure modes

1. **A suite fails before any change.** Stop; report the pre-existing failure.
2. **A change breaks a test (incl. the balance-sim witness).** Revert; record
   under "Considered but not applied" with the test + failure.
3. **The sim can't exercise an axis** (persistent-buff zone, mercy-exploit line,
   x-die-interaction cards — the greedy bot doesn't trigger these). Flag it;
   propose a smarter sim policy or a `npm run combat-sim` CLI (see §8 propose-
   only); do not tune around it.
4. **Focus matches nothing.** Run the full sweep; note the empty focus.

## 8. Quick reference

**Tunable surface (numeric — editable):**

| Axis | File | Constant / target |
|---|---|---|
| Default threat thresholds | `src/Combat/combat.threat.ts` | `DEFAULT_DOT_FACTOR` (0.14), `DEFAULT_CONTROL_FACTOR` (0.18), `ESCALATION` ([1, 1.2, 1.4]) × enemy HP |
| Authored threat sequences | `src/Combat/combat.threat.ts` | `AUTHORED_THREAT_SEQUENCES[id]` — per-phase `dotFactor`/`controlFactor` (weak-to-dot vs weak-to-control) + threat-action damage |
| Stance-die bag | `src/Combat/combat.dice.ts` | `COMBAT_DIE_FACES` — X frequency (2/6) + Wild frequency (1/6) |
| Free top-action pressure floor | `src/Combat/combat.engine.ts` | `TOP_ACTION_PRESSURE` (1) |
| Befriend threshold reduction | `src/Combat/combat.engine.ts` | `BEFRIEND_THRESHOLD_REDUCTION` (3) |
| Momentum carry cap | `src/Combat/combat.pressure.ts` | `MOMENTUM_CAP` (3) |

**Propose-only (structural — never auto-apply):** the `effectPressure` formula
(`combat.cards.ts`), the self-reinforcing die-refresh rule + RPS cost ladder
(`combat.engine.ts`), die states / verb classes / track count
(`combat.encounter.types.ts`), and building a `npm run combat-sim` CLI +
richer sim policies (the greedy bot under-exercises the dice economy).

**Engine + sim:**
- Engine: `src/Combat/combat.engine.ts` (driver) + `combat.{dice,deck,cards,pressure,threat}.ts`
- Sim (the witness): `simulateHazardPatternCombat` in `src/Combat/combat.encounter.sim.ts`
- Types: `src/Combat/combat.encounter.types.ts`
- Public barrel: `src/Combat/index.ts` (re-exported from root `src/index.ts`)

**Tests (witnesses):**
- Engine e2e (acceptance criteria): `src/Combat/e2e/hazard-pattern-combat.engine.test.ts`
- Balance sim guard: `src/Combat/e2e/hazard-pattern-combat.balance.sim.test.ts`
- Run targeted: `npx vitest run src/Combat/e2e/hazard-pattern-combat.balance.sim.test.ts`
- Run full: `npm test`

**Doctrine:**
- Spec: `specs/25-hazard-pattern-combat.md` · braindump:
  `braindump/2026-06-21-hazard-pattern-combat.md`
- Vision: `VISION.md` (Combat vision) · `CLAUDE.md` (load-bearing doctrine)

**Mobile witness:** `axiomancer-mobile` — `/combat-encounter` route, dev button
`debug-combat-encounter-button`, seed `globalThis.__AXM_COMBAT_SEED__`,
e2e `npm run e2e:combat`.

**Legacy:** the turn-based combat is tuned by `/legacy-combat-tuning`
(`skills/legacy-combat-tuning.md`) — do not conflate the two surfaces.
