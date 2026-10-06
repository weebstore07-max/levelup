import { supabase } from '../lib/supabase';
import { UserProfile } from '../types';
import { toUuid } from './lessonProgressService';

export const usersService = {
  async getById(userId: string): Promise<UserProfile | null> {
    const validUserId = toUuid(userId);
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', validUserId)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching user profile:', error.message);
      return null;
    }
    return (data || null) as UserProfile | null;
  },

  async create(user: Partial<UserProfile> & { id: string; email: string }): Promise<UserProfile | null> {
    const validUserId = toUuid(user.id);

    // 1. Return existing profile if it already exists for this exact Auth ID
    const existing = await this.getById(validUserId);
    if (existing) {
      return existing;
    }

    // 2. If a legacy profile exists for this email under an old hashed ID, migrate its ID to the real Auth UUID
    if (user.email) {
      const { data: legacyUser } = await supabase
        .from('users')
        .select('*')
        .eq('email', user.email)
        .maybeSingle();

      if (legacyUser && legacyUser.id !== validUserId) {
        console.log(`[PROFILE MIGRATION] Migrating legacy profile ${legacyUser.id} to Auth UUID ${validUserId} for ${user.email}`);
        
        const { data: migratedProfile, error: updateError } = await supabase
          .from('users')
          .update({
            id: validUserId,
            display_name: user.display_name || legacyUser.display_name,
            avatar_url: user.avatar_url || legacyUser.avatar_url,
            updated_at: new Date().toISOString()
          })
          .eq('id', legacyUser.id)
          .select()
          .maybeSingle();

        if (migratedProfile && !updateError) {
          return migratedProfile as UserProfile;
        }

        // Fallback: If primary key update is blocked by DBMS constraint, delete old legacy row and re-insert preserving values
        await supabase.from('users').delete().eq('id', legacyUser.id);
        
        const preservedPayload = {
          ...legacyUser,
          id: validUserId,
          display_name: user.display_name || legacyUser.display_name,
          avatar_url: user.avatar_url || legacyUser.avatar_url,
          updated_at: new Date().toISOString()
        };

        const { data: reinsertedProfile } = await supabase
          .from('users')
          .insert(preservedPayload)
          .select()
          .maybeSingle();

        if (reinsertedProfile) {
          return reinsertedProfile as UserProfile;
        }
      }
    }

    // 3. Create fresh profile if no legacy record exists
    const payload = {
      ...user,
      id: validUserId
    };

    const { data, error } = await supabase
      .from('users')
      .insert(payload)
      .select()
      .maybeSingle();

    if (error) {
      if (error.code === '23505' && user.email) {
        const { data: existingByEmail } = await supabase
          .from('users')
          .select('*')
          .eq('email', user.email)
          .maybeSingle();
        if (existingByEmail) return existingByEmail as UserProfile;
      }
      console.error('Error creating user profile:', error.message);
      throw error;
    }
    return data as UserProfile;
  },

  async update(userId: string, updates: Partial<UserProfile> & Record<string, any>): Promise<UserProfile | null> {
    const validUserId = toUuid(userId);
    console.log("ID after toUuid:", validUserId);
    
    const payload: Record<string, any> = {
      updated_at: new Date().toISOString()
    };

    if (updates.display_name !== undefined) payload.display_name = updates.display_name;
    if (updates.avatar_url !== undefined) payload.avatar_url = updates.avatar_url;
    if (updates.xp !== undefined) payload.xp = updates.xp;
    if (updates.level !== undefined) payload.level = updates.level;
    if (updates.level_title !== undefined) payload.level_title = updates.level_title;
    if (updates.streak_days !== undefined) payload.streak_days = updates.streak_days;
    if (updates.freeze_passes !== undefined) payload.freeze_passes = updates.freeze_passes;
    if (updates.freeze_pass_activated !== undefined) payload.freeze_pass_activated = updates.freeze_pass_activated;
    if (updates.last_frozen_date !== undefined) payload.last_frozen_date = updates.last_frozen_date;
    if (updates.last_freeze_used_date !== undefined) payload.last_freeze_used_date = updates.last_freeze_used_date;
    if (updates.freeze_challenge_started_at !== undefined) payload.freeze_challenge_started_at = updates.freeze_challenge_started_at;
    if (updates.daily_goal_minutes !== undefined) payload.daily_goal_minutes = updates.daily_goal_minutes;

    if (typeof updates.streak_days === 'number') {
      const existing = await this.getById(validUserId);
      const currentLongest = existing?.longest_streak ?? 0;
      if (updates.streak_days > currentLongest) {
        payload.longest_streak = updates.streak_days;
      }
    }

    console.log("[PROFILE DEBUG] Supabase UPDATE payload", {
      validUserId,
      payload
    });

    const { data, error } = await supabase
      .from('users')
      .update(payload)
      .eq('id', validUserId)
      .select()
      .maybeSingle();

    console.log("[PROFILE DEBUG] Supabase UPDATE result", {
      data,
      error,
      returnedDisplayName: data?.display_name
    });

    if (error) {
      console.error('Error updating user profile:', error.message);
      throw error;
    }

    return data as UserProfile;
  },

  async delete(userId: string): Promise<boolean> {
    const validUserId = toUuid(userId);

    // 1. Primary secure method: Execute delete_user_account RPC function (deletes auth.users and public.users securely)
    const { error: rpcError } = await supabase.rpc('delete_user_account');

    if (!rpcError) {
      return true;
    }

    console.warn('RPC delete_user_account unavailable, performing client profile cleanup fallback:', rpcError.message);

    // 2. Fallback: Clean up user-owned records across user tables
    await supabase.from('lesson_progress').delete().eq('user_id', validUserId);
    await supabase.from('todos').delete().eq('user_id', validUserId);
    await supabase.from('targets').delete().eq('user_id', validUserId);
    await supabase.from('user_achievements').delete().eq('user_id', validUserId);
    await supabase.from('notifications').delete().eq('user_id', validUserId);
    await supabase.from('study_sessions').delete().eq('user_id', validUserId);

    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', validUserId);

    if (error) {
      console.error('Error deleting user profile:', error.message);
      throw error;
    }
    return true;
  },

  async recalculateUserTotalXp(userId: string): Promise<number> {
    const validUserId = toUuid(userId);

    // 1. Fetch completed lessons
    const { data: lp } = await supabase
      .from('lesson_progress')
      .select('completed')
      .eq('user_id', validUserId);
    const completedLessonsCount = (lp || []).filter(p => Boolean(p.completed)).length;
    const lessonXp = completedLessonsCount * 10;

    // 2. Fetch completed todos
    const { data: todos } = await supabase
      .from('todos')
      .select('completed, priority')
      .eq('user_id', validUserId);
    const XP_MAP: Record<string, number> = { high: 30, medium: 20, low: 10 };
    const todoXp = (todos || [])
      .filter(t => Boolean(t.completed))
      .reduce((sum, t) => sum + (XP_MAP[t.priority] || 10), 0);

    // 3. Fetch unlocked achievements
    const { data: uAch } = await supabase
      .from('user_achievements')
      .select('unlocked, achievement_id, achievements(title, xp_reward)')
      .eq('user_id', validUserId);
    const { data: allAchievements } = await supabase
      .from('achievements')
      .select('id, title, xp_reward');

    const achList = (allAchievements || []) as any[];
    const achMap = new Map(achList.map(a => [a.id, a.xp_reward || 0]));
    const achTitleMap = new Map(achList.map(a => [a.title ? String(a.title).toLowerCase().trim() : '', a.xp_reward || 0]));

    const achievementXp = (uAch || [])
      .filter(ua => Boolean(ua.unlocked))
      .reduce((sum, ua: any) => {
        const achTitle = ua.achievements?.title ? String(ua.achievements.title).toLowerCase().trim() : '';
        const reward = (ua.achievement_id && achMap.get(ua.achievement_id))
          || (achTitle && achTitleMap.get(achTitle))
          || (ua.achievements?.xp_reward || 0);
        return sum + reward;
      }, 0);

    const totalAuthoritativeXp = lessonXp + todoXp + achievementXp;

    const { error } = await supabase
      .from('users')
      .update({ xp: totalAuthoritativeXp, updated_at: new Date().toISOString() })
      .eq('id', validUserId);

    if (error) {
      console.error('Error updating user total XP:', error.message);
    }

    return totalAuthoritativeXp;
  }
};

export const formatDateKey = (d: Date): string => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const getPrevDay = (d: Date): Date => {
  const prev = new Date(d);
  prev.setDate(prev.getDate() - 1);
  return prev;
};

export interface StreakEvaluation {
  streakDays: number;
  missedDateNeedingFreeze: string | null;
}

export const calculateStreak = (
  progressList: { completed: boolean; completed_at?: string | null }[],
  sessionsList: { session_date?: string }[] = [],
  lastFrozenDate?: string | null
): StreakEvaluation => {
  const activeDates = new Set<string>();

  progressList.forEach((p) => {
    if (p.completed && p.completed_at) {
      activeDates.add(formatDateKey(new Date(p.completed_at)));
    }
  });

  sessionsList.forEach((s) => {
    if (s.session_date) {
      activeDates.add(formatDateKey(new Date(s.session_date)));
    }
  });

  const today = new Date();
  const todayKey = formatDateKey(today);
  const yesterdayKey = formatDateKey(getPrevDay(today));

  let checkDate: Date | null = null;
  let missedDateNeedingFreeze: string | null = null;

  if (activeDates.has(todayKey)) {
    checkDate = today;
  } else if (activeDates.has(yesterdayKey)) {
    checkDate = getPrevDay(today);
  } else {
    // Neither today nor yesterday is active.
    // Check if yesterday is an inactive day right after an active day (eligible to be frozen)
    const dayBeforeYesterdayKey = formatDateKey(getPrevDay(getPrevDay(today)));
    if (!activeDates.has(yesterdayKey) && yesterdayKey !== lastFrozenDate && activeDates.has(dayBeforeYesterdayKey)) {
      missedDateNeedingFreeze = yesterdayKey;
    }
    // Critical: If today is inactive AND yesterday is only frozen (not active),
    // the frozen day cannot anchor an inactive today. The streak resets to 0.
    return { streakDays: 0, missedDateNeedingFreeze };
  }

  let streak = 0;
  let curr: Date | null = checkDate;

  while (curr) {
    const currKey = formatDateKey(curr);

    if (activeDates.has(currKey)) {
      streak++;
      curr = getPrevDay(curr);
    } else if (lastFrozenDate && currKey === lastFrozenDate) {
      // Frozen Day Bridge: Skip the day without incrementing active streak count or breaking loop
      curr = getPrevDay(curr);
    } else {
      // Check if this un-frozen missed day is eligible for freeze consumption
      const prevKey = formatDateKey(getPrevDay(curr));
      if (activeDates.has(prevKey) && !missedDateNeedingFreeze && currKey !== lastFrozenDate) {
        missedDateNeedingFreeze = currKey;
      }
      break; // Inactive day stops consecutive streak loop
    }
  }

  return { streakDays: streak, missedDateNeedingFreeze };
};
