import { Character } from "../src/character/types";
import { createCharacter } from "../src/character";

export const Player: Character = createCharacter({
    name: "Player",
    level: 1,
    baseStats: {
        heart: 4,
        body: 3,
        mind: 2,
    },
});
