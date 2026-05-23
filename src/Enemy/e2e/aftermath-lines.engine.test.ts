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
});
