import { supabase } from '../lib/supabase';
import { LessonProgress } from '../types';

const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const isUuid = (id: string): boolean => {
  return !!id && uuidRegex.test(id);
};

export const toUuid = (id: string): string => {
  if (!id) return '00000000-0000-0000-0000-000000000001';
  if (uuidRegex.test(id)) return id;

  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = ((hash << 5) - hash) + id.charCodeAt(i);
    hash |= 0;
  }
  const hex = Math.abs(hash).toString(16).padStart(8, '0');
  return `${hex.slice(0, 8)}-0000-4000-8000-000000000000`.toLowerCase();
};

export const lessonProgressService = {
  async getByUserId(userId: string): Promise<LessonProgress[]> {
    const validUserId = toUuid(userId);
    const { data, error } = await supabase
      .from('lesson_progress')
      .select('*')
      .eq('user_id', validUserId);

    if (error) {
      console.error('Error fetching lesson progress:', error.message);
      return [];
    }
    return data as LessonProgress[];
  },

  async upsert(progress: Omit<LessonProgress, 'id'> & { id?: string }, userEmail?: string): Promise<LessonProgress | null> {
    const validUserId = toUuid(progress.user_id);
    const validLessonId = toUuid(progress.lesson_id);
    const validCourseId = toUuid(progress.course_id);
    const uniqueEmail = userEmail || `user_${validUserId.slice(0, 8)}@levelup.internal`;

    // Ensure parent user record exists in public.users to satisfy Foreign Key constraint
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('id', validUserId)
      .maybeSingle();

    if (!existingUser) {
      const { data: { user: sbAuthUser } } = await supabase.auth.getUser();
      const realEmail = sbAuthUser?.email || userEmail || `user_${validUserId.slice(0, 8)}@levelup.internal`;
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
      ...progress,
      id: progress.id && isUuid(progress.id) ? progress.id : crypto.randomUUID(),
      user_id: validUserId,
      lesson_id: validLessonId,
      course_id: validCourseId
    };

    const { data, error } = await supabase
      .from('lesson_progress')
      .upsert(payload, { onConflict: 'user_id,lesson_id' })
      .select()
      .single();

    if (error) {
      console.error('Error upserting lesson progress:', error.message);
      throw error;
    }

    // Trigger automatic achievement evaluation asynchronously
    import('./achievementEvaluator').then(({ checkAchievements }) => {
      checkAchievements(validUserId).catch(err => console.warn('Achievement check failed:', err));
    }).catch(() => {});

    return data as LessonProgress;
  },

  async delete(id: string): Promise<boolean> {
    const { error } = await supabase
      .from('lesson_progress')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting lesson progress:', error.message);
      throw error;
    }
    return true;
  }
};

export const mergeLessonsWithProgress = (
  lessons: import('../types').Lesson[] = [],
  progressList: LessonProgress[] = []
): import('../types').MergedLesson[] => {
  const progressMap = new Map<string, LessonProgress>();
  progressList.forEach((p) => {
    if (p.lesson_id) {
      progressMap.set(p.lesson_id, p);
    }
  });

  return lessons.map((lesson) => {
    const p = progressMap.get(lesson.id);
    return {
      ...lesson,
      completed: p ? Boolean(p.completed) : false,
      completed_at: p ? p.completed_at : null
    };
  });
};
