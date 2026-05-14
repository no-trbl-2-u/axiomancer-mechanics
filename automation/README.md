# Combat CLI Automation

`combat-test.py` drives `npm run combat` through a real PTY (`pexpect`) so that
`inquirer` renders correctly. It writes each session's full output to
`automation/testing-logs/` (gitignored) so combat runs can be inspected after the fact.

## Setup

```bash
pip3 install pexpect
```

## Usage

### Random Testing Mode

```bash
npm run combat:auto -- <runs> [stance] [action] [enemy]
# or directly:
python3 automation/combat-test.py <runs> [stance] [action] [enemy]
```

| Argument | Required | Values | Default |
|----------|----------|--------|---------|
| `<runs>` | yes | positive integer | — |
| `[stance]` | no | `1` Heart, `2` Body, `3` Mind | random |
| `[action]` | no | `1` Attack, `2` Defend | random |
| `[enemy]` | no | enemy slug or `-` | default |

Examples:

```bash
npm run combat:auto -- 50          # 50 runs, both choices random
npm run combat:auto -- 50 1        # 50 runs, always Heart, random action
npm run combat:auto -- 50 2 2      # 50 runs, always Body + Defend
npm run combat:auto -- 10 3 1      # 10 runs, always Mind + Attack
```

### Script Testing Mode

```bash
python3 automation/combat-test.py --script <path> [--seed <seed>]
```

| Argument | Required | Description |
|----------|----------|-------------|
| `--script <path>` | yes | JSON script file with actions and expectations |
| `--seed <seed>` | no | RNG seed for deterministic runs |

Examples:

```bash
python3 automation/combat-test.py --script scripts/mind-mark-stack.json
python3 automation/combat-test.py --script scripts/ad-baculum-clear.json --seed deterministic_001
```

## Script Format

Scripts are JSON files with predefined actions and expectations:

```json
{
    "seed": "test_001",
    "actions": ["mind", "attack", "mind", "attack"],
    "expectations": [
        "EXPECT effect tier1_mind_mark intensity == 2"
    ]
}
```

## Seeded RNG

The combat CLI now supports deterministic runs:

```bash
npm run combat -- --seed=my_seed_value
```

Two runs with the same seed produce identical combat transcripts. Use `COMBAT_DEBUG=1` to enable effect state dumps for test verification:

```bash
COMBAT_DEBUG=1 npm run combat -- --seed=test_123
```

## Logs

Each invocation writes one file per run to `automation/testing-logs/` named
`<timestamp>-run-<n>.txt`. ANSI escapes are stripped and CRLFs normalised to LFs so
the logs are diff-friendly.
