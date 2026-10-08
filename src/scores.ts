export interface ScoreStore {
  read(): string | null;
  write(value: string): void;
  persistent: boolean;
}
export function validScore(value: unknown): number {
  if (typeof value !== 'number' && typeof value !== 'string') return 0;
  const score = Number(value);
  return Number.isSafeInteger(score) && score >= 0 ? score : 0;
}
export class Scores {
  value = 0;
  status: 'persistent' | 'session' | 'memory' = 'memory';
  constructor(private stores: ScoreStore[]) {
    for (const store of stores) {
      try { this.value = Math.max(this.value, validScore(store.read())); } catch {}
    }
    this.save(this.value);
  }
  save(score: number) {
    this.value = Math.max(this.value, validScore(score));
    this.status = 'memory';
    for (const store of this.stores) {
      try {
        store.write(String(this.value));
        if (store.read() === String(this.value)) {
          if (store.persistent) this.status = 'persistent';
          else if (this.status === 'memory') this.status = 'session';
        }
      } catch {}
    }
    return this.value;
  }
  export() { return JSON.stringify({ game: 'space-attack', version: 1, highScore: this.value }, null, 2); }
  import(text: string) {
    const data = JSON.parse(text);
    if (data?.game !== 'space-attack' || data.version !== 1 || typeof data.highScore !== 'number' || !Number.isSafeInteger(data.highScore) || data.highScore < 0) throw new Error('Invalid score backup');
    return this.save(data.highScore);
  }
}
export function browserScores() {
  const key = 'space-attack.high';
  return new Scores([
    { read: () => localStorage.getItem(key), write: value => localStorage.setItem(key,value), persistent: true },
    { read: () => document.cookie.split('; ').find(item => item.startsWith('space_attack_high='))?.split('=')[1] ?? null, write: value => { document.cookie = `space_attack_high=${value}; Max-Age=31536000; Path=/; SameSite=Lax`; }, persistent: true },
    { read: () => sessionStorage.getItem(key), write: value => sessionStorage.setItem(key,value), persistent: false },
  ]);
}
