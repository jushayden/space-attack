# Scoring reference audit

Reference: [Space Attack video](https://www.youtube.com/watch?v=jYIC8ADIArc). Audit date: 2026-10-08. Timestamps refer to the video, with frame numbers counted from zero at 60 frames per second.

The formation uses four scoring classes despite having three colors. The lower red rows and the upper red row have different values. The [original Emerson manual, page 4](https://amigan.yatho.com/SpaceAttack-Emerson.pdf#page=4), independently located on 2026-10-08, explicitly confirms every formation and diving value below. Its printed table resolves the earlier uncertainty about upper-red and yellow diving rewards. The implementation awards points once when an enemy dies, including a ship collision that destroys both ships.

| Enemy class | In formation | Diving | Evidence |
| --- | ---: | ---: | --- |
| Lower red rows | 30 | 60 | Formation: 9.533 s, score 0 to 30. Diving: 10.000 s, 30 to 90, followed by repeated increments described below. |
| Green row | 40 | 80 | Formation: 19.250 s, 2900 to 2940; 26.350 s, 4830 to 4870; 32.500 s, 7230 to 7270. Diving: 36.900 s, 7590 to 7670. |
| Upper red row | 50 | 100 | Formation: 40.567 s, 7910 to 7960. Red diver events include 100-point increments at 16.867 s and 33.467 s; assigning those to the upper red subtype is an inference because the diving red sprites do not clearly preserve row identity. |
| Yellow command ships | 60 | 200 | Formation: 36.467 s, 7530 to 7590, after the shot reaches the yellow formation slot. A yellow diver is active before the 27.433 s change from 4900 to 5100. The manual confirms the fixed 200-point diving reward. |

The full recording contains six 200-point increments, at 27.433, 57.650, 67.183, 108.167, 213.650, and 217.133 seconds. It contains no 150- or 300-point increment. The game uses the manual's fixed 200-point reward for yellow divers. The attribution qualifications in the evidence column describe the video audit alone; the manual confirms the reward mapping. No wave multiplier or combo multiplier was established.

## Repeated score increments

The recording contains score changes that cannot represent independent kills of visible enemies:

| Interval | Observed score changes |
| --- | --- |
| 10.000 to 10.233 s | Eight increments of 60, from 30 to 510, every two video frames |
| 12.300 to 12.500 s | Seven increments of 60, from 600 to 1020, every two frames |
| 16.867 to 17.000 s | Five increments of 100, from 2310 to 2810, every two frames |
| 30.433 to 31.200 s | Repeated increments of 60 over a period shorter than one second |

Divers also flicker between consecutive frames in this recording. The video alone cannot distinguish a scoring bug, original game behavior, or recording/emulation effects. These bursts do not establish a per-kill multiplier. This implementation removes an enemy and awards its value once, so one projectile cannot repeatedly score against the same target.

## Coverage and verification

The full HUD pass decoded all 17,132 frames from 0.000 through 285.517 seconds. Template matching read the six score digits on every frame. The first two frames have no readable score; the remaining 17,130 readings match the digit templates. Enlarged score sheets were spot-checked visually. This automated pass measures score changes; it does not identify the cause of each change.

| Increment | Number of occurrences |
| --- | ---: |
| 30 | 114 |
| 40 | 37 |
| 50 | 15 |
| 60 | 550 |
| 80 | 107 |
| 100 | 123 |
| 200 | 6 |

Those 952 increments total 60,710, matching the final displayed score. Repeated bursts account for many increments, so these counts are not enemy kill counts.

The detailed visual audit also decoded all 2,400 consecutive full frames from 7.000 through 46.983 seconds and compared frames immediately before and after representative kills. It verified the numeric changes above against enlarged score crops and formation views. This is a close audit of the first wave, not a claim that every kill in the full recording has an unambiguous cause.

The source video and extracted images remain outside the repository. Only these findings and the scoring implementation belong to the project.
