# Playtest Report — late-game-coastal-tyrant

> Late-game Sage preset against The Coastal Tyrant. First vertical proving ground for balance, timeout, friendship visibility, and dominant-policy detection.

## Scenario

- Preset: sage
- Enemy: coastal-tyrant
- Seed: late-game-coastal-tyrant-v0
- Max rounds: 75
- Policies: aggressive, defensive, friendship, resource-optimal, random, mixed
- Runs: 25

## Aggregate Metrics

- Win rate: 16.0%
- Defeat rate: 0.0%
- Friendship rate: 4.0%
- Timeout rate: 80.0%
- Average rounds: 70.96
- Median rounds: 75
- Average final player HP: 797.80
- Average final enemy HP: 226.84
- Average damage to player: 31.16
- Average damage to enemy: 486.12
- Max friendship counter: 36

## Outcome Counts

- victory: 4
- defeat: 0
- friendship: 1
- flee: 0
- timeout: 20

## Player Action Use

- attack: 826
- defend: 459
- skill: 434
- item: 55

## Stance Use

- body: 950
- heart: 593
- mind: 231

## Skill Use

- ad-hominem-strike: 236
- appeal-to-pity: 58
- false-dilemma: 42
- mob-appeal: 17
- undistributed-middle: 13
- ship-of-theseus: 13
- bootstrap-paradox: 13
- eternal-regress: 11
- liars-echo: 10
- achilles-gambit: 9
- sorites-cascade: 6
- straw-giant: 6

## Enemy Action Use

- defend: 730
- skill:achilles-gambit: 626
- attack: 418

## Policy Summaries

### aggressive

- Runs: 5
- Win rate: 0.0%
- Defeat rate: 0.0%
- Friendship rate: 0.0%
- Timeout rate: 100.0%
- Average rounds: 75
- Average final player HP: 695.20
- Average final enemy HP: 177.60
- Average damage to player: 23.20
- Average damage to enemy: 536.40
- Max friendship counter: 0

### defensive

- Runs: 4
- Win rate: 100.0%
- Defeat rate: 0.0%
- Friendship rate: 0.0%
- Timeout rate: 0.0%
- Average rounds: 51.25
- Average final player HP: 777.50
- Average final enemy HP: 0
- Average damage to player: 2.50
- Average damage to enemy: 671
- Max friendship counter: 0

### friendship

- Runs: 4
- Win rate: 0.0%
- Defeat rate: 0.0%
- Friendship rate: 0.0%
- Timeout rate: 100.0%
- Average rounds: 75
- Average final player HP: 972.50
- Average final enemy HP: 455
- Average damage to player: 44.50
- Average damage to enemy: 252.50
- Max friendship counter: 36

### resource-optimal

- Runs: 4
- Win rate: 0.0%
- Defeat rate: 0.0%
- Friendship rate: 0.0%
- Timeout rate: 100.0%
- Average rounds: 75
- Average final player HP: 791.50
- Average final enemy HP: 204.25
- Average damage to player: 37.25
- Average damage to enemy: 524.50
- Max friendship counter: 0

### random

- Runs: 4
- Win rate: 0.0%
- Defeat rate: 0.0%
- Friendship rate: 0.0%
- Timeout rate: 100.0%
- Average rounds: 75
- Average final player HP: 749.25
- Average final enemy HP: 280
- Average damage to player: 47.50
- Average damage to enemy: 462.25
- Max friendship counter: 12

### mixed

- Runs: 4
- Win rate: 0.0%
- Defeat rate: 0.0%
- Friendship rate: 25.0%
- Timeout rate: 75.0%
- Average rounds: 73.50
- Average final player HP: 826.50
- Average final enemy HP: 256.50
- Average damage to player: 34
- Average damage to enemy: 457.50
- Max friendship counter: 10

## Findings for Tobin

- 80% of runs timed out before combat resolved.
- Friendship policy built enough counter (36) but never resolved; HP gate remains unmet at average final enemy HP 455.

## Replay Seeds Worth Inspecting

- late-game-coastal-tyrant-v0:1
- late-game-coastal-tyrant-v0:3
- late-game-coastal-tyrant-v0:4
- late-game-coastal-tyrant-v0:5
- late-game-coastal-tyrant-v0:6
- late-game-coastal-tyrant-v0:7
- late-game-coastal-tyrant-v0:9
- late-game-coastal-tyrant-v0:10
- late-game-coastal-tyrant-v0:11
- late-game-coastal-tyrant-v0:13

## Run Summaries

- Run 1: outcome=timeout, policy=aggressive, seed=late-game-coastal-tyrant-v0:1, rounds=75, playerHp=715, enemyHp=176, damageToPlayer=21, damageToEnemy=518, friendshipCounter=0
- Run 2: outcome=victory, policy=defensive, seed=late-game-coastal-tyrant-v0:2, rounds=54, playerHp=758, enemyHp=0, damageToPlayer=0, damageToEnemy=703, friendshipCounter=0
- Run 3: outcome=timeout, policy=friendship, seed=late-game-coastal-tyrant-v0:3, rounds=75, playerHp=975, enemyHp=455, damageToPlayer=65, damageToEnemy=310, friendshipCounter=26
- Run 4: outcome=timeout, policy=resource-optimal, seed=late-game-coastal-tyrant-v0:4, rounds=75, playerHp=862, enemyHp=154, damageToPlayer=19, damageToEnemy=528, friendshipCounter=0
- Run 5: outcome=timeout, policy=random, seed=late-game-coastal-tyrant-v0:5, rounds=75, playerHp=749, enemyHp=309, damageToPlayer=53, damageToEnemy=448, friendshipCounter=10
- Run 6: outcome=timeout, policy=mixed, seed=late-game-coastal-tyrant-v0:6, rounds=75, playerHp=785, enemyHp=311, damageToPlayer=15, damageToEnemy=461, friendshipCounter=9
- Run 7: outcome=timeout, policy=aggressive, seed=late-game-coastal-tyrant-v0:7, rounds=75, playerHp=731, enemyHp=139, damageToPlayer=25, damageToEnemy=537, friendshipCounter=0
- Run 8: outcome=victory, policy=defensive, seed=late-game-coastal-tyrant-v0:8, rounds=55, playerHp=786, enemyHp=0, damageToPlayer=10, damageToEnemy=669, friendshipCounter=0
- Run 9: outcome=timeout, policy=friendship, seed=late-game-coastal-tyrant-v0:9, rounds=75, playerHp=965, enemyHp=455, damageToPlayer=44, damageToEnemy=210, friendshipCounter=32
- Run 10: outcome=timeout, policy=resource-optimal, seed=late-game-coastal-tyrant-v0:10, rounds=75, playerHp=790, enemyHp=266, damageToPlayer=31, damageToEnemy=486, friendshipCounter=0
- Run 11: outcome=timeout, policy=random, seed=late-game-coastal-tyrant-v0:11, rounds=75, playerHp=730, enemyHp=258, damageToPlayer=42, damageToEnemy=509, friendshipCounter=6
- Run 12: outcome=friendship, policy=mixed, seed=late-game-coastal-tyrant-v0:12, rounds=69, playerHp=881, enemyHp=180, damageToPlayer=56, damageToEnemy=424, friendshipCounter=7
- Run 13: outcome=timeout, policy=aggressive, seed=late-game-coastal-tyrant-v0:13, rounds=75, playerHp=655, enemyHp=246, damageToPlayer=40, damageToEnemy=490, friendshipCounter=0
- Run 14: outcome=victory, policy=defensive, seed=late-game-coastal-tyrant-v0:14, rounds=47, playerHp=810, enemyHp=0, damageToPlayer=0, damageToEnemy=633, friendshipCounter=0
- Run 15: outcome=timeout, policy=friendship, seed=late-game-coastal-tyrant-v0:15, rounds=75, playerHp=975, enemyHp=455, damageToPlayer=9, damageToEnemy=220, friendshipCounter=36
- Run 16: outcome=timeout, policy=resource-optimal, seed=late-game-coastal-tyrant-v0:16, rounds=75, playerHp=772, enemyHp=221, damageToPlayer=69, damageToEnemy=514, friendshipCounter=0
- Run 17: outcome=timeout, policy=random, seed=late-game-coastal-tyrant-v0:17, rounds=75, playerHp=802, enemyHp=277, damageToPlayer=30, damageToEnemy=397, friendshipCounter=12
- Run 18: outcome=timeout, policy=mixed, seed=late-game-coastal-tyrant-v0:18, rounds=75, playerHp=818, enemyHp=225, damageToPlayer=47, damageToEnemy=503, friendshipCounter=7
- Run 19: outcome=timeout, policy=aggressive, seed=late-game-coastal-tyrant-v0:19, rounds=75, playerHp=708, enemyHp=89, damageToPlayer=0, damageToEnemy=639, friendshipCounter=0
- Run 20: outcome=victory, policy=defensive, seed=late-game-coastal-tyrant-v0:20, rounds=49, playerHp=756, enemyHp=0, damageToPlayer=0, damageToEnemy=679, friendshipCounter=0
- Run 21: outcome=timeout, policy=friendship, seed=late-game-coastal-tyrant-v0:21, rounds=75, playerHp=975, enemyHp=455, damageToPlayer=60, damageToEnemy=270, friendshipCounter=29
- Run 22: outcome=timeout, policy=resource-optimal, seed=late-game-coastal-tyrant-v0:22, rounds=75, playerHp=742, enemyHp=176, damageToPlayer=30, damageToEnemy=570, friendshipCounter=0
- Run 23: outcome=timeout, policy=random, seed=late-game-coastal-tyrant-v0:23, rounds=75, playerHp=716, enemyHp=276, damageToPlayer=65, damageToEnemy=495, friendshipCounter=11
- Run 24: outcome=timeout, policy=mixed, seed=late-game-coastal-tyrant-v0:24, rounds=75, playerHp=822, enemyHp=310, damageToPlayer=18, damageToEnemy=442, friendshipCounter=10
- Run 25: outcome=timeout, policy=aggressive, seed=late-game-coastal-tyrant-v0:25, rounds=75, playerHp=667, enemyHp=238, damageToPlayer=30, damageToEnemy=498, friendshipCounter=0
