# AGENTS.md

## Cursor Cloud specific instructions

### Project overview

Axiomancer Mechanics is a TypeScript TTRPG game engine (Node.js CLI). No databases, servers, or containers required. See `README.md` for architecture docs.

### Key commands

All commands are in `package.json`:

| Task | Command |
|---|---|
| Build | `npm run build` |
| Type-check | `npm run type-check` |
| Test | `npm test` (vitest) |
| Lint | `npm run lint` |
| Lint + type-check | `npm run check` |
| Combat CLI | `npm run combat` |
| Character CLI | `npm run character` |
| Automated combat test | `npm run combat:auto` (requires `pexpect`: `pip3 install pexpect`) |

### Committing during spec implementations

When implementing a spec, commit **incrementally** — do not accumulate all
changes into a single commit at the end. A natural commit cadence is:

1. **Per logical unit of work** — e.g. one commit per spec step, or one per
   file/layer when multiple files form a cohesive change (resolver + exports +
   tests can be one commit; CLI refactor can be another; docs/spec update can
   be a third).
2. **After each green gate** — only commit when `npm test` and
   `npm run type-check` are clean for that increment. Never commit a broken
   intermediate state.
3. **Commit message format** — `<type>(<scope>): <short description>`, e.g.
   `feat(combat): promote resolveCombatRound to first-class export` or
   `refactor(cli): delegate runCombatTurn to resolver — no inline math`.
   Keep the body concise; reference the spec number when relevant.
4. **Spec update commit** — the final commit for any spec implementation must
   include the updated spec file (acceptance checklist ticked + implementation
   notes) and any doc files changed.

Never squash or amend after pushing unless explicitly asked.

### Caveats

- **ESLint config has a pre-existing issue**: `npm run lint` fails with `A configuration object specifies rule "@typescript-eslint/no-explicit-any", but could not find plugin "@typescript-eslint"` because `eslint.config.mts` declares the rule without registering the plugin in the same config object. `npm run type-check` works and is the reliable static analysis check.
- **CLI apps are interactive**: Both `combat` and `character` CLIs use `inquirer` prompts. Set `COMBAT_NO_DELAY=1` to skip animation delays in combat. For automated testing, use the Python automation script (`npm run combat:auto`) or drive prompts via `pexpect`/tmux `send-keys`.
- **Test runner**: `npm test` runs vitest. Use alongside `npm run type-check` and `npm run build` for correctness checks.
- **State file**: The combat CLI writes a `game-state.json` in the project root. This file is gitignored and ephemeral.
- **Spec update**: If using a spec file to implement a change, update the spec as you walk through the steps

### Hermetic E2E testing — REQUIRED

Every implementation must land with at least one **hermetic e2e test** that
drives the change through the highest-level public entry point of its module.
If you cannot, extract logic until you can — or document the
"hermetic-test debt" in the PR description.

**Hermetic** = self-contained (no disk/network/TTY) + deterministic
(`Math.random` stubbed via `src/test-utils/rng.ts`) + isolated
(`vi.restoreAllMocks` in `afterEach`).

- **Standard:** [`docs/testing.md`](./docs/testing.md) (canonical).
- **Reference test:** [`src/Combat/e2e/combat.resolver.test.ts`](./src/Combat/e2e/combat.resolver.test.ts) (copy its structure).
- **Location:** `src/<Module>/e2e/<feature>.engine.test.ts` (the `.engine.test.ts`
  suffix is a fixed marker meaning "hermetic e2e suite"). The engine code
  itself lives next to the module as `<feature>.resolver.ts` (composite
  orchestrators returning `{ state, events }`) or `<feature>.reducer.ts`
  (single state-shape edits) so CLI files contain UI only.
- **Stub helpers:** `mockAlternatingRng`, `mockFixedRng`, `mockSequentialRng`
  from `src/test-utils/rng.ts`. Do not re-roll your own `vi.spyOn(Math, 'random')`.
- **Verification:** `npm test` green twice + `npm run type-check` clean before
  declaring done.
