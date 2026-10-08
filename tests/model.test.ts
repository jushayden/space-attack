import { test } from 'node:test';
import assert from 'node:assert/strict';
import { World, direction, difficulty, PLAYER_SPEED, PLAYER_Y, SHOT_SPEED } from '../src/model.ts';

test('opposite directions cancel across all keyboard combinations', () => {
  for (const left of ['KeyA','ArrowLeft']) for (const right of ['KeyD','ArrowRight']) assert.equal(direction(new Set([left,right])),0);
  assert.equal(direction(new Set(['KeyA','ArrowLeft'])),-1);
  assert.equal(direction(new Set(['KeyD','ArrowRight'])),1);
});
test('movement is constant speed, stops immediately, and respects boundaries', () => {
  const w = new World(); w.start();
  w.diveTimer = Infinity;
  w.step(1/60,1); assert.equal(w.x,400+PLAYER_SPEED/60);
  w.step(1/60,0); assert.equal(w.x,406);
  for(let i=0;i<300;i++) w.step(1/60,1);
  assert.equal(w.x,776);
});
test('Space and click share exactly one projectile slot, released at the top', () => {
  const w = new World(); w.start(); w.x=30;
  w.fire(); const first=w.shot; w.fire(); assert.equal(w.shot,first);
  for(let i=0;i<45;i++) { w.step(1/60,0,true); if(w.shot) assert.equal(typeof w.shot.y,'number'); }
  assert.notEqual(w.shot,first); assert.ok(w.shot);
});
test('swept shots hit one enemy and award points once', () => {
  const w = new World(); w.start();
  const enemy=w.enemies[0]; enemy.homeX=400; enemy.homeY=300;
  w.enemies=[enemy]; w.shot={x:400,y:315,vx:0}; w.step(1/30);
  assert.equal(w.enemies.includes(enemy),false); assert.equal(w.enemies.length,41); assert.equal(w.wave,2); assert.equal(w.score,60); assert.equal(w.shot,null);
  w.step(1/30); assert.equal(w.score,60); assert.equal(w.high,60);
});
test('enemy shots consume two spares then end the run and restart resets all state', () => {
  const w = new World(); w.start();
  for(let life=2;life>=0;life--){
    w.respawn=0; w.awaitingEntry=false; w.bullets=[{x:w.x,y:PLAYER_Y-12,vx:0},{x:w.x,y:PLAYER_Y-12,vx:0}]; w.step(1/30);
    assert.equal(w.lives,life); assert.equal(w.mode,life?'playing':'over');
  }
  w.high=300; w.score=120; w.wave=4; w.start();
  assert.equal(w.lives,3); assert.equal(w.score,0); assert.equal(w.high,300); assert.equal(w.wave,1); assert.equal(w.enemies.length,41); assert.equal(w.bullets.length,0);
});
test('enemy contact destroys both ships and awards a kill', () => {
  const w=new World();w.start(); const e=w.enemies[0];e.dive=true;e.x=w.x;e.y=PLAYER_Y-2;e.vx=0;
  w.step(1/60);assert.equal(w.lives,2);assert.ok(w.score>0);assert.equal(w.enemies.includes(e),false);
});
test('clearing formation advances waves and increases bounded difficulty', () => {
  const w=new World(); w.start(); w.enemies=[];w.step(1/60);assert.equal(w.awaitingEntry,true);
  for(let i=0;i<110;i++)w.step(1/60);
  assert.equal(w.wave,2);assert.equal(w.enemies.length,41);
  assert.ok(difficulty(2).bulletSpeed>difficulty(1).bulletSpeed);
  assert.ok(difficulty(2).fireDelay<difficulty(1).fireDelay);
  assert.ok(difficulty(999).bulletSpeed<SHOT_SPEED);
});
test('pause freezes movement, shots, enemy timers, and wave transitions', () => {
  const w=new World();w.start();w.fire();w.pause();const snapshot=JSON.stringify(w);
  w.step(1/30,1,true);assert.equal(JSON.stringify(w),snapshot);
  w.resume();w.step(1/60,1);assert.equal(w.x,406);
});
test('divers return without scoring and no more than two dive at once', () => {
  const w=new World(()=>.5);w.start();w.diveTimer=0;w.step(1/60);
  const diver=w.enemies.find(e=>e.dive)!;assert.ok(diver);
  diver.y=610;w.step(1/60);assert.equal(diver.dive,false);assert.equal(w.score,0);
  for(let i=0;i<500;i++){w.respawn=1;w.step(1/60);assert.ok(w.enemies.filter(e=>e.dive).length<=2);}
});
