import type { LeaderboardEntry } from '../types';
import type { LeaderboardService } from './leaderboardService';
import { supabase } from '../lib/supabase';

class SupabaseLeaderboardService implements LeaderboardService {
  async getPersonalBest(): Promise<number | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data } = await supabase
      .from('leaderboard_entries')
      .select('score')
      .eq('user_id', user.id)
      .single();

    return data?.score ?? null;
  }

  async getEntries(): Promise<LeaderboardEntry[]> {
    const { data, error } = await supabase
      .from('leaderboard_entries')
      .select('player_name, score, created_at')
      .order('score', { ascending: false });

    if (error || !data) return [];
    return data.map(row => ({
      name: row.player_name,
      score: row.score,
      date: (row.created_at as string).split('T')[0],
    }));
  }

  async addEntry(name: string, score: number): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Check if user already has a score saved
    const { data: existing } = await supabase
      .from('leaderboard_entries')
      .select('score')
      .eq('user_id', user.id)
      .single();

    // Only save if this beats their current best (or they have no entry yet)
    if (existing && existing.score >= score) return;

    await supabase.from('leaderboard_entries').upsert(
      { user_id: user.id, player_name: name, score },
      { onConflict: 'user_id' },
    );
  }

  async getTopEntries(count: number): Promise<LeaderboardEntry[]> {
    const { data, error } = await supabase
      .from('leaderboard_entries')
      .select('player_name, score, created_at')
      .order('score', { ascending: false })
      .limit(count);

    if (error || !data) return [];
    return data.map(row => ({
      name: row.player_name,
      score: row.score,
      date: (row.created_at as string).split('T')[0],
    }));
  }
}

export const supabaseLeaderboard = new SupabaseLeaderboardService();
