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

- Win rate: 44.0%
- Defeat rate: 0.0%
- Friendship rate: 32.0%
- Timeout rate: 24.0%
- Average rounds: 63.32
- Median rounds: 65
- Average final player HP: 717.56
- Average final enemy HP: 133.56
- Average damage to player: 19.28
- Average damage to enemy: 691.32
- Max friendship counter: 36

## Outcome Counts

- victory: 11
- defeat: 0
- friendship: 8
- flee: 0
- timeout: 6

## Player Action Use

- attack: 763
- defend: 516
- skill: 251
- item: 53

## Stance Use

- body: 834
- heart: 551
- mind: 198

## Skill Use

- mob-appeal: 135
- liars-echo: 74
- sorites-cascade: 23
- bootstrap-paradox: 19

## Enemy Action Use

- defend: 635
- skill:achilles-gambit: 572
- attack: 376

## Policy Summaries

### aggressive

- Runs: 5
- Win rate: 100.0%
- Defeat rate: 0.0%
- Friendship rate: 0.0%
- Timeout rate: 0.0%
- Average rounds: 54.20
- Average final player HP: 642.60
- Average final enemy HP: 0
- Average damage to player: 0
- Average damage to enemy: 831.40
- Max friendship counter: 0

### defensive

- Runs: 4
- Win rate: 50.0%
- Defeat rate: 0.0%
- Friendship rate: 0.0%
- Timeout rate: 50.0%
- Average rounds: 63
- Average final player HP: 614.50
- Average final enemy HP: 63.50
- Average damage to player: 2.50
- Average damage to enemy: 757.75
- Max friendship counter: 23

### friendship

- Runs: 4
- Win rate: 0.0%
- Defeat rate: 0.0%
- Friendship rate: 0.0%
- Timeout rate: 100.0%
- Average rounds: 75
- Average final player HP: 968
- Average final enemy HP: 455
- Average damage to player: 44.50
- Average damage to enemy: 404
- Max friendship counter: 36

### resource-optimal

- Runs: 4
- Win rate: 100.0%
- Defeat rate: 0.0%
- Friendship rate: 0.0%
- Timeout rate: 0.0%
- Average rounds: 68.50
- Average final player HP: 613.25
- Average final enemy HP: 0
- Average damage to player: 15.75
- Average damage to enemy: 828.75
- Max friendship counter: 0

### random

- Runs: 4
- Win rate: 0.0%
- Defeat rate: 0.0%
- Friendship rate: 100.0%
- Timeout rate: 0.0%
- Average rounds: 64.75
- Average final player HP: 731
- Average final enemy HP: 174.25
- Average damage to player: 38
- Average damage to enemy: 631
- Max friendship counter: 12

### mixed

- Runs: 4
- Win rate: 0.0%
- Defeat rate: 0.0%
- Friendship rate: 100.0%
- Timeout rate: 0.0%
- Average rounds: 56.75
- Average final player HP: 754.75
- Average final enemy HP: 142
- Average damage to player: 19.75
- Average damage to enemy: 660
- Max friendship counter: 6

## Findings for Tobin

- 24% of runs timed out before combat resolved.
- Friendship policy built enough counter (36) but never resolved; HP gate remains unmet at average final enemy HP 455.

## Replay Seeds Worth Inspecting

- late-game-coastal-tyrant-v0:2
- late-game-coastal-tyrant-v0:3
- late-game-coastal-tyrant-v0:9
- late-game-coastal-tyrant-v0:15
- late-game-coastal-tyrant-v0:20
- late-game-coastal-tyrant-v0:21

## Run Summaries

- Run 1: outcome=victory, policy=aggressive, seed=late-game-coastal-tyrant-v0:1, rounds=55, playerHp=647, enemyHp=0, damageToPlayer=0, damageToEnemy=846, friendshipCounter=0
- Run 2: outcome=timeout, policy=defensive, seed=late-game-coastal-tyrant-v0:2, rounds=75, playerHp=490, enemyHp=84, damageToPlayer=0, damageToEnemy=853, friendshipCounter=14
- Run 3: outcome=timeout, policy=friendship, seed=late-game-coastal-tyrant-v0:3, rounds=75, playerHp=963, enemyHp=455, damageToPlayer=65, damageToEnemy=496, friendshipCounter=26
- Run 4: outcome=victory, policy=resource-optimal, seed=late-game-coastal-tyrant-v0:4, rounds=64, playerHp=564, enemyHp=0, damageToPlayer=22, damageToEnemy=852, friendshipCounter=0
- Run 5: outcome=friendship, policy=random, seed=late-game-coastal-tyrant-v0:5, rounds=74, playerHp=658, enemyHp=171, damageToPlayer=43, damageToEnemy=666, friendshipCounter=10
- Run 6: outcome=friendship, policy=mixed, seed=late-game-coastal-tyrant-v0:6, rounds=51, playerHp=759, enemyHp=173, damageToPlayer=0, damageToEnemy=628, friendshipCounter=6
- Run 7: outcome=victory, policy=aggressive, seed=late-game-coastal-tyrant-v0:7, rounds=43, playerHp=775, enemyHp=0, damageToPlayer=0, damageToEnemy=667, friendshipCounter=0
- Run 8: outcome=victory, policy=defensive, seed=late-game-coastal-tyrant-v0:8, rounds=55, playerHp=684, enemyHp=0, damageToPlayer=10, damageToEnemy=771, friendshipCounter=0
- Run 9: outcome=timeout, policy=friendship, seed=late-game-coastal-tyrant-v0:9, rounds=75, playerHp=959, enemyHp=455, damageToPlayer=44, damageToEnemy=336, friendshipCounter=32
- Run 10: outcome=victory, policy=resource-optimal, seed=late-game-coastal-tyrant-v0:10, rounds=65, playerHp=599, enemyHp=0, damageToPlayer=9, damageToEnemy=815, friendshipCounter=0
- Run 11: outcome=friendship, policy=random, seed=late-game-coastal-tyrant-v0:11, rounds=55, playerHp=837, enemyHp=178, damageToPlayer=35, damageToEnemy=526, friendshipCounter=8
- Run 12: outcome=friendship, policy=mixed, seed=late-game-coastal-tyrant-v0:12, rounds=53, playerHp=791, enemyHp=137, damageToPlayer=60, damageToEnemy=522, friendshipCounter=5
- Run 13: outcome=victory, policy=aggressive, seed=late-game-coastal-tyrant-v0:13, rounds=67, playerHp=450, enemyHp=0, damageToPlayer=0, damageToEnemy=1001, friendshipCounter=0
- Run 14: outcome=victory, policy=defensive, seed=late-game-coastal-tyrant-v0:14, rounds=47, playerHp=714, enemyHp=0, damageToPlayer=0, damageToEnemy=729, friendshipCounter=0
- Run 15: outcome=timeout, policy=friendship, seed=late-game-coastal-tyrant-v0:15, rounds=75, playerHp=975, enemyHp=455, damageToPlayer=9, damageToEnemy=352, friendshipCounter=36
- Run 16: outcome=victory, policy=resource-optimal, seed=late-game-coastal-tyrant-v0:16, rounds=71, playerHp=589, enemyHp=0, damageToPlayer=13, damageToEnemy=825, friendshipCounter=0
- Run 17: outcome=friendship, policy=random, seed=late-game-coastal-tyrant-v0:17, rounds=65, playerHp=731, enemyHp=173, damageToPlayer=26, damageToEnemy=661, friendshipCounter=12
- Run 18: outcome=friendship, policy=mixed, seed=late-game-coastal-tyrant-v0:18, rounds=51, playerHp=846, enemyHp=178, damageToPlayer=19, damageToEnemy=591, friendshipCounter=5
- Run 19: outcome=victory, policy=aggressive, seed=late-game-coastal-tyrant-v0:19, rounds=51, playerHp=712, enemyHp=0, damageToPlayer=0, damageToEnemy=789, friendshipCounter=0
- Run 20: outcome=timeout, policy=defensive, seed=late-game-coastal-tyrant-v0:20, rounds=75, playerHp=570, enemyHp=170, damageToPlayer=0, damageToEnemy=678, friendshipCounter=23
- Run 21: outcome=timeout, policy=friendship, seed=late-game-coastal-tyrant-v0:21, rounds=75, playerHp=975, enemyHp=455, damageToPlayer=60, damageToEnemy=432, friendshipCounter=29
- Run 22: outcome=victory, policy=resource-optimal, seed=late-game-coastal-tyrant-v0:22, rounds=74, playerHp=701, enemyHp=0, damageToPlayer=19, damageToEnemy=823, friendshipCounter=0
- Run 23: outcome=friendship, policy=random, seed=late-game-coastal-tyrant-v0:23, rounds=65, playerHp=698, enemyHp=175, damageToPlayer=48, damageToEnemy=671, friendshipCounter=9
- Run 24: outcome=friendship, policy=mixed, seed=late-game-coastal-tyrant-v0:24, rounds=72, playerHp=623, enemyHp=80, damageToPlayer=0, damageToEnemy=899, friendshipCounter=5
- Run 25: outcome=victory, policy=aggressive, seed=late-game-coastal-tyrant-v0:25, rounds=55, playerHp=629, enemyHp=0, damageToPlayer=0, damageToEnemy=854, friendshipCounter=0
