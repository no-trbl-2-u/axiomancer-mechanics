/**
 * Set-item library (Phase 54, per Spec 05e §7).
 *
 * Frozen array of the named sets the player can assemble by equipping
 * matching template instances. Engine code (`set.engine.ts`) iterates
 * this list at every `initializeCombat` + `generateBasicActionResources`
 * call; UI code can also enumerate it for an "active sets" summary.
 *
 * Initial roster:
 *   - Wanderer's Road (2-piece) — light traveller's kit.
 *   - Iron Discipline (3-piece) — physical-training motif.
 *   - Scholar's Circle (2-piece) — focused-study motif.
 *
 * Set members intentionally overlap (e.g. `leather-cap` belongs to all
 * three). A player wearing the right combination can activate partial
 * bonuses from multiple sets at once — covered by the Phase 54 hermetic
 * tests in `src/Items/e2e/sets.engine.test.ts`.
 *
 * Adding a set: append a new `ItemSet` literal here, then update
 * `docs/equipment.md` "Set Items" section + a hermetic test if the
 * bonus shape is new. Adding more sets is iterate-tier content
 * authoring, not a phase.
 */

import type { ItemSet } from './set.types';

const wandererRoad: ItemSet = {
    id: 'wanderers-road',
    name: "Wanderer's Road",
    description: "A traveller's lightness of foot and clarity of eye.",
    memberTemplateIds: ['sandals', 'leather-cap'],
    bonuses: {
        2: {
            resourceInteraction: {
                combatStartTokens: { heart: 2 },
            },
        },
    },
};

const ironDiscipline: ItemSet = {
    id: 'iron-discipline',
    name: 'Iron Discipline',
    description: 'The disciplined training of body over comfort.',
    memberTemplateIds: ['leather-cap', 'cloth-wrap', 'cloth-gloves'],
    bonuses: {
        2: {
            statModifiers: [
                { stat: 'physicalDefense', value: 3 },
            ],
        },
        3: {
            resourceInteraction: {
                generationBonus: [
                    { trigger: 'any', resourceType: 'body', bonus: 1 },
                ],
            },
        },
    },
};

const scholarsCircle: ItemSet = {
    id: 'scholars-circle',
    name: "Scholar's Circle",
    description: "A scholar's focused preparation.",
    memberTemplateIds: ['copper-ring', 'leather-cap'],
    bonuses: {
        2: {
            resourceInteraction: {
                combatStartTokens: { mind: 2 },
            },
            passiveEffects: ['buff_critical_rate_up'],
        },
    },
};

/** All named item sets, frozen and iterated in this exact order. */
export const itemSetLibrary: ReadonlyArray<ItemSet> = Object.freeze([
    wandererRoad,
    ironDiscipline,
    scholarsCircle,
]);

/**
 * O(N) lookup helper. Returns the matching `ItemSet` (frozen) or
 * `undefined` if the id is unknown.
 */
export function getItemSetById(id: string): ItemSet | undefined {
    return itemSetLibrary.find(s => s.id === id);
}
