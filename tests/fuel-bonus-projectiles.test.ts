import { test } from 'node:test';
import assert from 'node:assert/strict';
import { World, FUEL_DURATION, FUEL_EMPTY_GRACE, LOW_FUEL } from '../src/model.ts';

function world() {
  const w = new World(() => .5);
  w.start();
  w.awaitingEntry = false;
  w.x = 400;
  w.diveTimer = Infinity;
  return w;
}

function frames(w: World, count: number, move = 0) {
  for (let i = 0; i < count; i++) w.step(1 / 60, move);
}

test('fuel lasts forty active seconds and warns only in the last twenty percent', () => {
  const w = world();
  const events: string[] = [];
  w.onEvent = event => events.push(event);
  assert.equal(FUEL_DURATION, 40);
  assert.equal(LOW_FUEL, .2);
  frames(w, 60 * 31);
  assert.ok(Math.abs(w.fuel - 9) < 1e-8);
  assert.equal(events.includes('fuel-warning'), false);
  frames(w, 61);
  assert.ok(w.fuel <= 8);
  assert.equal(events.filter(e => e === 'fuel-warning').length, 1);
  frames(w, 60 * 8);
  assert.equal(w.fuel, 0);
  assert.equal(w.lives, 3);
  frames(w, 120);
  assert.equal(w.lives, 2);
  assert.equal(events.filter(e => e === 'damage').length, 1);
});

test('fuel does not drain during initial waiting, partial entry, or pause', () => {
  const w = new World(() => .5);
  w.start();
  frames(w, 600);
  assert.equal(w.fuel, 40);
  w.step(1 / 60, 1);
  assert.equal(w.playerActive, false);
  assert.equal(w.fuel, 40);
  frames(w, 8);
  assert.equal(w.playerActive, true);
  const fuel = w.fuel;
  w.pause();
  frames(w, 600);
  assert.equal(w.fuel, fuel);
  w.resume();
  w.step(1 / 60);
  assert.ok(w.fuel < fuel);
});

test('empty fuel warns, grants two active seconds, then costs one ship and refills on entry', () => {
  const w = world();
  const events: string[] = [];
  w.onEvent = event => events.push(event);
  assert.equal(FUEL_EMPTY_GRACE, 2);
  w.fuel = .01;
  w.fuelWarningTimer = .5;
  w.step(1 / 60);
  assert.equal(w.fuel, 0);
  assert.equal(w.lives, 3);
  assert.equal(w.fuelEmptyTimer, 2);
  assert.equal(events.filter(event => event === 'fuel-warning').length, 1);
  w.fire();
  assert.ok(w.shot);
  frames(w, 119);
  assert.equal(w.lives, 3);
  assert.ok(w.fuelEmptyTimer > 0);
  w.step(1 / 60);
  assert.equal(w.lives, 2);
  assert.equal(w.fuelEmptyTimer, 0);
  assert.equal(w.respawn, 3);
  frames(w, 181);
  assert.equal(w.fuel, 0);
  assert.equal(w.lives, 2);
  assert.equal(w.awaitingEntry, true);
  w.step(1 / 60, 1);
  assert.equal(w.fuel, 40);
  assert.equal(w.fuelEmptyTimer, 2);
  assert.equal(w.playerActive, false);
  frames(w, 8);
  assert.ok(w.fuel > 39.9);
  assert.equal(w.playerActive, true);
});

test('wave completion refills fuel and holds it while awaiting input', () => {
  const w = world();
  w.fuel = 0;
  w.fuelEmptyTimer = .5;
  w.enemies = [];
  w.step(1 / 60);
  assert.equal(w.wave, 2);
  assert.equal(w.fuel, 40);
  assert.equal(w.fuelEmptyTimer, 2);
  assert.equal(w.respawn, 0);
  frames(w, 179);
  assert.equal(w.fuel, 40);
  assert.equal(w.playerActive, false);
});

test('empty-fuel grace freezes while paused and resets on restart', () => {
  const w = world();
  w.fuel = .01;
  w.step(1 / 60);
  frames(w, 60);
  const remaining = w.fuelEmptyTimer;
  assert.ok(Math.abs(remaining - 1) < 1e-8);
  w.pause();
  frames(w, 600);
  assert.equal(w.fuelEmptyTimer, remaining);
  assert.equal(w.lives, 3);
  w.resume();
  frames(w, 59);
  assert.equal(w.lives, 3);
  w.step(1 / 60);
  assert.equal(w.lives, 2);
  w.start();
  assert.equal(w.fuelEmptyTimer, 2);
  assert.equal(w.fuel, 40);
});

test('crossing five thousand awards exactly one spare per run and resets on restart', () => {
  const w = world();
  const events: string[] = [];
  w.onEvent = event => events.push(event);
  w.score = 4900;
  w.kill(w.enemies[0]);
  assert.equal(w.score, 4960);
  assert.equal(w.lives, 3);
  w.kill(w.enemies[0]);
  assert.equal(w.score, 5020);
  assert.equal(w.lives, 4);
  assert.equal(w.bonusAwarded, true);
  w.score = 9990;
  w.kill(w.enemies[0]);
  assert.equal(w.lives, 4);
  assert.equal(events.filter(e => e === 'bonus').length, 1);
  w.start();
  assert.equal(w.bonusAwarded, false);
  assert.equal(w.lives, 3);
  w.score = 4940;
  w.kill(w.enemies[0]);
  assert.equal(w.score, 5000);
  assert.equal(w.lives, 4);
  assert.equal(events.filter(e => e === 'bonus').length, 2);
});

test('swept opposing projectiles cancel the nearest pair once without scoring', () => {
  const w = world();
  const events: string[] = [];
  w.onEvent = event => events.push(event);
  const far = { x: 400, y: 260, vx: 0 };
  const near = { x: 400, y: 275, vx: 0 };
  w.bullets = [far, near];
  w.shot = { x: 400, y: 300, vx: 0 };
  w.step(1 / 30);
  assert.equal(w.shot, null);
  assert.deepEqual(w.bullets, [far]);
  assert.equal(w.score, 0);
  assert.equal(w.lives, 3);
  assert.equal(events.filter(e => e === 'cancel').length, 1);
  w.step(1 / 30);
  assert.equal(events.filter(e => e === 'cancel').length, 1);
});

test('a nearer enemy projectile shields an enemy within the same swept path', () => {
  const w = world();
  const enemy = w.enemies[0];
  enemy.homeX = 400;
  enemy.homeY = 265;
  w.shot = { x: 400, y: 300, vx: 0 };
  w.bullets = [{ x: 400, y: 280, vx: 0 }];
  w.step(1 / 30);
  assert.equal(w.shot, null);
  assert.equal(w.bullets.length, 0);
  assert.equal(w.enemies.includes(enemy), true);
  assert.equal(w.score, 0);
});

test('an enemy nearer than the opposing projectile still receives the player hit', () => {
  const w = world();
  const enemy = w.enemies[0];
  enemy.homeX = 400;
  enemy.homeY = 285;
  const bullet = { x: 400, y: 260, vx: 0 };
  w.bullets = [bullet];
  w.shot = { x: 400, y: 300, vx: 0 };
  w.step(1 / 30);
  assert.equal(w.enemies.includes(enemy), false);
  assert.equal(w.score, 60);
  assert.equal(w.shot, null);
  assert.deepEqual(w.bullets, [bullet]);
});

test('nonaligned projectiles cross without cancellation', () => {
  const w = world();
  w.shot = { x: 400, y: 300, vx: 0 };
  const bullet = { x: 406, y: 280, vx: 0 };
  w.bullets = [bullet];
  w.step(1 / 30);
  assert.ok(w.shot);
  assert.deepEqual(w.bullets, [bullet]);
  assert.equal(w.score, 0);
});

test('projectiles already past each other do not cancel retroactively', () => {
  const w = world();
  w.shot = { x: 400, y: 300, vx: 0 };
  const bullet = { x: 400, y: 320, vx: 0 };
  w.bullets = [bullet];
  w.step(1 / 30);
  assert.ok(w.shot);
  assert.deepEqual(w.bullets, [bullet]);
});
