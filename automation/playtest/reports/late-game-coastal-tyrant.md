# Playtest Report — late-game-coastal-tyrant

> Late-game Sage preset against The Coastal Tyrant. First vertical proving ground for balance, timeout, friendship visibility, and dominant-policy detection.

## Scenario

- Preset: sage
- Enemy: coastal-tyrant
- Seed: late-game-coastal-tyrant-v0
- Max rounds: 70
- Policies: aggressive, defensive, mixed, strategist
- Runs: 100

## Aggregate Metrics

- Win rate: 70.0%
- Defeat rate: 0.0%
- Friendship rate: 0.0%
- Timeout rate: 30.0%
- Average rounds: 59.96
- Median rounds: 62
- Average final player HP: 3721.38
- Average final enemy HP: 26.89
- Average damage to player: 0.53
- Average damage to enemy: 644.39
- Max friendship counter: 3

## Outcome Counts

- victory: 70
- defeat: 0
- friendship: 0
- flee: 0
- timeout: 30

## Player Action Use

- attack: 3617
- skill: 1568
- defend: 565
- exploit: 246

## Stance Use

- body: 5618
- heart: 346
- mind: 32

## Skill Use

- ad-hominem-strike: 1486
- befriend: 50
- false-dilemma: 16
- undistributed-middle: 12
- sorites-cascade: 4

## Enemy Action Use

- defend: 2422
- skill:achilles-gambit: 2154
- attack: 1420

## Policy Summaries

### aggressive

- Runs: 25
- Win rate: 36.0%
- Defeat rate: 0.0%
- Friendship rate: 0.0%
- Timeout rate: 64.0%
- Average rounds: 68.52
- Average final player HP: 3716.12
- Average final enemy HP: 51.44
- Average damage to player: 0
- Average damage to enemy: 611.68
- Max friendship counter: 0

### defensive

- Runs: 25
- Win rate: 48.0%
- Defeat rate: 0.0%
- Friendship rate: 0.0%
- Timeout rate: 52.0%
- Average rounds: 66.84
- Average final player HP: 3714.12
- Average final enemy HP: 52.52
- Average damage to player: 0
- Average damage to enemy: 619.96
- Max friendship counter: 3

### mixed

- Runs: 25
- Win rate: 100.0%
- Defeat rate: 0.0%
- Friendship rate: 0.0%
- Timeout rate: 0.0%
- Average rounds: 53.88
- Average final player HP: 3727.16
- Average final enemy HP: 0
- Average damage to player: 0.28
- Average damage to enemy: 675.48
- Max friendship counter: 3

### strategist

- Runs: 25
- Win rate: 96.0%
- Defeat rate: 0.0%
- Friendship rate: 0.0%
- Timeout rate: 4.0%
- Average rounds: 50.60
- Average final player HP: 3728.12
- Average final enemy HP: 3.60
- Average damage to player: 1.84
- Average damage to enemy: 670.44
- Max friendship counter: 1

## Findings for Tobin

- Outcome breakdown: 70% victory, 0% friendship, 0% defeat, 30% timeout
- 30% of runs timed out before combat resolved.
- Actual win rate is 70% (70/100); target band is 65–75 victories only.
- No friendship outcomes surfaced; Tobin should judge whether the peaceful route is too hidden or too costly.
- Befriend skill metrics: 50 attempts, 100% success rate
- Mercy choices: 0 spare (0%), 246 exploit (100%)
- STRATEGIST witness: 96% actual win rate (24/25; needs 20+), average 50.60 rounds
- AGGRESSIVE is below T's 65% actual-win floor at 9/25; needs 17+.
- DEFENSIVE is below T's 65% actual-win floor at 12/25; needs 17+.
- MIXED clears T's 65% actual-win floor at 25/25; needs 17+.
- Dominant stance: body (94% of stances).
- Expressiveness verdict: thin — body stance dominates at 94%; mercy opens but is only exploited, not spared.

## Replay Seeds Worth Inspecting

- late-game-coastal-tyrant-v0:1
- late-game-coastal-tyrant-v0:5
- late-game-coastal-tyrant-v0:6
- late-game-coastal-tyrant-v0:9
- late-game-coastal-tyrant-v0:13
- late-game-coastal-tyrant-v0:14
- late-game-coastal-tyrant-v0:21
- late-game-coastal-tyrant-v0:22
- late-game-coastal-tyrant-v0:25
- late-game-coastal-tyrant-v0:26

## Run Summaries

- Run 1: outcome=timeout, policy=aggressive, seed=late-game-coastal-tyrant-v0:1, rounds=70, playerHp=3711, enemyHp=27, damageToPlayer=0, damageToEnemy=639, friendshipCounter=0
- Run 2: outcome=victory, policy=defensive, seed=late-game-coastal-tyrant-v0:2, rounds=59, playerHp=3716, enemyHp=0, damageToPlayer=0, damageToEnemy=670, friendshipCounter=3
- Run 3: outcome=victory, policy=mixed, seed=late-game-coastal-tyrant-v0:3, rounds=59, playerHp=3720, enemyHp=0, damageToPlayer=0, damageToEnemy=679, friendshipCounter=3
- Run 4: outcome=victory, policy=strategist, seed=late-game-coastal-tyrant-v0:4, rounds=52, playerHp=3729, enemyHp=0, damageToPlayer=0, damageToEnemy=657, friendshipCounter=1
- Run 5: outcome=timeout, policy=aggressive, seed=late-game-coastal-tyrant-v0:5, rounds=70, playerHp=3713, enemyHp=163, damageToPlayer=0, damageToEnemy=501, friendshipCounter=0
- Run 6: outcome=timeout, policy=defensive, seed=late-game-coastal-tyrant-v0:6, rounds=70, playerHp=3718, enemyHp=10, damageToPlayer=0, damageToEnemy=660, friendshipCounter=3
- Run 7: outcome=victory, policy=mixed, seed=late-game-coastal-tyrant-v0:7, rounds=46, playerHp=3730, enemyHp=0, damageToPlayer=0, damageToEnemy=653, friendshipCounter=3
- Run 8: outcome=victory, policy=strategist, seed=late-game-coastal-tyrant-v0:8, rounds=45, playerHp=3729, enemyHp=0, damageToPlayer=0, damageToEnemy=661, friendshipCounter=1
- Run 9: outcome=timeout, policy=aggressive, seed=late-game-coastal-tyrant-v0:9, rounds=70, playerHp=3715, enemyHp=88, damageToPlayer=0, damageToEnemy=574, friendshipCounter=0
- Run 10: outcome=victory, policy=defensive, seed=late-game-coastal-tyrant-v0:10, rounds=46, playerHp=3726, enemyHp=0, damageToPlayer=0, damageToEnemy=659, friendshipCounter=3
- Run 11: outcome=victory, policy=mixed, seed=late-game-coastal-tyrant-v0:11, rounds=50, playerHp=3733, enemyHp=0, damageToPlayer=0, damageToEnemy=678, friendshipCounter=3
- Run 12: outcome=victory, policy=strategist, seed=late-game-coastal-tyrant-v0:12, rounds=57, playerHp=3728, enemyHp=0, damageToPlayer=0, damageToEnemy=706, friendshipCounter=0
- Run 13: outcome=timeout, policy=aggressive, seed=late-game-coastal-tyrant-v0:13, rounds=70, playerHp=3717, enemyHp=130, damageToPlayer=0, damageToEnemy=534, friendshipCounter=0
- Run 14: outcome=timeout, policy=defensive, seed=late-game-coastal-tyrant-v0:14, rounds=70, playerHp=3717, enemyHp=82, damageToPlayer=0, damageToEnemy=586, friendshipCounter=3
- Run 15: outcome=victory, policy=mixed, seed=late-game-coastal-tyrant-v0:15, rounds=53, playerHp=3730, enemyHp=0, damageToPlayer=0, damageToEnemy=672, friendshipCounter=3
- Run 16: outcome=victory, policy=strategist, seed=late-game-coastal-tyrant-v0:16, rounds=48, playerHp=3734, enemyHp=0, damageToPlayer=0, damageToEnemy=690, friendshipCounter=1
- Run 17: outcome=victory, policy=aggressive, seed=late-game-coastal-tyrant-v0:17, rounds=68, playerHp=3721, enemyHp=0, damageToPlayer=0, damageToEnemy=661, friendshipCounter=0
- Run 18: outcome=victory, policy=defensive, seed=late-game-coastal-tyrant-v0:18, rounds=55, playerHp=3723, enemyHp=0, damageToPlayer=0, damageToEnemy=663, friendshipCounter=3
- Run 19: outcome=victory, policy=mixed, seed=late-game-coastal-tyrant-v0:19, rounds=50, playerHp=3732, enemyHp=0, damageToPlayer=0, damageToEnemy=664, friendshipCounter=3
- Run 20: outcome=victory, policy=strategist, seed=late-game-coastal-tyrant-v0:20, rounds=65, playerHp=3723, enemyHp=0, damageToPlayer=0, damageToEnemy=686, friendshipCounter=1
- Run 21: outcome=victory, policy=aggressive, seed=late-game-coastal-tyrant-v0:21, rounds=70, playerHp=3716, enemyHp=0, damageToPlayer=0, damageToEnemy=658, friendshipCounter=0
- Run 22: outcome=timeout, policy=defensive, seed=late-game-coastal-tyrant-v0:22, rounds=70, playerHp=3711, enemyHp=65, damageToPlayer=0, damageToEnemy=606, friendshipCounter=3
- Run 23: outcome=victory, policy=mixed, seed=late-game-coastal-tyrant-v0:23, rounds=62, playerHp=3713, enemyHp=0, damageToPlayer=0, damageToEnemy=659, friendshipCounter=3
- Run 24: outcome=victory, policy=strategist, seed=late-game-coastal-tyrant-v0:24, rounds=57, playerHp=3730, enemyHp=0, damageToPlayer=0, damageToEnemy=670, friendshipCounter=1
- Run 25: outcome=timeout, policy=aggressive, seed=late-game-coastal-tyrant-v0:25, rounds=70, playerHp=3717, enemyHp=7, damageToPlayer=0, damageToEnemy=658, friendshipCounter=0
- Run 26: outcome=timeout, policy=defensive, seed=late-game-coastal-tyrant-v0:26, rounds=70, playerHp=3703, enemyHp=240, damageToPlayer=0, damageToEnemy=435, friendshipCounter=3
- Run 27: outcome=victory, policy=mixed, seed=late-game-coastal-tyrant-v0:27, rounds=47, playerHp=3731, enemyHp=0, damageToPlayer=0, damageToEnemy=668, friendshipCounter=3
- Run 28: outcome=victory, policy=strategist, seed=late-game-coastal-tyrant-v0:28, rounds=57, playerHp=3730, enemyHp=0, damageToPlayer=0, damageToEnemy=685, friendshipCounter=0
- Run 29: outcome=timeout, policy=aggressive, seed=late-game-coastal-tyrant-v0:29, rounds=70, playerHp=3716, enemyHp=42, damageToPlayer=0, damageToEnemy=615, friendshipCounter=0
- Run 30: outcome=timeout, policy=defensive, seed=late-game-coastal-tyrant-v0:30, rounds=70, playerHp=3715, enemyHp=107, damageToPlayer=0, damageToEnemy=562, friendshipCounter=3
- Run 31: outcome=victory, policy=mixed, seed=late-game-coastal-tyrant-v0:31, rounds=41, playerHp=3734, enemyHp=0, damageToPlayer=0, damageToEnemy=688, friendshipCounter=3
- Run 32: outcome=victory, policy=strategist, seed=late-game-coastal-tyrant-v0:32, rounds=49, playerHp=3736, enemyHp=0, damageToPlayer=0, damageToEnemy=664, friendshipCounter=1
- Run 33: outcome=timeout, policy=aggressive, seed=late-game-coastal-tyrant-v0:33, rounds=70, playerHp=3710, enemyHp=67, damageToPlayer=0, damageToEnemy=599, friendshipCounter=0
- Run 34: outcome=victory, policy=defensive, seed=late-game-coastal-tyrant-v0:34, rounds=67, playerHp=3713, enemyHp=0, damageToPlayer=0, damageToEnemy=669, friendshipCounter=3
- Run 35: outcome=victory, policy=mixed, seed=late-game-coastal-tyrant-v0:35, rounds=47, playerHp=3733, enemyHp=0, damageToPlayer=0, damageToEnemy=688, friendshipCounter=3
- Run 36: outcome=victory, policy=strategist, seed=late-game-coastal-tyrant-v0:36, rounds=33, playerHp=3736, enemyHp=0, damageToPlayer=0, damageToEnemy=689, friendshipCounter=0
- Run 37: outcome=timeout, policy=aggressive, seed=late-game-coastal-tyrant-v0:37, rounds=70, playerHp=3715, enemyHp=4, damageToPlayer=0, damageToEnemy=659, friendshipCounter=0
- Run 38: outcome=victory, policy=defensive, seed=late-game-coastal-tyrant-v0:38, rounds=67, playerHp=3712, enemyHp=0, damageToPlayer=0, damageToEnemy=687, friendshipCounter=3
- Run 39: outcome=victory, policy=mixed, seed=late-game-coastal-tyrant-v0:39, rounds=53, playerHp=3727, enemyHp=0, damageToPlayer=7, damageToEnemy=677, friendshipCounter=2
- Run 40: outcome=victory, policy=strategist, seed=late-game-coastal-tyrant-v0:40, rounds=49, playerHp=3729, enemyHp=0, damageToPlayer=0, damageToEnemy=665, friendshipCounter=1
- Run 41: outcome=timeout, policy=aggressive, seed=late-game-coastal-tyrant-v0:41, rounds=70, playerHp=3713, enemyHp=191, damageToPlayer=0, damageToEnemy=472, friendshipCounter=0
- Run 42: outcome=timeout, policy=defensive, seed=late-game-coastal-tyrant-v0:42, rounds=70, playerHp=3718, enemyHp=29, damageToPlayer=0, damageToEnemy=642, friendshipCounter=3
- Run 43: outcome=victory, policy=mixed, seed=late-game-coastal-tyrant-v0:43, rounds=58, playerHp=3723, enemyHp=0, damageToPlayer=0, damageToEnemy=696, friendshipCounter=2
- Run 44: outcome=victory, policy=strategist, seed=late-game-coastal-tyrant-v0:44, rounds=44, playerHp=3704, enemyHp=0, damageToPlayer=29, damageToEnemy=651, friendshipCounter=0
- Run 45: outcome=victory, policy=aggressive, seed=late-game-coastal-tyrant-v0:45, rounds=67, playerHp=3720, enemyHp=0, damageToPlayer=0, damageToEnemy=671, friendshipCounter=0
- Run 46: outcome=timeout, policy=defensive, seed=late-game-coastal-tyrant-v0:46, rounds=70, playerHp=3709, enemyHp=146, damageToPlayer=0, damageToEnemy=528, friendshipCounter=3
- Run 47: outcome=victory, policy=mixed, seed=late-game-coastal-tyrant-v0:47, rounds=59, playerHp=3728, enemyHp=0, damageToPlayer=0, damageToEnemy=665, friendshipCounter=3
- Run 48: outcome=victory, policy=strategist, seed=late-game-coastal-tyrant-v0:48, rounds=57, playerHp=3725, enemyHp=0, damageToPlayer=0, damageToEnemy=680, friendshipCounter=0
- Run 49: outcome=timeout, policy=aggressive, seed=late-game-coastal-tyrant-v0:49, rounds=70, playerHp=3716, enemyHp=85, damageToPlayer=0, damageToEnemy=579, friendshipCounter=0
- Run 50: outcome=victory, policy=defensive, seed=late-game-coastal-tyrant-v0:50, rounds=66, playerHp=3716, enemyHp=0, damageToPlayer=0, damageToEnemy=662, friendshipCounter=3
- Run 51: outcome=victory, policy=mixed, seed=late-game-coastal-tyrant-v0:51, rounds=47, playerHp=3731, enemyHp=0, damageToPlayer=0, damageToEnemy=671, friendshipCounter=3
- Run 52: outcome=victory, policy=strategist, seed=late-game-coastal-tyrant-v0:52, rounds=28, playerHp=3743, enemyHp=0, damageToPlayer=0, damageToEnemy=662, friendshipCounter=0
- Run 53: outcome=timeout, policy=aggressive, seed=late-game-coastal-tyrant-v0:53, rounds=70, playerHp=3721, enemyHp=17, damageToPlayer=0, damageToEnemy=646, friendshipCounter=0
- Run 54: outcome=timeout, policy=defensive, seed=late-game-coastal-tyrant-v0:54, rounds=70, playerHp=3707, enemyHp=242, damageToPlayer=0, damageToEnemy=432, friendshipCounter=3
- Run 55: outcome=victory, policy=mixed, seed=late-game-coastal-tyrant-v0:55, rounds=68, playerHp=3723, enemyHp=0, damageToPlayer=0, damageToEnemy=663, friendshipCounter=3
- Run 56: outcome=victory, policy=strategist, seed=late-game-coastal-tyrant-v0:56, rounds=40, playerHp=3738, enemyHp=0, damageToPlayer=0, damageToEnemy=662, friendshipCounter=1
- Run 57: outcome=victory, policy=aggressive, seed=late-game-coastal-tyrant-v0:57, rounds=62, playerHp=3721, enemyHp=0, damageToPlayer=0, damageToEnemy=651, friendshipCounter=0
- Run 58: outcome=victory, policy=defensive, seed=late-game-coastal-tyrant-v0:58, rounds=67, playerHp=3716, enemyHp=0, damageToPlayer=0, damageToEnemy=689, friendshipCounter=3
- Run 59: outcome=victory, policy=mixed, seed=late-game-coastal-tyrant-v0:59, rounds=62, playerHp=3721, enemyHp=0, damageToPlayer=0, damageToEnemy=694, friendshipCounter=3
- Run 60: outcome=victory, policy=strategist, seed=late-game-coastal-tyrant-v0:60, rounds=52, playerHp=3729, enemyHp=0, damageToPlayer=0, damageToEnemy=682, friendshipCounter=0
- Run 61: outcome=timeout, policy=aggressive, seed=late-game-coastal-tyrant-v0:61, rounds=70, playerHp=3716, enemyHp=10, damageToPlayer=0, damageToEnemy=648, friendshipCounter=0
- Run 62: outcome=timeout, policy=defensive, seed=late-game-coastal-tyrant-v0:62, rounds=70, playerHp=3711, enemyHp=80, damageToPlayer=0, damageToEnemy=590, friendshipCounter=3
- Run 63: outcome=victory, policy=mixed, seed=late-game-coastal-tyrant-v0:63, rounds=59, playerHp=3725, enemyHp=0, damageToPlayer=0, damageToEnemy=659, friendshipCounter=3
- Run 64: outcome=victory, policy=strategist, seed=late-game-coastal-tyrant-v0:64, rounds=57, playerHp=3728, enemyHp=0, damageToPlayer=0, damageToEnemy=679, friendshipCounter=0
- Run 65: outcome=victory, policy=aggressive, seed=late-game-coastal-tyrant-v0:65, rounds=64, playerHp=3723, enemyHp=0, damageToPlayer=0, damageToEnemy=656, friendshipCounter=0
- Run 66: outcome=victory, policy=defensive, seed=late-game-coastal-tyrant-v0:66, rounds=67, playerHp=3712, enemyHp=0, damageToPlayer=0, damageToEnemy=675, friendshipCounter=3
- Run 67: outcome=victory, policy=mixed, seed=late-game-coastal-tyrant-v0:67, rounds=44, playerHp=3738, enemyHp=0, damageToPlayer=0, damageToEnemy=681, friendshipCounter=3
- Run 68: outcome=victory, policy=strategist, seed=late-game-coastal-tyrant-v0:68, rounds=57, playerHp=3724, enemyHp=0, damageToPlayer=0, damageToEnemy=681, friendshipCounter=0
- Run 69: outcome=victory, policy=aggressive, seed=late-game-coastal-tyrant-v0:69, rounds=67, playerHp=3720, enemyHp=0, damageToPlayer=0, damageToEnemy=664, friendshipCounter=0
- Run 70: outcome=timeout, policy=defensive, seed=late-game-coastal-tyrant-v0:70, rounds=70, playerHp=3713, enemyHp=41, damageToPlayer=0, damageToEnemy=626, friendshipCounter=3
- Run 71: outcome=victory, policy=mixed, seed=late-game-coastal-tyrant-v0:71, rounds=59, playerHp=3723, enemyHp=0, damageToPlayer=0, damageToEnemy=676, friendshipCounter=3
- Run 72: outcome=victory, policy=strategist, seed=late-game-coastal-tyrant-v0:72, rounds=49, playerHp=3732, enemyHp=0, damageToPlayer=0, damageToEnemy=658, friendshipCounter=0
- Run 73: outcome=victory, policy=aggressive, seed=late-game-coastal-tyrant-v0:73, rounds=70, playerHp=3720, enemyHp=0, damageToPlayer=0, damageToEnemy=666, friendshipCounter=0
- Run 74: outcome=victory, policy=defensive, seed=late-game-coastal-tyrant-v0:74, rounds=67, playerHp=3716, enemyHp=0, damageToPlayer=0, damageToEnemy=681, friendshipCounter=3
- Run 75: outcome=victory, policy=mixed, seed=late-game-coastal-tyrant-v0:75, rounds=59, playerHp=3720, enemyHp=0, damageToPlayer=0, damageToEnemy=705, friendshipCounter=3
- Run 76: outcome=victory, policy=strategist, seed=late-game-coastal-tyrant-v0:76, rounds=37, playerHp=3739, enemyHp=0, damageToPlayer=0, damageToEnemy=654, friendshipCounter=0
- Run 77: outcome=victory, policy=aggressive, seed=late-game-coastal-tyrant-v0:77, rounds=70, playerHp=3712, enemyHp=0, damageToPlayer=0, damageToEnemy=666, friendshipCounter=0
- Run 78: outcome=victory, policy=defensive, seed=late-game-coastal-tyrant-v0:78, rounds=67, playerHp=3710, enemyHp=0, damageToPlayer=0, damageToEnemy=672, friendshipCounter=3
- Run 79: outcome=victory, policy=mixed, seed=late-game-coastal-tyrant-v0:79, rounds=44, playerHp=3732, enemyHp=0, damageToPlayer=0, damageToEnemy=653, friendshipCounter=2
- Run 80: outcome=victory, policy=strategist, seed=late-game-coastal-tyrant-v0:80, rounds=52, playerHp=3727, enemyHp=0, damageToPlayer=0, damageToEnemy=680, friendshipCounter=0
- Run 81: outcome=timeout, policy=aggressive, seed=late-game-coastal-tyrant-v0:81, rounds=70, playerHp=3709, enemyHp=31, damageToPlayer=0, damageToEnemy=636, friendshipCounter=0
- Run 82: outcome=timeout, policy=defensive, seed=late-game-coastal-tyrant-v0:82, rounds=70, playerHp=3713, enemyHp=147, damageToPlayer=0, damageToEnemy=524, friendshipCounter=3
- Run 83: outcome=victory, policy=mixed, seed=late-game-coastal-tyrant-v0:83, rounds=47, playerHp=3734, enemyHp=0, damageToPlayer=0, damageToEnemy=684, friendshipCounter=3
- Run 84: outcome=timeout, policy=strategist, seed=late-game-coastal-tyrant-v0:84, rounds=70, playerHp=3713, enemyHp=90, damageToPlayer=0, damageToEnemy=586, friendshipCounter=0
- Run 85: outcome=timeout, policy=aggressive, seed=late-game-coastal-tyrant-v0:85, rounds=70, playerHp=3712, enemyHp=38, damageToPlayer=0, damageToEnemy=625, friendshipCounter=0
- Run 86: outcome=timeout, policy=defensive, seed=late-game-coastal-tyrant-v0:86, rounds=70, playerHp=3712, enemyHp=74, damageToPlayer=0, damageToEnemy=595, friendshipCounter=3
- Run 87: outcome=victory, policy=mixed, seed=late-game-coastal-tyrant-v0:87, rounds=56, playerHp=3724, enemyHp=0, damageToPlayer=0, damageToEnemy=666, friendshipCounter=3
- Run 88: outcome=victory, policy=strategist, seed=late-game-coastal-tyrant-v0:88, rounds=45, playerHp=3727, enemyHp=0, damageToPlayer=0, damageToEnemy=669, friendshipCounter=1
- Run 89: outcome=victory, policy=aggressive, seed=late-game-coastal-tyrant-v0:89, rounds=55, playerHp=3728, enemyHp=0, damageToPlayer=0, damageToEnemy=670, friendshipCounter=0
- Run 90: outcome=victory, policy=defensive, seed=late-game-coastal-tyrant-v0:90, rounds=70, playerHp=3712, enemyHp=0, damageToPlayer=0, damageToEnemy=674, friendshipCounter=3
- Run 91: outcome=victory, policy=mixed, seed=late-game-coastal-tyrant-v0:91, rounds=65, playerHp=3720, enemyHp=0, damageToPlayer=0, damageToEnemy=686, friendshipCounter=3
- Run 92: outcome=victory, policy=strategist, seed=late-game-coastal-tyrant-v0:92, rounds=56, playerHp=3730, enemyHp=0, damageToPlayer=0, damageToEnemy=688, friendshipCounter=1
- Run 93: outcome=timeout, policy=aggressive, seed=late-game-coastal-tyrant-v0:93, rounds=70, playerHp=3709, enemyHp=260, damageToPlayer=0, damageToEnemy=407, friendshipCounter=0
- Run 94: outcome=victory, policy=defensive, seed=late-game-coastal-tyrant-v0:94, rounds=63, playerHp=3720, enemyHp=0, damageToPlayer=0, damageToEnemy=696, friendshipCounter=3
- Run 95: outcome=victory, policy=mixed, seed=late-game-coastal-tyrant-v0:95, rounds=56, playerHp=3727, enemyHp=0, damageToPlayer=0, damageToEnemy=692, friendshipCounter=3
- Run 96: outcome=victory, policy=strategist, seed=late-game-coastal-tyrant-v0:96, rounds=57, playerHp=3711, enemyHp=0, damageToPlayer=17, damageToEnemy=665, friendshipCounter=0
- Run 97: outcome=timeout, policy=aggressive, seed=late-game-coastal-tyrant-v0:97, rounds=70, playerHp=3712, enemyHp=126, damageToPlayer=0, damageToEnemy=537, friendshipCounter=0
- Run 98: outcome=timeout, policy=defensive, seed=late-game-coastal-tyrant-v0:98, rounds=70, playerHp=3714, enemyHp=50, damageToPlayer=0, damageToEnemy=616, friendshipCounter=3
- Run 99: outcome=victory, policy=mixed, seed=late-game-coastal-tyrant-v0:99, rounds=56, playerHp=3727, enemyHp=0, damageToPlayer=0, damageToEnemy=670, friendshipCounter=2
- Run 100: outcome=victory, policy=strategist, seed=late-game-coastal-tyrant-v0:100, rounds=52, playerHp=3729, enemyHp=0, damageToPlayer=0, damageToEnemy=691, friendshipCounter=0
