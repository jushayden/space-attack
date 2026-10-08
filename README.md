# Space Attack

A desktop browser arcade shooter built with Phaser, TypeScript, and Vite. Start a run, clear enemy formations, and survive increasingly fast enemy fire. High scores are saved to local storage and a backup cookie, with session storage and an in-memory copy as fallbacks. Export Score downloads a backup that Import Score can restore, including when browser storage is blocked. If all persistent storage is unavailable, exporting the file is required to keep the score after closing the browser.

## Run

Requires Node.js 22.12 or newer.

```sh
npm ci
npm run dev
```

Open the URL printed by Vite. For a production build, run `npm run build`, then `npm run preview`.

## Controls

| Action | Input |
| --- | --- |
| Move | A / D or Left / Right Arrow |
| Fire | Hold Space or left mouse button inside the playfield |
| Start, restart | Enter or the screen button |
| Resume | Enter or Escape |
| Pause, resume | Escape |

Opposite directions cancel, including mixed keyboard bindings. Movement has constant speed and stops on release. Space and mouse share one projectile slot. A new shot becomes available after the previous shot hits or exits the screen.

Each run starts with three ships, with the first waiting offscreen for directional input. Two spares appear at bottom right. Reaching 5,000 points awards one bonus ship per run. Both ships die on player/enemy contact. Player and enemy projectiles cancel each other on contact without awarding points. Switching tabs or losing window focus pauses the game; return and resume explicitly.

A destroyed player leaves an X and debris on screen for three seconds. After that, hold D or Right Arrow to slide in from the left, or A or Left Arrow to appear fully at the right edge, matching the entry asymmetry documented in the Arcadia guide. Opposing inputs cancel and keep the ship waiting. On the last life, the same three-second death display precedes Game Over; Enter starts a fresh run.

Clearing a wave displays the next formation immediately and removes the active ship for three seconds, matching the death delay. After that delay, directional input brings the ship back in from the corresponding edge. Enemies do not begin diving until the ship has entered the playfield.

## Enemy rules

The 41 enemies occupy six rows: 2 yellow, 5 red, 7 green, and three rows of 9 red. The formation moves slowly from side to side. Up to two randomly selected enemies dive diagonally, bounce off the sides, and sometimes reverse direction in midair. Divers fire downward more often as they descend. Survivors return to their original formation slots without awarding points. While the player is absent, existing divers keep moving without firing, and new dives wait for the player's return.

The fuel meter drains during active play and refills for each replacement ship and new wave. A tank lasts approximately 40 seconds, followed by a two-second empty warning before the ship is lost. Low fuel changes the meter to red and sounds a warning when sound is enabled. Pausing or waiting offscreen does not consume fuel. See [fuel measurements and timing assumptions](docs/fuel.md).

Enemy projectile speed increases each wave and stays below player projectile speed. Firing pressure and dive frequency also increase, with limits that preserve playability. Divers retain the video's measured screen-space slope of approximately 28.8 degrees below horizontal across waves. Their positions advance in 30 Hz steps to recreate the guide's described jerkiness; the exact original update frequency is not documented.

Formation rewards are 30 for lower red, 40 for green, 50 for upper red, and 60 for yellow. Diving rewards are 60, 80, 100, and 200 respectively. Each destroyed enemy awards points once. See [the scoring audit](docs/scoring.md) for timestamps, full-video HUD coverage, and remaining uncertainty in the reference.

## Checks

```sh
npm test
npm run build
```

With the development server running at port 5173 and Microsoft Edge installed, `node tests/browser.mjs` checks keyboard/mouse input, cancellation, pause, blur, scoring persistence, wave advancement, game over, restart, and narrow layout. It writes screenshots to the workspace's `work` folder. Browser state inspection exists only in development builds.

GitHub Actions runs the unit tests and production build on pushes and pull requests.

## Reference

[Space Attack longplay](https://www.youtube.com/watch?v=jYIC8ADIArc), [original Emerson manual](https://amigan.yatho.com/SpaceAttack-Emerson.pdf), and [Arcadia Gaming Guide](https://amigan.yatho.com/agg/). Sprites are drawn in code; no video frames or extracted game assets ship with the game. Desktop keyboard and mouse are required; touch controls are not implemented.
