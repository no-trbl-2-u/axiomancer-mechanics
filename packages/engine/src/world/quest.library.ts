type FishingVillageQuests =
    'starting-quest' |
    'get-to-forest';

type NorthernForestQuests =
    'gather-wood' |
    'get-to-cave';

type CavernsQuests =
    'gather-iron' |
    'get-to-northern-city';

type NorthernCityQuests =
    'find-blacksmith' |
    'build-boat' |
    'kill-some-time' |
    'get-to-connecting-river';

type ConnectingRiverQuests =
    'find-islanders' |
    'join-islanders-for-ritual' |
    'get-to-town-across-river';

/**
 * QuestName is the union of all quest names in the game
 * @todo: Keep QuestName updated with new quests
 * @todo: Create a QuestLibrary that uses these and
 *        creates Quest objects
 */
export type QuestName =
    FishingVillageQuests |
    NorthernForestQuests |
    CavernsQuests |
    NorthernCityQuests |
    ConnectingRiverQuests;