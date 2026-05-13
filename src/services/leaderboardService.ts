import type { LeaderboardEntry } from '../types';

export interface LeaderboardService {
  getEntries(difficulty: string): Promise<LeaderboardEntry[]>;
  addEntry(name: string, score: number, difficulty: string): Promise<void>;
  getTopEntries(count: number, difficulty: string): Promise<LeaderboardEntry[]>;
}

// ── localStorage implementation ───────────────────────────────────────────────

const storageKey = (difficulty: string) => `rocket_crush_lb_${difficulty}`;
const MAX_ENTRIES = 20;

class LocalLeaderboardService implements LeaderboardService {
  private readSorted(difficulty: string): LeaderboardEntry[] {
    try {
      const raw = localStorage.getItem(storageKey(difficulty));
      if (!raw) return [];
      return (JSON.parse(raw) as LeaderboardEntry[]).sort((a, b) => b.score - a.score);
    } catch {
      return [];
    }
  }

  async getEntries(difficulty: string): Promise<LeaderboardEntry[]> {
    return this.readSorted(difficulty);
  }

  async addEntry(name: string, score: number, difficulty: string): Promise<void> {
    const trimmedName = name.trim() || 'Anonymous';
    const date = new Date().toISOString().split('T')[0];
    const entries = this.readSorted(difficulty);

    // Keep best score only per name
    const existing = entries.findIndex(e => e.name === trimmedName);
    if (existing !== -1) {
      if (entries[existing].score >= score) return;
      entries.splice(existing, 1);
    }

    entries.push({ name: trimmedName, score, date });
    entries.sort((a, b) => b.score - a.score);
    localStorage.setItem(storageKey(difficulty), JSON.stringify(entries.slice(0, MAX_ENTRIES)));
  }

  async getTopEntries(count: number, difficulty: string): Promise<LeaderboardEntry[]> {
    return this.readSorted(difficulty).slice(0, count);
  }
}

export const localLeaderboard = new LocalLeaderboardService();
