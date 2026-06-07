# Skill: mechanics-tuning

> **High autonomy within hard guardrails.** Run the character × playstyle ×
> enemy balance matrix, A/B-test numeric changes, and deliver results on two
> tracks: the data report goes to `main`, the suggestions + auto-applied
> winners go to a new branch + PR.

## 1. Purpose

`/mechanics-tuning` is the self-improving balance loop. It drives `npm run tune`
(the `src/Tuning/` engine), reads the generated logs, optionally consults the
`balance-analyst` subagent for richer recommendations, and ships the outcome.
It exists so balance work is evidence-driven and reproducible instead of
hand-waved.

It does NOT reimplement combat or invent metrics — the engine and the existing
playtest harness do that. The skill is the orchestrator + the delivery layer.

## 2. Invocation

```
/mechanics-tuning
/mechanics-tuning --focus="new status effects since April"
/mechanics-tuning --focus="early-game enemy balance" --runs=50
/loop 6h /mechanics-tuning            # periodic autonomous tuning
```

Arguments are forwarded to `npm run tune` (`--focus`, `--runs`, `--levels`,
`--playstyles`, `--difficulties`, `--use-api`, `--max-iterations`).

## 3. Autonomy contract

- **Numeric-only, capped, reviewed.** The engine can only change values in the
  tunable registry (`src/Tuning/tunable.registry.ts`), each ±25%/run, and only
  keeps a change that improves matrix health, is not a regression, and passes
  `npm run verify`. Structural/schema/logic ideas are propose-only.
- **Two delivery tracks (never blur them).** The data report (facts) lands on
  `main`. The suggestions writeup + the auto-applied winners ride a PR branch.
- **Ambiguity → ask.** If a focus is unclear or a propose-only idea looks
  architecturally significant, surface it; don't guess.

## 4. The procedure

### Step 0 — Sync & sanity
- Ensure a clean working tree. Note the base branch (usually `main`).
- `npm ci` if `node_modules` is absent.

### Step 1 — Run the matrix + A/B
- Run: `npm run tune -- --focus="<focus>" <other flags>`
  (omit `--dry-run`; we want winners applied to the working tree).
- The CLI prints a final `[tune] RESULT { ... }` JSON line. Capture from it:
  `dataReport`, `dataReportJson`, `suggestions` (paths) and `keptChanges`.
- The CLI leaves: edited tunable file(s) for kept winners (working tree),
  the two report artifacts under `automation/playtest/reports/`, and an updated
  `automation/playtest/strategist-knowledge.json`.

### Step 2 — Consult the balance-analyst (offline enrichment)
- Spawn the `balance-analyst` subagent, pointing it at the data report JSON and
  any `automation/playtest/tuning/<run-id>/` artifacts.
- It returns structured Markdown (auto-apply candidates already covered by the
  engine + propose-only structural ideas). Append its "Propose-only" section to
  the suggestions file so a human reviewer sees the richer reasoning.
- Do NOT have the subagent write code — it returns analysis only.

### Step 3 — Track 1: data report → `main`
- Stage ONLY the data artifacts and learning state (NOT the winner edits):
  `git add automation/playtest/reports/tuning-<ts>.md
   automation/playtest/reports/tuning-<ts>.json
   automation/playtest/strategist-knowledge.json`
- Commit: `docs(balance): tuning data report <ts>`
- Push to `main`: `git push origin HEAD:main`
  (In CI the checkout is `main`; locally, confirm you're on / targeting `main`.)

### Step 4 — Track 2: suggestions + winners → PR
- Create a branch: `git checkout -b balance/tuning-<ts>` (carries the still-
  unstaged winner edits + the suggestions file across).
- Stage the winner-edited tunable files and the suggestions writeup:
  `git add <changed tunable files> automation/playtest/reports/suggestions-<ts>.md`
- Commit: `fix(balance): apply A/B winners + suggestions <ts>`
- Push and open a PR (ready for review, not draft):
  - Title: `balance: tuning <ts> (<n> auto-applied)`
  - Body: list each kept change (`param: old → new`), a one-line *why*, and a
    link/reference to the data report committed on `main`. Add the propose-only
    section for human follow-up.
- If there are **no kept winners**, still open the PR carrying just the
  suggestions writeup (propose-only recommendations) so the findings are
  reviewable. If there is genuinely nothing to suggest, skip the PR and say so.

### Step 5 — Report back
- One concise message: data-report commit on `main`, the PR URL, and the
  headline health delta. If `/loop`-invoked and a focus rotation is desired,
  proceed to the next focus; otherwise stop.

## 5. Hard rules

- **Never push code/balance changes directly to `main`.** Only the data report
  (+ learning state) lands on `main`. Winners go through the PR.
- **Never auto-merge the suggestions PR.** A human approves it.
- **Never bypass the verify gate.** The engine already gates kept winners on
  `npm run verify`; do not commit a winner that did not pass.
- **Never edit `src/index.ts`, public types, or core formulas.** The applier
  denylist enforces this; don't work around it.
- **No emojis. No `Co-Authored-By:` trailers.** Commit style:
  `<type>(<scope>): <one-line>`.

## 6. Failure modes

1. **`npm run tune` fails / no `RESULT` line.** Read stderr; if it's a content
   bug (e.g. a new enemy/skill referencing a missing id), fix the root cause or
   report it — do not ship a partial run.
2. **No candidate improved health.** Normal. Push the data report to `main`;
   open a propose-only PR (or skip per Step 4) and say the matrix is in band.
3. **Verify fails on a winner.** The engine already reverted it; it appears
   under "Considered but not applied". No action needed.
4. **Focus matches nothing.** The matrix still runs at baseline; note that the
   focus filter was empty and suggest a broader focus.

## 7. Quick reference

- Engine: `src/Tuning/` · CLI: `npm run tune` · registry:
  `src/Tuning/tunable.registry.ts`
- Artifacts: `automation/playtest/reports/{tuning,suggestions}-<ts>.*`
- Learning state: `automation/playtest/strategist-knowledge.json`
- Subagent: `.claude/agents/balance-analyst.md`
- CI: `.github/workflows/mechanics-tuning.yml` (manual `workflow_dispatch`)
