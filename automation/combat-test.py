#!/usr/bin/env python3
"""
Automates `npm run combat` in the Axiomancer-mechanics project.
Picks a random option for each prompt and logs all output to a timestamped file.

Usage:
    python3 combat-test.py <runs> [reaction] [action] [enemy]
    python3 combat-test.py 50                 # both choices random every round
    python3 combat-test.py 50 1               # always Heart (1) for Q1, random Q2
    python3 combat-test.py 50 2               # always Body  (2) for Q1, random Q2
    python3 combat-test.py 50 3               # always Mind  (3) for Q1, random Q2
    python3 combat-test.py 50 1 1             # always Heart + always Attack
    python3 combat-test.py 50 2 2             # always Body  + always Defend
    python3 combat-test.py 50 - - sandbag     # use the high-HP training dummy
    python3 combat-test.py 50 2 1 sandbag     # always Body Attack vs Sandbag
                                              # (Spec 04b § Q5 — long combats so
                                              # skills/effects can be exercised
                                              # over many rounds)

Pass `-` for any positional slot to skip it (keep random / default).

Uses pexpect to drive a real PTY session so that inquirer renders correctly.
Two prompts alternate each round:
  Q1 "Respond with..." → 3 choices (1=heart, 2=body, 3=mind)
     last option text: "(mental)"
  Q2 "Action..."       → 2 choices (1=attack, 2=defend) — or 3 when at least
     one skill is equipped (skills slot added by Spec 04).
     last option text: ends with "defend" — we anchor on that.

By alternating which pattern we wait for, inquirer's mid-input re-renders
(which repeat the choice list) are naturally skipped.
"""

import io
import os
import random
import re
import sys
from datetime import datetime
from pathlib import Path

import pexpect

COMBAT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

""" First Choice Constants """
HEART = 1
BODY = 2
MIND = 3

""" Second Choice Constants """
ATTACK = 1
DEFEND = 2

ANSI_ESCAPE = re.compile(r'\x1b(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])')
CRLF = re.compile(r'\r\n')


def clean(text: str) -> str:
    """Strip ANSI codes and normalise CRLF → LF."""
    return ANSI_ESCAPE.sub('', CRLF.sub('\n', text))


class RawLogWriter:
    """Accumulates everything pexpect reads from the child."""

    def __init__(self) -> None:
        self._buf = io.StringIO()

    def write(self, data: str) -> None:
        self._buf.write(data)

    def flush(self) -> None:
        pass

    def getvalue(self) -> str:
        return self._buf.getvalue()


# ── Pattern constants ─────────────────────────────────────────────────────────
# Q1 last choice ends in "(mental)" — unique to the choice list
Q1_PATTERN = r'\(mental\)'
# Q2 last choice is "2) defend" — the numbering keeps it distinct from
# "defends" / "DEFEND" that can appear in combat narration text
Q2_PATTERN = r'2\) defend'


def run_one_combat(
    run_index: int,
    total: int,
    q1_choice: int | None,
    q2_choice: int | None,
    enemy_slug: str | None,
) -> str:
    """Run a single combat session and return the cleaned output string.

    q1_choice: fixed value (1/2/3) for the "Respond with..." prompt, or None for random.
    q2_choice: fixed value (1/2)   for the "Action..."        prompt, or None for random.
    enemy_slug: opponent slug (passed to the CLI via COMBAT_ENEMY), or None
                for the CLI's default ("disatree").
    """
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    raw_log = RawLogWriter()

    print(f"  [{run_index}/{total}] Starting at {timestamp} …", flush=True)

    env = {**os.environ, "COMBAT_NO_DELAY": "1"}
    if enemy_slug:
        env["COMBAT_ENEMY"] = enemy_slug
    child = pexpect.spawn(
        "npm run combat",
        cwd=COMBAT_DIR,
        encoding="utf-8",
        timeout=60,
        dimensions=(120, 50),
        env=env,
    )
    child.logfile_read = raw_log

    waiting_for_q1 = True

    while True:
        patterns = [Q1_PATTERN if waiting_for_q1 else Q2_PATTERN, pexpect.EOF, pexpect.TIMEOUT]

        try:
            idx = child.expect(patterns, timeout=60)
        except pexpect.EOF:
            break
        except Exception as exc:  # noqa: BLE001
            raw_log.write(f"\n[ERROR: {exc}]\n")
            break

        if idx == 0:
            if waiting_for_q1:
                choice = str(q1_choice if q1_choice is not None else random.randint(1, 3))
            else:
                choice = str(q2_choice if q2_choice is not None else random.randint(1, 2))
            child.sendline(choice)
            waiting_for_q1 = not waiting_for_q1
        elif idx == 1:
            break
        else:
            raw_log.write("\n[TIMEOUT — no prompt received within 60 s]\n")
            break

    child.close()
    exit_code = child.exitstatus

    output = clean(raw_log.getvalue())

    header = f"{'=' * 54}\n  Run {run_index}/{total}  —  {timestamp}\n{'=' * 54}\n\n"
    footer = f"\n{'=' * 54}\n  End of run {run_index}  (exit code: {exit_code})\n{'=' * 54}\n\n"
    return header + output + footer


Q1_NAMES = {HEART: "Heart", BODY: "Body", MIND: "Mind"}
Q2_NAMES = {ATTACK: "Attack", DEFEND: "Defend"}

# Spec 04b § Q5 — known opponent slugs recognised by the CLI's COMBAT_ENEMY
# env var. Keep this in sync with `ENEMY_REGISTRY` in
# `src/Enemy/enemy.library.ts`.
KNOWN_ENEMY_SLUGS = ("disatree", "sandbag")


def _parse_optional(value: str, parser, valid, label: str):
    if value == "-":
        return None
    try:
        parsed = parser(value)
    except ValueError:
        print(f"Error: {label} must be one of {valid} (or '-' to skip).")
        sys.exit(1)
    if parsed not in valid:
        print(f"Error: {label} must be one of {valid} (or '-' to skip).")
        sys.exit(1)
    return parsed


def main() -> None:
    if not (2 <= len(sys.argv) <= 5):
        print(
            f"Usage: python3 {Path(__file__).name} <runs> [reaction] [action] [enemy]"
        )
        print("  reaction  1=Heart  2=Body  3=Mind     (or '-' to randomise)")
        print("  action    1=Attack 2=Defend            (or '-' to randomise)")
        print(f"  enemy     one of {KNOWN_ENEMY_SLUGS} (or '-' for CLI default)")
        sys.exit(1)

    try:
        total = int(sys.argv[1])
        if total < 1:
            raise ValueError
    except ValueError:
        print("Error: <runs> must be a positive integer.")
        sys.exit(1)

    q1_choice: int | None = None
    if len(sys.argv) >= 3:
        q1_choice = _parse_optional(sys.argv[2], int, (HEART, BODY, MIND), "[reaction]")

    q2_choice: int | None = None
    if len(sys.argv) >= 4:
        q2_choice = _parse_optional(sys.argv[3], int, (ATTACK, DEFEND), "[action]")

    enemy_slug: str | None = None
    if len(sys.argv) == 5:
        if sys.argv[4] != "-":
            slug = sys.argv[4].lower()
            if slug not in KNOWN_ENEMY_SLUGS:
                print(f"Error: [enemy] must be one of {KNOWN_ENEMY_SLUGS} (or '-' for default).")
                sys.exit(1)
            enemy_slug = slug

    reaction_label = Q1_NAMES[q1_choice] if q1_choice is not None else "Random"
    action_label   = Q2_NAMES[q2_choice] if q2_choice is not None else "Random"
    enemy_label    = enemy_slug.capitalize() if enemy_slug else "Default"

    """ Saves to /automation/testing-logs/{log-file} """
    session_start = datetime.now()
    log_file = (
        Path(__file__).parent / "testing-logs"
        / f"{reaction_label}_{action_label}_{enemy_label}_{session_start.strftime('%Y-%m-%d_%H-%M')}.txt"
    )

    print(
        f"Running {total} combat session(s) — "
        f"Reaction: {reaction_label}, Action: {action_label}, Enemy: {enemy_label}. "
        f"Log → {log_file}"
    )

    with open(log_file, "w", encoding="utf-8") as fh:
        fh.write(f"{'#' * 54}\n")
        fh.write(f"  COMBAT SESSION LOG\n")
        fh.write(f"  Started  : {session_start.strftime('%Y-%m-%d %H:%M:%S')}\n")
        fh.write(f"  Runs     : {total}\n")
        fh.write(f"  Reaction : {reaction_label}\n")
        fh.write(f"  Action   : {action_label}\n")
        fh.write(f"  Enemy    : {enemy_label}\n")
        fh.write(f"{'#' * 54}\n\n")

        for i in range(1, total + 1):
            result = run_one_combat(i, total, q1_choice, q2_choice, enemy_slug)
            fh.write(result)
            fh.flush()  # write each run immediately so partial logs are readable

    session_end = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    print(f"\nAll {total} run(s) complete. Finished at {session_end}")
    print(f"Log saved to: {log_file}")


if __name__ == "__main__":
    main()
