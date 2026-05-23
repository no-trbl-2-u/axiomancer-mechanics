/**
 * Phase 71 — per-foe aftermath narrative lines (GH#65 ask 1).
 *
 * Pins the registration shape + voice signatures on the three
 * currently-authored befriendable enemies (MournfulGull,
 * HollowEyedBeggar, CoastalTyrant). The remaining 13 enemies in
 * the library are intentionally un-authored (D1 — pattern-setting
 * phase; full content sweep is a follow-up); the regression case
 * pins that the fields stay strictly undefined for those enemies
 * so the consumer-side fallback path stays intact.
 */
import { describe, it, expect } from 'vitest';
import {
    MournfulGull,
    HollowEyedBeggar,
    CoastalTyrant,
    TidepoolCrab,
} from '../enemy.library';

describe('Phase 71 — per-foe aftermath narrative lines', () => {
    const authored = [MournfulGull, HollowEyedBeggar, CoastalTyrant];

    it('all three authored befriendable enemies carry the full line-set shape', () => {
        for (const enemy of authored) {
            expect(enemy.finalBlowLines).toBeDefined();
            expect(enemy.finalBlowLines!.brutal).toMatch(/\S/);
            expect(enemy.finalBlowLines!.quiet).toMatch(/\S/);
            expect(enemy.finalBlowLines!.ironic).toMatch(/\S/);

            expect(enemy.pactLines).toBeDefined();
            expect(enemy.pactLines!.quiet).toMatch(/\S/);
            expect(enemy.pactLines!.setDown).toMatch(/\S/);
            expect(enemy.pactLines!.heavy).toMatch(/\S/);

            expect(enemy.causeLines).toBeDefined();
            expect(enemy.causeLines!.brutal).toMatch(/\S/);
            expect(enemy.causeLines!.broken).toMatch(/\S/);
            expect(enemy.causeLines!.quiet).toMatch(/\S/);
        }
    });

    it('voice signatures pin per enemy', () => {
        expect(MournfulGull.pactLines!.quiet).toMatch(/slights/);
        expect(HollowEyedBeggar.pactLines!.heavy).toMatch(/carrying these/);
        expect(CoastalTyrant.pactLines!.heavy).toMatch(/king of nothing/);
    });

    it('un-authored enemies (TidepoolCrab) have all three fields undefined', () => {
        expect(TidepoolCrab.finalBlowLines).toBeUndefined();
        expect(TidepoolCrab.pactLines).toBeUndefined();
        expect(TidepoolCrab.causeLines).toBeUndefined();
    });

    // Phase 71 D4 — engine does NO variant selection between the three
    // slots. The variant pick lives entirely on the consumer (mobile
    // presenter, CLI, etc.) based on the outcome shape. This case
    // documents the intended consumption pattern with an inline
    // mock-consumer helper so future engine-side helper proposals have
    // a concrete sketch to lean on (e.g. if multiple consumers converge
    // on the same selection heuristic, the engine could ship a
    // `pickFinalBlowVariant(report, enemy)` helper — see Phase 71
    // brief Follow-ups).
    it('consumer-side variant selection — mock pickFinalBlowVariant pattern', () => {
        // Toy consumer-side selection heuristic: damage-tier shape →
        // variant key. Brutal = overkill burst (damage ≥ 2× cap);
        // ironic = mirror / self-inflicted (sourceId === enemy.id);
        // quiet = exact-cap default.
        const pickFinalBlowVariant = (report: {
            overkillRatio?: number;
            sourceIsSelf?: boolean;
        }): 'brutal' | 'quiet' | 'ironic' => {
            if (report.sourceIsSelf) return 'ironic';
            if (report.overkillRatio !== undefined && report.overkillRatio >= 2) return 'brutal';
            return 'quiet';
        };

        // Drive each variant against MournfulGull's authored lines.
        expect(MournfulGull.finalBlowLines![pickFinalBlowVariant({ overkillRatio: 3 })])
            .toMatch(/half-syllable/); // brutal
        expect(MournfulGull.finalBlowLines![pickFinalBlowVariant({ overkillRatio: 1 })])
            .toMatch(/lands once/);    // quiet
        expect(MournfulGull.finalBlowLines![pickFinalBlowVariant({ sourceIsSelf: true })])
            .toMatch(/listener/);      // ironic
    });
});
