import { test } from 'node:test';
import assert from 'node:assert/strict';
import { World, PLAYER_Y } from '../src/model.ts';

function world() {
  const w = new World(() => .5);
  w.start();
  w.diveTimer = 100;
  return w;
}

test('ram destroys the enemy and costs one ship with a kill reward', () => {
  const w = world();
  const enemy = w.enemies[0];
  Object.assign(enemy, { dive: true, x: w.x, y: PLAYER_Y, vx: 0 });
  w.step(1 / 60);
  assert.equal(w.enemies.includes(enemy), false);
  assert.equal(w.lives, 2);
  assert.ok(w.score > 0);
  assert.equal(w.high, w.score);
});

test('respawn immunity neither kills touching enemies nor costs another ship', () => {
  const w = world();
  const enemy = w.enemies[0];
  Object.assign(enemy, { dive: true, x: w.x, y: PLAYER_Y, vx: 0 });
  w.respawn = 1;
  w.bullets = [{ x: w.x, y: PLAYER_Y, vx: 0 }];
  w.step(1 / 60);
  assert.equal(w.enemies.includes(enemy), true);
  assert.equal(w.lives, 3);
  assert.equal(w.score, 0);
});

test('simultaneous enemy shots and contact consume only one life', () => {
  const w = world();
  const enemy = w.enemies[0];
  Object.assign(enemy, { dive: true, x: w.x, y: PLAYER_Y, vx: 0 });
  w.fire();
  w.bullets = Array.from({ length: 3 }, () => ({ x: w.x, y: PLAYER_Y, vx: 0 }));
  w.step(1 / 60);
  assert.equal(w.lives, 2);
  assert.equal(w.shot, null);
  assert.equal(w.bullets.length, 0);
});

test('one player shot destroys only the nearest enemy in its swept path', () => {
  const w = world();
  const [far, near] = w.enemies;
  Object.assign(far, { homeX: w.x, homeY: 290 });
  Object.assign(near, { homeX: w.x, homeY: 305 });
  w.enemies = [far, near];
  w.shot = { x: w.x, y: 320, vx: 0 };
  w.step(1 / 30);
  assert.deepEqual(w.enemies, [far]);
  assert.equal(w.shot, null);
  const score = w.score;
  w.step(1 / 30);
  assert.equal(w.score, score);
});

test('final-life ram removes both ships and ends the run once', () => {
  const w = world();
  const events: string[] = [];
  w.onEvent = event => events.push(event);
  const enemy = w.enemies[0];
  Object.assign(enemy, { dive: true, x: w.x, y: PLAYER_Y, vx: 0 });
  w.enemies = [enemy];
  w.lives = 1;
  w.step(1 / 60);
  assert.equal(w.mode, 'over');
  assert.equal(w.lives, 0);
  assert.equal(w.enemies.length, 0);
  assert.equal(w.waveWait, 0);
  assert.equal(events.filter(event => event === 'damage').length, 1);
  assert.equal(events.filter(event => event === 'over').length, 1);
  w.step(1 / 60);
  assert.equal(w.lives, 0);
});
