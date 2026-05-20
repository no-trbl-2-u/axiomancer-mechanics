/**
 * Hermetic e2e — public barrel surface (Phase 50).
 *
 * Pins the top-level `axiomancer-mechanics` exports that consumers
 * (notably `axiomancer-mobile`) rely on. The Skills library + lookup
 * were the original Phase 50 motivator (mobile-side stop-gap at
 * `state/mocks/combat.skills.fixture.ts`); the broader purpose is a
 * compact contract test that catches accidental removal of any
 * locked public name without forcing every consumer to set up an
 * out-of-repo smoke.
 *
 * Test imports the same module path that consumers do — from this
 * test file's perspective that's `'../../index'`, which is the
 * compiled-from `src/index.ts` barrel.
 */

import { describe, it, expect } from 'vitest';

import {
    skillLibrary,
    getSkillById,
    getActiveEffectModifiers,
    getEffectiveStats,
    canAct,
    resolveEffectiveAdvantage,
    nullAdapter,
} from '../../index';
import type {
    PersistenceAdapter,
    GameState,
} from '../../index';

describe('Phase 50 — public barrel exposes skillLibrary + getSkillById', () => {
    it('skillLibrary is a non-empty array of Skill entries', () => {
        expect(skillLibrary).toBeDefined();
        expect(Array.isArray(skillLibrary)).toBe(true);
        expect(skillLibrary.length).toBeGreaterThan(0);
    });

    it('every entry in skillLibrary carries a non-empty id', () => {
        for (const skill of skillLibrary) {
            expect(skill.id).toBeDefined();
            expect(typeof skill.id).toBe('string');
            expect(skill.id.length).toBeGreaterThan(0);
        }
    });

    it('getSkillById is a function that returns a defined Skill for a real id', () => {
        expect(getSkillById).toBeDefined();
        expect(typeof getSkillById).toBe('function');

        const firstId = skillLibrary[0].id;
        const skill = getSkillById(firstId);

        expect(skill).toBeDefined();
        expect(skill?.id).toBe(firstId);
    });

    it('getSkillById returns undefined for an unknown id', () => {
        const result = getSkillById('this-skill-id-does-not-exist-anywhere');
        expect(result).toBeUndefined();
    });
});

describe('iterate (post-critique-21) — public barrel exposes 4 Combat-tier aggregators', () => {
    // Pins the four effect/combat aggregators that `docs/effects.md` lists
    // as public Combat-tier helpers. Until this iterate tick they lived only
    // on `src/Combat/index.ts` and were unreachable from the top-level
    // `axiomancer-mechanics` barrel — external consumers (e.g. mobile
    // building custom UI on top of `getEffectiveStats`) had no path in.

    it('getActiveEffectModifiers is a function', () => {
        expect(getActiveEffectModifiers).toBeDefined();
        expect(typeof getActiveEffectModifiers).toBe('function');
    });

    it('getEffectiveStats is a function', () => {
        expect(getEffectiveStats).toBeDefined();
        expect(typeof getEffectiveStats).toBe('function');
    });

    it('canAct is a function', () => {
        expect(canAct).toBeDefined();
        expect(typeof canAct).toBe('function');
    });

    it('resolveEffectiveAdvantage is a function', () => {
        expect(resolveEffectiveAdvantage).toBeDefined();
        expect(typeof resolveEffectiveAdvantage).toBe('function');
    });
});

describe('Phase 55 — PersistenceAdapter is reachable + shape-stable', () => {
    // The type is imported at the top of the file via `import type`. If the
    // public barrel ever loses the PersistenceAdapter export, the compile
    // step (npm run type-check) catches it before this test even runs.

    it('nullAdapter is a PersistenceAdapter value-export from the public barrel', () => {
        expect(nullAdapter).toBeDefined();
        expect(typeof nullAdapter.load).toBe('function');
        expect(typeof nullAdapter.save).toBe('function');
    });

    it('the interface shape is a synchronous two-method contract — extending it compile-checks', () => {
        // The extension pattern documented in src/Game/persistence/types.ts:
        // adapters bridging to async backends extend PersistenceAdapter and
        // add async lifecycle helpers (preload / flush / clear). This test
        // builds a minimal extension to compile-check the contract; runtime
        // shape (sync load + save) is the engine guarantee.
        interface FakeAsyncAdapter extends PersistenceAdapter {
            preload(): Promise<void>;
            flush(): Promise<void>;
        }

        const fake: FakeAsyncAdapter = {
            load: () => null,
            save: (_state: GameState) => { /* no-op */ },
            preload: async () => { /* no-op */ },
            flush: async () => { /* no-op */ },
        };

        expect(typeof fake.load).toBe('function');
        expect(typeof fake.save).toBe('function');
        expect(typeof fake.preload).toBe('function');
        expect(typeof fake.flush).toBe('function');

        // The sync surface still works through the extended interface
        // without any await — that's the architectural guarantee mobile's
        // AsyncStorageAdapter depends on.
        const loaded = fake.load();
        expect(loaded).toBeNull();
        fake.save({ version: 5 } as GameState);
    });
});
