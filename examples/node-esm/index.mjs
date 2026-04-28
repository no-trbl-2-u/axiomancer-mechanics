// Minimal ESM smoke example for axiomancer-mechanics.
// Run from the repo root:  node examples/node-esm/index.mjs
//
// Demonstrates subpath imports and a one-round combat exchange.

import { createCharacter } from 'axiomancer-mechanics/character';
import { determineAdvantage, getBaseStatForType } from 'axiomancer-mechanics/combat';
import { createMemoryAdapter } from 'axiomancer-mechanics/persistence';
import { createGameStore } from 'axiomancer-mechanics/store';
import { createNewGameState } from 'axiomancer-mechanics/game';

const player = createCharacter({
    name: 'Demo',
    level: 1,
    baseStats: { heart: 4, body: 3, mind: 2 },
});

const adapter = createMemoryAdapter(createNewGameState());
const store = createGameStore(adapter);
console.log('player level:', store.getState().player.level);

const adv = determineAdvantage('heart', 'body');
console.log('heart vs body:', adv);

const heartAttack = getBaseStatForType(player, 'heart');
console.log('player heart attack stat:', heartAttack);
