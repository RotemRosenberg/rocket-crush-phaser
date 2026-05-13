import type { LeaderboardEntry } from '../types';

// ── Interface ─────────────────────────────────────────────────────────────────
// Swapping between localStorage and Supabase only requires changing which
// implementation is used — no UI or game logic needs to change.

export interface LeaderboardService {
  getEntries(): Promise<LeaderboardEntry[]>;
  addEntry(name: string, score: number): Promise<void>;
  getTopEntries(count: number): Promise<LeaderboardEntry[]>;
}

// ── localStorage implementation ───────────────────────────────────────────────

const STORAGE_KEY = 'rocket_crush_leaderboard';
const MAX_ENTRIES = 20;

class LocalLeaderboardService implements LeaderboardService {
  private readSorted(): LeaderboardEntry[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      return (JSON.parse(raw) as LeaderboardEntry[]).sort((a, b) => b.score - a.score);
    } catch {
      return [];
    }
  }

  async getEntries(): Promise<LeaderboardEntry[]> {
    return this.readSorted();
  }

  async addEntry(name: string, score: number): Promise<void> {
    const trimmedName = name.trim() || 'Anonymous';
    const date = new Date().toISOString().split('T')[0];
    const entries = this.readSorted();
    entries.push({ name: trimmedName, score, date });
    entries.sort((a, b) => b.score - a.score);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries.slice(0, MAX_ENTRIES)));
  }

  async getTopEntries(count: number): Promise<LeaderboardEntry[]> {
    return this.readSorted().slice(0, count);
  }
}

export const localLeaderboard = new LocalLeaderboardService();
