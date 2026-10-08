# Space Attack

Fresh project created 2026-10-08. Phaser 3, TypeScript 5, Vite 7. Exact versions are in package-lock.json.

`src/model.ts` owns deterministic gameplay, injected randomness, collision resolution, scores, enemy selection, and wave progression. `src/main.ts` owns Phaser rendering, DOM HUD, input, local high-score persistence, sound, and sprite/effect drawing. `src/style.css` owns the page shell. Physics runs at 120 fixed steps per second, with a bounded catch-up interval after stalls.

Current requirements: exactly one player shot; A/D and arrows cancel across bindings; one active ship plus two spares; compact 41-unit formation; three colors with two red/green sprite variants; two random divers; reflections and random turns; downward firing accelerates with descent; enemy shot speed increases per wave but stays below the player's; contact kills both ships; stars begin below the formation; smaller darker divers; yellow enemy pulses and cyan X/debris on player death.

Spare ships use the same sprite pattern and proportional screen size as the player. Respawning briefly removes the active ship rather than displaying an invulnerable ship. Losing focus pauses the simulation and clears input.

Scoring uses observed row values, with remaining reference uncertainties documented in docs/scoring.md. Do not reproduce repeated post-kill score bursts without new evidence establishing their cause.

Validation: npm test, npm run build, and tests/browser.mjs with local Vite running. GitHub upload requires the exact destination approval requested by automatic review. No public hosting has been configured.
