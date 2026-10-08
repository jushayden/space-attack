import Phaser from 'phaser';
import './style.css';
import { World, WIDTH, HEIGHT, PLAYER_Y, direction, COLORS } from './model';

const $ = (id: string) => document.getElementById(id)!;
const world = new World();
try { const n = Number(localStorage.getItem('space-attack.high')); world.high = Number.isFinite(n) && n > 0 ? Math.floor(n) : 0; } catch {}
const keys = new Set<string>();
let mouse = false;
let sound = false;
let audio: AudioContext | undefined;
let previousMode = '';
let savedHigh = world.high;
function tone(frequency: number, duration: number, end: number) {
  if (!sound) return;
  audio ??= new AudioContext();
  void audio.resume();
  const oscillator = audio.createOscillator();
  const gain = audio.createGain();
  oscillator.type = 'square'; oscillator.frequency.setValueAtTime(frequency, audio.currentTime);
  oscillator.frequency.exponentialRampToValueAtTime(end, audio.currentTime + duration);
  gain.gain.setValueAtTime(.025, audio.currentTime); gain.gain.exponentialRampToValueAtTime(.001, audio.currentTime + duration);
  oscillator.connect(gain); gain.connect(audio.destination); oscillator.start(); oscillator.stop(audio.currentTime + duration);
}
world.onEvent = event => {
  if (event === 'shoot') tone(740, .08, 220);
  if (event === 'hit') tone(180, .11, 55);
  if (event === 'damage') tone(110, .35, 22);
  if (event === 'wave') tone(300, .3, 900);
  if (world.high !== savedHigh) { savedHigh = world.high; try { localStorage.setItem('space-attack.high', String(savedHigh)); } catch {} }
};
function action() {
  keys.clear(); mouse = false;
  if (world.mode === 'paused') world.resume(); else if (world.mode !== 'playing') world.start();
  ($('start') as HTMLButtonElement).blur();
}
$('start').addEventListener('click', action);
$('sound').addEventListener('click', () => { sound = !sound; $('sound').textContent = sound ? 'SOUND ON' : 'SOUND OFF'; $('sound').setAttribute('aria-pressed', String(sound)); if (sound) tone(440,.08,660); });
window.addEventListener('keydown', event => {
  if (['Space','ArrowLeft','ArrowRight','Escape','Enter','KeyA','KeyD'].includes(event.code) && !(event.target instanceof HTMLButtonElement)) event.preventDefault();
  if (event.code === 'Enter' && !event.repeat && !(event.target instanceof HTMLButtonElement)) action();
  if (event.code === 'Escape' && !event.repeat) { if (world.mode === 'paused') world.resume(); else world.pause(); keys.clear(); mouse = false; }
  if (!(event.target instanceof HTMLButtonElement)) keys.add(event.code);
});
window.addEventListener('keyup', event => keys.delete(event.code));
$('game').addEventListener('pointerdown', event => { if (event.button === 0 && world.mode === 'playing') { mouse = true; world.fire(); event.preventDefault(); } });
window.addEventListener('pointerup', () => mouse = false);
window.addEventListener('pointercancel', () => mouse = false);
function blur() { world.pause(); keys.clear(); mouse = false; }
window.addEventListener('blur', blur);
document.addEventListener('visibilitychange', () => { if (document.hidden) blur(); });
const patterns = [
  ['00010001000','11111111111','01111111110','01101110110','00111111100','00111111100','00011011000','00110001100'],
  ['00100000100','01111111110','01111111110','01101110110','01111111110','00111111100','01100100110','11000000011'],
  ['10000000001','11000100011','01111111110','01101110110','00111111100','00011111000','00001110000','00000100000'],
];
const player = ['00000100000','00001110000','00011111000','00111111100','11111111111','11111111111','11110001111'];
const spareSprite = `<svg class="ship" viewBox="0 0 11 7" aria-hidden="true">${player.flatMap((row,y) => [...row].flatMap((pixel,x) => pixel === '1' ? `<rect x="${x}" y="${y}" width="1" height="1"/>` : [])).join('')}</svg>`;
function diverColor(color: number) {
  return (Math.floor((color >> 16 & 255) * .7) << 16) | (Math.floor((color >> 8 & 255) * .7) << 8) | Math.floor((color & 255) * .7);
}
class Arcade extends Phaser.Scene {
  accumulator = 0;
  g!: Phaser.GameObjects.Graphics;
  stars = Array.from({length:90},(_,i) => ({x:(i*137.23)%WIDTH,y:(i*91.7)%HEIGHT,size:i%5===0?2:1}));
  banner!: Phaser.GameObjects.Text;
  create() {
    this.g = this.add.graphics();
    this.banner = this.add.text(WIDTH/2, HEIGHT/2, '', {fontFamily:'monospace',fontSize:'23px',color:'#e0ed98',align:'center'}).setOrigin(.5);
  }
  sprite(pattern: string[], x: number, y: number, color: number, size = 3) {
    this.g.fillStyle(color);
    pattern.forEach((row,r) => [...row].forEach((pixel,c) => {
      if (pixel !== '1') return;
      const left = Math.round(x+(c-row.length/2)*size);
      const top = Math.round(y+(r-pattern.length/2)*size);
      const right = Math.round(x+(c+1-row.length/2)*size);
      const bottom = Math.round(y+(r+1-pattern.length/2)*size);
      this.g.fillRect(left,top,right-left,bottom-top);
    }));
  }
  update(_time: number, delta: number) {
    this.accumulator += Math.min(delta/1000,.1);
    while (this.accumulator >= 1/120) {
      world.step(1/120,direction(keys),mouse || keys.has('Space'));
      this.accumulator -= 1/120;
    }
    this.g.clear();
    this.stars.forEach((s,i) => { this.g.fillStyle(i%3===0?0xbbae43:0x7d7429,.6+.2*Math.sin(world.age+i)); this.g.fillRect(s.x,220+(s.y+world.age*5)%(HEIGHT-220),s.size,s.size); });
    world.enemies.forEach(e => this.sprite(patterns[e.tier === 2 ? 2 : (e.id + Math.floor(world.age * 2)) % 2],e.x,e.y,e.dive ? diverColor(COLORS[e.tier]) : COLORS[e.tier],e.dive ? 2.5 : 3));
    if (world.lives > 0 && world.respawn <= 0) {
      this.sprite(player,world.x,PLAYER_Y,0x75d6df);
      this.g.fillStyle(0xe3e29a); this.g.fillRect(world.x-3,PLAYER_Y+12,6,4+Math.sin(world.age*40)*2);
    }
    if (world.shot) { this.g.fillStyle(0xf7f5c0); this.g.fillRect(world.shot.x-2,world.shot.y-10,4,17); }
    world.bullets.forEach(b => { this.g.fillStyle(0xff8d73); this.g.fillRect(b.x-2,b.y-5,4,12); });
    world.sparks.forEach(s => {
      if (s.kind === 'enemy') {
        const progress = 1 - s.life / .5;
        const radius = 5 + progress * 27;
        this.g.lineStyle(2, 0xebdf58, 1 - progress);
        this.g.strokeRect(s.x-radius,s.y-radius,radius*2,radius*2);
        this.g.lineStyle(2, 0x9a872b, (1-progress)*.75);
        this.g.strokeCircle(s.x,s.y,radius*.65);
      } else {
        const progress = 1 - s.life / 1.1;
        this.g.fillStyle(s.color, Math.min(1,s.life*3));
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
    this.banner.setText(world.waveWait>0?'WAVE CLEARED':world.respawn>0?'SHIP LOST':'');
    $('score').textContent=String(world.score).padStart(6,'0'); $('best').textContent=String(world.high).padStart(6,'0'); $('wave').textContent=String(world.wave).padStart(2,'0');
    const spare = Math.max(0,world.lives-1);
    if ($('lives').childElementCount!==spare) $('lives').innerHTML=spareSprite.repeat(spare);
    $('lives').setAttribute('aria-label', `${spare} spare ships`);
    $('status').textContent=world.mode==='playing'?(world.waveWait>0?'NEXT WAVE INCOMING':world.respawn>0?'DEPLOYING SPARE SHIP':'DEFEND THE SECTOR'):world.mode==='paused'?'FLIGHT PAUSED':world.mode==='over'?'SIGNAL LOST':'READY TO LAUNCH';
    const displayMode = world.mode === 'over' && world.sparks.some(s => s.kind === 'player' && s.life > .3) ? 'dying' : world.mode;
    if(previousMode !== displayMode){
      previousMode=displayMode;
      $('overlay').classList.toggle('hidden',displayMode==='playing' || displayMode==='dying');
      if(world.mode==='paused') { $('eyebrow').textContent='FLIGHT ON HOLD'; $('title').innerHTML='PAUSED'; $('message').textContent='Take a breath. Your sector can wait.'; $('start').innerHTML='RESUME <span>↵</span>'; $('hint').textContent='ENTER OR ESC TO RESUME'; }
      if(world.mode==='over') { $('eyebrow').textContent='TRANSMISSION ENDED'; $('title').innerHTML='GAME<br><span>OVER</span>'; $('message').textContent=`SCORE ${String(world.score).padStart(6,'0')} · WAVE ${world.wave}`; $('start').innerHTML='PLAY AGAIN <span>↵</span>'; $('hint').textContent='PRESS ENTER TO RESTART'; }
    }
  }
}
new Phaser.Game({type:Phaser.AUTO,parent:'game',width:WIDTH,height:HEIGHT,backgroundColor:'#000000',pixelArt:true,antialias:false,scene:Arcade,scale:{mode:Phaser.Scale.FIT,autoCenter:Phaser.Scale.CENTER_BOTH},audio:{noAudio:true}});
if (import.meta.env.DEV) Object.assign(window,{spaceAttack:world});
