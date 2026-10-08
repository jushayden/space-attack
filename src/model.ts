export const WIDTH = 800;
export const HEIGHT = 580;
export const PLAYER_Y = 529;
export const PLAYER_SPEED = 360;
export const SHOT_SPEED = 780;
export const ENTRY_DELAY = 3;
export const DIVE_TICK = 1 / 30;
export const DIVE_RATIO = 150 / 82.5;
export const FUEL_DURATION = 40;
export const FUEL_EMPTY_GRACE = 2;
export const LOW_FUEL = .2;
export type Mode = 'ready' | 'playing' | 'paused' | 'over';
export type Enemy = { id: number; x: number; y: number; homeX: number; homeY: number; tier: number; points: number; dive: boolean; vx: number; motionTimer: number; fireTimer: number; turnTimer: number };
export type Shot = { x: number; y: number; vx: number };
export type Spark = { x: number; y: number; color: number; life: number; kind: 'enemy' | 'player' };
export const COLORS = [0xf04b49, 0x63e16c, 0xebdf58];
export function direction(keys: Set<string>) {
  return Number(keys.has('KeyD') || keys.has('ArrowRight')) - Number(keys.has('KeyA') || keys.has('ArrowLeft'));
}
export function difficulty(wave: number) {
  const progression = Math.max(0, wave - 1);
  const level = Math.min(15, progression);
  return { bulletSpeed: 190 + 510 * progression / (progression + 30), fireDelay: Math.max(.3, 1.25 - level * .075), diveDelay: Math.max(.7, 2.7 - level * .15), diveSpeed: 82.5 };
}
export function diveFireDelay(y: number, wave: number) {
  const descent = Math.max(0, Math.min(1, y / PLAYER_Y));
  return Math.max(.16, difficulty(wave).fireDelay * (1.15 - .85 * descent));
}
export class World {
  mode: Mode = 'ready';
  score = 0;
  high = 0;
  wave = 1;
  lives = 3;
  fuel = FUEL_DURATION;
  fuelEmptyTimer = FUEL_EMPTY_GRACE;
  fuelWarningTimer = 0;
  bonusAwarded = false;
  x = WIDTH / 2;
  shot: Shot | null = null;
  bullets: Shot[] = [];
  enemies: Enemy[] = [];
  sparks: Spark[] = [];
  age = 0;
  waveWait = 0;
  respawn = 0;
  awaitingEntry = false;
  entryDirection = 0;
  get playerActive() { return this.lives > 0 && this.respawn <= 0 && !this.awaitingEntry && this.entryDirection === 0; }
  diveTimer = 2.4;
  onEvent: (event: string) => void = () => {};
  constructor(public random = Math.random) { this.formation(); }
  start() {
    this.score = 0; this.wave = 1; this.lives = 3; this.x = WIDTH / 2;
    this.fuel = FUEL_DURATION; this.fuelEmptyTimer = FUEL_EMPTY_GRACE; this.fuelWarningTimer = 0; this.bonusAwarded = false;
    this.shot = null; this.bullets = []; this.sparks = []; this.age = 0;
    this.waveWait = 0; this.respawn = 0; this.mode = 'playing'; this.formation();
    this.awaitingEntry = true; this.entryDirection = 0; this.x = -20;
    this.onEvent('start');
  }
  formation() {
    this.enemies = [];
    [2, 5, 7, 9, 9, 9].forEach((count, row) => {
      for (let column = 0; column < count; column++) {
        const x = WIDTH / 2 + (row === 0 ? (column * 2 - 1) : column - (count - 1) / 2) * 38;
        const y = 48 + row * 27;
        this.enemies.push({ id: this.enemies.length, x, y, homeX: x, homeY: y, tier: row === 0 ? 2 : row === 2 ? 1 : 0, points: row === 0 ? 60 : row === 1 ? 50 : row === 2 ? 40 : 30, dive: false, vx: 0, motionTimer: 0, fireTimer: 0, turnTimer: 0 });
      }
    });
    this.diveTimer = 2.4;
  }
  pause() { if (this.mode === 'playing') this.mode = 'paused'; }
  resume() { if (this.mode === 'paused') this.mode = 'playing'; }
  fire() {
    if (this.mode !== 'playing' || this.shot || !this.playerActive) return;
    this.shot = { x: this.x, y: PLAYER_Y - 19, vx: 0 }; this.onEvent('shoot');
  }
  kill(enemy: Enemy) {
    this.enemies = this.enemies.filter(e => e !== enemy);
    this.score += enemy.dive ? (enemy.tier === 2 ? 200 : enemy.points * 2) : enemy.points;
    this.high = Math.max(this.high, this.score);
    if (!this.bonusAwarded && this.score >= 5000) {
      this.bonusAwarded = true; this.lives++; this.onEvent('bonus');
    }
    this.sparks.push({ x: enemy.x, y: enemy.y, color: 0xebdf58, life: .5, kind: 'enemy' });
    this.onEvent('hit');
  }
  damage() {
    if (this.mode !== 'playing' || !this.playerActive) return;
    this.sparks.push({ x: this.x, y: PLAYER_Y, color: 0x77d9e7, life: ENTRY_DELAY, kind: 'player' });
    this.lives--; this.shot = null; this.bullets = []; this.onEvent('damage');
    this.respawn = ENTRY_DELAY; this.awaitingEntry = true; this.entryDirection = 0;
    if (this.lives === 0) { this.mode = 'over'; this.onEvent('over'); }
  }
  advanceEnemies(dt: number, canFire: boolean) {
    const settings = difficulty(this.wave);
    for (const enemy of this.enemies) {
      if (enemy.dive) {
        enemy.turnTimer -= dt;
        if (enemy.turnTimer <= 0) {
          if (this.random() < .28) enemy.vx *= -1;
          enemy.turnTimer = .65 + this.random() * .85;
        }
        enemy.motionTimer += dt;
        while (enemy.motionTimer + 1e-9 >= DIVE_TICK) {
          enemy.motionTimer = Math.max(0,enemy.motionTimer-DIVE_TICK);
          enemy.x += enemy.vx * DIVE_TICK; enemy.y += settings.diveSpeed * DIVE_TICK;
          if (enemy.x < 23 || enemy.x > WIDTH - 23) { enemy.vx *= -1; enemy.x = Math.max(23, Math.min(WIDTH - 23, enemy.x)); }
        }
        if (canFire) {
          enemy.fireTimer -= dt;
          if (enemy.fireTimer <= 0) {
            if (enemy.y < PLAYER_Y - 24) this.bullets.push({ x: enemy.x, y: enemy.y + 15, vx: 0 });
            enemy.fireTimer = diveFireDelay(enemy.y, this.wave);
          }
        }
        if (enemy.y > HEIGHT + 20) { enemy.dive = false; enemy.vx = 0; enemy.x = enemy.homeX + Math.sin(this.age * .8) * 22; enemy.y = enemy.homeY; }
      } else { enemy.x = enemy.homeX + Math.sin(this.age * .8) * 22; enemy.y = enemy.homeY; }
    }
  }
  step(dt: number, move = 0, firing = false) {
    if (this.mode === 'over') {
      dt = Math.min(dt, 1 / 30);
      this.age += dt;
      this.advanceEnemies(dt, false);
      this.respawn = Math.max(0,this.respawn - Math.min(dt,1/30));
      this.sparks.forEach(s => s.life -= Math.min(dt, 1 / 30));
      this.sparks = this.sparks.filter(s => s.life > 0);
      return;
    }
    if (this.mode !== 'playing') return;
    dt = Math.min(dt, 1 / 30);
    this.age += dt;
    this.sparks.forEach(s => s.life -= dt);
    this.sparks = this.sparks.filter(s => s.life > 0);
    if (this.respawn > 0) this.respawn = Math.max(0, this.respawn - dt);
    if (this.awaitingEntry && this.respawn <= 0 && move !== 0) {
      this.fuel = FUEL_DURATION; this.fuelEmptyTimer = FUEL_EMPTY_GRACE; this.fuelWarningTimer = 0;
      this.awaitingEntry = false; this.entryDirection = move > 0 ? 1 : 0;
      this.x = move > 0 ? -20 : WIDTH - 24;
    }
    const enteringThisStep = this.entryDirection !== 0;
    if (enteringThisStep) {
      this.x += this.entryDirection * PLAYER_SPEED * dt;
      if (this.x >= 24 && this.x <= WIDTH - 24) {
        this.x = this.entryDirection > 0 ? 24 : WIDTH - 24;
        this.entryDirection = 0;
      }
    }
    this.advanceEnemies(dt, this.playerActive);
    if (!this.playerActive) return;
    if (!enteringThisStep) this.x = Math.max(24, Math.min(WIDTH - 24, this.x + move * PLAYER_SPEED * dt));
    const hadFuel = this.fuel > 0;
    this.fuel = Math.max(0,this.fuel-dt);
    if (hadFuel && this.fuel === 0) this.fuelWarningTimer = 0;
    if (this.fuel <= FUEL_DURATION*LOW_FUEL) {
      this.fuelWarningTimer -= dt;
      if (this.fuelWarningTimer <= 0) { this.onEvent('fuel-warning'); this.fuelWarningTimer = .75; }
    }
    if (this.fuel <= 0 && !hadFuel) {
      this.fuelEmptyTimer = Math.max(0,this.fuelEmptyTimer-dt);
      if (this.fuelEmptyTimer <= 1e-9) { this.fuelEmptyTimer = 0; this.damage(); return; }
    }
    if (firing) this.fire();
    const settings = difficulty(this.wave);
    if (this.shot) {
      const shot = this.shot;
      const oldY = shot.y;
      shot.y -= SHOT_SPEED * dt;
      const hit = this.enemies.filter(e => Math.abs(e.x - shot.x) < 17 && e.y + 13 >= shot.y && e.y - 13 <= oldY).sort((a,b) => b.y - a.y)[0];
      const hitTime = hit ? Math.max(0,(oldY-hit.y-13)/(SHOT_SPEED*dt)) : Infinity;
      const intercepts = this.bullets.flatMap(bullet => {
        if (bullet.y > oldY+15) return [];
        const time = Math.max(0,(oldY-bullet.y-15)/((SHOT_SPEED+settings.bulletSpeed)*dt));
        return time <= 1 && Math.abs(bullet.x+bullet.vx*dt*time-shot.x) <= 4 ? [{bullet,time}] : [];
      }).sort((a,b) => a.time-b.time);
      const intercept = intercepts[0];
      if (intercept && intercept.time <= hitTime) {
        this.bullets = this.bullets.filter(bullet => bullet !== intercept.bullet);
        this.shot = null; this.onEvent('cancel');
      } else if (hit) {
        this.shot = null; this.kill(hit);
      } else if (shot.y < -15) this.shot = null;
    }
    for (const bullet of [...this.bullets]) {
      const oldY = bullet.y;
      bullet.y += settings.bulletSpeed * dt; bullet.x += bullet.vx * dt;
      if (this.playerActive && Math.abs(bullet.x - this.x) < 17 && bullet.y + 5 >= PLAYER_Y - 13 && oldY - 5 <= PLAYER_Y + 13) {
        this.damage(); break;
      }
    }
    this.bullets = this.bullets.filter(b => b.y < HEIGHT + 10 && b.x > -10 && b.x < WIDTH + 10);
    for (const enemy of this.enemies) {
      if (this.mode === 'playing' && this.playerActive && Math.abs(enemy.x - this.x) < 27 && Math.abs(enemy.y - PLAYER_Y) < 23) {
        this.kill(enemy); this.damage(); break;
      }
    }
    if (this.mode !== 'playing') return;
    if (!this.enemies.length) {
      this.wave++; this.formation(); this.awaitingEntry = true; this.entryDirection = 0;
      this.respawn = ENTRY_DELAY;
      this.fuel = FUEL_DURATION; this.fuelEmptyTimer = FUEL_EMPTY_GRACE; this.fuelWarningTimer = 0;
      this.bullets = []; this.shot = null; this.onEvent('wave'); return;
    }
    if (!this.playerActive) return;
    this.diveTimer -= dt;
    if (this.diveTimer <= 0) {
      const available = this.enemies.filter(e => !e.dive);
      const slots = 2 - this.enemies.filter(e => e.dive).length;
      for (let slot = 0; slot < slots && available.length; slot++) {
        const [enemy] = available.splice(Math.floor(this.random() * available.length), 1);
        enemy.dive = true; enemy.vx = (this.random() < .5 ? -1 : 1) * settings.diveSpeed * DIVE_RATIO;
        enemy.motionTimer = 0;
        enemy.fireTimer = diveFireDelay(enemy.y, this.wave) * (.6 + this.random() * .4);
        enemy.turnTimer = .65 + this.random() * .85;
      }
      this.diveTimer = settings.diveDelay;
    }
  }
}
