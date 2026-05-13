# Skill: march

> **Outer dispatcher.** Reads project state and delegates to one
> of the shipping skills. Designed for `/loop`. The
> autonomous-beast entry point.

## 1. Purpose

`/loop /march` is the autonomous-beast mode. It picks the
right-thing-to-do every tick:

```
unlabeled GitHub issues exist      →  /triage
ELSE critique due (rate-lim)       →  /critique
ELSE pending phase                 →  /ship-a-phase
ELSE expand due + bold posture     →  /expand
ELSE                               →  /iterate
```

No `/ship-data` — data layer is `none` for this project.

## 2. Invocation

```
/march                      # one tick: dispatch + execute
/loop 30m /march            # autonomous loop, every 30 min
/loop /march                # self-paced autonomous loop
```

## 3. Procedure

### Step 0 — Sync

```bash
git pull --ff-only
```

If divergence, stop per §5.

### Step 1 — Triage gate (cheapest check)

```bash
export GH_TOKEN=$(awk -F= '/^GH_TOKEN=/ {sub(/^GH_TOKEN=/, ""); print; exit}' .env 2>/dev/null)
GH_REPO="no-trbl-2-u/axiomancer-mechanics"

unlabeled=$(gh issue list --repo "$GH_REPO" --state open \
  --search "-label:triage:loop-queued -label:triage:needs-user -label:triage:closed -label:triage:reviewed -label:loop:opened" \
  --json number --jq 'length' 2>/dev/null || echo 0)
```

If `unlabeled > 0`:
- Read `skills/triage.md`, execute, return.

If `gh` not installed or `GH_TOKEN` missing: log warning, fall through.

### Step 2 — Critique gate (rate-limited)

Read metadata header at top of `plan/CRITIQUE.md`:
```
> Last pass: <ISO-date> at commit <sha>
> Pass count: <N>
```

Dispatch to `/critique` if **all three** hold:
1. Current commit is ≥12 commits after `Last pass`, OR `Last pass` > 24h
   ago, OR `Last pass` is "never" and at least Phase 09 has shipped.
2. `npm run deploy:check` exits 0.
3. No pending HIGH critique already queued for iterate.

If all three: read `skills/critique.md`, execute, return.

Otherwise fall through.

### Step 3 — Dispatch (first match wins)

#### 3a. Pending phase?

Open `plan/steps/01_build_plan.md`. If any `[ ]` row in the Status block:
- Read `skills/ship-a-phase.md`, execute, return.

#### 3b. No data layer

Skip — data layer is `none`.

#### 3c. Expand due?

Read `plan/bearings.md` "Plan expansion posture". If **strict**, skip to 3d.

Check `plan/PHASE_CANDIDATES.md` metadata. Dispatch to `/expand` if:
1. Posture is bold or autonomous.
2. ≥20 commits since `Last pass`, OR >48h since `Last pass`, OR `Last pass`
   is "never" and ≥3 phases have shipped.
3. At least one signal: AUDIT.md has Pending rows, OR CRITIQUE.md has
   Pending rows, OR `Knowledge-Gaps.md` / `braindump/` have actionable items.

If conditions met: read `skills/expand.md`, execute, return.

#### 3d. Else — iterate

Read `skills/iterate.md`, execute, return.

### Step 4 — Done

Return cleanly. Next loop tick re-dispatches.

## 4. Hand-off honesty

When dispatching into a child skill, **fully adopt its contract**. Hard
rules, failure modes, commit conventions, verify gate. `/march` doesn't
add rules; it inherits.

## 5. Failure modes

1. **`git pull` divergence** — stop.
2. **State files corrupted or missing** (build plan, AUDIT, CRITIQUE) —
   stop and report.

## 6. Quick reference

```bash
# State files
plan/steps/01_build_plan.md        # pending phases
plan/CRITIQUE.md                   # critique queue + last-pass metadata
plan/PHASE_CANDIDATES.md           # expand queue + last-pass metadata

# External signals
gh issue list ...                  # unlabeled count
npm run deploy:check               # green-deploy condition (exit 0 = green)

# Skills it dispatches into
skills/triage.md                   # Step 1
skills/critique.md                 # Step 2
skills/ship-a-phase.md             # Step 3a
skills/expand.md                   # Step 3c
skills/iterate.md                  # Step 3d
```
