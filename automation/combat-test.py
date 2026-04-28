#!/usr/bin/env python3
"""
Automates `npm run combat` in the Axiomancer-mechanics project.

USAGE
=====
    python3 combat-test.py <runs> [reaction] [action] [--seed N] [--script PATH] [--assert PATH]

EXAMPLES
--------
    python3 combat-test.py 50                  # 50 random runs
    python3 combat-test.py 10 1                # 10 runs, always Heart for stance, random action
    python3 combat-test.py 5 1 1 --seed 42     # deterministic Heart-Attack runs
    python3 combat-test.py 1 --script scripts/mind-mark.txt
    python3 combat-test.py 1 --script scripts/mind-mark.txt --assert assertions/mind-mark.json

FEATURES
========

  RNG seed (--seed)
    Sets process.env.AXIOMANCER_SEED so the combat CLI installs a
    deterministic Mulberry32 PRNG over Math.random. Replays the same
    rolls / AI choices every time.

  Scripted action sequences (--script PATH)
    Plain-text file with one round-pair per line in the format:
        <stance>,<action>
    where stance is heart|body|mind (or 1|2|3) and action is
    attack|defend (or 1|2). Lines starting with '#' are comments.
    The harness sends those choices in order, then loops.

  Assertion layer (--assert PATH)
    A JSON file with shape:
        {
          "expected_substrings": [...],   # all must appear in the run output
          "expected_no_substrings": [...] # none may appear
        }
    Failures are printed and `exit 2` is returned so CI can pick them up.

LOG OUTPUT
==========

Logs are saved to automation/testing-logs/<reaction>_<action>_<ts>.txt.
Active-effect state dumps are surfaced naturally via the CLI's existing
'Active Effects' panel — they appear in the saved log with no extra
flags required.
"""

from __future__ import annotations

import argparse
import io
import json
import os
import random
import re
import sys
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path

import pexpect

# ── Path config ──────────────────────────────────────────────────────────────
COMBAT_DIR = str(Path(__file__).resolve().parent.parent)


# ── Choice constants ────────────────────────────────────────────────────────
HEART, BODY, MIND = 1, 2, 3
ATTACK, DEFEND = 1, 2

STANCE_NAME_TO_INT = {"heart": HEART, "body": BODY, "mind": MIND}
ACTION_NAME_TO_INT = {"attack": ATTACK, "defend": DEFEND}

Q1_NAMES = {HEART: "Heart", BODY: "Body", MIND: "Mind"}
Q2_NAMES = {ATTACK: "Attack", DEFEND: "Defend"}

ANSI_ESCAPE = re.compile(r"\x1b(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])")
CRLF = re.compile(r"\r\n")


def clean(text: str) -> str:
    """Strip ANSI codes and normalise CRLF → LF."""
    return ANSI_ESCAPE.sub("", CRLF.sub("\n", text))


# ── pexpect patterns ────────────────────────────────────────────────────────
Q1_PATTERN = r"\(mental\)"            # last entry of stance prompt
Q2_PATTERN = r"\(Phase 4 — coming soon\)"  # last entry of action prompt (with placeholders)
Q2_LEGACY_PATTERN = r"2\) defend"     # fallback for older CLI


# ── Scripted-action loader ──────────────────────────────────────────────────
@dataclass
class ScriptedSequence:
    pairs: list[tuple[int, int]] = field(default_factory=list)

    def at(self, round_idx: int) -> tuple[int, int]:
        if not self.pairs:
            return (0, 0)
        return self.pairs[round_idx % len(self.pairs)]


def load_script(path: Path) -> ScriptedSequence:
    seq = ScriptedSequence()
    for line_no, raw in enumerate(path.read_text(encoding="utf-8").splitlines(), 1):
        line = raw.strip()
        if not line or line.startswith("#"):
            continue
        parts = [p.strip().lower() for p in line.split(",")]
        if len(parts) != 2:
            raise ValueError(f"{path}:{line_no}: expected 'stance,action', got {raw!r}")
        stance_raw, action_raw = parts
        stance = STANCE_NAME_TO_INT.get(stance_raw)
        if stance is None and stance_raw in {"1", "2", "3"}:
            stance = int(stance_raw)
        action = ACTION_NAME_TO_INT.get(action_raw)
        if action is None and action_raw in {"1", "2"}:
            action = int(action_raw)
        if stance is None or action is None:
            raise ValueError(f"{path}:{line_no}: invalid stance/action ({raw!r})")
        seq.pairs.append((stance, action))
    if not seq.pairs:
        raise ValueError(f"{path}: no scripted action pairs found")
    return seq


# ── Assertion loader ────────────────────────────────────────────────────────
@dataclass
class Assertions:
    expected_substrings: list[str] = field(default_factory=list)
    expected_no_substrings: list[str] = field(default_factory=list)


def load_assertions(path: Path) -> Assertions:
    data = json.loads(path.read_text(encoding="utf-8"))
    return Assertions(
        expected_substrings=list(data.get("expected_substrings", [])),
        expected_no_substrings=list(data.get("expected_no_substrings", [])),
    )


def evaluate_assertions(output: str, asserts: Assertions) -> list[str]:
    failures: list[str] = []
    for s in asserts.expected_substrings:
        if s not in output:
            failures.append(f"missing expected substring: {s!r}")
    for s in asserts.expected_no_substrings:
        if s in output:
            failures.append(f"unexpected substring present: {s!r}")
    return failures


# ── Log writer ──────────────────────────────────────────────────────────────
class RawLogWriter:
    def __init__(self) -> None:
        self._buf = io.StringIO()
    def write(self, data: str) -> None: self._buf.write(data)
    def flush(self) -> None: pass
    def getvalue(self) -> str: return self._buf.getvalue()


# ── Single-run driver ───────────────────────────────────────────────────────
def run_one_combat(
    run_index: int,
    total: int,
    q1_choice: int | None,
    q2_choice: int | None,
    seed: int | None,
    script: ScriptedSequence | None,
) -> str:
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    raw_log = RawLogWriter()

    print(f"  [{run_index}/{total}] Starting at {timestamp} …", flush=True)

    env = {**os.environ, "COMBAT_NO_DELAY": "1"}
    if seed is not None:
        env["AXIOMANCER_SEED"] = str(seed)

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
    round_idx = 0

    while True:
        patterns = [
            Q1_PATTERN if waiting_for_q1 else Q2_PATTERN,
            Q2_LEGACY_PATTERN,
            pexpect.EOF,
            pexpect.TIMEOUT,
        ]
        try:
            idx = child.expect(patterns, timeout=60)
        except pexpect.EOF:
            break
        except Exception as exc:
            raw_log.write(f"\n[ERROR: {exc}]\n")
            break

        if idx in (0, 1):
            if waiting_for_q1:
                if script:
                    choice = str(script.at(round_idx)[0])
                else:
                    choice = str(q1_choice if q1_choice is not None else random.randint(1, 3))
            else:
                if script:
                    choice = str(script.at(round_idx)[1])
                    round_idx += 1
                else:
                    choice = str(q2_choice if q2_choice is not None else random.randint(1, 2))
            child.sendline(choice)
            waiting_for_q1 = not waiting_for_q1
        elif idx == 2:
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


# ── CLI ─────────────────────────────────────────────────────────────────────
def parse_args(argv: list[str]) -> argparse.Namespace:
    p = argparse.ArgumentParser(description="Axiomancer combat CLI automation harness.")
    p.add_argument("runs", type=int, help="number of combat sessions to run")
    p.add_argument("reaction", type=int, nargs="?", default=None, help="1=Heart, 2=Body, 3=Mind (random if omitted)")
    p.add_argument("action", type=int, nargs="?", default=None, help="1=Attack, 2=Defend (random if omitted)")
    p.add_argument("--seed", type=int, default=None, help="Deterministic RNG seed for the combat CLI.")
    p.add_argument("--script", type=Path, default=None, help="Path to a scripted action sequence file.")
    p.add_argument("--assert", dest="assert_path", type=Path, default=None, help="Path to a JSON assertion file.")
    return p.parse_args(argv)


def main() -> None:
    ns = parse_args(sys.argv[1:])

    if ns.runs < 1:
        print("Error: <runs> must be a positive integer.")
        sys.exit(1)

    q1_choice = ns.reaction
    q2_choice = ns.action
    if q1_choice is not None and q1_choice not in (HEART, BODY, MIND):
        print("Error: [reaction] must be 1, 2, or 3.")
        sys.exit(1)
    if q2_choice is not None and q2_choice not in (ATTACK, DEFEND):
        print("Error: [action] must be 1 or 2.")
        sys.exit(1)

    script: ScriptedSequence | None = load_script(ns.script) if ns.script else None
    assertions: Assertions | None = load_assertions(ns.assert_path) if ns.assert_path else None

    reaction_label = Q1_NAMES[q1_choice] if q1_choice is not None else ("Scripted" if script else "Random")
    action_label = Q2_NAMES[q2_choice] if q2_choice is not None else ("Scripted" if script else "Random")

    session_start = datetime.now()
    log_dir = Path(__file__).parent / "testing-logs"
    log_dir.mkdir(exist_ok=True)
    log_file = log_dir / f"{reaction_label}_{action_label}_{session_start.strftime('%Y-%m-%d_%H-%M')}.txt"

    print(f"Running {ns.runs} combat session(s) — Reaction: {reaction_label}, Action: {action_label}.")
    if ns.seed is not None:
        print(f"  Seed     : {ns.seed}")
    if script:
        print(f"  Script   : {ns.script} ({len(script.pairs)} pairs)")
    if assertions:
        print(f"  Asserts  : {ns.assert_path}")
    print(f"  Log →    : {log_file}")

    failed_runs = 0

    with open(log_file, "w", encoding="utf-8") as fh:
        fh.write(f"{'#' * 54}\n")
        fh.write(f"  COMBAT SESSION LOG\n")
        fh.write(f"  Started  : {session_start.strftime('%Y-%m-%d %H:%M:%S')}\n")
        fh.write(f"  Runs     : {ns.runs}\n")
        fh.write(f"  Reaction : {reaction_label}\n")
        fh.write(f"  Action   : {action_label}\n")
        if ns.seed is not None:
            fh.write(f"  Seed     : {ns.seed}\n")
        if script:
            fh.write(f"  Script   : {ns.script}\n")
        fh.write(f"{'#' * 54}\n\n")

        for i in range(1, ns.runs + 1):
            result = run_one_combat(i, ns.runs, q1_choice, q2_choice, ns.seed, script)
            fh.write(result)
            fh.flush()

            if assertions is not None:
                failures = evaluate_assertions(result, assertions)
                if failures:
                    failed_runs += 1
                    print(f"  Run {i}: FAILED")
                    for f in failures:
                        print(f"    - {f}")
                    fh.write(f"\n[ASSERTIONS] {len(failures)} failure(s):\n")
                    for f in failures:
                        fh.write(f"  - {f}\n")
                    fh.write("\n")

    session_end = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    print(f"\nAll {ns.runs} run(s) complete. Finished at {session_end}")
    print(f"Log saved to: {log_file}")

    if failed_runs > 0:
        print(f"Assertion failures in {failed_runs}/{ns.runs} run(s).")
        sys.exit(2)


if __name__ == "__main__":
    main()
