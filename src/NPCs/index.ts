/**
 * NPCs System Module
 * Handles NPC creation and dialogue
 */

import { NPC, DialogueMap } from './types';

// Export all types
export * from './types';

// ============================================================================
// NPC CREATION
// ============================================================================

/**
 * Creates a new NPC
 * @param name - The name of the NPC
 * @param dialogue - Collection of dialogue options
 * @param description - Optional description of the NPC
 * @returns A new NPC instance
 */
export function createNPC(
    name: string,
    dialogue: DialogueMap,
    description?: string
): NPC {
    return undefined as any;
}

// ============================================================================
// DIALOGUE MANAGEMENT
// ============================================================================

/**
 * Gets dialogue for a specific key
 * @param npc - The NPC to get dialogue from
 * @param key - The dialogue key to retrieve
 * @returns The dialogue string or array, or null if key not found
 */
export function getDialogue(npc: NPC, key: string): string | string[] | null {
    return undefined as any;
}
