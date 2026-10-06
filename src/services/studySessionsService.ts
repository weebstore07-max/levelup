import { supabase } from '../lib/supabase';
import { StudySession } from '../types';
import { toUuid } from './lessonProgressService';

export const studySessionsService = {
  async getByUserId(userId: string): Promise<StudySession[]> {
    const validUserId = toUuid(userId);

    // Auto-sync any missing study sessions for completed lessons before returning
    await this.syncMissingLessonSessions(validUserId);

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

  async syncMissingLessonSessions(userId: string): Promise<void> {
    try {
      const validUserId = toUuid(userId);

      // 1. Fetch completed lesson progress records for user
      const { data: progress } = await supabase
        .from('lesson_progress')
        .select('lesson_id, completed, completed_at')
        .eq('user_id', validUserId)
        .eq('completed', true);

      if (!progress || progress.length === 0) return;

      // 2. Fetch existing study sessions for user
      const { data: existingSessions } = await supabase
        .from('study_sessions')
        .select('*')
        .eq('user_id', validUserId);

      const sessions = existingSessions || [];

      // Set of lesson_ids that already have a study_session linked
      const linkedLessonIds = new Set<string>();
      sessions.forEach(s => {
        if (s.lesson_id) linkedLessonIds.add(s.lesson_id);
      });

      // Collect unlinked study sessions (without lesson_id)
      const unlinkedSessions = [...sessions.filter(s => !s.lesson_id)];

      // 3. Fetch lesson durations for completed lessons
      const completedLessonIds = progress.map(p => p.lesson_id);
      const { data: lessonsData } = await supabase
        .from('lessons')
        .select('id, duration_minutes')
        .in('id', completedLessonIds);

      const lessonDurationMap = new Map<string, number>();
      (lessonsData || []).forEach(l => {
        lessonDurationMap.set(l.id, Number(l.duration_minutes) || 1);
      });

      const missingSessionsToInsert: any[] = [];

      for (const p of progress) {
        if (linkedLessonIds.has(p.lesson_id)) continue;

        const dur = lessonDurationMap.get(p.lesson_id) || 1;
        const sessionDate = p.completed_at
          ? p.completed_at.split('T')[0]
          : new Date().toISOString().split('T')[0];

        // Check if an unlinked session exists matching date & duration
        const matchIndex = unlinkedSessions.findIndex(
          s => (s.session_date === sessionDate || (s.created_at && s.created_at.split('T')[0] === sessionDate)) &&
               Number(s.duration_minutes) === dur
        );

        if (matchIndex !== -1) {
          // Link existing unlinked session to this lesson_id
          const matchedSession = unlinkedSessions.splice(matchIndex, 1)[0];
          linkedLessonIds.add(p.lesson_id);
          await supabase
            .from('study_sessions')
            .update({ lesson_id: p.lesson_id })
            .eq('id', matchedSession.id);
        } else {
          // Reconstruct missing study session
          missingSessionsToInsert.push({
            id: crypto.randomUUID(),
            user_id: validUserId,
            lesson_id: p.lesson_id,
            duration_minutes: dur,
            xp_earned: 0,
            session_date: sessionDate
          });
          linkedLessonIds.add(p.lesson_id);
        }
      }

      if (missingSessionsToInsert.length > 0) {
        await supabase.from('study_sessions').insert(missingSessionsToInsert);
      }
    } catch (err) {
      console.warn('Error syncing missing lesson study sessions:', err);
    }
  },

  async recordLessonCompletionSession(userId: string, lessonId: string, durationMinutes: number): Promise<StudySession | null> {
    const validUserId = toUuid(userId);
    const validLessonId = lessonId ? toUuid(lessonId) : null;
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

    // Prevent duplicate inserts for the SAME lesson (by lesson_id)
    if (validLessonId) {
      const { data: existingByLesson } = await supabase
        .from('study_sessions')
        .select('*')
        .eq('user_id', validUserId)
        .eq('lesson_id', validLessonId);

      if (existingByLesson && existingByLesson.length > 0) {
        return existingByLesson[0] as StudySession;
      }
    }

    const newSession = {
      id: crypto.randomUUID(),
      user_id: validUserId,
      lesson_id: validLessonId,
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
    const validLessonId = lessonId ? toUuid(lessonId) : null;
    const dur = durationMinutes > 0 ? Number(durationMinutes) : 1;
    const today = new Date().toISOString().split('T')[0];

    // Delete strictly by user_id and lesson_id when lesson_id is present
    if (validLessonId) {
      const { error } = await supabase
        .from('study_sessions')
        .delete()
        .eq('user_id', validUserId)
        .eq('lesson_id', validLessonId);

      if (!error) return true;
    }

    // Fallback for legacy rows without lesson_id
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
