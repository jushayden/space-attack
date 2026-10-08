import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Scores, type ScoreStore } from '../src/scores.ts';

function store(value: string | null, persistent = true): ScoreStore {
  return { read: () => value, write: next => { value = next; }, persistent };
}
function blocked(): ScoreStore {
  return { read: () => { throw new Error('Unavailable'); }, write: () => { throw new Error('Unavailable'); }, persistent: true };
}

test('cookie backup preserves scores when local storage is unavailable', () => {
  const cookie = store('240');
  const scores = new Scores([blocked(), cookie, store(null, false)]);
  assert.equal(scores.value, 240);
  assert.equal(scores.status, 'persistent');
  scores.save(420);
  assert.equal(new Scores([blocked(), cookie]).value, 420);
});

test('session-only storage is reported honestly and keeps the highest score', () => {
  const session = store(null, false);
  const scores = new Scores([blocked(), blocked(), session]);
  scores.save(120);
  scores.save(60);
  assert.equal(scores.status, 'session');
  assert.equal(new Scores([blocked(), session]).value, 120);
});

test('unavailable stores still support in-memory scoring and export/import', () => {
  const scores = new Scores([blocked(), blocked(), blocked()]);
  assert.equal(scores.status, 'memory');
  scores.save(640);
  const restored = new Scores([blocked()]);
  assert.equal(restored.import(scores.export()), 640);
  assert.equal(restored.status, 'memory');
  assert.equal(restored.import(JSON.stringify({game:'space-attack', version:1, highScore:20})), 640);
});

test('malformed backups are rejected without changing the saved score', () => {
  const scores = new Scores([store('120')]);
  for (const backup of ['{', 'null', '{}', '{"game":"other","version":1,"highScore":500}', '{"game":"space-attack","version":2,"highScore":500}', '{"game":"space-attack","version":1,"highScore":"500"}', '{"game":"space-attack","version":1,"highScore":-1}', '{"game":"space-attack","version":1,"highScore":2.5}', '{"game":"space-attack","version":1,"highScore":9007199254740992}']) {
    assert.throws(() => scores.import(backup));
    assert.equal(scores.value, 120);
  }
});

test('highest valid value wins across stores and repairs stale copies', () => {
  const stores = [store('100'), store('500'), store('300', false), store('invalid')];
  const scores = new Scores(stores);
  assert.equal(scores.value, 500);
  assert.equal(scores.status, 'persistent');
  assert.ok(stores.every(item => item.read() === '500'));
});

test('silently rejected writes do not count as durable storage', () => {
  const scores = new Scores([{ read: () => null, write: () => {}, persistent: true }]);
  scores.save(30);
  assert.equal(scores.value, 30);
  assert.equal(scores.status, 'memory');
});
