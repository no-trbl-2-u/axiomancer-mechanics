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

- Win rate: 0.0%
- Defeat rate: 0.0%
- Friendship rate: 0.0%
- Timeout rate: 100.0%
- Average rounds: 75
- Median rounds: 75
- Average final player HP: 2426.68
- Average final enemy HP: 4453.08
- Average damage to player: 41.12
- Average damage to enemy: 528.12
- Max friendship counter: 3

## Outcome Counts

- victory: 0
- defeat: 0
- friendship: 0
- flee: 0
- timeout: 25

## Player Action Use

- attack: 1328
- skill: 496
- defend: 51

## Stance Use

- body: 1875
- heart: 0
- mind: 0

## Skill Use

- ad-hominem-strike: 496

## Enemy Action Use

- attack: 768
- skill:sorites-cascade: 654
- defend: 453

## Policy Summaries

### aggressive

- Runs: 7
- Win rate: 0.0%
- Defeat rate: 0.0%
- Friendship rate: 0.0%
- Timeout rate: 100.0%
- Average rounds: 75
- Average final player HP: 2431.14
- Average final enemy HP: 4574.14
- Average damage to player: 29.57
- Average damage to enemy: 408.14
- Max friendship counter: 0

### defensive

- Runs: 6
- Win rate: 0.0%
- Defeat rate: 0.0%
- Friendship rate: 0.0%
- Timeout rate: 100.0%
- Average rounds: 75
- Average final player HP: 2579.33
- Average final enemy HP: 3962.50
- Average damage to player: 8.50
- Average damage to enemy: 1015.50
- Max friendship counter: 3

### mixed

- Runs: 6
- Win rate: 0.0%
- Defeat rate: 0.0%
- Friendship rate: 0.0%
- Timeout rate: 100.0%
- Average rounds: 75
- Average final player HP: 2358.83
- Average final enemy HP: 4625.33
- Average damage to player: 80.83
- Average damage to enemy: 355.33
- Max friendship counter: 2

### strategist

- Runs: 6
- Win rate: 0.0%
- Defeat rate: 0.0%
- Friendship rate: 0.0%
- Timeout rate: 100.0%
- Average rounds: 75
- Average final player HP: 2336.67
- Average final enemy HP: 4630.17
- Average damage to player: 47.50
- Average damage to enemy: 353.50
- Max friendship counter: 0

## Findings for Tobin

- Outcome breakdown: 0% victory, 0% friendship, 0% defeat, 100% timeout
- 100% of runs timed out before combat resolved.
- Resolution success is 0%; target band is 65–75% victory plus friendship/mercy resolution.
- No friendship outcomes surfaced; Tobin should judge whether the peaceful route is too hidden or too costly.
- No Befriend attempts surfaced; mercy evidence is not yet exercising the doctrine path.
- STRATEGIST witness: 0% resolution success, average 75 rounds
- Dominant player action: attack (71% of actions).
- Dominant stance: body (100% of stances).

## Replay Seeds Worth Inspecting

- phase-121-difficult-v1:1
- phase-121-difficult-v1:2
- phase-121-difficult-v1:3
- phase-121-difficult-v1:4
- phase-121-difficult-v1:5
- phase-121-difficult-v1:6
- phase-121-difficult-v1:7
- phase-121-difficult-v1:8
- phase-121-difficult-v1:9
- phase-121-difficult-v1:10

## Run Summaries

- Run 1: outcome=timeout, policy=aggressive, seed=phase-121-difficult-v1:1, rounds=75, playerHp=2310, enemyHp=4543, damageToPlayer=17, damageToEnemy=439, friendshipCounter=0
- Run 2: outcome=timeout, policy=defensive, seed=phase-121-difficult-v1:2, rounds=75, playerHp=2726, enemyHp=3971, damageToPlayer=0, damageToEnemy=1010, friendshipCounter=0
- Run 3: outcome=timeout, policy=mixed, seed=phase-121-difficult-v1:3, rounds=75, playerHp=2383, enemyHp=4679, damageToPlayer=43, damageToEnemy=301, friendshipCounter=2
- Run 4: outcome=timeout, policy=strategist, seed=phase-121-difficult-v1:4, rounds=75, playerHp=2254, enemyHp=4664, damageToPlayer=68, damageToEnemy=323, friendshipCounter=0
- Run 5: outcome=timeout, policy=aggressive, seed=phase-121-difficult-v1:5, rounds=75, playerHp=2631, enemyHp=4582, damageToPlayer=33, damageToEnemy=398, friendshipCounter=0
- Run 6: outcome=timeout, policy=defensive, seed=phase-121-difficult-v1:6, rounds=75, playerHp=2468, enemyHp=4038, damageToPlayer=30, damageToEnemy=940, friendshipCounter=2
- Run 7: outcome=timeout, policy=mixed, seed=phase-121-difficult-v1:7, rounds=75, playerHp=2384, enemyHp=4544, damageToPlayer=51, damageToEnemy=436, friendshipCounter=2
- Run 8: outcome=timeout, policy=strategist, seed=phase-121-difficult-v1:8, rounds=75, playerHp=2325, enemyHp=4611, damageToPlayer=63, damageToEnemy=370, friendshipCounter=0
- Run 9: outcome=timeout, policy=aggressive, seed=phase-121-difficult-v1:9, rounds=75, playerHp=2415, enemyHp=4604, damageToPlayer=16, damageToEnemy=379, friendshipCounter=0
- Run 10: outcome=timeout, policy=defensive, seed=phase-121-difficult-v1:10, rounds=75, playerHp=2730, enemyHp=3762, damageToPlayer=21, damageToEnemy=1213, friendshipCounter=0
- Run 11: outcome=timeout, policy=mixed, seed=phase-121-difficult-v1:11, rounds=75, playerHp=2744, enemyHp=4601, damageToPlayer=45, damageToEnemy=380, friendshipCounter=0
- Run 12: outcome=timeout, policy=strategist, seed=phase-121-difficult-v1:12, rounds=75, playerHp=2502, enemyHp=4710, damageToPlayer=67, damageToEnemy=267, friendshipCounter=0
- Run 13: outcome=timeout, policy=aggressive, seed=phase-121-difficult-v1:13, rounds=75, playerHp=2259, enemyHp=4550, damageToPlayer=32, damageToEnemy=436, friendshipCounter=0
- Run 14: outcome=timeout, policy=defensive, seed=phase-121-difficult-v1:14, rounds=75, playerHp=2584, enemyHp=3972, damageToPlayer=0, damageToEnemy=1014, friendshipCounter=0
- Run 15: outcome=timeout, policy=mixed, seed=phase-121-difficult-v1:15, rounds=75, playerHp=2195, enemyHp=4681, damageToPlayer=160, damageToEnemy=304, friendshipCounter=0
- Run 16: outcome=timeout, policy=strategist, seed=phase-121-difficult-v1:16, rounds=75, playerHp=2419, enemyHp=4649, damageToPlayer=0, damageToEnemy=342, friendshipCounter=0
- Run 17: outcome=timeout, policy=aggressive, seed=phase-121-difficult-v1:17, rounds=75, playerHp=2565, enemyHp=4610, damageToPlayer=33, damageToEnemy=367, friendshipCounter=0
- Run 18: outcome=timeout, policy=defensive, seed=phase-121-difficult-v1:18, rounds=75, playerHp=2295, enemyHp=4091, damageToPlayer=0, damageToEnemy=874, friendshipCounter=3
- Run 19: outcome=timeout, policy=mixed, seed=phase-121-difficult-v1:19, rounds=75, playerHp=2259, enemyHp=4580, damageToPlayer=84, damageToEnemy=399, friendshipCounter=0
- Run 20: outcome=timeout, policy=strategist, seed=phase-121-difficult-v1:20, rounds=75, playerHp=2262, enemyHp=4587, damageToPlayer=67, damageToEnemy=395, friendshipCounter=0
- Run 21: outcome=timeout, policy=aggressive, seed=phase-121-difficult-v1:21, rounds=75, playerHp=2304, enemyHp=4636, damageToPlayer=40, damageToEnemy=355, friendshipCounter=0
- Run 22: outcome=timeout, policy=defensive, seed=phase-121-difficult-v1:22, rounds=75, playerHp=2673, enemyHp=3941, damageToPlayer=0, damageToEnemy=1042, friendshipCounter=0
- Run 23: outcome=timeout, policy=mixed, seed=phase-121-difficult-v1:23, rounds=75, playerHp=2188, enemyHp=4667, damageToPlayer=102, damageToEnemy=312, friendshipCounter=1
- Run 24: outcome=timeout, policy=strategist, seed=phase-121-difficult-v1:24, rounds=75, playerHp=2258, enemyHp=4560, damageToPlayer=20, damageToEnemy=424, friendshipCounter=0
- Run 25: outcome=timeout, policy=aggressive, seed=phase-121-difficult-v1:25, rounds=75, playerHp=2534, enemyHp=4494, damageToPlayer=36, damageToEnemy=483, friendshipCounter=0
