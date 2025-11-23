import { Character } from "./types";
import { createCharacter } from "./index";

export const Player: Character = createCharacter({
    name: "Player",
    level: 1,
    baseStats: {
        heart: 4,
        body: 3,
        mind: 1,
    },
});


/* Used to debug mocked character */
console.log("Player:", JSON.stringify(Player, null, 2));