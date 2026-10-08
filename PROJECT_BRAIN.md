# Space Attack

Fresh project created 2026-10-08. Phaser 3, TypeScript 5, Vite 7. Exact versions are in package-lock.json.

`src/model.ts` owns deterministic gameplay, injected randomness, collision resolution, scores, enemy selection, and wave progression. `src/main.ts` owns Phaser rendering, DOM HUD, input, local high-score persistence, sound, and sprite/effect drawing. `src/style.css` owns the page shell. Physics runs at 120 fixed steps per second, with a bounded catch-up interval after stalls.

Current requirements: exactly one player shot; A/D and arrows cancel across bindings; one active ship plus two spares; compact 41-unit formation; three colors with two red/green sprite variants; two random divers; reflections and random turns; downward firing accelerates with descent; enemy shot speed increases per wave but stays below the player's; contact kills both ships; stars begin below the formation; smaller darker divers; yellow enemy pulses and cyan X/debris on player death.

Spare ships use the same sprite pattern and proportional screen size as the player. Death leaves an X for three seconds, then awaits directional entry. Right input slides in from the left; left input appears fully at the right edge, matching the approved Arcadia Gaming Guide. Initial runs also await offscreen entry, without a death delay. Waves reset immediately and await input-directed entry without a timed delay. Existing divers continue moving without firing while the player is absent; new dives wait for reentry. Losing focus pauses the simulation and clears input. Enter restarts after the final three-second death display.

Divers move at horizontal speed 150 and vertical speed 82.5, matching the measured video screen-space slope (28.8 degrees). These speeds stay fixed across waves; enemy bullet speed and attack pressure still increase. Positions advance at 30 Hz, a deliberate approximation of documented jerky movement, not a claim about exact original hardware timing. Random midair-turn probability remains tunable rather than source-verified.

`src/scores.ts` validates scores, merges the highest local/cookie/session copy, writes redundant backups, and falls back to memory. Export/import JSON preserves the score when browser persistence is blocked. A status message appears if storage is unavailable. Alt+Shift+E exports and Alt+Shift+I imports a score backup.

Reference UI: unframed black screen, yellow score digits at the top, green spare ships and red wave number at bottom right. No branding bar, slogans, status strip, or control legend. Pause displays only PAUSED. There is no Settings panel. Sound is always enabled after the starting gesture. Yellow divers have downward-facing horns; enemy explosions are a single expanding circle. Player silhouette uses the reference's central turret, narrow stem, and flat wide base, with no exhaust effect.

Scoring uses row values confirmed by the original Emerson manual's page 4 table: formation 30/40/50/60 and diving 60/80/100/200. Video anomalies remain documented in docs/scoring.md. Do not reproduce repeated post-kill score bursts without new evidence establishing their cause.

Stars have independently randomized positions, brightness, size, and twinkle phase, and remain below the formation. Wave clear has no timed entry delay and displays the next formation immediately. No life is lost and no death X appears on an ordinary wave clear.

Validation: npm test, npm run build, and tests/browser.mjs with local Vite running. Public repository: https://github.com/jushayden/space-attack. No public hosting has been configured.

Difficulty and the current approximate diver angle and random-turn behavior were accepted on 2026-10-08. Sound gain is .075, with a stronger descending critical-fuel alert at 20% and a sound for each actual enemy projectile.

Optimization pass on 2026-10-08 retains 120 Hz simulation and accepted mechanics. Sprite textures are cached with four fractional rounding variants for 2.5px divers; pooled Images preserve layering. HUD writes only changed values (fuel width rounded to 0.1%). Loop sleeps on ready/paused/hidden and wakes on action, Escape, score import, resize, or visibility. Nearest-hit loops preserve tie order and collision priority; temporary per-step arrays are reduced. Model state/events match the previous version across 36,000 deterministic steps.
