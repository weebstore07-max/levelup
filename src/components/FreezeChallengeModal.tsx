import React from 'react';
import { isDateInCurrentMonth } from '../services';

export interface FreezeChallengeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onActivate?: () => void;
  freezePasses: number;
  freezePassActivated?: boolean;
  lastFrozenDate: string | null;
  lastFreezeUsedDate?: string | null;
  todayLessons: number;
  todayMinutes: number;
  todayXp: number;
  todaySessions: number;
}

const getNextMonthFirstDayStr = (): string => {
  const now = new Date();
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return nextMonth.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

export const FreezeChallengeModal: React.FC<FreezeChallengeModalProps> = ({
  isOpen,
  onClose,
  onActivate,
  freezePasses,
  freezePassActivated,
  lastFrozenDate,
  lastFreezeUsedDate,
  todayLessons,
  todayMinutes,
  todayXp,
  todaySessions
}) => {
  if (!isOpen) return null;

  const lessonsCompleted = Math.min(10, todayLessons);
  const minutesCompleted = Math.min(120, todayMinutes);
  const xpCompleted = Math.min(150, todayXp);
  const sessionsCompleted = Math.min(3, todaySessions);

  const isChallengeComplete =
    lessonsCompleted >= 10 &&
    minutesCompleted >= 120 &&
    xpCompleted >= 150 &&
    sessionsCompleted >= 3;

  const hasPassAvailable = freezePasses >= 1 || isChallengeComplete;
  const isMonthlyLimitReached = isDateInCurrentMonth(lastFreezeUsedDate);

  const lessonPercent = Math.min(100, Math.round((todayLessons / 10) * 100));
  const minutePercent = Math.min(100, Math.round((todayMinutes / 120) * 100));
  const xpPercent = Math.min(100, Math.round((todayXp / 150) * 100));
  const sessionPercent = Math.min(100, Math.round((todaySessions / 3) * 100));

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-white dark:bg-[#211E1A] border border-[#D8CFBF] dark:border-[#3A342C] rounded-[20px] p-6 md:p-8 max-w-md w-full shadow-xl flex flex-col gap-6 text-[#2C2825] dark:text-[#F0EBE1] relative max-h-[90vh] overflow-y-auto">
        
        {/* Header & Close Button */}
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-display-lg text-2xl font-bold text-primary flex items-center gap-2">
              <span>❄️</span> Hard Freeze Challenge
            </h3>
            <p className="text-xs text-on-surface-variant mt-1">
              Complete today's 4 targets on the same local date to earn a Freeze Pass.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container-high transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        </div>

        {/* Dynamic Status Banner */}
        {freezePassActivated ? (
          <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-amber-900 dark:text-amber-200 text-xs flex items-start gap-3">
            <span className="text-lg flex-shrink-0">⚡</span>
            <div>
              <p className="font-bold text-sm">Freeze Pass Activated</p>
              <p className="mt-0.5">Your next qualifying missed study day will be protected.</p>
            </div>
          </div>
        ) : isMonthlyLimitReached ? (
          <div className="p-4 rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800/60 text-purple-900 dark:text-purple-200 text-xs flex items-start gap-3">
            <span className="text-lg flex-shrink-0">❄️</span>
            <div>
              <p className="font-bold text-sm">Freeze Pass Used This Month</p>
              <p className="mt-0.5">Your next Freeze Pass can be used starting {getNextMonthFirstDayStr()}.</p>
            </div>
          </div>
        ) : hasPassAvailable || isChallengeComplete ? (
          <div className="p-4 rounded-xl bg-green-50 dark:bg-green-950/40 border border-green-200 dark:border-green-800/60 text-green-900 dark:text-green-200 text-xs flex items-start gap-3">
            <span className="material-symbols-outlined text-lg flex-shrink-0 text-green-600 dark:text-green-400">check_circle</span>
            <div>
              <p className="font-bold text-sm">Challenge Complete!</p>
              <p className="mt-0.5">Freeze Pass Earned! Activate it whenever you are ready.</p>
            </div>
          </div>
        ) : lastFrozenDate ? (
          <div className="p-4 rounded-xl bg-[#F8F5EE] dark:bg-[#2C2823] border border-[#D8CFBF] dark:border-[#3A342C] text-xs flex items-start gap-3">
            <span className="text-lg flex-shrink-0">❄️</span>
            <div>
              <p className="font-bold text-sm text-[#2C2825] dark:text-[#F0EBE1]">Freeze Pass Used</p>
              <p className="mt-0.5 text-[#8C8275] dark:text-[#A39B8E]">
                Your streak was protected for {lastFrozenDate}. Complete today's challenge to earn another.
              </p>
            </div>
          </div>
        ) : null}

        {/* Requirements Section */}
        <div className="flex flex-col gap-4">
          {/* Requirement 1: Lessons */}
          <div className="p-3.5 rounded-xl bg-[#F8F5EE] dark:bg-[#2C2823] border border-[#E7E1D6] dark:border-[#3A342C] flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold uppercase tracking-wider text-[#8C8275] dark:text-[#A39B8E]">
                Lessons Completed
              </span>
              <span className={`font-bold ${lessonsCompleted >= 10 ? 'text-green-700 dark:text-green-400' : 'text-[#2C2825] dark:text-[#F0EBE1]'}`}>
                {lessonsCompleted >= 10 ? '✓ 10 / 10' : `${todayLessons} / 10 completed`}
              </span>
            </div>
            <div className="w-full bg-[#E7E1D6] dark:bg-[#352F27] rounded-full h-2 overflow-hidden">
              <div
                className={`h-full transition-all duration-300 ${lessonsCompleted >= 10 ? 'bg-green-600 dark:bg-green-500' : 'bg-primary'}`}
                style={{ width: `${lessonPercent}%` }}
              />
            </div>
          </div>

          {/* Requirement 2: Study Time */}
          <div className="p-3.5 rounded-xl bg-[#F8F5EE] dark:bg-[#2C2823] border border-[#E7E1D6] dark:border-[#3A342C] flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold uppercase tracking-wider text-[#8C8275] dark:text-[#A39B8E]">
                Study Time
              </span>
              <span className={`font-bold ${minutesCompleted >= 120 ? 'text-green-700 dark:text-green-400' : 'text-[#2C2825] dark:text-[#F0EBE1]'}`}>
                {minutesCompleted >= 120 ? '✓ 120 / 120 min' : `${todayMinutes} / 120 minutes`}
              </span>
            </div>
            <div className="w-full bg-[#E7E1D6] dark:bg-[#352F27] rounded-full h-2 overflow-hidden">
              <div
                className={`h-full transition-all duration-300 ${minutesCompleted >= 120 ? 'bg-green-600 dark:bg-green-500' : 'bg-primary'}`}
                style={{ width: `${minutePercent}%` }}
              />
            </div>
          </div>

          {/* Requirement 3: XP Earned */}
          <div className="p-3.5 rounded-xl bg-[#F8F5EE] dark:bg-[#2C2823] border border-[#E7E1D6] dark:border-[#3A342C] flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold uppercase tracking-wider text-[#8C8275] dark:text-[#A39B8E]">
                XP Earned Today
              </span>
              <span className={`font-bold ${xpCompleted >= 150 ? 'text-green-700 dark:text-green-400' : 'text-[#2C2825] dark:text-[#F0EBE1]'}`}>
                {xpCompleted >= 150 ? '✓ 150 / 150 XP' : `${todayXp} / 150 XP`}
              </span>
            </div>
            <div className="w-full bg-[#E7E1D6] dark:bg-[#352F27] rounded-full h-2 overflow-hidden">
              <div
                className={`h-full transition-all duration-300 ${xpCompleted >= 150 ? 'bg-green-600 dark:bg-green-500' : 'bg-primary'}`}
                style={{ width: `${xpPercent}%` }}
              />
            </div>
          </div>

          {/* Requirement 4: Study Sessions */}
          <div className="p-3.5 rounded-xl bg-[#F8F5EE] dark:bg-[#2C2823] border border-[#E7E1D6] dark:border-[#3A342C] flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold uppercase tracking-wider text-[#8C8275] dark:text-[#A39B8E]">
                Study Sessions
              </span>
              <span className={`font-bold ${sessionsCompleted >= 3 ? 'text-green-700 dark:text-green-400' : 'text-[#2C2825] dark:text-[#F0EBE1]'}`}>
                {sessionsCompleted >= 3 ? '✓ 3 / 3 Sessions' : `${todaySessions} / 3 sessions`}
              </span>
            </div>
            <div className="w-full bg-[#E7E1D6] dark:bg-[#352F27] rounded-full h-2 overflow-hidden">
              <div
                className={`h-full transition-all duration-300 ${sessionsCompleted >= 3 ? 'bg-green-600 dark:bg-green-500' : 'bg-primary'}`}
                style={{ width: `${sessionPercent}%` }}
              />
            </div>
          </div>
        </div>

        {/* Reward Box */}
        <div className="p-4 rounded-xl bg-surface-container-lowest card-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">❄️</span>
            <div>
              <p className="font-bold text-sm text-[#2C2825] dark:text-[#F0EBE1]">1 Freeze Pass</p>
              <p className="text-xs text-[#8C8275] dark:text-[#A39B8E]">Protects your streak for one missed day when activated.</p>
            </div>
          </div>
          <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-md bg-[#F8F5EE] dark:bg-[#2C2823] text-[#8C8275] dark:text-[#A39B8E]">
            Reward
          </span>
        </div>

        {/* Action Buttons */}
        <div className="pt-3 border-t border-[#E7E1D6] dark:border-[#3A342C] flex items-center justify-end gap-3">
          {hasPassAvailable && !freezePassActivated && !isMonthlyLimitReached ? (
            <>
              <button
                type="button"
                onClick={onClose}
                className="py-2.5 px-4 rounded-xl border border-outline-variant font-bold text-xs hover:bg-surface-container-high transition-colors cursor-pointer text-[#2C2825] dark:text-[#F0EBE1]"
              >
                Not Now
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onActivate) onActivate();
                }}
                className="py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white font-bold text-xs transition-colors cursor-pointer"
              >
                Activate Freeze Pass
              </button>
            </>
          ) : freezePassActivated ? (
            <button
              type="button"
              onClick={onClose}
              className="w-full py-3 px-4 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-sm transition-colors cursor-pointer text-center"
            >
              Activated
            </button>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="w-full py-3 px-4 rounded-xl bg-[#2C2825] dark:bg-[#F0EBE1] text-white dark:text-[#1C1A17] font-bold text-sm hover:opacity-90 transition-opacity cursor-pointer text-center"
            >
              Got it
            </button>
          )}
        </div>

      </div>
    </div>
  );
};

export default FreezeChallengeModal;
