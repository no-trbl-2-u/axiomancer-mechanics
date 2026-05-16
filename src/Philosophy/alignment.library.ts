/**
 * Philosophical alignment library (Phase 42).
 *
 * The 27-cell registry indexed by the `(epistemology, outlook, scope)`
 * bucket triple. Unit 1 ships a placeholder of one cell so the engine
 * compiles; the full registry lands in Unit 2 (authored verbatim from
 * `PhilosAxiosDoc.pdf`).
 *
 * Cell ids: kebab-case `<epistemology>-<outlook>-<scope>`. Stable across
 * versions.
 */

import type { PhilosophicalAlignmentCell } from './types';

/**
 * The 27-cell library. Unit 1 placeholder — the rest land in Unit 2.
 *
 * Note: tests in Unit 1 only assert engine shape + reducer behaviour,
 * not exhaustiveness (that lands with the full library in Unit 2).
 */
export const philosophicalAlignmentLibrary: readonly PhilosophicalAlignmentCell[] = Object.freeze([
    // PDF cell 1 — Logic / Optimistic / Individual.
    {
        id: 'logic-optimistic-individual',
        epistemology: 'high',
        outlook: 'high',
        scope: 'low',
        label: 'Logic-Optimistic-Individual',
        philosopher: 'Friedrich Nietzsche (late period)',
        literaryCharacter: { name: 'Prometheus', work: "Shelley's \"Prometheus Unbound\"" },
        fallacies: [
            {
                name: 'Appeal to Consequences',
                example: '"This belief makes me stronger, therefore it\'s true".',
                rationale: 'Nietzsche valued beliefs based on life-affirming power rather than objective truth.',
            },
            {
                name: 'Genetic Fallacy',
                example: '"Your morality comes from slave resentment, therefore it\'s invalid".',
                rationale: 'Genealogical critique dismisses ideas based on their psychological origins.',
            },
            {
                name: 'No True Scotsman',
                example: '"No true Übermensch would accept herd morality".',
                rationale: 'Constantly redefining the ideal individual to exclude weakness.',
            },
        ],
    },
]);
