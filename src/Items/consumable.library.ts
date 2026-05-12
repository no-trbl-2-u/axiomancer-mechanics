/**
 * Consumable Library — Spec 05b content.
 *
 * Twelve consumables that exercise every leg of the Spec 05 consumable
 * pipeline: immediate `healAmount`, effect-library references via `effectId`,
 * and combat-resource grants via `resourceGrant`.
 *
 * Design notes (Spec 05b resolutions):
 *   - Q3 (B): philosophical tokens (`fallacy` / `paradox`) remain skill-only.
 *     `philosopher-tea` and `void-essence` were rewritten to grant
 *     stance tokens (`heart` / `body` / `mind`) instead so the Tier-1 →
 *     Tier-3 generation chain isn't short-circuited by an item slot.
 *   - Q6 (A): consumable `resourceGrant` is applied in-combat when the player
 *     picks `action: 'item'`. Using an item spends the player's turn, so the
 *     grant is a tempo trade-off rather than free resources.
 *
 * Effect IDs reference the global effects library (`src/Effects/buffs.library.json`,
 * `debuffs.library.json`); unknown IDs are silently skipped by `useConsumableEffect`,
 * so library authors are responsible for keeping references valid.
 */

import { Consumable } from './types';

/**
 * The full consumable library for Spec 05b. Exactly 12 entries. Quantities
 * default to 1 — callers (shops, loot tables, debug helpers) stack as needed
 * via `stackItem`.
 */
export const consumableLibrary: Consumable[] = [
    {
        id: 'healing-potion',
        name: 'Healing Potion',
        description: 'A clean clay flask of red liquid. Restores moderate HP.',
        category: 'consumable',
        healAmount: 20,
        quantity: 1,
    },
    {
        id: 'minor-healing-potion',
        name: 'Minor Healing Potion',
        description: 'A small flask, half the strength of a true healing draught.',
        category: 'consumable',
        healAmount: 10,
        quantity: 1,
    },
    {
        id: 'antidote',
        name: 'Antidote',
        description: 'A bitter green tincture. Purges venoms and lingering wounds.',
        category: 'consumable',
        effectId: 'buff_cleanse',
        quantity: 1,
    },
    {
        id: 'clarity-serum',
        name: 'Clarity Serum',
        description: 'A cold colorless serum. Strips a single hindrance from the mind.',
        category: 'consumable',
        effectId: 'buff_cleanse',
        quantity: 1,
    },
    {
        id: 'focus-vial',
        name: 'Focus Vial',
        description: 'A vial of crystalline thought. Sharpens reasoning for a moment.',
        category: 'consumable',
        resourceGrant: { mind: 3 },
        quantity: 1,
    },
    {
        id: 'heart-draught',
        name: "Heart's Draught",
        description: 'A warm draught that quickens the wearer\'s convictions.',
        category: 'consumable',
        resourceGrant: { heart: 3 },
        quantity: 1,
    },
    {
        id: 'body-elixir',
        name: 'Body Elixir',
        description: 'A heavy elixir that locks the muscles into purpose.',
        category: 'consumable',
        resourceGrant: { body: 3 },
        quantity: 1,
    },
    {
        id: 'berserker-brew',
        name: 'Berserker Brew',
        description: 'A bitter brown brew. Briefly grants haste and a surge of body resolve.',
        category: 'consumable',
        effectId: 'buff_haste',
        resourceGrant: { body: 5 },
        quantity: 1,
    },
    {
        id: 'philosopher-tea',
        name: "Philosopher's Tea",
        description:
            'A slow tea brewed from contradictions. Sharpens the mind and ' +
            'lingers on the tongue as a fresh argument.',
        category: 'consumable',
        // Spec 05b Q3 (B): consumables grant stance tokens only — philosophical
        // tokens stay skill-only. The lore framing still hints at paradoxes.
        effectId: 'buff_critical_damage_up',
        resourceGrant: { mind: 2 },
        quantity: 1,
    },
    {
        id: 'resonance-crystal',
        name: 'Resonance Crystal',
        description: 'A three-faced crystal that resonates with body, mind, and heart in equal measure.',
        category: 'consumable',
        resourceGrant: { body: 2, mind: 2, heart: 2 },
        quantity: 1,
    },
    {
        id: 'revive-crystal',
        name: 'Revive Crystal',
        description: 'A milky crystal that briefly entangles the bearer with a safer reality.',
        category: 'consumable',
        // No `prevent_ko` effect exists in the global library yet; the closest
        // analog is `buff_invincibility` (1-round immunity), which sells the
        // "negates the next lethal hit" fantasy while keeping the data layer
        // honest. Replace with a bespoke effect when Spec 06+ adds one.
        effectId: 'buff_invincibility',
        quantity: 1,
    },
    {
        id: 'void-essence',
        name: 'Void Essence',
        description:
            'A vial of substance that refuses to be observed. Drinking it ' +
            'leaves the wearer slightly insistent and intensely present.',
        category: 'consumable',
        // Spec 05b Q3 (B): no philosophical tokens. Heart aligns with the
        // void-essence flavor of staring back at the abyss.
        effectId: 'buff_critical_damage_up',
        resourceGrant: { heart: 2 },
        quantity: 1,
    },
];

const consumableRegistry = new Map<string, Consumable>(
    consumableLibrary.map(item => [item.id, item]),
);

/** O(1) consumable lookup by ID. Returns `undefined` for unknown IDs. */
export function getConsumableById(id: string): Consumable | undefined {
    return consumableRegistry.get(id);
}
