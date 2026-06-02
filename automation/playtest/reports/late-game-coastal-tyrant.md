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
- Friendship rate: 0.0%
- Timeout rate: 84.0%
- Average rounds: 70.56
- Median rounds: 75
- Average final player HP: 788.08
- Average final enemy HP: 220.28
- Average damage to player: 32.68
- Average damage to enemy: 495.04
- Max friendship counter: 36

## Outcome Counts

- victory: 4
- defeat: 0
- friendship: 0
- flee: 0
- timeout: 21

## Player Action Use

- attack: 859
- defend: 447
- skill: 409
- item: 49

## Stance Use

- body: 947
- heart: 606
- mind: 211

## Skill Use

- ad-hominem-strike: 218
- appeal-to-pity: 54
- false-dilemma: 39
- mob-appeal: 17
- bootstrap-paradox: 15
- undistributed-middle: 14
- ship-of-theseus: 12
- eternal-regress: 11
- liars-echo: 9
- achilles-gambit: 9
- straw-giant: 6
- sorites-cascade: 5

## Enemy Action Use

- defend: 716
- skill:achilles-gambit: 634
- attack: 414

## Policy Summaries

### aggressive

- Runs: 5
- Win rate: 0.0%
- Defeat rate: 0.0%
- Friendship rate: 0.0%
- Timeout rate: 100.0%
- Average rounds: 75
- Average final player HP: 695.20
- Average final enemy HP: 167.80
- Average damage to player: 23.20
- Average damage to enemy: 546.20
- Max friendship counter: 0

### defensive

- Runs: 4
- Win rate: 100.0%
- Defeat rate: 0.0%
- Friendship rate: 0.0%
- Timeout rate: 0.0%
- Average rounds: 47.25
- Average final player HP: 785.75
- Average final enemy HP: 0
- Average damage to player: 2.50
- Average damage to enemy: 654.75
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
- Average damage to player: 51.50
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
- Average final enemy HP: 184.25
- Average damage to player: 37.25
- Average damage to enemy: 544.50
- Max friendship counter: 0

### random

- Runs: 4
- Win rate: 0.0%
- Defeat rate: 0.0%
- Friendship rate: 0.0%
- Timeout rate: 100.0%
- Average rounds: 75
- Average final player HP: 746.25
- Average final enemy HP: 272.50
- Average damage to player: 50.50
- Average damage to enemy: 469.75
- Max friendship counter: 12

### mixed

- Runs: 4
- Win rate: 0.0%
- Defeat rate: 0.0%
- Friendship rate: 0.0%
- Timeout rate: 100.0%
- Average rounds: 75
- Average final player HP: 760.50
- Average final enemy HP: 255.25
- Average damage to player: 33.50
- Average damage to enemy: 489.75
- Max friendship counter: 6

## Findings for Tobin

- 84% of runs timed out before combat resolved.
- No friendship outcomes surfaced; Tobin should judge whether the peaceful route is too hidden or too costly.
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
- late-game-coastal-tyrant-v0:12

## Run Summaries

- Run 1: outcome=timeout, policy=aggressive, seed=late-game-coastal-tyrant-v0:1, rounds=75, playerHp=715, enemyHp=164, damageToPlayer=21, damageToEnemy=530, friendshipCounter=0
- Run 2: outcome=victory, policy=defensive, seed=late-game-coastal-tyrant-v0:2, rounds=46, playerHp=770, enemyHp=0, damageToPlayer=0, damageToEnemy=670, friendshipCounter=0
- Run 3: outcome=timeout, policy=friendship, seed=late-game-coastal-tyrant-v0:3, rounds=75, playerHp=975, enemyHp=455, damageToPlayer=68, damageToEnemy=310, friendshipCounter=26
- Run 4: outcome=timeout, policy=resource-optimal, seed=late-game-coastal-tyrant-v0:4, rounds=75, playerHp=862, enemyHp=135, damageToPlayer=19, damageToEnemy=547, friendshipCounter=0
- Run 5: outcome=timeout, policy=random, seed=late-game-coastal-tyrant-v0:5, rounds=75, playerHp=740, enemyHp=295, damageToPlayer=62, damageToEnemy=462, friendshipCounter=10
- Run 6: outcome=timeout, policy=mixed, seed=late-game-coastal-tyrant-v0:6, rounds=75, playerHp=684, enemyHp=252, damageToPlayer=68, damageToEnemy=492, friendshipCounter=4
- Run 7: outcome=timeout, policy=aggressive, seed=late-game-coastal-tyrant-v0:7, rounds=75, playerHp=731, enemyHp=131, damageToPlayer=25, damageToEnemy=545, friendshipCounter=0
- Run 8: outcome=victory, policy=defensive, seed=late-game-coastal-tyrant-v0:8, rounds=51, playerHp=796, enemyHp=0, damageToPlayer=10, damageToEnemy=651, friendshipCounter=0
- Run 9: outcome=timeout, policy=friendship, seed=late-game-coastal-tyrant-v0:9, rounds=75, playerHp=965, enemyHp=455, damageToPlayer=54, damageToEnemy=210, friendshipCounter=32
- Run 10: outcome=timeout, policy=resource-optimal, seed=late-game-coastal-tyrant-v0:10, rounds=75, playerHp=790, enemyHp=253, damageToPlayer=31, damageToEnemy=499, friendshipCounter=0
- Run 11: outcome=timeout, policy=random, seed=late-game-coastal-tyrant-v0:11, rounds=75, playerHp=727, enemyHp=258, damageToPlayer=45, damageToEnemy=509, friendshipCounter=6
- Run 12: outcome=timeout, policy=mixed, seed=late-game-coastal-tyrant-v0:12, rounds=75, playerHp=784, enemyHp=232, damageToPlayer=19, damageToEnemy=512, friendshipCounter=3
- Run 13: outcome=timeout, policy=aggressive, seed=late-game-coastal-tyrant-v0:13, rounds=75, playerHp=655, enemyHp=234, damageToPlayer=40, damageToEnemy=502, friendshipCounter=0
- Run 14: outcome=victory, policy=defensive, seed=late-game-coastal-tyrant-v0:14, rounds=46, playerHp=810, enemyHp=0, damageToPlayer=0, damageToEnemy=630, friendshipCounter=0
- Run 15: outcome=timeout, policy=friendship, seed=late-game-coastal-tyrant-v0:15, rounds=75, playerHp=975, enemyHp=455, damageToPlayer=20, damageToEnemy=220, friendshipCounter=36
- Run 16: outcome=timeout, policy=resource-optimal, seed=late-game-coastal-tyrant-v0:16, rounds=75, playerHp=772, enemyHp=203, damageToPlayer=69, damageToEnemy=532, friendshipCounter=0
- Run 17: outcome=timeout, policy=random, seed=late-game-coastal-tyrant-v0:17, rounds=75, playerHp=802, enemyHp=271, damageToPlayer=30, damageToEnemy=403, friendshipCounter=12
- Run 18: outcome=timeout, policy=mixed, seed=late-game-coastal-tyrant-v0:18, rounds=75, playerHp=839, enemyHp=238, damageToPlayer=24, damageToEnemy=480, friendshipCounter=6
- Run 19: outcome=timeout, policy=aggressive, seed=late-game-coastal-tyrant-v0:19, rounds=75, playerHp=708, enemyHp=89, damageToPlayer=0, damageToEnemy=639, friendshipCounter=0
- Run 20: outcome=victory, policy=defensive, seed=late-game-coastal-tyrant-v0:20, rounds=46, playerHp=767, enemyHp=0, damageToPlayer=0, damageToEnemy=668, friendshipCounter=0
- Run 21: outcome=timeout, policy=friendship, seed=late-game-coastal-tyrant-v0:21, rounds=75, playerHp=975, enemyHp=455, damageToPlayer=64, damageToEnemy=270, friendshipCounter=29
- Run 22: outcome=timeout, policy=resource-optimal, seed=late-game-coastal-tyrant-v0:22, rounds=75, playerHp=742, enemyHp=146, damageToPlayer=30, damageToEnemy=600, friendshipCounter=0
- Run 23: outcome=timeout, policy=random, seed=late-game-coastal-tyrant-v0:23, rounds=75, playerHp=716, enemyHp=266, damageToPlayer=65, damageToEnemy=505, friendshipCounter=11
- Run 24: outcome=timeout, policy=mixed, seed=late-game-coastal-tyrant-v0:24, rounds=75, playerHp=735, enemyHp=299, damageToPlayer=23, damageToEnemy=475, friendshipCounter=6
- Run 25: outcome=timeout, policy=aggressive, seed=late-game-coastal-tyrant-v0:25, rounds=75, playerHp=667, enemyHp=221, damageToPlayer=30, damageToEnemy=515, friendshipCounter=0
