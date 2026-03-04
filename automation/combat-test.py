#!/usr/bin/env python3
"""
Automates `npm run combat` in the Axiomancer-mechanics project.
Picks a random option for each prompt and logs all output to a timestamped file.

Usage:
    python3 run_combat.py <runs> [reaction] [action]
    python3 run_combat.py 50          # 50 runs, both choices random every round
    python3 run_combat.py 50 1        # 50 runs, always Heart (1) for Q1, random Q2
    python3 run_combat.py 50 2        # 50 runs, always Body  (2) for Q1, random Q2
    python3 run_combat.py 50 3        # 50 runs, always Mind  (3) for Q1, random Q2
    python3 run_combat.py 50 1 1      # 50 runs, always Heart + always Attack
    python3 run_combat.py 50 2 2      # 50 runs, always Body  + always Defend

Uses pexpect to drive a real PTY session so that inquirer renders correctly.
Two prompts alternate each round:
  Q1 "Respond with..." → 3 choices (1=heart, 2=body, 3=mind)
     last option text: "(mental)"
  Q2 "Action..."       → 2 choices (1=attack, 2=defend)
     last option text: "2) defend"

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

COMBAT_DIR = "/home/pn143/Workspace/axiomancer-mechanics"

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


def run_one_combat(run_index: int, total: int, q1_choice: int | None, q2_choice: int | None) -> str:
    """Run a single combat session and return the cleaned output string.

    q1_choice: fixed value (1/2/3) for the "Respond with..." prompt, or None for random.
    q2_choice: fixed value (1/2)   for the "Action..."        prompt, or None for random.
    """
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    raw_log = RawLogWriter()

    print(f"  [{run_index}/{total}] Starting at {timestamp} …", flush=True)

    env = {**os.environ, "COMBAT_NO_DELAY": "1"}
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


def main() -> None:
    if not (2 <= len(sys.argv) <= 4):
        print(f"Usage: python3 {Path(__file__).name} <runs> [reaction] [action]")
        print(f"  reaction  1=Heart  2=Body  3=Mind   (omit for random)")
        print(f"  action    1=Attack 2=Defend          (omit for random)")
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
        try:
            q1_choice = int(sys.argv[2])
            if q1_choice not in (HEART, BODY, MIND):
                raise ValueError
        except ValueError:
            print("Error: [reaction] must be 1 (Heart), 2 (Body), or 3 (Mind).")
            sys.exit(1)

    q2_choice: int | None = None
    if len(sys.argv) == 4:
        try:
            q2_choice = int(sys.argv[3])
            if q2_choice not in (ATTACK, DEFEND):
                raise ValueError
        except ValueError:
            print("Error: [action] must be 1 (Attack) or 2 (Defend).")
            sys.exit(1)

    reaction_label = Q1_NAMES[q1_choice] if q1_choice is not None else "Random"
    action_label   = Q2_NAMES[q2_choice] if q2_choice is not None else "Random"

    """ Saves to /automation/combat-logs/{log-file} """
    session_start = datetime.now()
    log_file = (
        Path(__file__).parent / "testing-logs"
        # Path(__file__).parent
        / f"{reaction_label}_{action_label}_{session_start.strftime('%Y-%m-%d_%H-%M')}.txt"
    )

    print(f"Running {total} combat session(s) — Reaction: {reaction_label}, Action: {action_label}. Log → {log_file}")

    with open(log_file, "w", encoding="utf-8") as fh:
        fh.write(f"{'#' * 54}\n")
        fh.write(f"  COMBAT SESSION LOG\n")
        fh.write(f"  Started  : {session_start.strftime('%Y-%m-%d %H:%M:%S')}\n")
        fh.write(f"  Runs     : {total}\n")
        fh.write(f"  Reaction : {reaction_label}\n")
        fh.write(f"  Action   : {action_label}\n")
        fh.write(f"{'#' * 54}\n\n")

        for i in range(1, total + 1):
            result = run_one_combat(i, total, q1_choice, q2_choice)
            fh.write(result)
            fh.flush()  # write each run immediately so partial logs are readable

    session_end = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    print(f"\nAll {total} run(s) complete. Finished at {session_end}")
    print(f"Log saved to: {log_file}")


if __name__ == "__main__":
    main()
