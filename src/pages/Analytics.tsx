import React, { useEffect, useState } from 'react';
import { PageLayout } from '../components/layout/PageLayout';
import { useAuth } from '../context/AuthContext';
import { studySessionsService, lessonProgressService, coursesService, lessonsService, usersService, calculateStreak, getSortedLessons, mergeLessonsWithProgress, formatDateKey, freezePassService, CATEGORY_COLORS, CourseCategory } from '../services';
import { StudySession, LessonProgress, Course, Lesson, UserProfile } from '../types';

export const Analytics: React.FC = () => {
  const { userProfile, currentUser } = useAuth();
  const [timeframe, setTimeframe] = useState('Last 7 Days');
  const [studySessions, setStudySessions] = useState<StudySession[]>([]);
  const [lessonProgress, setLessonProgress] = useState<LessonProgress[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [lessonsMap, setLessonsMap] = useState<Record<string, Lesson[]>>({});
  const [dbUser, setDbUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalyticsData();

    const handleFocus = () => {
      fetchAnalyticsData();
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [currentUser]);

  const fetchAnalyticsData = async () => {
    try {
      setLoading(true);

      if (!currentUser?.uid) {
        setCourses([]);
        setLessonsMap({});
        setLoading(false);
        return;
      }

      const activeUserId = currentUser.uid;

      // 1. Fetch courses & lessons for user
      const coursesData = await coursesService.getByUserId(activeUserId);
      setCourses(coursesData);

      const allLessonsMap: Record<string, Lesson[]> = {};
      for (const c of coursesData) {
        allLessonsMap[c.id] = await lessonsService.getByCourseId(c.id);
      }
      setLessonsMap(allLessonsMap);

        // 2. Fetch User Profile for live XP & Longest Streak
        const profileData = await usersService.getById(activeUserId);
        setDbUser(profileData);

        // 3. Fetch study sessions (no hardcoded seeds)
        const sessions = await studySessionsService.getByUserId(activeUserId);
        setStudySessions(sessions || []);

        // 4. Fetch lesson progress
        const progress = await lessonProgressService.getByUserId(activeUserId);
        setLessonProgress(progress || []);

        // Sync longest streak if current streak exceeds longest streak
        const { streakDays: currentStreak } = await freezePassService.processUserStreakAndFreeze(
          activeUserId,
          progress || [],
          sessions || [],
          profileData
        );
        const existingLongest = profileData?.longest_streak ?? 0;
        if (currentStreak > existingLongest) {
          await usersService.update(activeUserId, { longest_streak: currentStreak });
          setDbUser(prev => prev ? { ...prev, longest_streak: currentStreak } : prev);
        }
    } catch (err) {
      console.warn('Analytics fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  // 1. Total Study Time sum from study_sessions for logged-in user (displayed as Xh Ym)
  const totalStudyMinutes = studySessions.reduce((sum, s) => sum + (s.duration_minutes || 0), 0);
  const studyHours = Math.floor(totalStudyMinutes / 60);
  const studyMins = totalStudyMinutes % 60;
  const formattedStudyTime = `${studyHours}h ${studyMins}m`;

  // 2. Lessons Completed count from lesson_progress (completed = true)
  const completedLessons = lessonProgress.filter(p => p.completed);
  const lessonsCompletedCount = completedLessons.length;

  // 3. Total XP Earned directly from users.xp
  const totalXpEarned = dbUser?.xp ?? userProfile?.xp ?? 0;

  // 4. Longest Streak read from users.longest_streak
  const currentStreak = calculateStreak(lessonProgress, studySessions, dbUser?.last_frozen_date || userProfile?.last_frozen_date).streakDays;
  const fetchedLongest = dbUser?.longest_streak ?? userProfile?.longest_streak ?? 0;
  const longestStreakDays = Math.max(fetchedLongest, currentStreak);

  // 5. Courses Completed count (100% of lessons completed)
  let completedCoursesCount = 0;
  courses.forEach(c => {
    const cLessons = getSortedLessons(lessonsMap[c.id] || []);
    if (cLessons.length > 0) {
      const merged = mergeLessonsWithProgress(cLessons, lessonProgress);
      if (merged.length > 0 && merged.every(l => l.completed)) {
        completedCoursesCount++;
      }
    }
  });

  // Weekly Study Time Chart (Mon–Sun) using exact Dashboard date logic
  const getMonSunDays = () => {
    const days = [];
    const now = new Date();
    const currentDay = now.getDay();
    const distanceToMon = currentDay === 0 ? -6 : 1 - currentDay;
    const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + distanceToMon);

    const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const todayStr = formatDateKey(now);

    for (let i = 0; i < 7; i++) {
      const d = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i);
      const dateStr = formatDateKey(d);
      const isToday = dateStr === todayStr;

      const dayMins = studySessions
        .filter(s => {
          const rawDate = s.session_date || (s.created_at ? formatDateKey(new Date(s.created_at)) : '');
          if (!rawDate) return false;
          const sDateStr = rawDate.split('T')[0];
          return sDateStr === dateStr;
        })
        .reduce((sum, s) => sum + (Number(s.duration_minutes) || 0), 0);

      const hours = Number((dayMins / 60).toFixed(1));

      days.push({
        day: dayLabels[i],
        dateStr,
        mins: dayMins,
        hours,
        isToday
      });
    }
    return days;
  };
  const weeklyDays = getMonSunDays();
  const totalWeeklyMins = weeklyDays.reduce((sum, d) => sum + d.mins, 0);
  const totalWeekly7dHrs = Math.floor(totalWeeklyMins / 60);
  const totalWeekly7dMins = totalWeeklyMins % 60;
  const formatted7dTotal = `${totalWeekly7dHrs}h ${totalWeekly7dMins}m (7d)`;
  const maxWeeklyMins = Math.max(...weeklyDays.map(d => d.mins), 0);

  // Learning Categories calculation (percentages calculated dynamically from saved categories of enrolled courses)
  const calculateLearningCategories = () => {
    if (courses.length === 0) {
      return [];
    }

    const counts: Record<string, number> = {};
    courses.forEach((c) => {
      const cat = c.category || 'Other';
      counts[cat] = (counts[cat] || 0) + 1;
    });

    const total = courses.length;
    const categoriesList = Object.entries(counts).map(([name, count]) => {
      const pct = Math.round((count / total) * 100);
      const colorObj = CATEGORY_COLORS[name as CourseCategory] || CATEGORY_COLORS['Other'];
      return {
        name,
        count,
        pct,
        color: colorObj.bg
      };
    });

    categoriesList.sort((a, b) => b.count - a.count);

    const currentSum = categoriesList.reduce((sum, item) => sum + item.pct, 0);
    if (categoriesList.length > 0 && currentSum !== 100) {
      const diff = 100 - currentSum;
      categoriesList[0].pct += diff;
    }

    return categoriesList;
  };
  const learningCategories = calculateLearningCategories();

  // XP Progress (7-day daily XP earned using local timezone date formatting)
  const getXpProgress7Days = () => {
    const days = [];
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const dateStr = formatDateKey(d);
      const dayLabel = d.toLocaleDateString('en-US', { weekday: 'short' });
      const sessionXp = studySessions
        .filter(s => {
          const sDate = s.session_date || (s.created_at ? formatDateKey(new Date(s.created_at)) : '');
          return sDate === dateStr;
        })
        .reduce((sum, s) => sum + (s.xp_earned || 0), 0);
      const lessonXp = lessonProgress
        .filter(p => p.completed && p.completed_at && formatDateKey(new Date(p.completed_at)) === dateStr)
        .length * 10;
      const dayXp = sessionXp + lessonXp;
      days.push({ dayLabel, dateStr, dayXp });
    }
    return days;
  };
  const xpProgressData = getXpProgress7Days();
  const maxXp = Math.max(...xpProgressData.map(d => d.dayXp), 100);

  // Most Productive Time calculation
  const getMostProductiveTime = () => {
    const periods = {
      Morning: { count: 0, icon: 'wb_sunny', label: 'Morning', range: '6:00 AM – 11:59 AM', message: 'Morning Bird! You are most active early in the day.' },
      Afternoon: { count: 0, icon: 'light_mode', label: 'Afternoon', range: '12:00 PM – 4:59 PM', message: 'Afternoon Focus! You get into the flow after midday.' },
      Evening: { count: 0, icon: 'wb_twilight', label: 'Evening', range: '5:00 PM – 7:59 PM', message: 'Evening Achiever! You wind down your day with focused learning.' },
      Night: { count: 0, icon: 'dark_mode', label: 'Night', range: '8:00 PM – 11:59 PM', message: 'Night Owl! You produce your best work under the stars.' }
    };

    studySessions.forEach(s => {
      const dt = s.created_at ? new Date(s.created_at) : new Date();
      const hour = dt.getHours();
      if (hour >= 6 && hour < 12) periods.Morning.count += s.duration_minutes;
      else if (hour >= 12 && hour < 17) periods.Afternoon.count += s.duration_minutes;
      else if (hour >= 17 && hour < 20) periods.Evening.count += s.duration_minutes;
      else periods.Night.count += s.duration_minutes;
    });

    let peak = periods.Evening;
    let maxVal = -1;
    (Object.keys(periods) as (keyof typeof periods)[]).forEach(k => {
      if (periods[k].count > maxVal) {
        maxVal = periods[k].count;
        peak = periods[k];
      }
    });

    return peak;
  };
  const peakTime = getMostProductiveTime();

  return (
    <PageLayout>
      <div className="flex flex-col gap-8">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row justify-between items-start gap-4 px-container-padding">
          <div>
            <h2 className="font-display-lg text-display-lg mb-2 text-primary">Analytics</h2>
            <p className="font-body-md text-body-md text-on-surface-variant">
              Review your learning patterns and track progress over time.
            </p>
          </div>
          {/* Date Range Selector */}
          <div className="flex items-center gap-2 rounded-lg bg-surface-container-lowest border card-border px-3 py-1.5 shadow-sm">
            <span className="material-symbols-outlined text-on-surface-variant text-[20px]">calendar_today</span>
            <select 
              value={timeframe}
              onChange={(e) => setTimeframe(e.target.value)}
              className="bg-transparent border-none text-body-md font-body-md focus:ring-0 p-0 pr-6 text-on-surface cursor-pointer outline-none"
            >
              <option>Last 7 Days</option>
              <option>Last 30 Days</option>
              <option>This Year</option>
              <option>All Time</option>
            </select>
          </div>
        </div>

        {/* Top Metrics Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-grid-gutter px-container-padding">
          <div className="card-border p-card-padding rounded-xl flex flex-col items-center text-center bg-surface-container-lowest">
            <div className="w-12 h-12 rounded-full bg-surface-container-highest flex items-center justify-center mb-4">
              <span className="material-symbols-outlined text-on-surface-variant">schedule</span>
            </div>
            <p className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider mb-1">Total Study Time</p>
            <p className="font-headline-sm text-headline-sm text-primary font-bold">{formattedStudyTime}</p>
          </div>

          <div className="card-border p-card-padding rounded-xl flex flex-col items-center text-center bg-surface-container-lowest">
            <div className="w-12 h-12 rounded-full bg-surface-container-highest flex items-center justify-center mb-4">
              <span className="material-symbols-outlined text-tertiary-container">check_circle</span>
            </div>
            <p className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider mb-1">Lessons Completed</p>
            <p className="font-headline-sm text-headline-sm text-primary font-bold">{lessonsCompletedCount}</p>
          </div>

          <div className="card-border p-card-padding rounded-xl flex flex-col items-center text-center bg-surface-container-lowest">
            <div className="w-12 h-12 rounded-full bg-surface-container-highest flex items-center justify-center mb-4">
              <span className="material-symbols-outlined text-tertiary" style={{ fontVariationSettings: '"FILL" 1' }}>stars</span>
            </div>
            <p className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider mb-1">XP Earned</p>
            <p className="font-headline-sm text-headline-sm text-primary font-bold">{totalXpEarned.toLocaleString()}</p>
          </div>

          <div className="card-border p-card-padding rounded-xl flex flex-col items-center text-center bg-surface-container-lowest">
            <div className="w-12 h-12 rounded-full bg-surface-container-highest flex items-center justify-center mb-4">
              <span className="material-symbols-outlined text-error" style={{ fontVariationSettings: '"FILL" 1' }}>local_fire_department</span>
            </div>
            <p className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider mb-1">Longest Streak</p>
            <p className="font-headline-sm text-headline-sm text-primary font-bold">{longestStreakDays} Days</p>
          </div>

          <div className="card-border p-card-padding rounded-xl flex flex-col items-center text-center col-span-2 md:col-span-1 bg-surface-container-lowest">
            <div className="w-12 h-12 rounded-full bg-surface-container-highest flex items-center justify-center mb-4">
              <span className="material-symbols-outlined text-primary">school</span>
            </div>
            <p className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider mb-1">Courses Completed</p>
            <p className="font-headline-sm text-headline-sm text-primary font-bold">{completedCoursesCount}</p>
          </div>
        </div>

        {/* Middle Row: Weekly Study Time & Subject Breakdown */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-grid-gutter px-container-padding">
          {/* Weekly Learning Activity Chart */}
          <div className="md:col-span-8 card-border rounded-xl p-7 bg-surface-container-lowest flex flex-col justify-between h-[280px]">
            <div>
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[22px] text-primary">bar_chart</span>
                  <h3 className="font-title-lg text-title-lg text-primary font-bold">Weekly Learning Activity</h3>
                </div>
                <span className="font-title-md text-title-md text-primary font-bold font-mono">
                  {formatted7dTotal}
                </span>
              </div>
              <div className="h-[160px] flex items-end justify-between gap-4 px-4 relative mt-2">
                <div className="absolute inset-0 flex flex-col justify-between pointer-events-none pb-8">
                  <div className="border-b border-outline-variant/15 w-full"></div>
                  <div className="border-b border-outline-variant/15 w-full"></div>
                  <div className="border-b border-outline-variant/15 w-full"></div>
                  <div className="border-b border-outline-variant/15 w-full"></div>
                </div>

                {weeklyDays.map((bar) => {
                  const pct = maxWeeklyMins > 0 && bar.mins > 0 ? Math.round((bar.mins / maxWeeklyMins) * 100) : 0;
                  return (
                    <div key={bar.day} className="flex-1 flex flex-col items-center h-full justify-end z-10">
                      <div className="w-full h-[120px] flex flex-col justify-end items-center relative">
                        {bar.isToday && bar.mins > 0 && (
                          <span className="text-[11px] font-bold text-primary mb-1 font-mono">
                            {bar.mins}m
                          </span>
                        )}
                        <div 
                          className={`w-full rounded-t-[10px] transition-all duration-200 cursor-pointer group relative ${
                            bar.isToday ? 'bg-primary' : 'bg-[#D4AF37] hover:bg-primary'
                          }`}
                          style={{ height: `${pct}%`, minHeight: bar.mins > 0 ? '6px' : '0px' }}
                        >
                          {!bar.isToday && bar.mins > 0 && (
                            <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-inverse-surface text-inverse-on-surface text-[10px] px-2 py-0.5 rounded shadow opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-20 pointer-events-none font-mono">
                              {bar.hours} hrs
                            </div>
                          )}
                        </div>
                      </div>
                      <span className={`font-label-sm text-label-sm mt-2 font-semibold ${
                        bar.isToday ? 'text-primary font-bold' : 'text-on-surface-variant'
                      }`}>
                        {bar.day}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Learning Categories */}
          <div className="md:col-span-4 card-border rounded-xl p-6 bg-surface-container-lowest flex flex-col justify-between">
            <div>
              <h3 className="font-title-lg text-title-lg text-primary font-bold mb-4">Learning Categories</h3>
              {learningCategories.length === 0 ? (
                <div className="py-8 text-center flex flex-col items-center justify-center">
                  <span className="material-symbols-outlined text-3xl text-on-surface-variant mb-2">category</span>
                  <p className="font-label-sm text-label-sm text-on-surface-variant font-medium">
                    No enrolled courses recorded yet.
                  </p>
                  <p className="font-label-sm text-[11px] text-on-surface-variant/80 mt-1">
                    Import a course to view your category distribution.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {learningCategories.map((item) => (
                    <div key={item.name}>
                      <div className="flex justify-between font-label-sm text-label-sm mb-1">
                        <span className="font-semibold text-primary">{item.name} ({item.count})</span>
                        <span className="font-bold font-mono text-primary">{item.pct}%</span>
                      </div>
                      <div className="h-2.5 bg-surface-container-highest rounded-full overflow-hidden">
                        <div className={`h-full ${item.color} transition-all duration-300`} style={{ width: `${item.pct}%` }}></div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="pt-4 border-t border-outline-variant/30 text-center">
              <span className="font-label-sm text-label-sm text-on-surface-variant">
                {courses.length > 0
                  ? `Category breakdown totals 100% across your ${courses.length} enrolled ${courses.length === 1 ? 'course' : 'courses'}`
                  : 'Calculated dynamically from your enrolled courses'}
              </span>
            </div>
          </div>
        </div>

        {/* Bottom Row: XP Progress & Most Productive Time */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-grid-gutter px-container-padding mb-8">
          {/* XP Progress Chart */}
          <div className="md:col-span-7 card-border rounded-xl p-6 bg-surface-container-lowest flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-title-lg text-title-lg text-primary font-bold flex items-center gap-2">
                  <span className="material-symbols-outlined text-tertiary">trending_up</span>
                  XP Progress (Last 7 Days)
                </h3>
                <span className="font-label-sm text-label-sm text-on-surface-variant">Daily XP</span>
              </div>
              <div className="h-48 flex items-end justify-between gap-3 px-2 relative mb-4">
                {xpProgressData.map((d) => {
                  const pct = Math.max(15, Math.round((d.dayXp / maxXp) * 100));
                  return (
                    <div key={d.dateStr} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group relative">
                      <div className="text-[10px] text-on-surface-variant opacity-0 group-hover:opacity-100 transition-opacity font-mono absolute -top-4">
                        +{d.dayXp} XP
                      </div>
                      <div 
                        className="w-full bg-[#1e8e3e] hover:opacity-90 transition-opacity rounded-t"
                        style={{ height: `${pct}%` }}
                      ></div>
                      <span className="text-[11px] font-semibold text-on-surface-variant">{d.dayLabel}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="pt-4 border-t border-outline-variant/30 flex justify-between items-center">
              <span className="font-label-sm text-label-sm text-on-surface-variant">Total Cumulative XP:</span>
              <span className="font-headline-sm text-headline-sm text-primary font-bold">{totalXpEarned.toLocaleString()} XP</span>
            </div>
          </div>

          {/* Most Productive Time */}
          <div className="md:col-span-5 card-border rounded-xl p-6 bg-surface-container-lowest flex flex-col justify-between">
            <div>
              <h3 className="font-title-lg text-title-lg text-primary font-bold mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined">schedule</span>
                Most Productive Time
              </h3>
              <div className="flex items-center gap-4 p-4 rounded-xl bg-surface-container-highest/40 border border-outline-variant/30 mb-4">
                <div className="w-14 h-14 rounded-full bg-[#f0e7d8] flex items-center justify-center text-[#c9a843] flex-shrink-0">
                  <span className="material-symbols-outlined text-2xl">{peakTime.icon}</span>
                </div>
                <div>
                  <div className="font-title-lg text-title-lg font-bold text-primary">{peakTime.label}</div>
                  <div className="font-label-sm text-label-sm text-on-surface-variant font-mono">{peakTime.range}</div>
                </div>
              </div>
              <p className="font-body-md text-body-md text-on-surface-variant leading-relaxed">
                {peakTime.message}
              </p>
            </div>

            <div className="pt-4 border-t border-outline-variant/30 text-center">
              <span className="font-label-sm text-label-sm text-on-surface-variant">
                Determined automatically from your study_sessions activity logs
              </span>
            </div>
          </div>
        </div>
      </div>
    </PageLayout>
  );
};

