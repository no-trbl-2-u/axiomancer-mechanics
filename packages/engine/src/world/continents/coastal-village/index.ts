/**
 * Coastal Continent — content barrel.
 *
 * One per-continent registry that combines metadata about the continent
 * with its map definitions. The world reducer only ever needs to know
 * the continent's `name` and which `MapName`s belong to it; the actual
 * Map objects are reachable by lookup through `maps`.
 */
import { Continent, Map } from '../../types';
import { CoastalContinentMapNames } from './maps';
import { fishingVillage, northernForest } from './maps';

export const coastalContinentMaps: Record<CoastalContinentMapNames, Map> = {
    'fishing-village': fishingVillage,
    'northern-forest': northernForest,
};

export const coastalContinent: Continent = {
    name: 'coastal-continent',
    description:
        'The coastal continent is a landmass bordered by the sea to the east and west. ' +
        'It is home to a variety of biomes, including forests, mountains, and plains.',
    availableMaps: ['fishing-village'],
    lockedMaps: ['northern-forest'],
    completedMaps: [],
};

export { fishingVillage, northernForest };
