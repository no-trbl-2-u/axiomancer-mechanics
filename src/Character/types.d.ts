/**
 * Character module type definitions
 *
 * This module contains types for player characters, including:
 * - Character 
 * - Character stats and attributes
 * - Acquired Skills
 * - Equipped Skills
 * - Equipped Items
 * - Inventory
 */

type CharacterBaseAttributes = {
    heart: number;
    body: number;
    mind: number;
}

interface Character {
    name: string;
    level: number;
    baseAttributes: CharacterBaseAttributes;
}

// TODO: Define Character types
export { };
