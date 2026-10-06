import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { PageLayout } from '../components/layout/PageLayout';
import { useAuth } from '../context/AuthContext';
import { coursesService, lessonsService, lessonProgressService, todosService, studySessionsService, usersService, notificationsService, calculateStreak, formatDateKey, getSortedLessons, mergeLessonsWithProgress, freezePassService, getChallengeProgress, isDateInCurrentMonth, CATEGORY_COLORS, CourseCategory } from '../services';
import { Course, Lesson, LessonProgress, TodoItem, StudySession, MergedLesson } from '../types';
import { supabase } from '../lib/supabase';
import { FreezeChallengeModal } from '../components/FreezeChallengeModal';
import { FreezePassConfirmationModal } from '../components/FreezePassConfirmationModal';

export const Dashboard: React.FC = () => {
  const { userProfile, currentUser, refreshProfile } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [lessonsMap, setLessonsMap] = useState<Record<string, Lesson[]>>({});
  const [progressList, setProgressList] = useState<LessonProgress[]>([]);
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [studySessions, setStudySessions] = useState<StudySession[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showFreezeModal, setShowFreezeModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isActivatingFreezePass, setIsActivatingFreezePass] = useState(false);
  const [expandedCourseId, setExpandedCourseId] = useState<string | null>(null);
  const [streakDays, setStreakDays] = useState<number>(userProfile?.streak_days || 0);
  const [challengeProgressData, setChallengeProgressData] = useState<{ lessons: number; minutes: number; xp: number; sessions: number }>({
    lessons: 0,
    minutes: 0,
    xp: 0,
    sessions: 0
  });

  useEffect(() => {
    fetchDashboardData();

    const handleUpdate = () => {
      if (currentUser?.uid) {
        fetchDashboardData();
      }
    };

    window.addEventListener('focus', handleUpdate);
    window.addEventListener('courses-updated', handleUpdate);

    return () => {
      window.removeEventListener('focus', handleUpdate);
      window.removeEventListener('courses-updated', handleUpdate);
    };
  }, [currentUser]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      if (!currentUser?.uid) {
        setCourses([]);
        setLessonsMap({});
        setProgressList([]);
        setTodos([]);
        setStudySessions([]);
        setLoading(false);
        return;
      }

      // 1. Fetch Courses & Lessons for User
      const coursesData = await coursesService.getByUserId(currentUser.uid);
      setCourses(coursesData);

      const allLessonsMap: Record<string, Lesson[]> = {};
      for (const course of coursesData) {
        const courseLessons = await lessonsService.getByCourseId(course.id);
        allLessonsMap[course.id] = courseLessons;
      }
      setLessonsMap(allLessonsMap);

      // 2. Fetch Lesson Progress
      const progressData = await lessonProgressService.getByUserId(currentUser.uid);
      setProgressList(progressData);

        // 3. Fetch Todos
        const todosData = await todosService.getByUserId(currentUser.uid);
        setTodos(todosData || []);

        // 4. Fetch Study Sessions
        const sessionsData = await studySessionsService.getByUserId(currentUser.uid);
        setStudySessions(sessionsData || []);

        // 5. Compute & sync live streak to Supabase with Freeze Pass support
        const { streakDays: computedStreak } = await freezePassService.processUserStreakAndFreeze(
          currentUser.uid,
          progressData,
          sessionsData || [],
          userProfile
        );
        setStreakDays(computedStreak);

        // 6. Compute real persistent challenge progress asynchronously
        const cProg = await getChallengeProgress(currentUser.uid, userProfile, progressData, sessionsData || []);
        setChallengeProgressData(cProg);
    } catch (err) {
      console.warn('Dashboard fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const getMergedLessonsForCourse = (courseId: string): MergedLesson[] => {
    const courseLessons = getSortedLessons(lessonsMap[courseId] || []);
    return mergeLessonsWithProgress(courseLessons, progressList);
  };

  // 1. Authoritative Total XP read directly from users.xp
  const completedLessonsCount = progressList.filter(p => p.completed).length;
  const calculatedXp = userProfile?.xp || 0;

  // 2. Level calculation from XP
  const calculatedLevel = Math.floor(calculatedXp / 200) + 1;
  const levelTitle = calculatedXp < 200 ? 'Beginner' : calculatedXp < 500 ? 'Explorer' : calculatedXp < 1000 ? 'Scholar' : 'Master';

  // Freeze Pass challenge calculations (Persistent Hard Freeze Challenge)
  const todayLessons = challengeProgressData.lessons;
  const todayMinutes = challengeProgressData.minutes;
  const todayXp = challengeProgressData.xp;
  const todaySessions = challengeProgressData.sessions;

  const isChallengeComplete =
    todayLessons >= 10 &&
    todayMinutes >= 120 &&
    todayXp >= 150 &&
    todaySessions >= 3;

  const freezePasses = userProfile?.freeze_passes ?? 0;
  const freezePassActivated = Boolean(userProfile?.freeze_pass_activated);
  const lastFrozenDate = userProfile?.last_frozen_date || null;
  const lastFreezeUsedDate = userProfile?.last_freeze_used_date || null;
  const isMonthlyLimitReached = isDateInCurrentMonth(lastFreezeUsedDate);
  const hasPassAvailable = (freezePasses >= 1 || isChallengeComplete);

  const handleConfirmActivateFreezePass = async () => {
    if (!currentUser?.uid) return;
    setIsActivatingFreezePass(true);
    try {
      const success = await freezePassService.activateFreezePass(currentUser.uid, userProfile);
      if (success) {
        await refreshProfile();
        await fetchDashboardData();
      }
    } catch (err) {
      console.error('Failed to activate Freeze Pass:', err);
    } finally {
      setIsActivatingFreezePass(false);
      setShowConfirmModal(false);
    }
  };

  // 3. Lesson duration lookup map
  const lessonDurationMap: Record<string, number> = {};
  Object.values(lessonsMap).forEach(lessons => {
    lessons.forEach(l => {
      lessonDurationMap[l.id] = Number(l.duration_minutes) || 0;
    });
  });

  // 4. Total Study Hours = SUM(duration_minutes of study_sessions)
  const totalCompletedStudyMinutes = studySessions.reduce((sum, s) => sum + (s.duration_minutes || 0), 0);

  const formatMinutesToHours = (mins: number): string => {
    if (mins === 0) return '0h 0m';
    if (mins < 60) return `${mins}m`;
    const hrs = Math.floor(mins / 60);
    const remainingMins = mins % 60;
    return `${hrs}h ${remainingMins}m`;
  };

  const formattedStudyHours = formatMinutesToHours(totalCompletedStudyMinutes);

  // 5. Filter & Sort Today's Tasks
  const todayStr = formatDateKey(new Date());
  const todaysTasks = todos
    .filter(t => !t.due_date || t.due_date === todayStr)
    .sort((a, b) => {
      if (a.completed !== b.completed) {
        return a.completed ? 1 : -1;
      }
      const pScore = { high: 3, medium: 2, low: 1 };
      return (pScore[b.priority] || 2) - (pScore[a.priority] || 2);
    });

  const pendingTasksCount = todaysTasks.filter(t => !t.completed).length;

  // 6. Weekly Learning Activity (last 7 days from completed lessons)
  const getLast7DaysActivity = () => {
    const days = [];
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const dateStr = formatDateKey(d);
      const dayLabel = d.toLocaleDateString('en-US', { weekday: 'short' });

      let dayMins = 0;
      progressList.forEach(p => {
        if (p.completed && p.completed_at) {
          const pDateStr = formatDateKey(new Date(p.completed_at));
          if (pDateStr === dateStr) {
            dayMins += lessonDurationMap[p.lesson_id] || 0;
          }
        }
      });

      days.push({ dateStr, dayLabel, dayMins });
    }
    return days;
  };
  const last7DaysData = getLast7DaysActivity();
  const last7DaysTotalMins = last7DaysData.reduce((acc, d) => acc + d.dayMins, 0);
  const maxDayMins = Math.max(...last7DaysData.map(d => d.dayMins), 0);

  // Helper for Course Progress %
  const getCourseMetrics = (courseId: string, defaultTotal: number) => {
    const merged = getMergedLessonsForCourse(courseId);
    const total = merged.length || defaultTotal || 1;
    const doneCount = merged.filter(l => l.completed).length;
    const pct = Math.round((doneCount / total) * 100);
    return { doneCount, total, pct };
  };

  // Toggle Lesson Completion
  const toggleLessonComplete = async (courseId: string, targetLessonId: string) => {
    if (!targetLessonId || !currentUser?.uid) return;

    const activeUserId = currentUser.uid;
    const userEmail = currentUser.email || undefined;

    const targetLesson = (lessonsMap[courseId] || []).find(l => l.id === targetLessonId);
    const durationMins = targetLesson?.duration_minutes || 1;

    const currentProgress = progressList.find(p => p.lesson_id === targetLessonId);
    const nextCompleted = !currentProgress?.completed;

    // Optimistic UI update
    const updatedList = progressList.filter(p => p.lesson_id !== targetLessonId);
    updatedList.push({
      id: currentProgress?.id || `temp-${targetLessonId}`,
      user_id: activeUserId,
      lesson_id: targetLessonId,
      course_id: courseId,
      completed: nextCompleted,
      completed_at: nextCompleted ? new Date().toISOString() : null
    });
    setProgressList(updatedList);

    try {
      await lessonProgressService.upsert({
        user_id: activeUserId,
        lesson_id: targetLessonId,
        course_id: courseId,
        completed: nextCompleted,
        completed_at: nextCompleted ? new Date().toISOString() : null
      }, userEmail);

      if (nextCompleted) {
        await studySessionsService.recordLessonCompletionSession(activeUserId, targetLessonId, durationMins);
        if (targetLesson) {
          notificationsService.create({
            user_id: activeUserId,
            title: `Lesson Completed: ${targetLesson.title}`,
            message: `Great job! You completed "${targetLesson.title}".`,
            type: 'course',
            is_read: false
          }).catch(err => console.warn('Failed to send lesson completion notification:', err));
        }
      } else {
        await studySessionsService.removeLessonCompletionSession(activeUserId, targetLessonId, durationMins);
      }

      const freshProgress = await lessonProgressService.getByUserId(activeUserId);
      const freshSessions = await studySessionsService.getByUserId(activeUserId);
      setProgressList(freshProgress);
      setStudySessions(freshSessions);

      const { streakDays: newStreak } = await freezePassService.processUserStreakAndFreeze(
        activeUserId,
        freshProgress,
        freshSessions,
        userProfile
      );
      setStreakDays(newStreak);
    } catch (err) {
      console.error('Failed to save lesson progress:', err);
      const freshProgress = await lessonProgressService.getByUserId(activeUserId);
      setProgressList(freshProgress);
    }
  };

  // Toggle Todo
  const toggleTodo = async (todo: TodoItem) => {
    const updatedStatus = !todo.completed;
    setTodos(todos.map(t => t.id === todo.id ? { ...t, completed: updatedStatus } : t));

    if (currentUser?.uid && !todo.id.startsWith('t')) {
      try {
        await todosService.update(todo.id, { completed: updatedStatus });
        const freshTodos = await todosService.getByUserId(currentUser.uid);
        setTodos(freshTodos);

        if (!todo.completed && updatedStatus) {
          const { data: { user } } = await supabase.auth.getUser();
          const activeUserId = user?.id || currentUser.uid;
          const notifMsg = `You completed: ${todo.title}`;

          const { data: existing } = await supabase
            .from('notifications')
            .select('id')
            .eq('user_id', activeUserId)
            .eq('title', 'To-Do Completed')
            .eq('message', notifMsg);

          if (!existing || existing.length === 0) {
            await notificationsService.create({
              user_id: activeUserId,
              title: 'To-Do Completed',
              message: notifMsg,
              type: 'todo',
              is_read: false
            }).catch((err) => console.error('Failed to create todo completion notification on Dashboard:', err));
          }
        }
      } catch (err) {
        console.error('Failed to update todo status:', err);
      }
    }
  };

  // Create Task
  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    if (!currentUser?.uid) return;

    const created = await todosService.create({
      user_id: currentUser.uid,
      title: newTaskTitle.trim(),
      category: 'General',
      priority: 'medium',
      due_date: todayStr,
      completed: false
    });
    if (created) {
      setTodos([created, ...todos]);

      const { data: { user } } = await supabase.auth.getUser();
      const activeUserId = user?.id || currentUser.uid;
      const notifMsg = `You added a new task: ${created.title}`;

      const { data: existing } = await supabase
        .from('notifications')
        .select('id')
        .eq('user_id', activeUserId)
        .eq('title', 'To-Do Added')
        .eq('message', notifMsg);

      if (!existing || existing.length === 0) {
        await notificationsService.create({
          user_id: activeUserId,
          title: 'To-Do Added',
          message: notifMsg,
          type: 'todo',
          is_read: false
        }).catch((err) => console.error('Failed to create task notification on Dashboard:', err));
      }
    }

    setNewTaskTitle('');
    setShowAddModal(false);
  };

  const enrolledCoursesCount = courses.length;

  return (
    <PageLayout>
      {/* Header section */}
      <div className="flex flex-col md:flex-row justify-between items-start mb-8 gap-4 md:items-start px-container-padding">
        <div>
          <h2 className="font-display-lg text-display-lg mb-2 text-primary">Dashboard</h2>
          <p className="font-body-md text-body-md text-on-surface-variant">
            Welcome back, <span className="font-semibold text-primary">{userProfile?.display_name || 'Learner'}</span>! Here's an overview of your learning progress.
          </p>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="flex flex-wrap lg:flex-nowrap gap-grid-gutter px-container-padding">
        <div className="bg-surface-container-lowest card-border rounded-xl p-card-padding flex justify-between items-center hover:bg-[#F2EEE5] transition-colors flex-1 min-w-[200px]">
          <div>
            <p className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider mb-1">XP</p>
            <p className="font-headline-sm text-headline-sm font-bold">{calculatedXp.toLocaleString()}</p>
            <p className="font-label-sm text-label-sm text-on-surface-variant mt-1">Total XP</p>
          </div>
          <div className="w-12 h-12 rounded-full bg-surface-container-highest flex items-center justify-center border border-outline-variant">
            <span className="material-symbols-outlined text-on-surface-variant" data-icon="star">star</span>
          </div>
        </div>

        <div className="bg-surface-container-lowest card-border rounded-xl p-card-padding flex justify-between items-center hover:bg-[#F2EEE5] transition-colors flex-1 min-w-[200px]">
          <div>
            <p className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider mb-1">Level</p>
            <p className="font-headline-sm text-headline-sm font-bold">{calculatedLevel}</p>
            <p className="font-label-sm text-label-sm text-on-surface-variant mt-1">{levelTitle}</p>
          </div>
          <div className="w-12 h-12 rounded-full bg-surface-container-highest flex items-center justify-center border border-outline-variant">
            <span className="material-symbols-outlined text-on-surface-variant" data-icon="trending_up">trending_up</span>
          </div>
        </div>

        <div className="bg-surface-container-lowest card-border rounded-xl p-card-padding flex flex-col justify-between hover:bg-[#F2EEE5] dark:hover:bg-[#2C2823] transition-colors flex-1 min-w-[220px]">
          <div className="flex justify-between items-start w-full">
            <div>
              <p className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider mb-1">Streak</p>
              <p className="font-headline-sm text-headline-sm font-bold">{streakDays} <span className="text-xs font-normal text-on-surface-variant">Days</span></p>
            </div>
            <div className="w-12 h-12 rounded-full bg-surface-container-highest flex items-center justify-center border border-outline-variant flex-shrink-0">
              <span className="material-symbols-outlined text-on-surface-variant" data-icon="local_fire_department">local_fire_department</span>
            </div>
          </div>

          {/* Freeze Pass Sub-Section */}
          <div className="mt-3 pt-2.5 border-t border-outline-variant/60 flex items-center justify-between text-xs gap-2">
            <div className="flex items-center gap-1.5 overflow-hidden">
              <span className="text-sm">❄️</span>
              <span className="font-medium truncate text-on-surface-variant">
                {freezePassActivated ? (
                  <span className="text-amber-700 dark:text-amber-400 font-bold">Activated</span>
                ) : hasPassAvailable && !isMonthlyLimitReached ? (
                  <span className="text-blue-600 dark:text-blue-400 font-bold">1 Available</span>
                ) : isMonthlyLimitReached ? (
                  <span className="text-on-surface-variant font-medium">Used This Month</span>
                ) : lastFrozenDate ? (
                  <span className="text-on-surface-variant font-medium">Used ({lastFrozenDate})</span>
                ) : (
                  <span>Challenge: {todayLessons}/10 • {todayMinutes}/120m</span>
                )}
              </span>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {hasPassAvailable && !freezePassActivated && !isMonthlyLimitReached && (
                <button
                  type="button"
                  onClick={() => setShowConfirmModal(true)}
                  className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs transition-colors cursor-pointer"
                >
                  Activate Freeze Pass
                </button>
              )}
              <button
                type="button"
                onClick={() => setShowFreezeModal(true)}
                className="text-primary font-bold hover:underline whitespace-nowrap cursor-pointer"
              >
                View Challenge
              </button>
            </div>
          </div>
        </div>

        <div className="bg-surface-container-lowest card-border rounded-xl p-card-padding flex justify-between items-center hover:bg-[#F2EEE5] transition-colors flex-1 min-w-[200px]">
          <div>
            <p className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider mb-1">Total Courses</p>
            <p className="font-headline-sm text-headline-sm font-bold">{enrolledCoursesCount}</p>
            <p className="font-label-sm text-label-sm text-on-surface-variant mt-1">Enrolled</p>
          </div>
          <div className="w-12 h-12 rounded-full bg-surface-container-highest flex items-center justify-center border border-outline-variant">
            <span className="material-symbols-outlined text-on-surface-variant" data-icon="menu_book">menu_book</span>
          </div>
        </div>
      </div>

      {/* Content Row: Active Courses Section */}
      <div className="px-container-padding mt-8 mb-2">
        <div className="bg-surface-container-lowest card-border rounded-xl p-card-padding flex flex-col">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-3">
            <h3 className="font-title-lg text-title-lg font-bold flex items-center gap-2">
              <span className="material-symbols-outlined">play_circle</span>
              Active Courses & Tracks
            </h3>
            <div className="flex items-center gap-3">
              <Link 
                to="/tracks?import=true#import" 
                className="px-3.5 py-1.5 border border-outline-variant rounded-lg font-label-sm text-label-sm text-primary hover:bg-surface-container-highest transition-colors flex items-center gap-1.5 font-bold cursor-pointer"
              >
                <span className="material-symbols-outlined text-base">add</span>
                New Playlist
              </Link>
              <Link to="/tracks" className="font-label-sm text-label-sm text-on-surface-variant hover:text-primary transition-colors flex items-center gap-0.5 font-medium">
                View all <span className="material-symbols-outlined text-sm">arrow_forward</span>
              </Link>
            </div>
          </div>

          <div className="flex flex-col gap-4 flex-1">
            {courses.length === 0 ? (
              <p className="font-body-md text-on-surface-variant text-sm">No active courses found. Go to Tracks to add one!</p>
            ) : (
              [...courses]
                .sort((a, b) => {
                  const pctA = getCourseMetrics(a.id, a.total_lessons).pct;
                  const pctB = getCourseMetrics(b.id, b.total_lessons).pct;
                  if (pctB !== pctA) {
                    return pctB - pctA; // Highest progress percentage first
                  }
                  if (a.created_at && b.created_at) {
                    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime(); // Most recent first
                  }
                  return courses.indexOf(b) - courses.indexOf(a); // Most recently added first fallback
                })
                .slice(0, 2)
                .map((course) => {
                  const { pct } = getCourseMetrics(course.id, course.total_lessons);
                  const courseLessons = getMergedLessonsForCourse(course.id);
                  const isExpanded = expandedCourseId === course.id;

                const catColor = CATEGORY_COLORS[course.category as CourseCategory] || CATEGORY_COLORS['Other'];
                const badgeClass = catColor.badge;

                return (
                  <div key={course.id} className="flex flex-col p-4 rounded-xl hover:bg-surface-container-low transition-colors border border-outline-variant/30 hover:border-outline-variant/60">
                    <div className="flex flex-col md:flex-row items-center gap-6">
                      {/* Course Thumbnail (220x125 16:9) */}
                      {course.thumbnail_url ? (
                        <img 
                          alt={course.title} 
                          className="w-[220px] h-[125px] rounded-xl object-cover border border-outline-variant flex-shrink-0" 
                          src={course.thumbnail_url} 
                        />
                      ) : (
                        <div className={`w-[220px] h-[125px] rounded-xl ${badgeClass} flex items-center justify-center flex-shrink-0 font-bold text-lg border border-outline-variant text-center px-2`}>
                          {course.category}
                        </div>
                      )}

                      {/* Center Info: Title, Lessons, Level, Shortened Progress Bar & Percentage */}
                      <div className="flex-1 flex flex-col justify-center min-w-0 w-full">
                        <h4 className="font-title-md text-title-md font-bold text-primary mb-1">{course.title}</h4>
                        <p className="font-label-sm text-label-sm text-on-surface-variant mb-3">
                          {course.total_lessons} lessons • {course.level}
                        </p>
                        <div className="flex items-center gap-3 w-full">
                          <div className="w-[60%] h-2 bg-[#E5E1D9] rounded-full overflow-hidden flex-shrink-0">
                            <div className="h-full bg-[#D4B24C] transition-all duration-300" style={{ width: `${pct}%` }}></div>
                          </div>
                          <span className="font-label-sm text-label-sm font-bold text-primary">{pct}%</span>
                        </div>
                      </div>

                      {/* Right Action Button */}
                      <button 
                        onClick={() => setExpandedCourseId(isExpanded ? null : course.id)}
                        className="px-4 py-2.5 border border-outline-variant rounded-xl font-label-md text-label-md text-primary hover:bg-surface-container-highest transition-colors cursor-pointer flex items-center gap-2 font-bold flex-shrink-0 md:self-center"
                      >
                        {isExpanded ? 'Close' : 'Continue Learning'}
                        <span className="material-symbols-outlined text-sm">
                          {isExpanded ? 'expand_less' : 'arrow_forward'}
                        </span>
                      </button>
                    </div>

                    {/* Lesson Drawer when Continue Learning is expanded */}
                    {isExpanded && (
                      <div className="mt-4 pt-4 border-t border-outline-variant/40 flex flex-col gap-2 bg-surface-container-low/60 p-3 rounded-lg">
                        <h5 className="font-label-sm text-label-sm font-bold text-primary mb-1">
                          Course Modules & Lessons ({courseLessons.length}):
                        </h5>
                        {courseLessons.length === 0 ? (
                          <p className="font-body-md text-on-surface-variant text-xs">No lesson details available.</p>
                        ) : (
                          courseLessons.map((lesson) => {
                            const done = lesson.completed;
                            return (
                              <div 
                                key={lesson.id}
                                onClick={() => toggleLessonComplete(course.id, lesson.id)}
                                className="flex items-center justify-between p-2 rounded bg-surface border border-outline-variant/30 hover:bg-surface-container-high transition-colors cursor-pointer"
                              >
                                <div className="flex items-center gap-2">
                                  <span className={`material-symbols-outlined text-base ${done ? 'text-green-600' : 'text-on-surface-variant'}`}>
                                    {done ? 'check_circle' : 'radio_button_unchecked'}
                                  </span>
                                  <span className={`font-body-md text-xs ${done ? 'line-through text-on-surface-variant' : 'text-primary font-medium'}`}>
                                    {lesson.title}
                                  </span>
                                </div>
                                <span className="text-[10px] text-on-surface-variant font-mono">
                                  {lesson.duration_minutes}m
                                </span>
                              </div>
                            );
                          })
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          <Link 
            to="/tracks" 
            className="mt-6 w-full py-3.5 rounded-xl border border-outline-variant text-primary font-label-md text-label-md font-bold hover:bg-surface-container-highest transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            Go to Tracks <span className="material-symbols-outlined text-sm">arrow_forward</span>
          </Link>
        </div>
      </div>

      {/* Grid: To-Do & Study Stats */}
      <div className="grid grid-cols-12 gap-grid-gutter px-container-padding mt-8">
        {/* To-Do List Widget */}
        <div className="col-span-12 lg:col-span-7">
          <div className="bg-surface-container-lowest card-border rounded-xl p-card-padding flex flex-col h-full">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-title-lg text-title-lg font-bold flex items-center gap-2">
                <span className="material-symbols-outlined">checklist</span>
                Today's To-Do
              </h3>
              <Link to="/todo" className="font-label-sm text-label-sm text-on-surface-variant hover:text-primary transition-colors">
                View all
              </Link>
            </div>

            <div className="flex flex-col gap-4 flex-1">
              {todaysTasks.length === 0 ? (
                <div className="py-6 text-center text-on-surface-variant font-body-md text-sm">
                  No tasks scheduled for today! Great job.
                </div>
              ) : (
                todaysTasks.map((todo) => (
                  <div 
                    key={todo.id} 
                    className={`flex items-center gap-3 pb-3 border-b border-outline-variant/30 transition-all duration-300 ${
                      todo.completed ? 'opacity-60' : ''
                    }`}
                  >
                    <button 
                      onClick={() => toggleTodo(todo)}
                      className={`w-[20px] h-[20px] min-w-[20px] min-h-[20px] rounded-full flex items-center justify-center transition-all duration-300 cursor-pointer ${
                        todo.completed 
                          ? 'bg-[#C5A880] border-2 border-[#C5A880] text-white shadow-sm' 
                          : 'bg-white border-2 border-[#C5A880] hover:border-[#A88B60]'
                      }`}
                    >
                      {todo.completed && (
                        <span className="material-symbols-outlined text-[13px] font-bold leading-none">
                          check
                        </span>
                      )}
                    </button>
                    <span className={`font-body-md text-body-md flex-1 truncate transition-all duration-300 ${
                      todo.completed ? 'text-on-surface-variant line-through font-normal' : 'text-primary font-medium'
                    }`}>
                      {todo.title}
                    </span>
                    <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border transition-all duration-300 ${
                      todo.completed 
                        ? 'bg-[#E6F4EA] text-[#1E8E3E] border-[#C2E7C9]' 
                        : 'bg-[#FEF3D6] text-[#B07200] border-[#F5E2B3]'
                    }`}>
                      {todo.completed ? 'Completed' : 'Pending'}
                    </span>
                  </div>
                ))
              )}
            </div>

            <button 
              onClick={() => setShowAddModal(true)}
              className="mt-4 flex items-center gap-2 text-on-surface-variant hover:text-primary transition-colors w-fit cursor-pointer"
            >
              <span className="material-symbols-outlined">add</span>
              <span className="font-label-md text-label-md font-bold">Add new task</span>
            </button>
          </div>
        </div>

        {/* Weekly Learning Activity & Study Stats Widget */}
        <div className="col-span-12 lg:col-span-5 flex flex-col gap-8">
          <div className="bg-surface-container-lowest card-border rounded-xl p-card-padding flex flex-col gap-6 h-full">
            <div className="flex justify-between items-center">
              <h3 className="font-title-lg text-title-lg font-bold flex items-center gap-2">
                <span className="material-symbols-outlined">equalizer</span>
                Weekly Learning Activity
              </h3>
              <span className="font-label-sm text-label-sm font-bold text-primary">
                {formatMinutesToHours(last7DaysTotalMins)} (7d)
              </span>
            </div>

            {/* Bar Chart for Last 7 Days */}
            <div className="flex items-end justify-between gap-2 h-32 pt-4 pb-2 border-b border-outline-variant/30 px-2">
              {last7DaysData.map((d, i) => {
                const heightPct = maxDayMins > 0 && d.dayMins > 0 
                  ? Math.max(12, Math.round((d.dayMins / maxDayMins) * 100)) 
                  : 0;
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group relative">
                    <div className="text-[10px] text-on-surface-variant opacity-0 group-hover:opacity-100 transition-opacity font-mono absolute -top-4">
                      {d.dayMins}m
                    </div>
                    <div 
                      className="w-full bg-[#D4B24C] hover:bg-primary transition-colors rounded-t"
                      style={{ height: `${heightPct}%` }}
                    ></div>
                    <span className="text-[11px] font-semibold text-on-surface-variant">{d.dayLabel}</span>
                  </div>
                );
              })}
            </div>

            {/* Study Stats Summary List */}
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between p-3 rounded-lg bg-surface-container-highest/30 border border-outline-variant/30">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-on-surface-variant text-base">check_circle</span>
                  <span className="font-label-md text-label-md">Completed Lessons</span>
                </div>
                <span className="font-bold">{completedLessonsCount}</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-surface-container-highest/30 border border-outline-variant/30">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-on-surface-variant text-base">timer</span>
                  <span className="font-label-md text-label-md">Total Study Hours</span>
                </div>
                <span className="font-bold">{formattedStudyHours}</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-surface-container-highest/30 border border-outline-variant/30">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-on-surface-variant text-base">description</span>
                  <span className="font-label-md text-label-md">Pending Tasks</span>
                </div>
                <span className="font-bold">{pendingTasksCount}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Add Task Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest card-border rounded-xl p-6 w-full max-w-md shadow-xl">
            <h3 className="font-title-lg text-title-lg font-bold mb-4">Add Quick Task</h3>
            <form onSubmit={handleCreateTask}>
              <input 
                type="text"
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                placeholder="Task description..."
                className="w-full p-3 border border-outline-variant rounded-lg bg-surface text-on-background mb-4 font-body-md focus:outline-none focus:border-primary"
                autoFocus
              />
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-lg border border-outline-variant font-label-md text-on-surface hover:bg-surface-container-low transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-primary text-on-primary font-label-md hover:opacity-90 transition-opacity"
                >
                  Save Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Freeze Pass Challenge Modal */}
      <FreezeChallengeModal
        isOpen={showFreezeModal}
        onClose={() => setShowFreezeModal(false)}
        onActivate={() => {
          setShowFreezeModal(false);
          setShowConfirmModal(true);
        }}
        freezePasses={freezePasses}
        freezePassActivated={freezePassActivated}
        lastFrozenDate={lastFrozenDate}
        lastFreezeUsedDate={lastFreezeUsedDate}
        todayLessons={todayLessons}
        todayMinutes={todayMinutes}
        todayXp={todayXp}
        todaySessions={todaySessions}
      />

      {/* Freeze Pass Confirmation Modal */}
      <FreezePassConfirmationModal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        onConfirm={handleConfirmActivateFreezePass}
        isActivating={isActivatingFreezePass}
      />
    </PageLayout>
  );
};

