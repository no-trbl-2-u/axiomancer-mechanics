import { WorldState } from './types';
import { MapName } from './map.library';
import { createMapState, getMapDefinition } from './map.registry';

/** Builds the initial WorldState for a new save. */
export function createStartingWorld(): WorldState {
    const fishingVillage = getMapDefinition('coastal-continent', 'fishing-village');
    return {
        world: [],
        currentContinent: {
            name: 'coastal-continent',
            description: 'The coastal continent is a landmass bordered by the sea to the east and west. It is home to a variety of biomes, including forests, mountains, and plains.',
            availableMaps: ['fishing-village' as MapName],
            lockedMaps: ['northern-forest' as MapName],
            completedMaps: [],
        },
        currentMap: createMapState(fishingVillage),
    };
}

export {
    MAP_REGISTRY, getMapDefinition, createMapState, MapNotFoundError,
} from './map.registry';

export type {
    WorldState, Continent, Quest, UniqueEvent,
    Reward, MapNode, NodeId, Encounter,
    MapDefinition, MapState, QuestObjective, QuestObjectiveType, QuestStatus, QuestLog,
} from './types';
export type { MapName, ContinentName } from './map.library';
export type { QuestName } from './quest.library';

export {
    generateEncounter, scaleEnemyToLevel, scaledEncounterLevel,
    DIFFICULTY_LEVEL_BANDS,
} from './encounter';
export type { GenerateEncounterOptions } from './encounter';

export {
    emptyQuestLog, isQuestComplete, findActiveQuest, findQuest,
    startQuest, progressQuest, completeQuest, discoverQuest,
    reachableObjectives, killObjectives,
} from './quest.engine';

export {
    moveToNode, completeCurrentNode, IllegalMoveError,
    changeMap, completeMap, unlockMap,
    completeNode, unlockNode, changeContinent, completeUniqueEvent,
    revealAdjacent, markNodeConsumed, unlockAdjacent,
} from './world.reducer';

// Spec 23 — MapEvents engine.
// Importing `./MapEvents/content` for its side effect registers the
// Phase 24 pools (fishing-village + northern-forest) on module load.
import './MapEvents/content';

export {
    resolveMapEvent,
    registerMapEventPool,
    setDefaultMapEventPool,
    setNodeEventPoolOverride,
} from './MapEvents/resolve-map-event';
export type {
    MapEventKind, MapEventPayload, MapEventPool, MapEventPoolEntry,
    EncounterPayload, InteractionPayload, GatheringPayload, RestPayload,
    VillagePayload, CutscenePayload, HazardPayload, LootCachePayload,
    ResolvedEvent, ResolveMapEventResult,
} from './MapEvents/types';

export {
    applyDialogueChoice,
} from './dialogue.runtime';
export type { ApplyDialogueChoiceResult } from './dialogue.runtime';
