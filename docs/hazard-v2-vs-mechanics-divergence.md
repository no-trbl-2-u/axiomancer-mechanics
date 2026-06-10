# Hazard Minigame: Local v2 Engine vs `axiomancer-mechanics` — Divergence Catalogue

Date: 2026-06-10
Status: Authoritative for the mobile v2 implementation (`state/hazard/`)

## Why this document exists

The hazard minigame shipped in mobile implements the **final design-handoff
prototype** (Claude Design bundle 2026-06-10, `Hazard Minigame Prototype.html`,
chats 1–7 — especially the chat-7 "four-colour system" redesign), plus
user-confirmed doctrine changes from the implementation session. The published
`axiomancer-mechanics@0.16.0` hazard engine still implements the older
CDR-0006 doctrine. Per the decision on 2026-06-10, the rules live **locally in
mobile** (`state/hazard/engine.ts`) until mechanics catches up. This file is
the upstreaming checklist: every line is a change the mechanics repo needs to
absorb (or consciously reject) before mobile can switch back to package
imports.

## Side-by-side

| Area | `axiomancer-mechanics@0.16.0` (CDR-0006 v0) | Mobile local v2 (`state/hazard/`) |
|---|---|---|
| **Progress types** | Four: `stability`, `escape`, `supply`, `force` | Two: `force`, `escape`. Stability/Supply removed entirely. |
| **Card/dice colours** | Five-ish (red/green/blue/yellow/purple + `any` costs) | Exactly four: **Red, Blue, Purple, Gold**. Colour = resource identity. |
| **Colour → stats contract** | Card class system (`direct-progress`, etc.), one progressType per card | Red→high FORCE, Blue→high ESCAPE, Purple→mid both, Gold→strong both. Every card carries a FORCE+ESCAPE stat pair on both rows. |
| **Die faces** | Per-colour dice with one X face (implementation varies) | Six faces = red, blue, purple, gold, **✕, ✕** (1/3 hostile). |
| **Card powering** | `bottomManaCost` arrays, may cost >1, `any` colour allowed | Exactly **one die, own colour only**. Gold cards demand a gold die — no substitution. |
| **Routes** | `topRoute`/`bottomRoute`, both single-progress thresholds | `safe` = one **combined** FORCE+ESCAPE meter; `risk` = **dual meters, BOTH required** in the same round. |
| **Dice between rounds** | `advanceToNextRound` refreshes dice | **No re-cast, ever.** One cast of 4 dice per hazard; spent stays spent. Only SECOND WIND (re-cast available dice) and convert cards touch the pool. *(User-confirmed 2026-06-10 — supersedes both the prototype's every-round re-cast and the design brief's safe-persists/risk-recasts split.)* |
| **Scoring** | `computeFinalScore` = count(O) − count(X) | Tier system: **Perfect** (all O) / **Complete** (≥1 O) / **Failure** (0 O). |
| **Rewards** | Static per-route reward objects (`vitae`, `items`, `supplyTokens`) | Tiered reward ids (cache/relic/vitae/token) + a **pick-1-of-3 card offer** (guaranteed rare + skippable on Perfect; 0% rare on a single win) + **reserve bonus** (+1 VITAE per unspent non-hex die — REC#3). |
| **Penalties** | Typed but unapplied (`resolveRound` TODO) | Fully applied at claim: consequence ladder by rounds lost — 1: lose banked tokens · 2: −5 max VITAE + CRACK dead card · 3: −8 VITAE + all of the above + Hexed flag — plus route penalty (penaltyVitae × losses). VITAE floors at 1 (hazards maim, never kill). |
| **Momentum** | none | Cleared-round surplus carries ⌊surplus/2⌋ (cap 3) into the next round (REC#1). |
| **Hazard library** | 5 hazards (H01–H05), thresholds 2–6 | 3 hazards tuned for the no-re-cast economy (safe ~19–24 combined, risk ~9–12 per meter). Monte-Carlo evidence in `state/hazard/__tests__/balance.sim.test.ts`. |
| **Card library** | 18 cards, several `noOpEffect` placeholders | 14 starter cards + 6 reward-pool cards + CRACK. Utilities all live: draw (1 free / 3 powered), re-cast, convert-✕. No placeholders. |
| **Enchantments** | `isEnchant` typed, arrays empty | Not implemented (prototype dropped them in the v2 redesign). |
| **Deck persistence** | none (sessions standalone) | Player hazard deck persists across hazards via `GameState.flags` (`hazard-card:<id>:<n>`), riding the engine save. Resets with the run. |
| **GameState integration** | No reducer owns a session | Mobile `hazard` slice owns the session; claim applies VITAE / max VITAE / currency / flags to `GameState` and saves. |
| **RNG** | engine singleton `getRng()` | Session-embedded mulberry32, seed pinned per session (dev hooks `__AXM_HAZARD_SEED__` / `__AXM_HAZARD_ID__`). |

## Mobile-side mappings that need real engine systems

These are applied as best-effort today and want first-class engine support:

- **Paradox token reward/loss** — banked as `hazard-token-banked:*` flags;
  no live combat-token bank exists to credit. The `tokens` consequence clears
  those flags.
- **Hexed (curse) consequence** — sets the `hazard-hexed` flag; combat does
  not yet consume it ("begin next combat with a hostile Curse die").
- **Max-VITAE scar recovery** — the scar is applied to `player.maxHealth`
  with a floor of 5; "until you next rest at an inn" recovery is not wired
  (no inn-rest hook exposed).
- **Cache / relic rewards** — granted as shillings (+12 / +20). A real loot
  table or item grant would be better.
- **Out-of-combat death** — the engine has no concept; hazard damage floors
  VITAE at 1.

## What stayed faithful to the prototype

Phase order (reveal → hand → route → cast → play → resolve → … → outcome →
rewards), the full card list with exact stats/weights/flavor, the 1/3-hostile
die distribution, colour-matched single-die powering, dual-meter BOTH-required
risk rounds, combined-meter safe rounds, the outcome tier copy, the reward
rarity ladder (incl. 0%-rare-on-one-win), consequence scaling by rounds lost,
and the skip-✕ on Perfect.
