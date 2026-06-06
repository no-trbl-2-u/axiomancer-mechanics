# Playtest Report — sage-anchor-difficult

> Phase 121 Difficult anchor: Sage vs Balance Judge. Target: 25-50% actual wins across all policies.

## Scenario

- Preset: sage
- Enemy: balance-judge
- Seed: phase-121-difficult-v1
- Max rounds: 75
- Policies: aggressive, defensive, mixed, strategist
- Runs: 25

## Aggregate Metrics

- Win rate: 36.0%
- Defeat rate: 64.0%
- Friendship rate: 0.0%
- Timeout rate: 0.0%
- Average rounds: 23.76
- Median rounds: 24
- Average final player HP: 49.20
- Average final enemy HP: 105.16
- Average damage to player: 82.92
- Average damage to enemy: 327.64
- Max friendship counter: 1

## Outcome Counts

- victory: 9
- defeat: 16
- friendship: 0
- flee: 0
- timeout: 0

## Player Action Use

- attack: 262
- skill: 199
- item: 103
- defend: 30

## Stance Use

- body: 517
- mind: 77
- heart: 0

## Skill Use

- achilles-gambit: 127
- sorites-cascade: 36
- straw-giant: 32
- false-dilemma: 2
- undistributed-middle: 2

## Enemy Action Use

- attack: 230
- skill:sorites-cascade: 217
- defend: 147

## Policy Summaries

### aggressive

- Runs: 7
- Win rate: 42.9%
- Defeat rate: 57.1%
- Friendship rate: 0.0%
- Timeout rate: 0.0%
- Average rounds: 22
- Average final player HP: 61.71
- Average final enemy HP: 70
- Average damage to player: 57.71
- Average damage to enemy: 397.14
- Max friendship counter: 0

### defensive

- Runs: 6
- Win rate: 16.7%
- Defeat rate: 83.3%
- Friendship rate: 0.0%
- Timeout rate: 0.0%
- Average rounds: 23.33
- Average final player HP: 38.83
- Average final enemy HP: 156.17
- Average damage to player: 130.50
- Average damage to enemy: 305.33
- Max friendship counter: 1

### mixed

- Runs: 6
- Win rate: 33.3%
- Defeat rate: 66.7%
- Friendship rate: 0.0%
- Timeout rate: 0.0%
- Average rounds: 24.67
- Average final player HP: 49.17
- Average final enemy HP: 89.33
- Average damage to player: 82.50
- Average damage to enemy: 328.50
- Max friendship counter: 0

### strategist

- Runs: 6
- Win rate: 50.0%
- Defeat rate: 50.0%
- Friendship rate: 0.0%
- Timeout rate: 0.0%
- Average rounds: 25.33
- Average final player HP: 45
- Average final enemy HP: 111
- Average damage to player: 65.17
- Average damage to enemy: 268
- Max friendship counter: 1

## Findings for Tobin

- Outcome breakdown: 36% victory, 0% friendship, 64% defeat, 0% timeout
- Defeat rate is high at 64%.
- Resolution success is 36%; target band is 65–75% victory plus friendship/mercy resolution.
- No friendship outcomes surfaced; Tobin should judge whether the peaceful route is too hidden or too costly.
- No Befriend attempts surfaced; mercy evidence is not yet exercising the doctrine path.
- STRATEGIST witness: 50% resolution success, average 25.33 rounds
- Dominant stance: body (87% of stances).

## Replay Seeds Worth Inspecting

- phase-121-difficult-v1:3
- phase-121-difficult-v1:5
- phase-121-difficult-v1:6
- phase-121-difficult-v1:7
- phase-121-difficult-v1:8
- phase-121-difficult-v1:10
- phase-121-difficult-v1:11
- phase-121-difficult-v1:14
- phase-121-difficult-v1:16
- phase-121-difficult-v1:17

## Run Summaries

- Run 1: outcome=victory, policy=aggressive, seed=phase-121-difficult-v1:1, rounds=29, playerHp=21, enemyHp=0, damageToPlayer=45, damageToEnemy=486, friendshipCounter=0
- Run 2: outcome=victory, policy=defensive, seed=phase-121-difficult-v1:2, rounds=18, playerHp=233, enemyHp=0, damageToPlayer=0, damageToEnemy=467, friendshipCounter=0
- Run 3: outcome=defeat, policy=mixed, seed=phase-121-difficult-v1:3, rounds=26, playerHp=0, enemyHp=121, damageToPlayer=88, damageToEnemy=271, friendshipCounter=0
- Run 4: outcome=victory, policy=strategist, seed=phase-121-difficult-v1:4, rounds=31, playerHp=72, enemyHp=0, damageToPlayer=76, damageToEnemy=311, friendshipCounter=1
- Run 5: outcome=defeat, policy=aggressive, seed=phase-121-difficult-v1:5, rounds=27, playerHp=0, enemyHp=45, damageToPlayer=143, damageToEnemy=418, friendshipCounter=0
- Run 6: outcome=defeat, policy=defensive, seed=phase-121-difficult-v1:6, rounds=22, playerHp=0, enemyHp=204, damageToPlayer=212, damageToEnemy=253, friendshipCounter=0
- Run 7: outcome=defeat, policy=mixed, seed=phase-121-difficult-v1:7, rounds=27, playerHp=0, enemyHp=93, damageToPlayer=50, damageToEnemy=336, friendshipCounter=0
- Run 8: outcome=defeat, policy=strategist, seed=phase-121-difficult-v1:8, rounds=26, playerHp=0, enemyHp=210, damageToPlayer=44, damageToEnemy=189, friendshipCounter=0
- Run 9: outcome=victory, policy=aggressive, seed=phase-121-difficult-v1:9, rounds=25, playerHp=214, enemyHp=0, damageToPlayer=48, damageToEnemy=465, friendshipCounter=0
- Run 10: outcome=defeat, policy=defensive, seed=phase-121-difficult-v1:10, rounds=21, playerHp=0, enemyHp=256, damageToPlayer=192, damageToEnemy=203, friendshipCounter=1
- Run 11: outcome=defeat, policy=mixed, seed=phase-121-difficult-v1:11, rounds=24, playerHp=0, enemyHp=155, damageToPlayer=225, damageToEnemy=273, friendshipCounter=0
- Run 12: outcome=victory, policy=strategist, seed=phase-121-difficult-v1:12, rounds=29, playerHp=19, enemyHp=0, damageToPlayer=49, damageToEnemy=464, friendshipCounter=0
- Run 13: outcome=victory, policy=aggressive, seed=phase-121-difficult-v1:13, rounds=15, playerHp=197, enemyHp=0, damageToPlayer=0, damageToEnemy=474, friendshipCounter=0
- Run 14: outcome=defeat, policy=defensive, seed=phase-121-difficult-v1:14, rounds=31, playerHp=0, enemyHp=74, damageToPlayer=208, damageToEnemy=388, friendshipCounter=1
- Run 15: outcome=victory, policy=mixed, seed=phase-121-difficult-v1:15, rounds=18, playerHp=292, enemyHp=0, damageToPlayer=0, damageToEnemy=379, friendshipCounter=0
- Run 16: outcome=defeat, policy=strategist, seed=phase-121-difficult-v1:16, rounds=22, playerHp=0, enemyHp=297, damageToPlayer=139, damageToEnemy=132, friendshipCounter=1
- Run 17: outcome=defeat, policy=aggressive, seed=phase-121-difficult-v1:17, rounds=21, playerHp=0, enemyHp=129, damageToPlayer=40, damageToEnemy=332, friendshipCounter=0
- Run 18: outcome=defeat, policy=defensive, seed=phase-121-difficult-v1:18, rounds=26, playerHp=0, enemyHp=144, damageToPlayer=41, damageToEnemy=319, friendshipCounter=0
- Run 19: outcome=victory, policy=mixed, seed=phase-121-difficult-v1:19, rounds=31, playerHp=3, enemyHp=0, damageToPlayer=82, damageToEnemy=415, friendshipCounter=0
- Run 20: outcome=victory, policy=strategist, seed=phase-121-difficult-v1:20, rounds=19, playerHp=179, enemyHp=0, damageToPlayer=36, damageToEnemy=309, friendshipCounter=0
- Run 21: outcome=defeat, policy=aggressive, seed=phase-121-difficult-v1:21, rounds=19, playerHp=0, enemyHp=217, damageToPlayer=42, damageToEnemy=246, friendshipCounter=0
- Run 22: outcome=defeat, policy=defensive, seed=phase-121-difficult-v1:22, rounds=22, playerHp=0, enemyHp=259, damageToPlayer=130, damageToEnemy=202, friendshipCounter=1
- Run 23: outcome=defeat, policy=mixed, seed=phase-121-difficult-v1:23, rounds=22, playerHp=0, enemyHp=167, damageToPlayer=50, damageToEnemy=297, friendshipCounter=0
- Run 24: outcome=defeat, policy=strategist, seed=phase-121-difficult-v1:24, rounds=25, playerHp=0, enemyHp=159, damageToPlayer=47, damageToEnemy=203, friendshipCounter=0
- Run 25: outcome=defeat, policy=aggressive, seed=phase-121-difficult-v1:25, rounds=18, playerHp=0, enemyHp=99, damageToPlayer=86, damageToEnemy=359, friendshipCounter=0
