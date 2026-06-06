# Playtest Report — sage-anchor-normal

> Phase 121 Normal anchor: Sage vs Audit Sentinel. Target: 75-100% actual wins across all policies.

## Scenario

- Preset: sage
- Enemy: audit-sentinel
- Seed: phase-121-normal-v1
- Max rounds: 50
- Policies: aggressive, defensive, mixed, strategist
- Runs: 25

## Aggregate Metrics

- Win rate: 80.0%
- Defeat rate: 0.0%
- Friendship rate: 0.0%
- Timeout rate: 20.0%
- Average rounds: 39.60
- Median rounds: 44
- Average final player HP: 254.80
- Average final enemy HP: 15.28
- Average damage to player: 106.08
- Average damage to enemy: 360.52
- Max friendship counter: 0

## Outcome Counts

- victory: 20
- defeat: 0
- friendship: 0
- flee: 0
- timeout: 5

## Player Action Use

- attack: 599
- skill: 364
- defend: 26
- item: 1

## Stance Use

- body: 866
- mind: 124
- heart: 0

## Skill Use

- achilles-gambit: 256
- sorites-cascade: 56
- straw-giant: 50
- undistributed-middle: 2

## Enemy Action Use

- attack: 375
- skill:false-dilemma: 337
- defend: 278

## Policy Summaries

### aggressive

- Runs: 7
- Win rate: 57.1%
- Defeat rate: 0.0%
- Friendship rate: 0.0%
- Timeout rate: 42.9%
- Average rounds: 48.86
- Average final player HP: 163.14
- Average final enemy HP: 16
- Average damage to player: 195.71
- Average damage to enemy: 409.71
- Max friendship counter: 0

### defensive

- Runs: 6
- Win rate: 66.7%
- Defeat rate: 0.0%
- Friendship rate: 0.0%
- Timeout rate: 33.3%
- Average rounds: 49
- Average final player HP: 226.33
- Average final enemy HP: 45
- Average damage to player: 135
- Average damage to enemy: 381.17
- Max friendship counter: 0

### mixed

- Runs: 6
- Win rate: 100.0%
- Defeat rate: 0.0%
- Friendship rate: 0.0%
- Timeout rate: 0.0%
- Average rounds: 32.83
- Average final player HP: 308.17
- Average final enemy HP: 0
- Average damage to player: 51.50
- Average damage to enemy: 337.33
- Max friendship counter: 0

### strategist

- Runs: 6
- Win rate: 100.0%
- Defeat rate: 0.0%
- Friendship rate: 0.0%
- Timeout rate: 0.0%
- Average rounds: 26.17
- Average final player HP: 336.83
- Average final enemy HP: 0
- Average damage to player: 27.17
- Average damage to enemy: 305.67
- Max friendship counter: 0

## Findings for Tobin

- Outcome breakdown: 80% victory, 0% friendship, 0% defeat, 20% timeout
- 20% of runs timed out before combat resolved.
- Resolution success is 80%; target band is 65–75% victory plus friendship/mercy resolution.
- No friendship outcomes surfaced; Tobin should judge whether the peaceful route is too hidden or too costly.
- No Befriend attempts surfaced; mercy evidence is not yet exercising the doctrine path.
- STRATEGIST witness: 100% resolution success, average 26.17 rounds
- Dominant stance: body (87% of stances).

## Replay Seeds Worth Inspecting

- phase-121-normal-v1:1
- phase-121-normal-v1:2
- phase-121-normal-v1:6
- phase-121-normal-v1:9
- phase-121-normal-v1:10
- phase-121-normal-v1:17
- phase-121-normal-v1:18
- phase-121-normal-v1:25

## Run Summaries

- Run 1: outcome=timeout, policy=aggressive, seed=phase-121-normal-v1:1, rounds=50, playerHp=167, enemyHp=17, damageToPlayer=185, damageToEnemy=404, friendshipCounter=0
- Run 2: outcome=victory, policy=defensive, seed=phase-121-normal-v1:2, rounds=50, playerHp=246, enemyHp=0, damageToPlayer=110, damageToEnemy=430, friendshipCounter=0
- Run 3: outcome=victory, policy=mixed, seed=phase-121-normal-v1:3, rounds=37, playerHp=287, enemyHp=0, damageToPlayer=70, damageToEnemy=323, friendshipCounter=0
- Run 4: outcome=victory, policy=strategist, seed=phase-121-normal-v1:4, rounds=28, playerHp=336, enemyHp=0, damageToPlayer=26, damageToEnemy=305, friendshipCounter=0
- Run 5: outcome=victory, policy=aggressive, seed=phase-121-normal-v1:5, rounds=49, playerHp=158, enemyHp=0, damageToPlayer=201, damageToEnemy=441, friendshipCounter=0
- Run 6: outcome=timeout, policy=defensive, seed=phase-121-normal-v1:6, rounds=50, playerHp=214, enemyHp=29, damageToPlayer=141, damageToEnemy=397, friendshipCounter=0
- Run 7: outcome=victory, policy=mixed, seed=phase-121-normal-v1:7, rounds=30, playerHp=345, enemyHp=0, damageToPlayer=17, damageToEnemy=328, friendshipCounter=0
- Run 8: outcome=victory, policy=strategist, seed=phase-121-normal-v1:8, rounds=36, playerHp=342, enemyHp=0, damageToPlayer=16, damageToEnemy=296, friendshipCounter=0
- Run 9: outcome=victory, policy=aggressive, seed=phase-121-normal-v1:9, rounds=50, playerHp=245, enemyHp=0, damageToPlayer=116, damageToEnemy=444, friendshipCounter=0
- Run 10: outcome=victory, policy=defensive, seed=phase-121-normal-v1:10, rounds=50, playerHp=225, enemyHp=0, damageToPlayer=135, damageToEnemy=425, friendshipCounter=0
- Run 11: outcome=victory, policy=mixed, seed=phase-121-normal-v1:11, rounds=30, playerHp=354, enemyHp=0, damageToPlayer=10, damageToEnemy=359, friendshipCounter=0
- Run 12: outcome=victory, policy=strategist, seed=phase-121-normal-v1:12, rounds=38, playerHp=283, enemyHp=0, damageToPlayer=76, damageToEnemy=314, friendshipCounter=0
- Run 13: outcome=victory, policy=aggressive, seed=phase-121-normal-v1:13, rounds=49, playerHp=187, enemyHp=0, damageToPlayer=174, damageToEnemy=428, friendshipCounter=0
- Run 14: outcome=victory, policy=defensive, seed=phase-121-normal-v1:14, rounds=46, playerHp=249, enemyHp=0, damageToPlayer=114, damageToEnemy=446, friendshipCounter=0
- Run 15: outcome=victory, policy=mixed, seed=phase-121-normal-v1:15, rounds=29, playerHp=335, enemyHp=0, damageToPlayer=25, damageToEnemy=327, friendshipCounter=0
- Run 16: outcome=victory, policy=strategist, seed=phase-121-normal-v1:16, rounds=16, playerHp=356, enemyHp=0, damageToPlayer=15, damageToEnemy=338, friendshipCounter=0
- Run 17: outcome=timeout, policy=aggressive, seed=phase-121-normal-v1:17, rounds=50, playerHp=97, enemyHp=88, damageToPlayer=261, damageToEnemy=325, friendshipCounter=0
- Run 18: outcome=timeout, policy=defensive, seed=phase-121-normal-v1:18, rounds=50, playerHp=169, enemyHp=241, damageToPlayer=205, damageToEnemy=154, friendshipCounter=0
- Run 19: outcome=victory, policy=mixed, seed=phase-121-normal-v1:19, rounds=34, playerHp=316, enemyHp=0, damageToPlayer=42, damageToEnemy=364, friendshipCounter=0
- Run 20: outcome=victory, policy=strategist, seed=phase-121-normal-v1:20, rounds=21, playerHp=348, enemyHp=0, damageToPlayer=18, damageToEnemy=309, friendshipCounter=0
- Run 21: outcome=victory, policy=aggressive, seed=phase-121-normal-v1:21, rounds=44, playerHp=187, enemyHp=0, damageToPlayer=177, damageToEnemy=418, friendshipCounter=0
- Run 22: outcome=victory, policy=defensive, seed=phase-121-normal-v1:22, rounds=48, playerHp=255, enemyHp=0, damageToPlayer=105, damageToEnemy=435, friendshipCounter=0
- Run 23: outcome=victory, policy=mixed, seed=phase-121-normal-v1:23, rounds=37, playerHp=212, enemyHp=0, damageToPlayer=145, damageToEnemy=323, friendshipCounter=0
- Run 24: outcome=victory, policy=strategist, seed=phase-121-normal-v1:24, rounds=18, playerHp=356, enemyHp=0, damageToPlayer=12, damageToEnemy=272, friendshipCounter=0
- Run 25: outcome=timeout, policy=aggressive, seed=phase-121-normal-v1:25, rounds=50, playerHp=101, enemyHp=7, damageToPlayer=256, damageToEnemy=408, friendshipCounter=0
