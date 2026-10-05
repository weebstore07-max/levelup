import { supabase } from '../lib/supabase';
import { UserAchievement } from '../types';
import { toUuid } from './lessonProgressService';

export const userAchievementsService = {
  async getByUserId(userId: string): Promise<UserAchievement[]> {
    const validUserId = toUuid(userId);
    const { data, error } = await supabase
      .from('user_achievements')
      .select('*, achievements(*)')
      .eq('user_id', validUserId);

    if (error) {
      console.error('Error fetching user achievements:', error.message);
      return [];
    }
    return data as UserAchievement[];
  },

  async upsert(userAch: Partial<UserAchievement> & { user_id: string; achievement_id: string }): Promise<UserAchievement | null> {
    const validUserId = toUuid(userAch.user_id);
    const payload = {
      ...userAch,
      id: userAch.id || crypto.randomUUID(),
      user_id: validUserId
    };

    // Ensure user exists in users table for FK constraint if needed
    try {
      const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('id', validUserId)
        .maybeSingle();

      if (!existingUser) {
        const { data: { user: sbAuthUser } } = await supabase.auth.getUser();
        const realEmail = sbAuthUser?.email || `user_${validUserId.slice(0, 8)}@levelup.internal`;
        const realName = sbAuthUser?.user_metadata?.full_name || sbAuthUser?.user_metadata?.name || sbAuthUser?.email?.split('@')[0] || 'Learner';
        const realAvatar = sbAuthUser?.user_metadata?.avatar_url || sbAuthUser?.user_metadata?.picture;

        await supabase.from('users').insert({
          id: validUserId,
          email: realEmail,
          display_name: realName,
          avatar_url: realAvatar
        });
      }
    } catch (e) {
      // Ignore user FK setup error if already exists
    }

    const { data, error } = await supabase
      .from('user_achievements')
      .upsert(payload, { onConflict: 'user_id,achievement_id' })
      .select()
      .single();

    if (error) {
      console.error('Error upserting user achievement:', error.message);
      return null;
    }
    return data as UserAchievement;
  },

  async delete(id: string): Promise<boolean> {
    const { error } = await supabase
      .from('user_achievements')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting user achievement:', error.message);
      throw error;
    }
    return true;
  }
};
