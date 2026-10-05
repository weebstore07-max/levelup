import { supabase } from '../lib/supabase';
import { StudySession } from '../types';
import { toUuid } from './lessonProgressService';

export const studySessionsService = {
  async getByUserId(userId: string): Promise<StudySession[]> {
    const validUserId = toUuid(userId);
    const { data, error } = await supabase
      .from('study_sessions')
      .select('*')
      .eq('user_id', validUserId)
      .order('session_date', { ascending: false });

    if (error) {
      console.error('Error fetching study sessions:', error.message);
      return [];
    }
    return data as StudySession[];
  },

  async recordLessonCompletionSession(userId: string, lessonId: string, durationMinutes: number): Promise<StudySession | null> {
    const validUserId = toUuid(userId);
    const dur = durationMinutes > 0 ? Number(durationMinutes) : 1;
    const today = new Date().toISOString().split('T')[0];

    // Ensure parent user record exists in public.users to satisfy Foreign Key constraint
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

    // Prevent duplicate inserts for the same user + lesson (by session_date & duration)
    const { data: existing } = await supabase
      .from('study_sessions')
      .select('*')
      .eq('user_id', validUserId)
      .eq('session_date', today)
      .eq('duration_minutes', dur);

    if (existing && existing.length > 0) {
      return existing[0] as StudySession;
    }

    const newSession = {
      id: crypto.randomUUID(),
      user_id: validUserId,
      duration_minutes: dur,
      xp_earned: 0,
      session_date: today
    };

    const { data, error } = await supabase
      .from('study_sessions')
      .insert(newSession)
      .select()
      .single();

    if (error) {
      console.error('Error inserting study_session:', error.message);
      return null;
    }
    return data as StudySession;
  },

  async removeLessonCompletionSession(userId: string, lessonId: string, durationMinutes: number): Promise<boolean> {
    const validUserId = toUuid(userId);
    const dur = durationMinutes > 0 ? Number(durationMinutes) : 1;
    const today = new Date().toISOString().split('T')[0];

    const { error } = await supabase
      .from('study_sessions')
      .delete()
      .eq('user_id', validUserId)
      .eq('session_date', today)
      .eq('duration_minutes', dur);

    if (error) {
      console.error('Error deleting study_session:', error.message);
      return false;
    }
    return true;
  },

  async create(session: Omit<StudySession, 'id' | 'created_at'> & { id?: string }): Promise<StudySession | null> {
    const validUserId = toUuid(session.user_id);
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

    const payload = {
      ...session,
      id: session.id || crypto.randomUUID(),
      user_id: validUserId
    };
    const { data, error } = await supabase
      .from('study_sessions')
      .insert(payload)
      .select()
      .single();

    if (error) {
      console.error('Error creating study session:', error.message);
      throw error;
    }
    return data as StudySession;
  },

  async update(id: string, updates: Partial<StudySession>): Promise<StudySession | null> {
    const { data, error } = await supabase
      .from('study_sessions')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating study session:', error.message);
      throw error;
    }
    return data as StudySession;
  },

  async delete(id: string): Promise<boolean> {
    const { error } = await supabase
      .from('study_sessions')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting study session:', error.message);
      throw error;
    }
    return true;
  }
};
