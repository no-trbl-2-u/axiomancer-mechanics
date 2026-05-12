/**
 * Unique Item Templates — Spec 05c stubs.
 *
 * Two curated Uniques for initial playtesting. Per Spec 05c the modifier
 * catalogue lives in Spec 05d; `fixedModIds` reference catalogue entries by
 * ID. The IDs below are *placeholders* — Spec 05d fills in canonical mod IDs
 * (and the matching value ranges) when the catalogue is authored. The factory
 * (`item.factory.ts`) tolerates unknown mod IDs by rolling a value of 0, so
 * Uniques still drop with the right shape today; they simply have no
 * mechanical effect until the catalogue lands.
 *
 * Spec 05c, point 7:
 *   - `axioms-edge`   — weapon, lvl 5
 *   - `paradox-loop`  — accessory, lvl 15
 */

import { UniqueItemTemplate } from './types';

/**
 * The full Unique-item template library. Two entries today; Spec 05e set
 * items will layer `setMembership` references on top.
 */
export const uniqueTemplates: UniqueItemTemplate[] = [
    {
        id: 'axioms-edge',
        name: "Axiom's Edge",
        description: 'A blade that recalls every premise it has cut through. Sings under pressure.',
        slot: 'weapon',
        requiredLevel: 5,
        baseStatModifiers: [
            { stat: 'body',           value: 2 },
            { stat: 'physicalAttack', value: 1 },
        ],
        // Spec 05d fills in canonical IDs; the names below describe intent.
        fixedModIds: [
            'weapon_body_flat',         // +body flat (procedural mod)
            'weapon_physical_attack',   // +physicalAttack flat (procedural mod)
            'unique_axioms_edge_crit',  // unique-only crit-on-hit signature
        ],
    },
    {
        id: 'paradox-loop',
        name: 'Paradox Loop',
        description: 'A circlet that contains a sentence which forever ends without finishing.',
        slot: 'accessory',
        requiredLevel: 15,
        baseStatModifiers: [
            { stat: 'mind', value: 2 },
        ],
        fixedModIds: [
            'accessory_mind_flat',          // +mind flat (procedural mod)
            'accessory_mental_defense',     // +mentalDefense flat (procedural mod)
            'unique_paradox_loop_echo',     // unique-only mind-token echo signature
        ],
    },
];

const uniqueRegistry = new Map<string, UniqueItemTemplate>(
    uniqueTemplates.map(t => [t.id, t]),
);

/** O(1) lookup by Unique template ID. Returns `undefined` for unknown IDs. */
export function getUniqueTemplate(id: string): UniqueItemTemplate | undefined {
    return uniqueRegistry.get(id);
}
