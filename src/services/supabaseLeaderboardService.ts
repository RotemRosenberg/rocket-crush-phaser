import type { LeaderboardEntry } from '../types';
import type { LeaderboardService } from './leaderboardService';
import { supabase } from '../lib/supabase';

class SupabaseLeaderboardService implements LeaderboardService {
  async getEntries(difficulty: string): Promise<LeaderboardEntry[]> {
    const { data, error } = await supabase
      .from('leaderboard_entries')
      .select('player_name, score, created_at')
      .eq('difficulty', difficulty)
      .order('score', { ascending: false });

    if (error || !data) return [];
    return data.map(row => ({
      name: row.player_name,
      score: row.score,
      date: (row.created_at as string).split('T')[0],
    }));
  }

  async addEntry(name: string, score: number, difficulty: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Check current best for this difficulty
    const { data: existing } = await supabase
      .from('leaderboard_entries')
      .select('score')
      .eq('user_id', user.id)
      .eq('difficulty', difficulty)
      .single();

    if (existing && existing.score >= score) return;

    await supabase.from('leaderboard_entries').upsert(
      { user_id: user.id, player_name: name, score, difficulty },
      { onConflict: 'user_id,difficulty' },
    );
  }

  async getTopEntries(count: number, difficulty: string): Promise<LeaderboardEntry[]> {
    const { data, error } = await supabase
      .from('leaderboard_entries')
      .select('player_name, score, created_at')
      .eq('difficulty', difficulty)
      .order('score', { ascending: false })
      .limit(count);

    if (error || !data) return [];
    return data.map(row => ({
      name: row.player_name,
      score: row.score,
      date: (row.created_at as string).split('T')[0],
    }));
  }

  async getPersonalBest(difficulty: string): Promise<number | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data } = await supabase
      .from('leaderboard_entries')
      .select('score')
      .eq('user_id', user.id)
      .eq('difficulty', difficulty)
      .single();

    return data?.score ?? null;
  }
}

export const supabaseLeaderboard = new SupabaseLeaderboardService();
