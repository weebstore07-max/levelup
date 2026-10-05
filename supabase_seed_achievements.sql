-- =======================================================
-- LevelUp Supabase Seed Script: 48 Achievements
-- Run this script in your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/_/sql
-- =======================================================

-- 1. Ensure required columns exist on achievements table
ALTER TABLE public.achievements 
  ADD COLUMN IF NOT EXISTS rarity TEXT DEFAULT 'common',
  ADD COLUMN IF NOT EXISTS requirement_type TEXT DEFAULT 'lesson_count',
  ADD COLUMN IF NOT EXISTS requirement_value INTEGER DEFAULT 1;

-- 2. Insert all 48 predefined achievements into public.achievements
INSERT INTO public.achievements (title, description, icon, xp_reward, category, rarity, requirement_type, requirement_value)
VALUES
  -- --- LESSONS (8) ---
  ('First Lesson', 'Complete your very first lesson.', 'school', 100, 'Lessons', 'common', 'lesson_count', 1),
  ('Getting Started', 'Complete 3 lessons.', 'play_circle', 150, 'Lessons', 'common', 'lesson_count', 3),
  ('Eager Learner', 'Complete 5 lessons.', 'menu_book', 200, 'Lessons', 'common', 'lesson_count', 5),
  ('Dedicated Scholar', 'Complete 10 lessons.', 'auto_stories', 350, 'Lessons', 'rare', 'lesson_count', 10),
  ('Knowledge Hunter', 'Complete 15 lessons.', 'psychology', 500, 'Lessons', 'rare', 'lesson_count', 15),
  ('Curriculum Master', 'Complete 25 lessons.', 'history_edu', 800, 'Lessons', 'epic', 'lesson_count', 25),
  ('Lesson Titan', 'Complete 40 lessons.', 'workspace_premium', 1200, 'Lessons', 'epic', 'lesson_count', 40),
  ('Grand Academician', 'Complete 60 lessons across all modules.', 'military_tech', 2000, 'Lessons', 'legendary', 'lesson_count', 60),

  -- --- COURSES (8) ---
  ('Course Starter', 'Finish your first full course.', 'local_library', 250, 'Courses', 'common', 'course_count', 1),
  ('Dual Graduate', 'Complete 2 courses.', 'terminal', 400, 'Courses', 'rare', 'course_count', 2),
  ('Triple Crown', 'Complete 3 courses.', 'code', 600, 'Courses', 'rare', 'course_count', 3),
  ('Bookworm', 'Complete 5 courses.', 'laptop_mac', 900, 'Courses', 'rare', 'course_count', 5),
  ('Polymath', 'Complete 7 courses.', 'developer_board', 1200, 'Courses', 'epic', 'course_count', 7),
  ('Code Master', 'Complete 10 courses.', 'extension', 1600, 'Courses', 'epic', 'course_count', 10),
  ('System Architect', 'Complete 15 courses.', 'architecture', 2500, 'Courses', 'legendary', 'course_count', 15),
  ('Omniscient Pioneer', 'Complete 20 courses.', 'stars', 4000, 'Courses', 'legendary', 'course_count', 20),

  -- --- STUDY SESSIONS (8) ---
  ('First Step', 'Log your first study session.', 'timer', 100, 'Sessions', 'common', 'study_session_count', 1),
  ('Study Routine', 'Log 3 study sessions.', 'schedule', 150, 'Sessions', 'common', 'study_session_count', 3),
  ('Focus Pioneer', 'Log 5 study sessions.', 'query_builder', 250, 'Sessions', 'common', 'study_session_count', 5),
  ('Deep Work Discipline', 'Log 10 study sessions.', 'hourglass_bottom', 400, 'Sessions', 'rare', 'study_session_count', 10),
  ('Concentration Veteran', 'Log 20 study sessions.', 'hourglass_full', 700, 'Sessions', 'rare', 'study_session_count', 20),
  ('Flow State Master', 'Log 35 study sessions.', 'speed', 1000, 'Sessions', 'epic', 'study_session_count', 35),
  ('Marathon Learner', 'Log 50 study sessions.', 'pace', 1500, 'Sessions', 'epic', 'study_session_count', 50),
  ('Unstoppable Focus', 'Log 100 study sessions.', 'history', 3000, 'Sessions', 'legendary', 'study_session_count', 100),

  -- --- TARGETS (8) ---
  ('Goal Setter', 'Complete your first target.', 'track_changes', 100, 'Targets', 'common', 'target_count', 1),
  ('Target Striker', 'Complete 3 learning targets.', 'ads_click', 200, 'Targets', 'common', 'target_count', 3),
  ('Milestone Achiever', 'Complete 5 learning targets.', 'flag', 350, 'Targets', 'rare', 'target_count', 5),
  ('Task Crusher', 'Complete 10 learning targets.', 'check_circle', 600, 'Targets', 'rare', 'target_count', 10),
  ('High Goal Crusher', 'Complete 15 learning targets.', 'verified', 900, 'Targets', 'rare', 'target_count', 15),
  ('Target Commander', 'Complete 25 learning targets.', 'star', 1400, 'Targets', 'epic', 'target_count', 25),
  ('Goal Virtuoso', 'Complete 40 learning targets.', 'diamond', 2000, 'Targets', 'epic', 'target_count', 40),
  ('Overachiever Legend', 'Complete 60 learning targets.', 'trophy', 3500, 'Targets', 'legendary', 'target_count', 60),

  -- --- STREAKS (8) ---
  ('Spark', 'Reach a 2-day study streak.', 'local_fire_department', 100, 'Streaks', 'common', 'streak_days', 2),
  ('Consistency Starter', 'Reach a 3-day study streak.', 'bolt', 150, 'Streaks', 'common', 'streak_days', 3),
  ('On Fire', 'Reach a 7-day study streak.', 'whatshot', 350, 'Streaks', 'common', 'streak_days', 7),
  ('Unstoppable Momentum', 'Reach a 10-day study streak.', 'electric_bolt', 500, 'Streaks', 'rare', 'streak_days', 10),
  ('Fortnight Warrior', 'Reach a 14-day study streak.', 'flare', 800, 'Streaks', 'rare', 'streak_days', 14),
  ('Monthly Mastery', 'Reach a 30-day study streak.', 'wb_sunny', 1500, 'Streaks', 'epic', 'streak_days', 30),
  ('Seasoned Habit', 'Reach a 60-day study streak.', 'shield', 2500, 'Streaks', 'epic', 'streak_days', 60),
  ('Centurion Streak', 'Reach a 100-day study streak.', 'auto_awesome', 5000, 'Streaks', 'legendary', 'streak_days', 100),

  -- --- XP (8) ---
  ('First XP', 'Earn your first 100 XP.', 'emoji_events', 50, 'XP', 'common', 'total_xp', 100),
  ('XP Enthusiast', 'Reach 500 total XP.', 'social_leaderboard', 150, 'XP', 'common', 'total_xp', 500),
  ('Bronze Collector', 'Reach 1,000 total XP.', 'stars', 250, 'XP', 'rare', 'total_xp', 1000),
  ('Silver Accumulator', 'Reach 2,500 total XP.', 'workspace_premium', 500, 'XP', 'rare', 'total_xp', 2500),
  ('Gold Vanguard', 'Reach 5,000 total XP.', 'emoji_events', 800, 'XP', 'rare', 'total_xp', 5000),
  ('Platinum Elite', 'Reach 10,000 total XP.', 'trophy', 1500, 'XP', 'epic', 'total_xp', 10000),
  ('Diamond Overlord', 'Reach 25,000 total XP.', 'crown', 3000, 'XP', 'epic', 'total_xp', 25000),
  ('Mythic Sovereign', 'Reach 50,000 total XP.', 'diamond', 5000, 'XP', 'legendary', 'total_xp', 50000)
ON CONFLICT (title) DO NOTHING;
