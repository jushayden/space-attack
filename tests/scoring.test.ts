import { test } from 'node:test';
import assert from 'node:assert/strict';
import { World } from '../src/model.ts';

test('formation rewards distinguish lower red, green, upper red, and yellow rows', () => {
  for (const [row, points] of [[3,30],[2,40],[1,50],[0,60]]) {
    const world = new World(); world.start();
    const target = world.enemies.find(enemy => enemy.homeY === 48 + row * 27)!;
    world.enemies = [target]; world.shot = {x:target.x,y:target.y+17,vx:0};
    world.step(1/60);
    assert.equal(world.enemies.includes(target),false); assert.equal(world.enemies.length,41); assert.equal(world.wave,2); assert.equal(world.score,points);
    world.step(1/60); assert.equal(world.score,points);
  }
});

test('diving rewards use the observed tier values once per kill', () => {
  for (const [row, points] of [[3,60],[2,80],[1,100],[0,200]]) {
    const world = new World(); world.start();
    const target = world.enemies.find(enemy => enemy.homeY === 48 + row * 27)!;
    Object.assign(target,{dive:true,x:400,y:350,vx:0,fireTimer:10,turnTimer:10});
    world.enemies = [target]; world.shot = {x:400,y:370,vx:0};
    world.step(1/60);
    assert.equal(world.enemies.includes(target),false); assert.equal(world.enemies.length,41); assert.equal(world.wave,2); assert.equal(world.score,points);
    world.step(1/60); assert.equal(world.score,points);
  }
});
