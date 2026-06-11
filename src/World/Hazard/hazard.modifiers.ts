/**
 * Hazard Modifier Table System (Phase 135)
 *
 * Threshold adjustment engine for modifying hazard encounters based on 
 * persistent world-state outcomes. Used by H08 (supply threshold -2),
 * H12 (stability auto-success ≤6), H15 (hazard removal), etc.
 */

import { MapState, NodeId, HazardModifierEntry } from '../types';
import { HazardCard } from './hazard.types';
import { getHazardOutcomesForNode } from '../world.reducer';

/**
 * Table of modifiers affecting hazard encounters at a specific node.
 * Built by scanning MapState.hazardOutcomes for relevant effects.
 */
export interface HazardModifierTable {
    nodeId: NodeId;
    modifiers: HazardModifierEntry[];
}

/**
 * Builds the modifier table for a node by scanning all hazard outcomes
 * that affect future encounters at that location. Used before spawning
 * a hazard to apply persistent world-state modifications.
 */
export function buildModifierTable(mapState: MapState, nodeId: NodeId): HazardModifierTable {
    const outcomes = getHazardOutcomesForNode(mapState, nodeId);
    const modifiers: HazardModifierEntry[] = [];

    for (const outcome of outcomes) {
        if (outcome.modifierEffects) {
            modifiers.push(...outcome.modifierEffects);
        }
    }

    return { nodeId, modifiers };
}

/**
 * Applies persistent world-state modifiers to a hazard card, returning
 * a modified copy with adjusted thresholds. Modifier effects stack 
 * additively (multiple -2 supply effects = -4 total adjustment).
 */
export function applyHazardModifiers(
    hazardCard: HazardCard, 
    mapState: MapState, 
    currentNode: NodeId
): HazardCard {
    const modifierTable = buildModifierTable(mapState, currentNode);
    
    if (modifierTable.modifiers.length === 0) {
        return hazardCard; // No modifications needed
    }

    // Group modifiers by hazard type for stacking
    const adjustments: Record<string, number> = {};
    for (const modifier of modifierTable.modifiers) {
        const key = modifier.hazardType;
        adjustments[key] = (adjustments[key] || 0) + modifier.thresholdAdjustment;
    }

    // Apply threshold adjustments to the hazard card
    let modifiedCard: HazardCard = { ...hazardCard };

    // Apply to main hazard thresholds if they match the modifier type
    const hazardType = inferHazardType(hazardCard);
    const adjustment = adjustments[hazardType];
    if (adjustment) {
        // Apply to safe route thresholds
        modifiedCard = {
            ...modifiedCard,
            safeRoute: {
                ...modifiedCard.safeRoute,
                combinedThresholds: modifiedCard.safeRoute.combinedThresholds.map((t: number) => 
                    Math.max(1, Math.min(20, t + adjustment))
                )
            }
        };

        // Apply to risk route thresholds if they exist
        if ('forceThresholds' in modifiedCard.riskRoute && 'escapeThresholds' in modifiedCard.riskRoute) {
            modifiedCard = {
                ...modifiedCard,
                riskRoute: {
                    ...modifiedCard.riskRoute,
                    forceThresholds: modifiedCard.riskRoute.forceThresholds.map((t: number) => 
                        Math.max(1, Math.min(20, t + adjustment))
                    ),
                    escapeThresholds: modifiedCard.riskRoute.escapeThresholds.map((t: number) => 
                        Math.max(1, Math.min(20, t + adjustment))
                    )
                }
            };
        }
    }

    return modifiedCard;
}

/**
 * Infers the hazard type from a hazard card's progression requirements.
 * Used to match modifier effects with the appropriate hazard encounters.
 */
function inferHazardType(hazardCard: HazardCard): string {
    // Infer hazard type from card name/id since progressRequirements may not exist
    const cardId = hazardCard.id.toLowerCase();
    const cardName = hazardCard.name.toLowerCase();
    
    // Check for specific hazard type hints in name/id
    if (cardId.includes('supply') || cardId.includes('spring') || cardId.includes('water') ||
        cardName.includes('spring') || cardName.includes('water')) {
        return 'supply';
    }
    if (cardId.includes('bridge') || cardId.includes('stability') || cardId.includes('structure') ||
        cardName.includes('bridge') || cardName.includes('stability')) {
        return 'stability';
    }
    if (cardName.includes('narrows') || cardName.includes('darkness')) {
        return 'escape';
    }
    
    // Default fallback — could be made more sophisticated
    return 'force';
}

/**
 * Checks if a hazard should be permanently removed from encounters
 * at this node due to H15 "Dark Narrows" style clearing effects.
 */
export function isHazardPermanentlyCleared(mapState: MapState, nodeId: NodeId, hazardId: string): boolean {
    const outcomes = getHazardOutcomesForNode(mapState, nodeId);
    return outcomes.some(outcome => 
        outcome.hazardId === hazardId && 
        outcome.outcome === 'cleared'
    );
}

/**
 * Gets all active modifier descriptions affecting a node for display purposes.
 * Returns human-readable strings describing the persistent effects.
 */
export function getActiveModifierDescriptions(mapState: MapState, nodeId: NodeId): string[] {
    const modifierTable = buildModifierTable(mapState, nodeId);
    return modifierTable.modifiers.map(modifier => modifier.description);
}