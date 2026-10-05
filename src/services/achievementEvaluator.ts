import { supabase } from '../lib/supabase';
import { achievementsService } from './achievementsService';
import { userAchievementsService } from './userAchievementsService';
import { lessonProgressService, toUuid } from './lessonProgressService';
import { coursesService } from './coursesService';
import { lessonsService } from './lessonsService';
import { studySessionsService } from './studySessionsService';
import { targetsService } from './targetsService';
import { notificationsService } from './notificationsService';
import { usersService } from './usersService';
import { PREDEFINED_ACHIEVEMENTS } from '../data/predefinedAchievements';
import { RequirementType } from '../types';

const activeChecks = new Map<string, Promise<void>>();

export const checkAchievements = async (userId: string): Promise<void> => {
  if (!userId) return;
  const validUserId = toUuid(userId);

  if (activeChecks.has(validUserId)) {
    return activeChecks.get(validUserId)!;
  }

  const checkPromise = (async () => {
    try {
      // 1. Fetch achievements from DB or fallback seed
      let allAchievements = await achievementsService.getAll();
      if (!allAchievements || allAchievements.length === 0) {
        allAchievements = await achievementsService.seedPredefinedAchievements();
      }

      // 2. Fetch existing user achievement records
      const existingUserAch = await userAchievementsService.getByUserId(validUserId);
    const existingMap = new Map<string, typeof existingUserAch[0]>();
    existingUserAch.forEach(ua => {
      if (ua.achievement_id) existingMap.set(ua.achievement_id, ua);
      if (ua.achievements?.title) existingMap.set(ua.achievements.title.toLowerCase().trim(), ua);
    });

    // 3. Fetch live user metrics concurrently from real progress/data tables
    const [progressData, coursesData, studySessionsData, targetsData, profileRes] = await Promise.all([
      lessonProgressService.getByUserId(validUserId).catch(() => []),
      coursesService.getAll().catch(() => []),
      studySessionsService.getByUserId(validUserId).catch(() => []),
      targetsService.getByUserId(validUserId).catch(() => []),
      supabase.from('users').select('xp, streak_days, longest_streak').eq('id', validUserId).maybeSingle()
    ]);

    // --- Metric Calculations from real Tables ---
    // Count completed lessons directly from lesson_progress table (never lessons.completed)
    const progressList = progressData || [];
    const completedProgressList = progressList.filter(p => Boolean(p.completed) === true || String(p.completed) === 'true');
    const completedLessonsCount = completedProgressList.length;

    // Build lookup set of completed lesson IDs (supporting raw ID and UUID converted ID)
    const completedLessonSet = new Set<string>();
    completedProgressList.forEach(p => {
      if (p.lesson_id) {
        completedLessonSet.add(p.lesson_id);
        completedLessonSet.add(toUuid(p.lesson_id));
      }
    });

    // Count completed courses from lesson_progress
    let completedCoursesCount = 0;
    if (coursesData && coursesData.length > 0) {
      for (const course of coursesData) {
        const lessons = await lessonsService.getByCourseId(course.id).catch(() => []);
        if (lessons.length > 0 && lessons.every(l => completedLessonSet.has(l.id) || completedLessonSet.has(toUuid(l.id)))) {
          completedCoursesCount++;
        }
      }
    }

    const studySessionsCount = (studySessionsData || []).length;
    const completedTargetsCount = (targetsData || []).filter(t => t.status === 'completed' || (t.progress_percentage || 0) >= 100).length;

    const profile = profileRes?.data;
    const streakDays = Math.max(profile?.streak_days || 0, profile?.longest_streak || 0);
    const totalXp = profile?.xp || 0;

    const metricValues: Record<RequirementType, number> = {
      lesson_count: completedLessonsCount,
      course_count: completedCoursesCount,
      study_session_count: studySessionsCount,
      target_count: completedTargetsCount,
      streak_days: streakDays,
      total_xp: totalXp
    };

    // Requirement Type Fallback Helper
    const inferReqType = (title: string, category: string): RequirementType => {
      const t = (title + ' ' + category).toLowerCase();
      if (t.includes('lesson')) return 'lesson_count';
      if (t.includes('course') || t.includes('bookworm') || t.includes('code master')) return 'course_count';
      if (t.includes('session') || t.includes('study') || t.includes('step') || t.includes('focus')) return 'study_session_count';
      if (t.includes('target') || t.includes('goal') || t.includes('striker') || t.includes('task')) return 'target_count';
      if (t.includes('streak') || t.includes('fire') || t.includes('spark') || t.includes('momentum')) return 'streak_days';
      if (t.includes('xp') || t.includes('collector') || t.includes('vanguard') || t.includes('sovereign')) return 'total_xp';
      return 'lesson_count';
    };

    // Requirement Value Fallback Helper
    const inferReqValue = (title: string, reqType: RequirementType): number => {
      const match = PREDEFINED_ACHIEVEMENTS.find(p => p.title.toLowerCase().trim() === title.toLowerCase().trim());
      if (match) return match.requirement_value;
      return 1;
    };

    // 4. Evaluate each achievement against current metrics and persist to user_achievements
    for (const ach of allAchievements) {
      const rawType = (ach.requirement_type as string) === 'lessons_completed' ? 'lesson_count' : ach.requirement_type;
      const reqType: RequirementType = (rawType as RequirementType) || inferReqType(ach.title, ach.category || '');
      const reqValue: number = ach.requirement_value || inferReqValue(ach.title, reqType);

      const currentMetric = metricValues[reqType] ?? 0;
      const max_progress = reqValue;
      const progress = Math.min(max_progress, currentMetric);
      const unlocked = currentMetric >= max_progress;

      const prev = existingMap.get(ach.id) || existingMap.get(ach.title.toLowerCase().trim());
      const wasUnlocked = prev?.unlocked || false;
      const prevProgress = prev?.progress || 0;

      // Upsert into user_achievements if state changed or missing
      if (!prev || prev.unlocked !== unlocked || prevProgress !== progress) {
        await userAchievementsService.upsert({
          user_id: validUserId,
          achievement_id: ach.id,
          unlocked,
          unlocked_at: unlocked ? (prev?.unlocked_at || new Date().toISOString()) : undefined,
          progress,
          max_progress
        });

        // Trigger notification if newly unlocked
        if (unlocked && !wasUnlocked) {
          await notificationsService.create({
            user_id: validUserId,
            title: `Badge Unlocked: ${ach.title}`,
            message: `Congratulations! You unlocked "${ach.title}" (${ach.rarity?.toUpperCase() || 'COMMON'} badge) and earned +${ach.xp_reward} XP!`,
            type: 'achievement',
            is_read: false
          }).catch(err => console.warn('Failed to send achievement notification:', err));
        }
      }
    }

    // Synchronize total XP to public.users.xp
    await usersService.recalculateUserTotalXp(validUserId);
  } catch (err) {
      console.error('Error during checkAchievements execution:', err);
    }
  })();

  activeChecks.set(validUserId, checkPromise);
  try {
    await checkPromise;
  } finally {
    activeChecks.delete(validUserId);
  }
};
