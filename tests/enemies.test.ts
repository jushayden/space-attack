import { test } from 'node:test';
import assert from 'node:assert/strict';
import { World, difficulty, diveFireDelay, DIVE_TICK, DIVE_RATIO, HEIGHT, SHOT_SPEED, WIDTH } from '../src/model.ts';

function divingWorld() {
  const world = new World(() => .5);
  world.start(); world.awaitingEntry = false; world.x = 400;
  world.diveTimer = 0;
  world.step(1 / 60);
  return world;
}

test('dive cycles choose two distinct enemies and replenish only vacant slots', () => {
  const world = divingWorld();
  const divers = world.enemies.filter(enemy => enemy.dive);
  assert.equal(divers.length, 2);
  assert.notEqual(divers[0].id, divers[1].id);
  world.diveTimer = 0;
  world.step(1 / 60);
  assert.deepEqual(world.enemies.filter(enemy => enemy.dive).map(enemy => enemy.id), divers.map(enemy => enemy.id));
  world.enemies = world.enemies.filter(enemy => enemy !== divers[0]);
  world.diveTimer = 0;
  world.step(1 / 60);
  assert.equal(world.enemies.filter(enemy => enemy.dive).length, 2);
  assert.ok(divers[1].dive);
});

test('a lone remaining enemy can dive without creating a duplicate', () => {
  const world = new World(() => .5);
  world.start(); world.awaitingEntry = false; world.x = 400;
  world.enemies = world.enemies.slice(0, 1);
  world.diveTimer = 0;
  world.step(1 / 60);
  assert.equal(world.enemies.length, 1);
  assert.equal(world.enemies[0].dive, true);
});

test('divers reflect from both side boundaries and descend diagonally', () => {
  for (const side of [-1, 1]) {
    const world = divingWorld();
    const enemy = world.enemies.find(enemy => enemy.dive)!;
    enemy.x = side < 0 ? 23 : WIDTH - 23;
    enemy.vx = side * 140;
    enemy.turnTimer = 1;
    const oldY = enemy.y;
    world.step(1 / 30);
    assert.equal(Math.sign(enemy.vx), -side);
    assert.ok(enemy.x >= 23 && enemy.x <= WIDTH - 23);
    assert.ok(enemy.y > oldY);
  }
});

test('midair direction checks can reverse or retain the current diagonal', () => {
  for (const roll of [0, .8]) {
    const world = divingWorld();
    const enemy = world.enemies.find(enemy => enemy.dive)!;
    enemy.x = 400;
    enemy.vx = 120;
    enemy.turnTimer = 0;
    world.random = () => roll;
    world.step(1 / 60);
    assert.equal(enemy.vx, roll === 0 ? -120 : 120);
    assert.ok(enemy.turnTimer > 0);
  }
});

test('each diver fires independently downward with shorter intervals at lower heights', () => {
  const world = divingWorld();
  const divers = world.enemies.filter(enemy => enemy.dive);
  divers[0].y = 100;
  divers[1].y = 400;
  for (const enemy of divers) enemy.fireTimer = 0;
  world.step(1 / 60);
  assert.equal(world.bullets.length, 2);
  assert.ok(world.bullets.every(bullet => bullet.vx === 0));
  assert.ok(divers[1].fireTimer < divers[0].fireTimer);
  assert.ok(diveFireDelay(400, 2) < diveFireDelay(400, 1));
});

test('formation enemies do not fire and returning divers rejoin their moving home without reward', () => {
  const world = new World(() => .5);
  world.start(); world.awaitingEntry = false; world.x = 400;
  world.diveTimer = 100;
  for (let frame = 0; frame < 180; frame++) world.step(1 / 60);
  assert.equal(world.bullets.length, 0);
  const enemy = world.enemies[0];
  enemy.dive = true;
  enemy.y = HEIGHT + 21;
  world.step(1 / 60);
  assert.equal(enemy.dive, false);
  assert.equal(enemy.y, enemy.homeY);
  assert.equal(enemy.x, enemy.homeX + Math.sin(world.age * .8) * 22);
  assert.equal(world.score, 0);
});

test('enemy shots get faster beyond wave sixteen while remaining slower than player shots', () => {
  for (const wave of [1, 2, 15, 16, 100, 1000]) {
    assert.ok(difficulty(wave + 1).bulletSpeed > difficulty(wave).bulletSpeed);
    assert.ok(difficulty(wave).bulletSpeed < SHOT_SPEED);
  }
});

test('divers preserve their diagonal angle and speed across waves', () => {
  for (const wave of [1, 5, 16, 100]) {
    const world = new World(() => .5);
    world.start(); world.awaitingEntry = false; world.x = 400;
    world.wave = wave;
    world.diveTimer = 0;
    world.step(1 / 120);
    const enemy = world.enemies.find(enemy => enemy.dive)!;
    enemy.turnTimer = 10;
    const before = {x:enemy.x,y:enemy.y};
    world.step(DIVE_TICK);
    assert.ok(Math.abs(Math.abs(enemy.x - before.x) - 5) < 1e-9);
    assert.ok(Math.abs(enemy.y - before.y - 2.75) < 1e-9);
    assert.ok(Math.abs(Math.abs((enemy.x - before.x) / (enemy.y - before.y)) - DIVE_RATIO) < 1e-9);
  }
});

test('diver motion holds between ticks and advances one discrete step per tick', () => {
  const world = divingWorld();
  const enemy = world.enemies.find(enemy => enemy.dive)!;
  enemy.turnTimer = 10;
  const before = {x:enemy.x,y:enemy.y};
  for (let frame = 0; frame < 3; frame++) {
    world.step(DIVE_TICK / 4);
    assert.equal(enemy.x, before.x);
    assert.equal(enemy.y, before.y);
  }
  world.step(DIVE_TICK / 4);
  assert.ok(Math.abs(enemy.x - before.x - 5) < 1e-9);
  assert.ok(Math.abs(enemy.y - before.y - 2.75) < 1e-9);
  const after = {x:enemy.x,y:enemy.y};
  world.step(DIVE_TICK / 4);
  assert.equal(enemy.x, after.x);
  assert.equal(enemy.y, after.y);
});
