# Playtest Report — sage-anchor-easy

> Phase 121 Easy anchor: Sage vs Coastal Tyrant. Target: 100% actual wins across all policies.

## Scenario

- Preset: sage
- Enemy: coastal-tyrant
- Seed: phase-121-easy-v1
- Max rounds: 50
- Policies: aggressive, defensive, mixed, strategist
- Runs: 25

## Aggregate Metrics

- Win rate: 48.0%
- Defeat rate: 0.0%
- Friendship rate: 0.0%
- Timeout rate: 52.0%
- Average rounds: 45.32
- Median rounds: 50
- Average final player HP: 3729.60
- Average final enemy HP: 67
- Average damage to player: 0
- Average damage to enemy: 624.04
- Max friendship counter: 0

## Outcome Counts

- victory: 12
- defeat: 0
- friendship: 0
- flee: 0
- timeout: 13

## Player Action Use

- attack: 907
- skill: 226

## Stance Use

- body: 1133
- heart: 0
- mind: 0

## Skill Use

- ad-hominem-strike: 226

## Enemy Action Use

- defend: 462
- skill:achilles-gambit: 367
- attack: 304

## Policy Summaries

### aggressive

- Runs: 7
- Win rate: 0.0%
- Defeat rate: 0.0%
- Friendship rate: 0.0%
- Timeout rate: 100.0%
- Average rounds: 50
- Average final player HP: 3729
- Average final enemy HP: 136.43
- Average damage to player: 0
- Average damage to enemy: 545.14
- Max friendship counter: 0

### defensive

- Runs: 6
- Win rate: 100.0%
- Defeat rate: 0.0%
- Friendship rate: 0.0%
- Timeout rate: 0.0%
- Average rounds: 37
- Average final player HP: 3731.67
- Average final enemy HP: 0
- Average damage to player: 0
- Average damage to enemy: 694.33
- Max friendship counter: 0

### mixed

- Runs: 6
- Win rate: 66.7%
- Defeat rate: 0.0%
- Friendship rate: 0.0%
- Timeout rate: 33.3%
- Average rounds: 45.83
- Average final player HP: 3729.83
- Average final enemy HP: 54.67
- Average damage to player: 0
- Average damage to enemy: 642.83
- Max friendship counter: 0

### strategist

- Runs: 6
- Win rate: 33.3%
- Defeat rate: 0.0%
- Friendship rate: 0.0%
- Timeout rate: 66.7%
- Average rounds: 47.67
- Average final player HP: 3728
- Average final enemy HP: 65.33
- Average damage to player: 0
- Average damage to enemy: 627
- Max friendship counter: 0

## Findings for Tobin

- Outcome breakdown: 48% victory, 0% friendship, 0% defeat, 52% timeout
- 52% of runs timed out before combat resolved.
- Resolution success is 48%; target band is 65–75% victory plus friendship/mercy resolution.
- No friendship outcomes surfaced; Tobin should judge whether the peaceful route is too hidden or too costly.
- No Befriend attempts surfaced; mercy evidence is not yet exercising the doctrine path.
- STRATEGIST witness: 33% resolution success, average 47.67 rounds
- Dominant player action: attack (80% of actions).
- Dominant stance: body (100% of stances).

## Replay Seeds Worth Inspecting

- phase-121-easy-v1:1
- phase-121-easy-v1:4
- phase-121-easy-v1:5
- phase-121-easy-v1:8
- phase-121-easy-v1:9
- phase-121-easy-v1:11
- phase-121-easy-v1:12
- phase-121-easy-v1:13
- phase-121-easy-v1:14
- phase-121-easy-v1:17

## Run Summaries

- Run 1: outcome=timeout, policy=aggressive, seed=phase-121-easy-v1:1, rounds=50, playerHp=3726, enemyHp=159, damageToPlayer=0, damageToEnemy=524, friendshipCounter=0
- Run 2: outcome=victory, policy=defensive, seed=phase-121-easy-v1:2, rounds=30, playerHp=3737, enemyHp=0, damageToPlayer=0, damageToEnemy=697, friendshipCounter=0
- Run 3: outcome=victory, policy=mixed, seed=phase-121-easy-v1:3, rounds=47, playerHp=3730, enemyHp=0, damageToPlayer=0, damageToEnemy=685, friendshipCounter=0
- Run 4: outcome=timeout, policy=strategist, seed=phase-121-easy-v1:4, rounds=50, playerHp=3730, enemyHp=22, damageToPlayer=0, damageToEnemy=664, friendshipCounter=0
- Run 5: outcome=timeout, policy=aggressive, seed=phase-121-easy-v1:5, rounds=50, playerHp=3730, enemyHp=179, damageToPlayer=0, damageToEnemy=500, friendshipCounter=0
- Run 6: outcome=victory, policy=defensive, seed=phase-121-easy-v1:6, rounds=42, playerHp=3728, enemyHp=0, damageToPlayer=0, damageToEnemy=718, friendshipCounter=0
- Run 7: outcome=victory, policy=mixed, seed=phase-121-easy-v1:7, rounds=47, playerHp=3731, enemyHp=0, damageToPlayer=0, damageToEnemy=685, friendshipCounter=0
- Run 8: outcome=timeout, policy=strategist, seed=phase-121-easy-v1:8, rounds=50, playerHp=3725, enemyHp=101, damageToPlayer=0, damageToEnemy=587, friendshipCounter=0
- Run 9: outcome=timeout, policy=aggressive, seed=phase-121-easy-v1:9, rounds=50, playerHp=3733, enemyHp=74, damageToPlayer=0, damageToEnemy=607, friendshipCounter=0
- Run 10: outcome=victory, policy=defensive, seed=phase-121-easy-v1:10, rounds=28, playerHp=3739, enemyHp=0, damageToPlayer=0, damageToEnemy=678, friendshipCounter=0
- Run 11: outcome=timeout, policy=mixed, seed=phase-121-easy-v1:11, rounds=50, playerHp=3725, enemyHp=151, damageToPlayer=0, damageToEnemy=533, friendshipCounter=0
- Run 12: outcome=timeout, policy=strategist, seed=phase-121-easy-v1:12, rounds=50, playerHp=3730, enemyHp=80, damageToPlayer=0, damageToEnemy=603, friendshipCounter=0
- Run 13: outcome=timeout, policy=aggressive, seed=phase-121-easy-v1:13, rounds=50, playerHp=3731, enemyHp=190, damageToPlayer=0, damageToEnemy=490, friendshipCounter=0
- Run 14: outcome=victory, policy=defensive, seed=phase-121-easy-v1:14, rounds=50, playerHp=3721, enemyHp=0, damageToPlayer=0, damageToEnemy=693, friendshipCounter=0
- Run 15: outcome=victory, policy=mixed, seed=phase-121-easy-v1:15, rounds=42, playerHp=3731, enemyHp=0, damageToPlayer=0, damageToEnemy=725, friendshipCounter=0
- Run 16: outcome=victory, policy=strategist, seed=phase-121-easy-v1:16, rounds=47, playerHp=3728, enemyHp=0, damageToPlayer=0, damageToEnemy=705, friendshipCounter=0
- Run 17: outcome=timeout, policy=aggressive, seed=phase-121-easy-v1:17, rounds=50, playerHp=3727, enemyHp=118, damageToPlayer=0, damageToEnemy=564, friendshipCounter=0
- Run 18: outcome=victory, policy=defensive, seed=phase-121-easy-v1:18, rounds=38, playerHp=3732, enemyHp=0, damageToPlayer=0, damageToEnemy=699, friendshipCounter=0
- Run 19: outcome=timeout, policy=mixed, seed=phase-121-easy-v1:19, rounds=50, playerHp=3724, enemyHp=177, damageToPlayer=0, damageToEnemy=511, friendshipCounter=0
- Run 20: outcome=timeout, policy=strategist, seed=phase-121-easy-v1:20, rounds=50, playerHp=3722, enemyHp=189, damageToPlayer=0, damageToEnemy=501, friendshipCounter=0
- Run 21: outcome=timeout, policy=aggressive, seed=phase-121-easy-v1:21, rounds=50, playerHp=3728, enemyHp=131, damageToPlayer=0, damageToEnemy=553, friendshipCounter=0
- Run 22: outcome=victory, policy=defensive, seed=phase-121-easy-v1:22, rounds=34, playerHp=3733, enemyHp=0, damageToPlayer=0, damageToEnemy=681, friendshipCounter=0
- Run 23: outcome=victory, policy=mixed, seed=phase-121-easy-v1:23, rounds=39, playerHp=3738, enemyHp=0, damageToPlayer=0, damageToEnemy=718, friendshipCounter=0
- Run 24: outcome=victory, policy=strategist, seed=phase-121-easy-v1:24, rounds=39, playerHp=3733, enemyHp=0, damageToPlayer=0, damageToEnemy=702, friendshipCounter=0
- Run 25: outcome=timeout, policy=aggressive, seed=phase-121-easy-v1:25, rounds=50, playerHp=3728, enemyHp=104, damageToPlayer=0, damageToEnemy=578, friendshipCounter=0
