/**
 * Items content subpath.
 *
 * Currently exposes the raw JSON tables for consumables and equipment.
 * The structured item-library helpers (lookup by id, by category, …)
 * land here in Phase 4 of the GAME-ROADMAP.
 */
import consumablesData from '../../items/consumable.library.json';
import equipmentData from '../../items/equipment.library.json';

export const consumablesLibrary = consumablesData;
export const equipmentLibrary = equipmentData;
