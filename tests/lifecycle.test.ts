import { test } from 'node:test';
import assert from 'node:assert/strict';
import { World, WIDTH, PLAYER_Y, direction } from '../src/model.ts';

function world() {
  const w = new World(() => .5);
  w.start();
  w.diveTimer = Infinity;
  frames(w, 9, 1);
  return w;
}

function frames(w: World, count: number, move = 0, firing = false) {
  for (let frame = 0; frame < count; frame++) w.step(1 / 60, move, firing);
}

function hit(w: World) {
  w.bullets.push({ x: w.x, y: PLAYER_Y, vx: 0 });
  w.step(1 / 60);
}

test('death holds the player explosion for three seconds and blocks shooting and entry', () => {
  const w = world();
  w.x = 250;
  hit(w);
  assert.equal(w.lives, 2);
  assert.equal(w.respawn, 3);
  assert.equal(w.playerActive, false);
  frames(w, 179, 1, true);
  assert.equal(w.x, 250);
  assert.ok(w.respawn > 0);
  assert.equal(w.shot, null);
  assert.equal(w.sparks.find(s => s.kind === 'player')?.x, 250);
  frames(w, 2);
  assert.equal(w.respawn, 0);
  assert.equal(w.sparks.some(s => s.kind === 'player'), false);
  assert.equal(w.awaitingEntry, true);
  assert.equal(w.playerActive, false);
});

test('neutral and canceled direction keep the next ship inactive after the delay', () => {
  const w = world();
  hit(w);
  frames(w, 181);
  for (const left of ['KeyA', 'ArrowLeft']) {
    for (const right of ['KeyD', 'ArrowRight']) {
      frames(w, 30, direction(new Set([left, right])), true);
      assert.equal(w.awaitingEntry, true);
      assert.equal(w.entryDirection, 0);
      assert.equal(w.playerActive, false);
      assert.equal(w.shot, null);
    }
  }
});

test('right input slides from the left and left input appears at the right after death', () => {
  for (const move of [-1, 1]) {
    const w = world();
    hit(w);
    frames(w, 181);
    w.step(1 / 60, move);
    assert.equal(w.awaitingEntry, false);
    if (move > 0) {
      assert.equal(w.entryDirection, 1);
      assert.equal(w.playerActive, false);
      assert.ok(w.x < 0);
      w.fire();
      assert.equal(w.shot, null);
      frames(w, 8);
      assert.equal(w.x, 24);
    } else {
      assert.equal(w.playerActive, true);
      assert.ok(w.x >= WIDTH - 30 && w.x <= WIDTH - 24);
    }
    assert.equal(w.entryDirection, 0);
    assert.equal(w.playerActive, true);
    w.fire();
    assert.ok(w.shot);
  }
});

test('clearing a wave immediately replaces the formation and waits for directional entry', () => {
  const w = world();
  const target = w.enemies[0];
  target.homeX = w.x;
  target.homeY = 300;
  w.enemies = [target];
  w.shot = { x: w.x, y: 315, vx: 0 };
  w.step(1 / 60);
  assert.equal(w.enemies.includes(target), false);
  assert.equal(w.enemies.length, 41);
  assert.equal(w.wave, 2);
  assert.equal(w.awaitingEntry, true);
  assert.equal(w.playerActive, false);
  const timer = w.diveTimer;
  const lives = w.lives;
  frames(w, 179, 1, true);
  assert.ok(w.respawn > 0);
  assert.equal(w.entryDirection, 0);
  assert.equal(w.awaitingEntry, true);
  assert.equal(w.lives, lives);
  frames(w, 421, 0, true);
  assert.equal(w.diveTimer, timer);
  assert.equal(w.enemies.filter(e => e.dive).length, 0);
  assert.equal(w.shot, null);
  assert.equal(w.wave, 2);
  w.step(1 / 60, 1);
  frames(w, 8);
  assert.equal(w.playerActive, true);
  frames(w, 150);
  assert.equal(w.enemies.filter(e => e.dive).length, 2);
});

test('pause freezes the death timer and explosion until resumed', () => {
  const w = world();
  hit(w);
  frames(w, 30);
  w.pause();
  const snapshot = JSON.stringify(w);
  frames(w, 240, 1, true);
  assert.equal(JSON.stringify(w), snapshot);
  w.resume();
  w.step(1 / 60);
  assert.ok(w.respawn < 2.5);
});

test('final death holds its explosion for three seconds without allowing reentry', () => {
  const w = world();
  w.lives = 1;
  hit(w);
  assert.equal(w.mode, 'over');
  assert.equal(w.respawn, 3);
  frames(w, 179, 1, true);
  assert.ok(w.respawn > 0);
  assert.equal(w.sparks.some(s => s.kind === 'player'), true);
  frames(w, 2, 1, true);
  assert.equal(w.respawn, 0);
  assert.equal(w.sparks.some(s => s.kind === 'player'), false);
  assert.equal(w.mode, 'over');
  assert.equal(w.playerActive, false);
  assert.equal(w.shot, null);
  w.start();
  assert.equal(w.playerActive, false);
  assert.equal(w.lives, 3);
  assert.equal(w.awaitingEntry, true);
  assert.equal(w.respawn, 0);
  assert.equal(w.x, -20);
  frames(w, 9, 1);
  assert.equal(w.playerActive, true);
});

test('starting waits offscreen without a delay and canceled input does not enter', () => {
  const w = new World(() => .5);
  w.start();
  assert.equal(w.x, -20);
  assert.equal(w.awaitingEntry, true);
  assert.equal(w.respawn, 0);
  frames(w, 60, direction(new Set(['KeyA', 'ArrowRight'])), true);
  assert.equal(w.x, -20);
  assert.equal(w.playerActive, false);
  assert.equal(w.shot, null);
  assert.equal(w.enemies.some(enemy => enemy.dive), false);
  w.step(1 / 60, -1);
  assert.equal(w.playerActive, true);
  assert.ok(w.x >= WIDTH - 30 && w.x <= WIDTH - 24);
});
