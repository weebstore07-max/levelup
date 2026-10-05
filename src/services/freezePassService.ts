import { supabase } from '../lib/supabase';
import { UserProfile, LessonProgress, StudySession } from '../types';
import { toUuid } from './lessonProgressService';
import { formatDateKey, usersService, calculateStreak } from './usersService';
import { notificationsService } from './notificationsService';

const activeOperations = new Map<string, Promise<any>>();

export const isDateInCurrentMonth = (dateStr?: string | null): boolean => {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return false;
  const now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
};

export const freezePassService = {
  /**
   * Check whether today's activity satisfies the Hard Freeze Challenge:
   * 10 completed lessons + 120 minutes + 150 XP + 3 separate study sessions on the same local calendar date.
   * Max 1 stored Freeze Pass.
   */
  async checkAndAwardFreezePass(
    userId: string,
    progressList: LessonProgress[] = [],
    sessionsList: StudySession[] = [],
    userProfile: UserProfile | null = null
  ): Promise<boolean> {
    if (!userId) return false;
    const validUserId = toUuid(userId);

    // If user already owns 1 or more Freeze Passes or has an activated pass, cannot earn another
    const currentPasses = userProfile?.freeze_passes ?? 0;
    const isActivated = Boolean(userProfile?.freeze_pass_activated);
    if (currentPasses >= 1 || isActivated) {
      return false;
    }

    const opKey = `award_${validUserId}`;
    if (activeOperations.has(opKey)) {
      return activeOperations.get(opKey)!;
    }

    const promise = (async () => {
      try {
        const todayKey = formatDateKey(new Date());

        // 1. Count completed lessons on today's local date
        const lessonsToday = progressList.filter(p => {
          if (!p.completed || !p.completed_at) return false;
          return formatDateKey(new Date(p.completed_at)) === todayKey;
        }).length;

        // 2. Filter study sessions on today's local date
        const todaySessionsList = sessionsList.filter(s => {
          if (!s.session_date) return false;
          return s.session_date.split('T')[0] === todayKey;
        });

        const sessionsToday = todaySessionsList.length;

        // 3. Sum study session minutes on today's local date
        const minutesToday = todaySessionsList.reduce((acc, s) => {
          return acc + (Number(s.duration_minutes) || 0);
        }, 0);

        // 4. Calculate today's XP: study session xp_earned + (lessonsToday * 50)
        const sessionXpToday = todaySessionsList.reduce((acc, s) => {
          return acc + (Number(s.xp_earned) || 0);
        }, 0);
        const xpToday = sessionXpToday + (lessonsToday * 50);

        if (lessonsToday >= 10 && minutesToday >= 120 && xpToday >= 150 && sessionsToday >= 3) {
          let awarded = false;

          // Primary atomic database operation: Supabase RPC
          const { data: rpcResult, error: rpcError } = await supabase.rpc('award_freeze_pass', {
            p_user_id: validUserId
          });

          if (!rpcError && rpcResult === true) {
            awarded = true;
          } else if (rpcError) {
            // Fallback atomic client update if RPC is missing/unavailable
            const freshUser = await usersService.getById(validUserId);
            if ((freshUser?.freeze_passes ?? 0) < 1 && !freshUser?.freeze_pass_activated) {
              const updated = await usersService.update(validUserId, { freeze_passes: 1 });
              if (updated && updated.freeze_passes === 1) {
                awarded = true;
              }
            }
          }

          if (awarded) {
            // Create notification ONLY on successful award state transition
            await notificationsService.create({
              user_id: validUserId,
              title: 'Freeze Pass Earned',
              message: 'Freeze Pass Earned! You completed today\'s challenge.',
              type: 'system',
              is_read: false
            });
            return true;
          }
        }
      } catch (err) {
        console.warn('Error evaluating Freeze Pass award:', err);
      } finally {
        activeOperations.delete(opKey);
      }
      return false;
    })();

    activeOperations.set(opKey, promise);
    return promise;
  },

  /**
   * Manually activate a Freeze Pass.
   * Decrements freeze_passes to 0 and sets freeze_pass_activated to true.
   * Blocked if already activated, or if a Freeze Pass was already used in the current calendar month.
   */
  async activateFreezePass(
    userId: string,
    userProfile: UserProfile | null = null
  ): Promise<boolean> {
    if (!userId) return false;
    const validUserId = toUuid(userId);

    const currentPasses = userProfile?.freeze_passes ?? 0;
    const isActivated = Boolean(userProfile?.freeze_pass_activated);
    const lastUsed = userProfile?.last_freeze_used_date || null;

    if (currentPasses < 1 || isActivated || isDateInCurrentMonth(lastUsed)) {
      return false;
    }

    const opKey = `activate_${validUserId}`;
    if (activeOperations.has(opKey)) {
      return activeOperations.get(opKey)!;
    }

    const promise = (async () => {
      try {
        let activated = false;

        const { data: rpcResult, error: rpcError } = await supabase.rpc('activate_freeze_pass', {
          p_user_id: validUserId
        });

        if (!rpcError && rpcResult === true) {
          activated = true;
        } else if (rpcError) {
          const freshUser = await usersService.getById(validUserId);
          if (
            (freshUser?.freeze_passes ?? 0) >= 1 &&
            !freshUser?.freeze_pass_activated &&
            !isDateInCurrentMonth(freshUser?.last_freeze_used_date)
          ) {
            const updated = await usersService.update(validUserId, {
              freeze_passes: 0,
              freeze_pass_activated: true
            });
            if (updated && updated.freeze_pass_activated) {
              activated = true;
            }
          }
        }

        if (activated) {
          await notificationsService.create({
            user_id: validUserId,
            title: 'Freeze Pass Activated',
            message: 'Freeze Pass Activated - Your next qualifying missed study day will be protected.',
            type: 'system',
            is_read: false
          });
          return true;
        }
      } catch (err) {
        console.warn('Error activating Freeze Pass:', err);
      } finally {
        activeOperations.delete(opKey);
      }
      return false;
    })();

    activeOperations.set(opKey, promise);
    return promise;
  },

  /**
   * Consume an ACTIVATED Freeze Pass for an eligible missed calendar date.
   * Uses atomic database RPC to guarantee single consumption and single notification.
   */
  async checkAndConsumeFreezePass(
    userId: string,
    missedDate: string | null,
    userProfile: UserProfile | null = null
  ): Promise<boolean> {
    if (!userId || !missedDate) return false;
    const validUserId = toUuid(userId);

    const isActivated = Boolean(userProfile?.freeze_pass_activated);
    const lastFrozen = userProfile?.last_frozen_date || null;

    if (!isActivated || lastFrozen === missedDate) {
      return false;
    }

    const opKey = `consume_${validUserId}_${missedDate}`;
    if (activeOperations.has(opKey)) {
      return activeOperations.get(opKey)!;
    }

    const promise = (async () => {
      try {
        let consumed = false;

        const { data: rpcResult, error: rpcError } = await supabase.rpc('consume_freeze_pass', {
          p_user_id: validUserId,
          p_freeze_date: missedDate
        });

        if (!rpcError && rpcResult === true) {
          consumed = true;
        } else if (rpcError) {
          const freshUser = await usersService.getById(validUserId);
          if (freshUser?.freeze_pass_activated && freshUser?.last_frozen_date !== missedDate) {
            const updated = await usersService.update(validUserId, {
              freeze_pass_activated: false,
              last_frozen_date: missedDate,
              last_freeze_used_date: missedDate
            });
            if (updated && updated.last_frozen_date === missedDate) {
              consumed = true;
            }
          }
        }

        if (consumed) {
          await notificationsService.create({
            user_id: validUserId,
            title: 'Freeze Pass Used',
            message: `Freeze Pass Used - Your streak was protected for ${missedDate}.`,
            type: 'system',
            is_read: false
          });
          return true;
        }
      } catch (err) {
        console.warn('Error consuming Freeze Pass:', err);
      } finally {
        activeOperations.delete(opKey);
      }
      return false;
    })();

    activeOperations.set(opKey, promise);
    return promise;
  },

  /**
   * Complete end-to-end processing helper for streak computation, Freeze Pass consumption/awards, and profile sync.
   */
  async processUserStreakAndFreeze(
    userId: string,
    progressList: LessonProgress[] = [],
    sessionsList: StudySession[] = [],
    userProfile: UserProfile | null = null
  ): Promise<{ streakDays: number; userProfile: UserProfile | null }> {
    if (!userId) return { streakDays: 0, userProfile };

    if (!userProfile) {
      userProfile = await usersService.getById(userId);
    }

    // 1. Initial pure streak calculation with current last_frozen_date
    let evalResult = calculateStreak(progressList, sessionsList, userProfile?.last_frozen_date);

    // 2. Check if user has an activated Freeze Pass to protect a missed date
    if (evalResult.missedDateNeedingFreeze && userProfile?.freeze_pass_activated) {
      const consumed = await this.checkAndConsumeFreezePass(
        userId,
        evalResult.missedDateNeedingFreeze,
        userProfile
      );
      if (consumed) {
        const freshUser = await usersService.getById(userId);
        if (freshUser) {
          userProfile = freshUser;
          // Re-evaluate streak with the new last_frozen_date
          evalResult = calculateStreak(progressList, sessionsList, freshUser.last_frozen_date);
        }
      }
    }

    // 3. Check if user is eligible to award a Freeze Pass for today's challenge
    await this.checkAndAwardFreezePass(userId, progressList, sessionsList, userProfile);

    // 4. Sync computed streak_days to users table
    const finalStreak = evalResult.streakDays;
    await usersService.update(userId, { streak_days: finalStreak });

    return { streakDays: finalStreak, userProfile };
  }
};
