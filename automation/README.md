# Combat CLI Automation

`combat-test.py` drives `npm run combat` through a real PTY (`pexpect`) so that
`inquirer` renders correctly. It writes each session's full output to
`automation/testing-logs/` (gitignored) so combat runs can be inspected after the fact.

## Setup

```bash
pip3 install pexpect
```

## Usage

```bash
npm run combat:auto -- <runs> [stance] [action]
# or directly:
python3 automation/combat-test.py <runs> [stance] [action]
```

| Argument | Required | Values | Default |
|----------|----------|--------|---------|
| `<runs>` | yes | positive integer | — |
| `[stance]` | no | `1` Heart, `2` Body, `3` Mind | random |
| `[action]` | no | `1` Attack, `2` Defend | random |

Examples:

```bash
npm run combat:auto -- 50          # 50 runs, both choices random
npm run combat:auto -- 50 1        # 50 runs, always Heart, random action
npm run combat:auto -- 50 2 2      # 50 runs, always Body + Defend
npm run combat:auto -- 10 3 1      # 10 runs, always Mind + Attack
```

`COMBAT_NO_DELAY=1` is set automatically by the script so animation delays do not
inflate run time.

## Logs

Each invocation writes one file per run to `automation/testing-logs/` named
`<timestamp>-run-<n>.txt`. ANSI escapes are stripped and CRLFs normalised to LFs so
the logs are diff-friendly.

## Pending (`specs/11-rng-seeding-and-test-harness.md`)

- RNG seed parameter (so a specific run can be deterministically replayed).
- Full active-effect dump per round.
- Pre-defined input scripts for regression-testing specific interactions.
- Assertion layer flagging runs where damage / effect math deviates from spec.
