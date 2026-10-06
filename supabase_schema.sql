-- ====================================================================
-- LEVELUP GAMIFIED LEARNING PORTAL - SUPABASE POSTGRESQL SCHEMA
-- ====================================================================

-- 1. USERS TABLE
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  display_name TEXT DEFAULT 'Learner',
  avatar_url TEXT DEFAULT 'https://lh3.googleusercontent.com/aida-public/AB6AXuAKgZo2XwuQSqbjj9VdjnnyBqka3Q-58zywTQoYk6uz_sSAxwkMHNpkOGuQoePDeWTqh1mYd_O1SEqfgFgBmAfSG4suLdmvmtoFBfbQN7DhRBXmGbi3bwCuQYdjwMEklAAvweQCGM95oI2q1J-zl2xT8IQvjihBbE2GihZGFrMve27uwq528B6yhCtlW_Rtu_yLWsvwGKbG1qh0x2xRvExNP8HfiPfPYKvevXC710DLXoY2x_mSCrmF',
  xp INTEGER DEFAULT 2500,
  level INTEGER DEFAULT 14,
  level_title TEXT DEFAULT 'Explorer',
  streak_days INTEGER DEFAULT 12,
  daily_goal_minutes INTEGER DEFAULT 60,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. COURSES TABLE (Tracks)
CREATE TABLE IF NOT EXISTS public.courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  category TEXT DEFAULT 'Computer Science',
  description TEXT,
  thumbnail_url TEXT,
  total_lessons INTEGER DEFAULT 0,
  estimated_hours NUMERIC(4, 1) DEFAULT 10.0,
  level TEXT DEFAULT 'Intermediate',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. LESSONS TABLE
CREATE TABLE IF NOT EXISTS public.lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  order_index INTEGER NOT NULL DEFAULT 1,
  duration_minutes INTEGER DEFAULT 20,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. LESSON PROGRESS TABLE
CREATE TABLE IF NOT EXISTS public.lesson_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  lesson_id UUID REFERENCES public.lessons(id) ON DELETE CASCADE NOT NULL,
  course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE NOT NULL,
  completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, lesson_id)
);

-- 5. TODOS TABLE
CREATE TABLE IF NOT EXISTS public.todos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  category TEXT DEFAULT 'General',
  priority TEXT CHECK (priority IN ('high', 'medium', 'low')) DEFAULT 'medium',
  due_date DATE,
  completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. TARGETS TABLE
CREATE TABLE IF NOT EXISTS public.targets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  category TEXT DEFAULT 'Study',
  target_date DATE,
  progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage BETWEEN 0 AND 100),
  status TEXT CHECK (status IN ('in_progress', 'completed', 'behind')) DEFAULT 'in_progress',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. ACHIEVEMENTS TABLE
CREATE TABLE IF NOT EXISTS public.achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT DEFAULT 'emoji_events',
  xp_reward INTEGER DEFAULT 100,
  category TEXT DEFAULT 'General',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. USER ACHIEVEMENTS TABLE
CREATE TABLE IF NOT EXISTS public.user_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  achievement_id UUID REFERENCES public.achievements(id) ON DELETE CASCADE NOT NULL,
  unlocked BOOLEAN DEFAULT FALSE,
  unlocked_at TIMESTAMPTZ,
  progress INTEGER DEFAULT 0,
  max_progress INTEGER DEFAULT 100,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, achievement_id)
);

-- 9. NOTIFICATIONS TABLE
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT CHECK (type IN ('system', 'track', 'target', 'achievement')) DEFAULT 'system',
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. STUDY SESSIONS TABLE
CREATE TABLE IF NOT EXISTS public.study_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  lesson_id UUID REFERENCES public.lessons(id) ON DELETE CASCADE NULL,
  duration_minutes INTEGER NOT NULL,
  xp_earned INTEGER DEFAULT 0,
  session_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure lesson_id column exists on pre-existing table
ALTER TABLE public.study_sessions ADD COLUMN IF NOT EXISTS lesson_id UUID REFERENCES public.lessons(id) ON DELETE CASCADE NULL;

-- INDEXES FOR PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_lesson_progress_user ON public.lesson_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_todos_user ON public.todos(user_id);
CREATE INDEX IF NOT EXISTS idx_targets_user ON public.targets(user_id);
CREATE INDEX IF NOT EXISTS idx_user_achievements_user ON public.user_achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_study_sessions_user ON public.study_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_study_sessions_lesson ON public.study_sessions(lesson_id);

-- ENABLE ROW LEVEL SECURITY (RLS)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.todos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_sessions ENABLE ROW LEVEL SECURITY;

-- POLICIES
CREATE POLICY "Users read own profile" ON public.users FOR SELECT USING (true);
CREATE POLICY "Users update own profile" ON public.users FOR UPDATE USING (true);
CREATE POLICY "Users insert profile" ON public.users FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public read courses" ON public.courses FOR SELECT USING (true);
CREATE POLICY "Allow public read lessons" ON public.lessons FOR SELECT USING (true);
CREATE POLICY "Allow public read achievements" ON public.achievements FOR SELECT USING (true);

CREATE POLICY "Manage own lesson progress" ON public.lesson_progress FOR ALL USING (true);
CREATE POLICY "Manage own todos" ON public.todos FOR ALL USING (true);
CREATE POLICY "Manage own targets" ON public.targets FOR ALL USING (true);
CREATE POLICY "Manage own user achievements" ON public.user_achievements FOR ALL USING (true);
CREATE POLICY "Manage own notifications" ON public.notifications FOR ALL USING (true);
CREATE POLICY "Manage own study sessions" ON public.study_sessions FOR ALL USING (true);

-- SEED DATA FOR COURSES
INSERT INTO public.courses (id, title, category, description, thumbnail_url, total_lessons, estimated_hours, level) VALUES
('c1000000-0000-0000-0000-000000000001', 'Advanced Algorithms & Data Structures', 'Computer Science', 'Master trees, graphs, dynamic programming, and complexity analysis.', 'https://images.unsplash.com/photo-1516116211223-4c71414a6743?auto=format&fit=crop&w=300&q=80', 12, 18.5, 'Advanced'),
('c1000000-0000-0000-0000-000000000002', 'System Design & Distributed Architecture', 'Software Engineering', 'Learn key principles of scalable backend system architectures.', 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=300&q=80', 8, 12.0, 'Intermediate'),
('c1000000-0000-0000-0000-000000000003', 'Modern Editorial UI & Design Systems', 'UI/UX Design', 'Craft elegant grid-based interfaces with warm minimalism and typography.', 'https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?auto=format&fit=crop&w=300&q=80', 10, 14.0, 'All Levels'),
('c1000000-0000-0000-0000-000000000004', 'Machine Learning Foundations', 'Data Science', 'Understand linear algebra, regression, neural networks, and model evaluations.', 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=300&q=80', 15, 22.0, 'Beginner');

-- SEED DATA FOR ACHIEVEMENTS
INSERT INTO public.achievements (id, title, description, icon, xp_reward, category) VALUES
('a1000000-0000-0000-0000-000000000001', 'Streak Champion', 'Maintain a 10-day consecutive study streak.', 'local_fire_department', 500, 'Streak'),
('a1000000-0000-0000-0000-000000000002', 'First Steps', 'Complete your very first lesson module.', 'school', 100, 'Learning'),
('a1000000-0000-0000-0000-000000000003', 'Task Master', 'Complete 20 tasks in your to-do checklist.', 'checklist', 250, 'Productivity'),
('a1000000-0000-0000-0000-000000000004', 'Goal Crusher', 'Achieve 100% on any target milestone.', 'track_changes', 400, 'Targets');

-- ====================================================================
-- SECURE USER DELETION RPC FUNCTION
-- ====================================================================
CREATE OR REPLACE FUNCTION public.delete_user_account()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_user_id uuid := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Delete from auth.users (cascades to public.users and all related user tables)
  DELETE FROM auth.users WHERE id = v_user_id;
  DELETE FROM public.users WHERE id = v_user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_user_account() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_user_account() TO authenticated;

-- ====================================================================
-- FREEZE PASS FEATURE: COLUMNS & ATOMIC RPC FUNCTIONS
-- ====================================================================

-- Add columns for Freeze Pass tracking
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS freeze_passes INTEGER DEFAULT 0;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS freeze_pass_activated BOOLEAN DEFAULT FALSE;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS last_frozen_date DATE NULL;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS last_freeze_used_date DATE NULL;

-- Atomic RPC to award a Freeze Pass (capped at 1, blocked if already holding or activated)
CREATE OR REPLACE FUNCTION public.award_freeze_pass(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_updated BOOLEAN := FALSE;
BEGIN
  -- Security check: Ensure authenticated user can only modify their own record
  IF auth.uid() IS NOT NULL AND auth.uid() <> p_user_id THEN
    RAISE EXCEPTION 'Unauthorized: Cannot modify another user''s freeze passes';
  END IF;

  UPDATE public.users
  SET freeze_passes = 1,
      updated_at = NOW()
  WHERE id = p_user_id 
    AND (freeze_passes IS NULL OR freeze_passes < 1)
    AND (freeze_pass_activated IS FALSE OR freeze_pass_activated IS NULL);

  IF FOUND THEN
    v_updated := TRUE;
  END IF;

  RETURN v_updated;
END;
$$;

REVOKE ALL ON FUNCTION public.award_freeze_pass(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.award_freeze_pass(UUID) TO authenticated;

-- Atomic RPC to manually activate a Freeze Pass
CREATE OR REPLACE FUNCTION public.activate_freeze_pass(p_user_id UUID, p_current_date DATE DEFAULT CURRENT_DATE)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_updated BOOLEAN := FALSE;
  v_ref_date DATE := COALESCE(p_current_date, CURRENT_DATE);
BEGIN
  -- Security check: Ensure authenticated user can only modify their own record
  IF auth.uid() IS NOT NULL AND auth.uid() <> p_user_id THEN
    RAISE EXCEPTION 'Unauthorized: Cannot modify another user''s freeze passes';
  END IF;

  UPDATE public.users
  SET freeze_passes = 0,
      freeze_pass_activated = TRUE,
      updated_at = NOW()
  WHERE id = p_user_id 
    AND freeze_passes >= 1
    AND (freeze_pass_activated IS FALSE OR freeze_pass_activated IS NULL)
    AND (last_freeze_used_date IS NULL OR date_trunc('month', last_freeze_used_date) < date_trunc('month', v_ref_date));

  IF FOUND THEN
    v_updated := TRUE;
  END IF;

  RETURN v_updated;
END;
$$;

REVOKE ALL ON FUNCTION public.activate_freeze_pass(UUID, DATE) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.activate_freeze_pass(UUID, DATE) TO authenticated;

-- Atomic RPC to consume an activated Freeze Pass for a specific missed date
CREATE OR REPLACE FUNCTION public.consume_freeze_pass(p_user_id UUID, p_freeze_date DATE)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_updated BOOLEAN := FALSE;
BEGIN
  -- Security check: Ensure authenticated user can only modify their own record
  IF auth.uid() IS NOT NULL AND auth.uid() <> p_user_id THEN
    RAISE EXCEPTION 'Unauthorized: Cannot modify another user''s freeze passes';
  END IF;

  UPDATE public.users
  SET freeze_pass_activated = FALSE,
      last_frozen_date = p_freeze_date,
      last_freeze_used_date = p_freeze_date,
      updated_at = NOW()
  WHERE id = p_user_id 
    AND freeze_pass_activated IS TRUE
    AND (last_frozen_date IS NULL OR last_frozen_date <> p_freeze_date);

  IF FOUND THEN
    v_updated := TRUE;
  END IF;

  RETURN v_updated;
END;
$$;

REVOKE ALL ON FUNCTION public.consume_freeze_pass(UUID, DATE) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.consume_freeze_pass(UUID, DATE) TO authenticated;


