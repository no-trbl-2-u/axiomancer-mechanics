// Minimal CommonJS smoke example for axiomancer-mechanics.
// Run from the repo root:  node examples/node-cjs/index.cjs
//
// Demonstrates subpath imports and a one-round combat exchange.

const { createCharacter, createEnemy } = require('axiomancer-mechanics/character');
const { determineAdvantage, getBaseStatForType } = require('axiomancer-mechanics/combat');
const { createMemoryAdapter, nullAdapter } = require('axiomancer-mechanics/persistence');
const { createGameStore } = require('axiomancer-mechanics/store');
const { createNewGameState } = require('axiomancer-mechanics/game');

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
