import { Image } from '../Utils/types';

/**
 * NPCs module type definitions
 *
 * This module contains types for non-player characters, including:
 * - NPC base interface
 * - Dialogue systems
 */

/**
 * DialogueMap is a collection of dynamic keys to access specific dialogue options
 * Uses string keys to map to arrays of dialogue lines, allowing flexible conversation trees.
 * @example
 * {
 *   "greeting": "Hello, traveler!",
 *   "farewell": ["Safe travels!", "Come back soon."]
 * }
 */
export interface DialogueMap {
    [key: string]: string | string[];
}

/**
 * NPC is a non-player character that can be interacted with
 * @property name - The name of the NPC
 * @property dialogue - A collection of dialogue options for the NPC, keyed by context or trigger
 * @property description - A description of the NPC (optional)
 * @property image - Optional: visual representation of the NPC (TODO: make mandatory once implemented)
 */
export interface NPC {
    name: string;
    dialogue: DialogueMap;
    description?: string;
    image?: Image; // TODO: Make mandatory once implemented
}