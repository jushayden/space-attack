import { test } from 'node:test';
import assert from 'node:assert/strict';
import { World, DIVE_TICK, HEIGHT, WIDTH } from '../src/model.ts';

function setup(finalLife = false) {
  const world = new World(() => .5);
  world.start();
  world.awaitingEntry = false;
  world.x = 400;
  world.diveTimer = 0;
  world.step(DIVE_TICK);
  const divers = world.enemies.filter(enemy => enemy.dive);
  for (const enemy of divers) {
    enemy.fireTimer = 0;
    enemy.turnTimer = 100;
  }
  if (finalLife) world.lives = 1;
  world.damage();
  return {world, divers};
}

test('existing divers keep moving through death and waiting without shooting or adding divers', () => {
  const {world, divers} = setup();
  const oldY = divers[0].y;
  world.diveTimer = 0;
  for (let tick = 0; tick < 120; tick++) world.step(DIVE_TICK);
  assert.equal(world.respawn, 0);
  assert.equal(world.awaitingEntry, true);
  assert.ok(divers[0].y > oldY);
  assert.deepEqual(world.enemies.filter(enemy => enemy.dive), divers);
  assert.equal(world.bullets.length, 0);
  assert.equal(world.diveTimer, 0);
  assert.equal(world.lives, 2);
  for (let tick = 0; tick < 240; tick++) world.step(DIVE_TICK);
  assert.equal(world.enemies.filter(enemy => enemy.dive).length, 0);
  assert.equal(world.bullets.length, 0);
  for (const enemy of divers) {
    assert.equal(enemy.y, enemy.homeY);
    assert.equal(enemy.x, enemy.homeX + Math.sin(world.age * .8) * 22);
  }
});

test('absent-player divers still bounce and can reverse diagonals midair', () => {
  const {world, divers} = setup();
  const enemy = divers[0];
  enemy.x = WIDTH - 23;
  enemy.vx = 150;
  world.step(DIVE_TICK);
  assert.equal(enemy.vx, -150);
  enemy.x = 400;
  enemy.turnTimer = 0;
  world.random = () => 0;
  world.step(DIVE_TICK);
  assert.equal(enemy.vx, 150);
  assert.equal(world.bullets.length, 0);
});

test('final death allows current divers to finish their paths without attacks', () => {
  const {world, divers} = setup(true);
  const enemy = divers[0];
  enemy.y = HEIGHT + 19;
  const oldY = divers[1].y;
  world.step(DIVE_TICK);
  assert.equal(enemy.dive, false);
  assert.ok(divers[1].y > oldY);
  for (let tick = 0; tick < 300; tick++) world.step(DIVE_TICK);
  assert.equal(world.mode, 'over');
  assert.equal(world.enemies.filter(item => item.dive).length, 0);
  assert.equal(world.bullets.length, 0);
  assert.equal(world.score, 0);
});

test('pausing a death freezes diver positions and timers until resumed', () => {
  const {world, divers} = setup();
  world.pause();
  const snapshot = JSON.stringify(world);
  world.step(DIVE_TICK);
  assert.equal(JSON.stringify(world), snapshot);
  const y = divers[0].y;
  world.resume();
  world.step(DIVE_TICK);
  assert.ok(divers[0].y > y);
  assert.equal(world.bullets.length, 0);
});

test('attacks resume only after the player enters the arena again', () => {
  const {world, divers} = setup();
  world.respawn = 0;
  world.diveTimer = 0;
  for (const enemy of divers) enemy.y = 200;
  world.step(DIVE_TICK);
  assert.equal(world.bullets.length, 0);
  world.step(DIVE_TICK, -1);
  assert.equal(world.playerActive, true);
  assert.equal(world.bullets.length, 2);
});
