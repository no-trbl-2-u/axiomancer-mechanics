import { Character } from './types';

// Export all types from this module
export * from './types';

function createCharacter(): Character {
    return {
        id: '',
        name: '',
        level: 1,
        health: 100,
        maxHealth: 100,
        mana: 100,
        maxMana: 100,
        baseStats: {
            heart: 10,
            body: 10,
            mind: 10,
        },
        derivedStats: {
            physicalDefense: 0,
            constitutionSave: 0,
            strength: 0,
            mindDefense: 0,
            reflexSave: 0,
            perception: 0,
            ailmentDefense: 0,
            willSave: 0,
            charm: 0,
            luck: 0,
        },
    };
}

export { createCharacter };