export interface UserProfile {
  id: string;
  email: string;
  display_name: string;
  avatar_url: string;
  first_name?: string;
  last_name?: string;
  username?: string;
  xp: number;
  level: number;
  level_title: string;
  streak_days: number;
  longest_streak?: number;
  freeze_passes?: number;
  freeze_pass_activated?: boolean;
  last_frozen_date?: string | null;
  last_freeze_used_date?: string | null;
  daily_goal_minutes: number;
  created_at?: string;
  updated_at?: string;
}

export interface Course {
  id: string;
  user_id?: string;
  title: string;
  category: string;
  description: string;
  thumbnail_url: string;
  total_lessons: number;
  estimated_hours: number;
  level: string;
  created_at?: string;
}

export interface Lesson {
  id: string;
  course_id: string;
  title: string;
  order_index: number;
  duration_minutes: number;
  video_id?: string;
  video_url?: string;
  youtube_video_id?: string;
  youtube_url?: string;
  created_at?: string;
}

export interface LessonProgress {
  id: string;
  user_id: string;
  lesson_id: string;
  course_id: string;
  completed: boolean;
  completed_at?: string | null;
}

export interface MergedLesson extends Lesson {
  completed: boolean;
  completed_at?: string | null;
}

export interface TodoItem {
  id: string;
  user_id: string;
  title: string;
  category: string;
  priority: 'high' | 'medium' | 'low';
  due_date?: string;
  completed: boolean;
  created_at?: string;
}

export interface TargetItem {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  category: string; // 'Daily' | 'Weekly' | 'Monthly'
  target_date?: string;
  priority?: 'high' | 'medium' | 'low';
  goal_value?: number;
  current_value?: number;
  progress_percentage: number;
  status: 'in_progress' | 'completed' | 'behind';
  created_at?: string;
}

export type AchievementRarity = 'common' | 'rare' | 'epic' | 'legendary';
export type RequirementType = 'lesson_count' | 'course_count' | 'study_session_count' | 'target_count' | 'streak_days' | 'total_xp';

export interface AchievementItem {
  id: string;
  title: string;
  description: string;
  icon: string;
  xp_reward: number;
  category: string;
  rarity?: AchievementRarity;
  requirement_type?: RequirementType;
  requirement_value?: number;
  created_at?: string;
}

export interface UserAchievement {
  id: string;
  user_id: string;
  achievement_id: string;
  unlocked: boolean;
  unlocked_at?: string;
  progress: number;
  max_progress: number;
  achievements?: AchievementItem;
}

export interface NotificationItem {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: 'system' | 'track' | 'target' | 'achievement' | 'todo' | 'course';
  is_read: boolean;
  created_at: string;
}

export interface StudySession {
  id: string;
  user_id: string;
  lesson_id?: string;
  duration_minutes: number;
  xp_earned: number;
  session_date: string;
  created_at?: string;
}
