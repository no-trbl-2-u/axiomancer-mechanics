# Philosophy — 3-axis alignment cube (Phase 42)

> Source-of-truth content: `PhilosAxiosDoc.pdf` at the repo root.
> Engine module: `src/Philosophy/`. Reducer wiring: `src/Game/`.

The philosophical-alignment system encodes a character's position on
three orthogonal axes drawn from `PhilosAxiosDoc.pdf`. Each axis is
an integer in `[-100, +100]`. The current `(low | mid | high)` bucket
triple indexes one of 27 cells in `philosophicalAlignmentLibrary`,
each carrying a representative philosopher, a literary character with
their source work, and three signature logical fallacies.

The system is **orthogonal** to `moralMeter` — see
[Relationship to `moralMeter`](#relationship-to-moralmeter) below.

## The three axes

| Axis | low | mid | high |
|---|---|---|---|
| `epistemology` | Faith | Agnostic | Logic |
| `outlook`      | Pessimistic | Neutral | Optimistic |
| `scope`        | Individual | Relational | Transcendent |

Polarity is chosen so the "more grounded in reason" / "more
hopeful" / "larger scope" ends land at the positive pole. The PDF
display order (Logic first, Optimistic first, Individual first) is
listing convention, not axis polarity — the engine uses the table
above.

## Bucketing

`bucketAxis(value: number): 'low' | 'mid' | 'high'`:

| Value range | Bucket |
|---|---|
| `value <= -34` | `'low'` |
| `-33 <= value <= 33` | `'mid'` |
| `value >= 34` | `'high'` |

Boundary values `±34` land in `'high'` / `'low'`; `±33` and below
(in absolute value) stay in `'mid'`. Three equal-width zones across
`[-100, +100]`.

Thresholds are exposed as `AXIS_HIGH_THRESHOLD` (`34`) and
`AXIS_LOW_THRESHOLD` (`-34`).

## Engine API

All exports are surfaced through `src/index.ts`:

- `bucketAxis(value: number): AxisBucket`
- `getAlignmentCell(alignment: PhilosophicalAlignment): PhilosophicalAlignmentCell`
  — buckets each axis and looks up the cell in the 27-cell registry.
  Throws if the resulting triple isn't in the library (invariant:
  the library is exhaustive — 27 entries cover every triple).
- `applyAlignmentDelta(current, delta): PhilosophicalAlignment` —
  pure shift; missing axes in `delta` pass through; each axis clamps
  to `[-100, +100]`.
- `defaultAlignment(): PhilosophicalAlignment` — `{0, 0, 0}` (the
  dead-centre Agnostic-Neutral-Relational / Buber cell).
- `philosophicalAlignmentLibrary: readonly PhilosophicalAlignmentCell[]`
  — frozen, length 27.

State + reducer:

- `GameState.philosophicalAlignment: PhilosophicalAlignment` (added
  in Phase 42; `GAME_STATE_VERSION` 4 → 5).
- `SHIFT_PHILOSOPHICAL_ALIGNMENT` action (`{ delta: Partial<PhilosophicalAlignment> }`).
- Store action `shiftPhilosophicalAlignment(delta)` mirrors
  `shiftMoralMeter(delta, gating?)`.

Save migration: `migrateV4toV5` defaults the field to `{0, 0, 0}` on
legacy saves (`src/Game/game.migrate.ts`).

## The 27 cells

PDF cell numbers in parens; ids are kebab-case
`<epistemology>-<outlook>-<scope>`.

| # | Cell | Philosopher | Literary character |
|---|---|---|---|
| 1 | `logic-optimistic-individual` | Friedrich Nietzsche (late period) | Prometheus — *Prometheus Unbound* |
| 2 | `logic-optimistic-relational` | Peter Singer | Dr. Rieux — *The Plague* |
| 3 | `logic-optimistic-transcendent` | Teilhard de Chardin | Elwin Ransom — *Perelandra* |
| 4 | `logic-mid-individual` | Albert Camus | Meursault — *The Stranger* |
| 5 | `logic-mid-relational` | Simone de Beauvoir | Jane Eyre — *Jane Eyre* |
| 6 | `logic-mid-transcendent` | Baruch Spinoza | The Narrator — *The Library of Babel* |
| 7 | `logic-pessimistic-individual` | Arthur Schopenhauer | Underground Man — *Notes from Underground* |
| 8 | `logic-pessimistic-relational` | Thomas Ligotti | Rust Cohle — *True Detective* S1 |
| 9 | `logic-pessimistic-transcendent` | Gnostics / Hans Jonas | Severian — *Book of the New Sun* |
| 10 | `mid-optimistic-individual` | Richard Rorty | Huckleberry Finn — *Adventures of Huckleberry Finn* |
| 11 | `mid-optimistic-relational` | John Dewey | Atticus Finch — *To Kill a Mockingbird* |
| 12 | `mid-optimistic-transcendent` | William James | Pi Patel — *Life of Pi* |
| 13 | `mid-mid-individual` | Michel de Montaigne | Ishmael — *Moby-Dick* |
| 14 | `mid-mid-relational` | Martin Buber | Nick Carraway — *The Great Gatsby* |
| 15 | `mid-mid-transcendent` | Lao Tzu / Zhuangzi (Taoism) | Siddhartha — *Siddhartha* |
| 16 | `mid-pessimistic-individual` | Emil Cioran | Hamlet — *Hamlet* |
| 17 | `mid-pessimistic-relational` | Peter Wessel Zapffe | Captain Ahab — *Moby-Dick* |
| 18 | `mid-pessimistic-transcendent` | H.P. Lovecraft (cosmicism) | Burroughs — *A Short Stay in Hell* |
| 19 | `faith-optimistic-individual` | Søren Kierkegaard | Alyosha Karamazov — *The Brothers Karamazov* |
| 20 | `faith-optimistic-relational` | Desmond Tutu / Ubuntu theology | Jean Valjean — *Les Misérables* |
| 21 | `faith-optimistic-transcendent` | St. Augustine / Thomas Aquinas | Dante — *Divine Comedy* |
| 22 | `faith-mid-individual` | Blaise Pascal | Raskolnikov — *Crime and Punishment* |
| 23 | `faith-mid-relational` | Dorothy Day / Catholic Worker Movement | Father Damien (historical) |
| 24 | `faith-mid-transcendent` | St. John of the Cross / Mystical Theology | Father Rodrigues — *Silence* |
| 25 | `faith-pessimistic-individual` | Tertullian | Ivan Karamazov — *The Brothers Karamazov* |
| 26 | `faith-pessimistic-relational` | Philipp Mainländer | Father Ferreira — *Silence* |
| 27 | `faith-pessimistic-transcendent` | Marcion / Gnostic Christianity | The Grand Inquisitor — *The Brothers Karamazov* |

## Fallacies — content fuel for future content

Each cell carries three signature logical fallacies (name, example,
rationale). They ship as data but are not wired to gameplay yet.
Per the PDF's closing line ("This complete system gives you 27
distinct philosophical positions, each with a representative
philosopher, literary character, and three characteristic logical
fallacies that could serve as 'spells' or abilities in your RPG
system"), the fallacies are reserved as content fuel for a future
skill/effect/spell phase. See `plan/phases/phase_42_philosophical_alignment.md`
"Follow-ups" for the planned content arcs.

## Relationship to `moralMeter`

`philosophicalAlignment` is **orthogonal** to
[`moralMeter`](./morality.md), not a replacement. Spec 10 Q4 keeps
the meter narrative-only (a single compassion ↔ ruthlessness
integer), and the PDF's three axes don't collapse onto that
dimension. Both fields persist independently; both are surfaced on
the CLI Character tab; both are read by save / load.

A future phase may unify the two systems (e.g. reskin `moralMeter`
as a fourth "ethics" axis or absorb it into `scope`), but that's an
explicit follow-up — Phase 42 ships them side-by-side. The
authoring sweep that retro-wires alignment shifts into existing map
events / dialogue is also a separate follow-up.

## CLI surface

The Character tab (`npm run game` → Character) renders the active
cell on every visit:

```
Philosophical alignment:
  Cell:         Agnostic-Neutral-Relational
  Philosopher:  Martin Buber
  Character:    Nick Carraway — Fitzgerald's "The Great Gatsby"
  Epistemology: mid (0)
  Outlook:      mid (0)
  Scope:        mid (0)
```

The bucket label + raw integer pair lets the agent-graded harness
(`automation/agent-e2e.mjs`) extract numerics without parsing the
prose label.
