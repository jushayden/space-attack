# Space Attack

Fresh project created 2026-10-08. Phaser 3, TypeScript 5, Vite 7. Exact versions are in package-lock.json.

`src/model.ts` owns deterministic gameplay, injected randomness, collision resolution, scores, enemy selection, and wave progression. `src/main.ts` owns Phaser rendering, DOM HUD, input, local high-score persistence, sound, and sprite/effect drawing. `src/style.css` owns the page shell. Physics runs at 120 fixed steps per second, with a bounded catch-up interval after stalls.

Current requirements: exactly one player shot; A/D and arrows cancel across bindings; one active ship plus two spares; compact 41-unit formation; three colors with two red/green sprite variants; two random divers; reflections and random turns; downward firing accelerates with descent; enemy shot speed increases per wave but stays below the player's; contact kills both ships; stars begin below the formation; smaller darker divers; yellow enemy pulses and cyan X/debris on player death.

Spare ships use the same sprite pattern and proportional screen size as the player. Death leaves an X for three seconds, then awaits directional entry. Right input enters from the left; left input enters from the right. Waves reset immediately and await the same input-directed entry. Divers and combat wait while the player is absent. Losing focus pauses the simulation and clears input. Enter restarts after the final three-second death display.

`src/scores.ts` validates scores, merges the highest local/cookie/session copy, writes redundant backups, and falls back to memory. Export/import JSON preserves the score when browser persistence is blocked. Storage state is visible in the page's score backup controls.

Reference UI: unframed black screen, yellow score digits at the top, green spare ships and red wave number at bottom right. No branding bar, slogans, status strip, or control legend. Pause displays only PAUSED. Sound and score backup controls sit in a collapsed Settings menu. Player silhouette uses the reference's central turret, narrow stem, and flat wide base, with no exhaust effect.

Scoring uses row values confirmed by the original Emerson manual's page 4 table: formation 30/40/50/60 and diving 60/80/100/200. Video anomalies remain documented in docs/scoring.md. Do not reproduce repeated post-kill score bursts without new evidence establishing their cause.

Stars have independently randomized positions, brightness, size, and twinkle phase, and remain below the formation. Wave clear uses the same three-second entry delay as death while displaying the next formation immediately. No life is lost and no death X appears on an ordinary wave clear.

Validation: npm test, npm run build, and tests/browser.mjs with local Vite running. GitHub upload requires the exact destination approval requested by automatic review. No public hosting has been configured.
