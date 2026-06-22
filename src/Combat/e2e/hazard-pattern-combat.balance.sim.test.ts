/**
 * Balance-sim witness — Spec 25 Hazard-Pattern Combat.
 *
 * The regression guard the `/combat-tuning` skill measures against. It pins the
 * load-bearing balance invariants of the new combat, deterministically (the sim
 * re-seeds the engine RNG per run, so a fixed start seed is reproducible):
 *
 *   1. Authored enemies are WINNABLE with a competent status loadout.
 *   2. Status play is the EFFICIENT path — a status loadout resolves in far
 *      fewer phases than a direct-damage-only loadout (the doctrine witness:
 *      status effects are the main way to win, not basic damage).
 *   3. BOTH win paths are live and distinct — a control-only loadout wins via
 *      the Control Saturation mercy path, not via DoT.
 *   4. Status play actually happens (engagement > 0).
 *
 * If a tuning change collapses any of these, this test fails and the change is
 * reverted. The exact rates are free to drift; the INVARIANTS are not.
 */

import { describe, it, expect } from 'vitest';

import { Player } from '../../Character/characters.mock';
import type { Character } from '../../Character/types';
import { MournfulGull, HollowEyedBeggar } from '../../Enemy/enemy.library';
import { deepClone } from '../../Utils';
import { simulateHazardPatternCombat } from '../combat.encounter.sim';

const RUNS = 120;
const SEED = 1;

function loadout(skills: string[]): Character {
    const p = deepClone(Player);
    p.knownSkills = skills.slice();
    p.baseStats = { heart: 10, body: 10, mind: 10 };
    p.health = 150;
    p.maxHealth = 150;
    return p;
}

const STATUS = ['slippery-slope', 'eternal-regress', 'achilles-gambit', 'befriend']; // DoT + control + damage + befriend
const DAMAGE_ONLY = ['achilles-gambit'];                                              // pure HP damage, no status
const CONTROL_ONLY = ['eternal-regress', 'befriend'];                                 // control + mercy only

describe('Spec 25 balance — authored enemies are winnable with status play', () => {
    for (const [name, enemy] of [['MournfulGull', MournfulGull], ['HollowEyedBeggar', HollowEyedBeggar]] as const) {
        it(`${name}: a status loadout wins the large majority of seeded combats`, () => {
            const s = simulateHazardPatternCombat(loadout(STATUS), enemy, RUNS, SEED);
            expect(s.runs).toBe(RUNS);
            expect(s.winRate).toBeGreaterThanOrEqual(0.8);
            // Status play actually occurs (effects land on the enemy).
            expect(s.statusEngagement).toBeGreaterThan(0);
        });
    }
});

describe('Spec 25 doctrine — status is the EFFICIENT win path (faster than raw damage)', () => {
    it('a status loadout resolves in far fewer phases than a damage-only loadout', () => {
        const status = simulateHazardPatternCombat(loadout(STATUS), MournfulGull, RUNS, SEED);
        const damage = simulateHazardPatternCombat(loadout(DAMAGE_ONLY), MournfulGull, RUNS, SEED);
        // Both may eventually win, but status must be decisively quicker — the
        // assembled-solution path beats the attrition grind.
        expect(status.avgRounds).toBeLessThan(damage.avgRounds);
        // A comfortable margin guards against the §4.4 oversimplification drift
        // (if damage-only ever becomes as fast as status, thresholds are wrong).
        expect(status.avgRounds * 1.5).toBeLessThan(damage.avgRounds);
    });
});

describe('Spec 25 — both win paths are live and distinct', () => {
    it('a control-only loadout wins via the Control Saturation mercy path, not DoT', () => {
        const c = simulateHazardPatternCombat(loadout(CONTROL_ONLY), MournfulGull, RUNS, SEED);
        expect(c.winRate).toBeGreaterThan(0);
        // Control wins resolve as MERCY (saturation), not VICTORY (DoT erosion).
        expect(c.mercies).toBeGreaterThan(0);
        expect(c.mercies).toBeGreaterThanOrEqual(c.victories);
    });

    it('the DoT path and the Control path produce different outcome mixes', () => {
        // On a DoT-weak enemy, a DoT-capable deck wins via DoT erosion while a
        // control-only deck wins via the mercy path — the tracks are separate
        // levers, and the enemy's weakness decides which is faster (Spec 26b
        // tuning §2: Control is now a genuine alternative, so this contrast must
        // be measured on a DoT-weak foe, not a control-weak one).
        const status = simulateHazardPatternCombat(loadout(STATUS), HollowEyedBeggar, RUNS, SEED);
        const control = simulateHazardPatternCombat(loadout(CONTROL_ONLY), HollowEyedBeggar, RUNS, SEED);
        expect(status.victories).toBeGreaterThan(control.victories);
    });
});
