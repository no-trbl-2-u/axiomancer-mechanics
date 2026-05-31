/**
 * Unique Item Templates — Spec 05c stubs, Spec 05d wiring.
 *
 * Two curated Uniques for initial playtesting. `fixedModIds` reference the
 * canonical Spec 05d catalogue (`src/Items/modifier.catalogue.ts`); the
 * factory rolls each ID through the same machinery a procedural mod uses.
 *
 * Spec 05d §8:
 *   - `axioms-edge`   — `['wm-flat-damage', 'wm-body-gen', 'um-paradox-edge']`
 *   - `paradox-loop`  — `['am-stance-res', 'am-proc-boost', 'um-resonance-prime']`
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
        // Spec 05d §8 — canonical IDs from the catalogue.
        fixedModIds: [
            'wm-flat-damage',     // common procedural — +physicalAttack
            'wm-body-gen',        // uncommon procedural — body/hit generation
            'um-paradox-edge',    // unique-only — double-proc on hit
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
        // Spec 05d §8.
        fixedModIds: [
            'am-stance-res',         // uncommon procedural — combat-start mind tokens
            'am-proc-boost',         // rare procedural — luck-driven proc adjacency
            'um-resonance-prime',    // unique-only — combat-start tokens for all stances
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
