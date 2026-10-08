import Phaser from 'phaser';
import './style.css';
import { World, WIDTH, HEIGHT, PLAYER_Y, direction, COLORS, FUEL_DURATION, LOW_FUEL } from './model';
import { browserScores } from './scores';

const elements = new Map<string, HTMLElement>();
const $ = (id: string) => {
  let element = elements.get(id);
  if (!element) { element = document.getElementById(id)!; elements.set(id, element); }
  return element;
};
function text(id: string, value: string) { if ($(id).textContent !== value) $(id).textContent = value; }
function attribute(id: string, name: string, value: string) { if ($(id).getAttribute(name) !== value) $(id).setAttribute(name, value); }
function wake() {
  if (!game.loop.running) { game.loop.resetDelta(); game.loop.wake(); }
}
const world = new World();
const scores = browserScores();
world.high = scores.value;
const keys = new Set<string>();
let mouse = false;
let audio: AudioContext | undefined;
let previousMode = '';
let savedHigh = world.high;
function tone(frequency: number, duration: number, end: number, volume = .075) {
  audio ??= new AudioContext();
  void audio.resume();
  const oscillator = audio.createOscillator();
  const gain = audio.createGain();
  oscillator.type = 'square'; oscillator.frequency.setValueAtTime(frequency, audio.currentTime);
  oscillator.frequency.exponentialRampToValueAtTime(end, audio.currentTime + duration);
  gain.gain.setValueAtTime(volume, audio.currentTime); gain.gain.exponentialRampToValueAtTime(.001, audio.currentTime + duration);
  oscillator.connect(gain); gain.connect(audio.destination); oscillator.start(); oscillator.stop(audio.currentTime + duration);
}
world.onEvent = event => {
  if (event === 'enemy-shoot') tone(320, .1, 130);
  if (event === 'shoot') tone(740, .08, 220);
  if (event === 'hit') tone(180, .11, 55);
  if (event === 'damage') tone(110, .35, 22);
  if (event === 'wave') tone(300, .3, 900);
  if (event === 'bonus') tone(500, .4, 1100);
  if (event === 'cancel') tone(260, .045, 110);
  if (event === 'fuel-warning') tone(880, .24, 440, .12);
  if (world.high !== savedHigh) { savedHigh = world.high; scores.save(savedHigh); }
};
function action() {
  audio ??= new AudioContext();
  void audio.resume();
  keys.clear(); mouse = false;
  if (world.mode === 'paused') world.resume(); else if (world.mode === 'ready' || (world.mode === 'over' && world.respawn <= 0)) world.start();
  ($('start') as HTMLButtonElement).blur();
  wake();
}
$('start').addEventListener('click', action);
function exportScore() {
  const url = URL.createObjectURL(new Blob([scores.export()], {type:'application/json'}));
  const link = document.createElement('a'); link.href = url; link.download = 'space-attack-score.json'; link.click();
  setTimeout(() => URL.revokeObjectURL(url),1000);
}
$('score-file').addEventListener('change', async () => {
  const input = $('score-file') as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;
  try {
    if (file.size > 4096) throw new Error('Invalid backup');
    world.high = scores.import(await file.text()); savedHigh = world.high;
    $('save-status').textContent = 'SCORE RESTORED';
  } catch { $('save-status').textContent = 'INVALID SCORE BACKUP'; }
  input.value = '';
  wake();
});
window.addEventListener('keydown', event => {
  if (event.altKey && event.shiftKey && ['KeyE','KeyI'].includes(event.code)) {
    event.preventDefault();
    if (!event.repeat) { if (event.code === 'KeyE') exportScore(); else ($('score-file') as HTMLInputElement).click(); }
    return;
  }
  if (['Space','ArrowLeft','ArrowRight','Escape','Enter','KeyA','KeyD'].includes(event.code) && !(event.target instanceof HTMLButtonElement)) event.preventDefault();
  if (event.code === 'Enter' && !event.repeat && (!(event.target instanceof HTMLButtonElement) || world.mode === 'over')) { event.preventDefault(); action(); }
  if (event.code === 'Escape' && !event.repeat) { if (world.mode === 'paused') world.resume(); else world.pause(); keys.clear(); mouse = false; wake(); }
  if (!(event.target instanceof HTMLButtonElement)) keys.add(event.code);
});
window.addEventListener('keyup', event => keys.delete(event.code));
$('game').addEventListener('pointerdown', event => { if (event.button === 0 && world.mode === 'playing') { mouse = true; world.fire(); event.preventDefault(); } });
window.addEventListener('pointerup', () => mouse = false);
window.addEventListener('pointercancel', () => mouse = false);
function blur() { world.pause(); keys.clear(); mouse = false; }
window.addEventListener('blur', blur);
document.addEventListener('visibilitychange', () => {
  if (document.hidden) { blur(); game.loop.sleep(); } else wake();
});
const patterns = [
  ['00010001000','11111111111','01111111110','01101110110','00111111100','00111111100','00011011000','00110001100'],
  ['00100000100','01111111110','01111111110','01101110110','01111111110','00111111100','01100100110','11000000011'],
  ['10000000001','11000100011','01111111110','01101110110','00111111100','00011111000','00001110000','00000100000'],
];
const yellowDiver = ['00000000000','00000100000','11111111111','10101110101','10111111101','00011111000','00001110000','00000100000'];
const player = ['00000100000','00001110000','00111111100','00000100000','10000100001','11111111111','11000000011'];
const spareSprite = `<svg class="ship" viewBox="0 0 11 7" aria-hidden="true">${player.flatMap((row,y) => [...row].flatMap((pixel,x) => pixel === '1' ? `<rect x="${x}" y="${y}" width="1" height="1"/>` : [])).join('')}</svg>`;
function diverColor(color: number) {
  return (Math.floor((color >> 16 & 255) * .7) << 16) | (Math.floor((color >> 8 & 255) * .7) << 8) | Math.floor((color & 255) * .7);
}
class Arcade extends Phaser.Scene {
  accumulator = 0;
  g!: Phaser.GameObjects.Graphics;
  background!: Phaser.GameObjects.Graphics;
  sprites: Phaser.GameObjects.Image[] = [];
  spriteCount = 0;
  stars = Array.from({length:90},() => ({x:Math.random()*WIDTH,y:Math.random()*(HEIGHT-220),size:Math.random()<.2?2:1,phase:Math.random()*Math.PI*2,bright:Math.random()<.33}));
  create() {
    this.background = this.add.graphics().setDepth(0);
    this.g = this.add.graphics().setDepth(2);
    const graphics = this.make.graphics({x:0,y:0});
    const make = (key: string, pattern: string[], color: number, size: number) => {
      const phases = size === 2.5 ? 2 : 1;
      for (let px = 0; px < phases; px++) for (let py = 0; py < phases; py++) {
        const ox = px / 2, oy = py / 2;
        graphics.clear().fillStyle(color);
        pattern.forEach((row,r) => {
          for (let c = 0; c < row.length; c++) if (row[c] === '1') {
            const x = Math.round(ox+c*size)-Math.round(ox);
            const y = Math.round(oy+r*size)-Math.round(oy);
            graphics.fillRect(x,y,Math.round(ox+(c+1)*size)-Math.round(ox)-x,Math.round(oy+(r+1)*size)-Math.round(oy)-y);
          }
        });
        graphics.generateTexture(`${key}-${px}-${py}`,Math.round(ox+pattern[0].length*size)-Math.round(ox),Math.round(oy+pattern.length*size)-Math.round(oy));
      }
    };
    for (let tier = 0; tier < 3; tier++) for (let variant = 0; variant < (tier === 2 ? 1 : 2); variant++) {
      make(`${tier}-${variant}-0`,patterns[tier === 2 ? 2 : variant],COLORS[tier],3);
      make(`${tier}-${variant}-1`,tier === 2 ? yellowDiver : patterns[variant],diverColor(COLORS[tier]),2.5);
    }
    make('player',player,0x75d6df,3);
    graphics.destroy();
    this.scale.on('resize',wake);
  }
  sprite(key: string, x: number, y: number, size = 3, rows = 8) {
    const left = x-11*size/2, top = y-rows*size/2;
    const px = size === 2.5 && left-Math.floor(left) >= .5 ? 1 : 0;
    const py = size === 2.5 && top-Math.floor(top) >= .5 ? 1 : 0;
    const texture = `${key}-${px}-${py}`;
    let image = this.sprites[this.spriteCount];
    if (!image) { image = this.add.image(0,0,texture).setOrigin(0).setDepth(1); this.sprites.push(image); }
    if (image.texture.key !== texture) image.setTexture(texture);
    image.setPosition(Math.round(left),Math.round(top)).setVisible(true);
    this.spriteCount++;
  }
  update(_time: number, delta: number) {
    if (!document.hidden) this.accumulator += Math.min(delta/1000,.1);
    while (this.accumulator >= 1/120) {
      world.step(1/120,direction(keys),mouse || keys.has('Space'));
      this.accumulator -= 1/120;
    }
    this.g.clear();
    this.background.clear();
    this.spriteCount = 0;
    this.stars.forEach(s => { this.background.fillStyle(s.bright?0xbbae43:0x7d7429,.6+.2*Math.sin(world.age+s.phase)); this.background.fillRect(s.x,220+(s.y+world.age*5)%(HEIGHT-220),s.size,s.size); });
    world.enemies.forEach(e => this.sprite(`${e.tier}-${e.tier === 2 ? 0 : (e.id+Math.floor(world.age*2))%2}-${Number(e.dive)}`,e.x,e.y,e.dive ? 2.5 : 3));
    if (world.lives > 0 && world.respawn <= 0 && !world.awaitingEntry) this.sprite('player',world.x,PLAYER_Y,3,7);
    for (let i = this.spriteCount; i < this.sprites.length; i++) this.sprites[i].setVisible(false);
    if (world.shot) { this.g.fillStyle(0xf7f5c0); this.g.fillRect(world.shot.x-2,world.shot.y-10,4,17); }
    world.bullets.forEach(b => { this.g.fillStyle(0xff8d73); this.g.fillRect(b.x-2,b.y-5,4,12); });
    world.sparks.forEach(s => {
      if (s.kind === 'enemy') {
        const progress = 1 - s.life / .5;
        const radius = 5 + progress * 27;
        this.g.lineStyle(2, 0xebdf58, 1 - progress);
        this.g.strokeCircle(s.x,s.y,radius);
      } else {
        const progress = Math.min(1,(3 - s.life) / .6);
        this.g.fillStyle(s.color, 1);
        for(let i=-3;i<=3;i++) {
          this.g.fillRect(s.x+i*3-1.5,s.y+i*3-1.5,3,3);
          this.g.fillRect(s.x+i*3-1.5,s.y-i*3-1.5,3,3);
        }
        for(let i=0;i<13;i++) {
          const angle=i*2.399;
          const distance=13+progress*(18+(i*7)%31);
          const size=i%3===0?4:2;
          this.g.fillRect(s.x+Math.cos(angle)*distance,s.y+Math.sin(angle)*distance,size,size);
        }
      }
    });
    text('score',String(world.score).padStart(6,'0')); text('best',String(world.high).padStart(6,'0')); text('wave',String(world.wave));
    const fuelRatio = world.fuel/FUEL_DURATION;
    const fuelWidth = `${Math.round(fuelRatio*1000)/10}%`;
    if ($('fuel-fill').style.width !== fuelWidth) $('fuel-fill').style.width = fuelWidth;
    attribute('fuel','aria-valuenow',String(Math.round(fuelRatio*100)));
    if ($('fuel').classList.contains('low') !== (fuelRatio<=LOW_FUEL)) $('fuel').classList.toggle('low',fuelRatio<=LOW_FUEL);
    const spare = Math.max(0,world.lives-1);
    if ($('lives').childElementCount!==spare) $('lives').innerHTML=spareSprite.repeat(spare);
    attribute('lives','aria-label', `${spare} spare ships`);
    if (scores.status !== 'persistent') text('save-status',scores.status === 'session' ? 'TEMPORARY SAVE · ALT+SHIFT+E TO EXPORT' : 'STORAGE UNAVAILABLE · ALT+SHIFT+E TO EXPORT');
    const displayMode = world.mode === 'over' && world.respawn > 0 ? 'dying' : world.mode;
    if(previousMode !== displayMode){
      previousMode=displayMode;
      $('overlay').classList.toggle('paused',displayMode==='paused');
      $('overlay').classList.toggle('hidden',displayMode==='playing' || displayMode==='dying');
      if(world.mode==='paused') { $('title').textContent='PAUSED'; }
      if(world.mode==='over') { $('title').textContent='GAME OVER'; $('start').textContent='PLAY AGAIN'; }
    }
    if (world.mode === 'paused' || world.mode === 'ready' || document.hidden) { this.accumulator = 0; this.game.loop.sleep(); }
  }
}
const game = new Phaser.Game({type:Phaser.AUTO,parent:'game',width:WIDTH,height:HEIGHT,backgroundColor:'#000000',pixelArt:true,antialias:false,scene:Arcade,scale:{mode:Phaser.Scale.FIT,autoCenter:Phaser.Scale.CENTER_BOTH},audio:{noAudio:true}});
if (import.meta.env.DEV) Object.assign(window,{spaceAttack:world,spaceAttackGame:game});
