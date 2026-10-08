# Fuel behavior

Sources: [reference video](https://www.youtube.com/watch?v=jYIC8ADIArc) and [Emerson Space Attack manual, page 2](https://amigan.yatho.com/SpaceAttack-Emerson.pdf). Reviewed 2026-10-08.

The manual specifies an audible warning when fuel reaches empty, followed by the active ship exploding if combat continues. A spare then takes over. It does not specify the fuel duration, warning threshold before empty, or delay between the empty warning and explosion.

## Video measurements

The green meter spans 360 pixels in the 1280 × 720 recording. It decreases in 40-pixel steps, giving nine visible segments. Sampling the entire recording at half-second intervals found approximately 4.25–4.5 seconds between steps during uninterrupted play. Nine such intervals imply roughly 38.6 seconds of fuel. This is an extrapolation from the meter, not a directly observed full-to-empty lifetime.

| Approximate video time | Meter | Observation |
| --- | --- | --- |
| 6 s | Full | Start of the first uninterrupted combat run |
| 10, 14.5, 18.5, 23, 27, 31.5, 35.5, 40 s | Successive reductions | First-wave drain |
| 42.5 s | Full | Refill as wave 2 begins |
| 77 s | 1/9 | Final visible segment in wave 2 |
| 81 s | Full | Refill as wave 3 begins |
| 152.5 s | 1/9 | Ship explosion; cause cannot be established from the fuel meter |
| 155.5 s | Full | Refill after the explosion, before the replacement enters |
| 176 s | Full | Another replacement refills a partially depleted meter |

Times have approximately half-second precision. No sampled frame showed a completely empty meter. The recording therefore does not establish the empty-fuel grace period. The remaining segment stays green; a separate 20% low-fuel warning is an interface choice.

## Implementation tuning

A 40-second tank approximates the measured drain rate. Refill on each new wave and replacement ship. Pause fuel consumption while the game is paused or no active ship is present.

The game warns at 20% fuel and again when the tank reaches empty. Empty fuel starts a two-second grace period during which the player can still move, shoot, and clear the wave. If fuel remains empty, the active ship explodes. Pausing freezes this timer. Starting a run, entering with a replacement ship, or advancing a wave resets the tank and grace period.

The two-second grace period and 20% warning threshold are gameplay settings. The manual establishes the empty warning and eventual destruction; the recording does not establish their timing.
