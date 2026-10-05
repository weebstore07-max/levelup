import { createClient } from '@supabase/supabase-js';

const rawUrl = 'https://ztezgtpuxjwmxcllecsv.supabase.co/rest/v1/';
const supabaseUrl = rawUrl.replace(/\/rest\/v1\/?$/, '').replace(/\/$/, '');
const supabaseAnonKey = 'sb_publishable_L9SZNwCjhtPZ7zCTcd20wg_ulJp0PKF';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const PREDEFINED_ACHIEVEMENTS = [
  // --- LESSONS (8) ---
  {
    title: 'First Lesson',
    description: 'Complete your very first lesson.',
    icon: 'school',
    xp_reward: 100,
    category: 'Lessons',
    rarity: 'common',
    requirement_type: 'lesson_count',
    requirement_value: 1
  },
  {
    title: 'Getting Started',
    description: 'Complete 3 lessons.',
    icon: 'play_circle',
    xp_reward: 150,
    category: 'Lessons',
    rarity: 'common',
    requirement_type: 'lesson_count',
    requirement_value: 3
  },
  {
    title: 'Eager Learner',
    description: 'Complete 5 lessons.',
    icon: 'menu_book',
    xp_reward: 200,
    category: 'Lessons',
    rarity: 'common',
    requirement_type: 'lesson_count',
    requirement_value: 5
  },
  {
    title: 'Dedicated Scholar',
    description: 'Complete 10 lessons.',
    icon: 'auto_stories',
    xp_reward: 350,
    category: 'Lessons',
    rarity: 'rare',
    requirement_type: 'lesson_count',
    requirement_value: 10
  },
  {
    title: 'Knowledge Hunter',
    description: 'Complete 15 lessons.',
    icon: 'psychology',
    xp_reward: 500,
    category: 'Lessons',
    rarity: 'rare',
    requirement_type: 'lesson_count',
    requirement_value: 15
  },
  {
    title: 'Curriculum Master',
    description: 'Complete 25 lessons.',
    icon: 'history_edu',
    xp_reward: 800,
    category: 'Lessons',
    rarity: 'epic',
    requirement_type: 'lesson_count',
    requirement_value: 25
  },
  {
    title: 'Lesson Titan',
    description: 'Complete 40 lessons.',
    icon: 'workspace_premium',
    xp_reward: 1200,
    category: 'Lessons',
    rarity: 'epic',
    requirement_type: 'lesson_count',
    requirement_value: 40
  },
  {
    title: 'Grand Academician',
    description: 'Complete 60 lessons across all modules.',
    icon: 'military_tech',
    xp_reward: 2000,
    category: 'Lessons',
    rarity: 'legendary',
    requirement_type: 'lesson_count',
    requirement_value: 60
  },

  // --- COURSES (8) ---
  {
    title: 'Course Starter',
    description: 'Finish your first full course.',
    icon: 'local_library',
    xp_reward: 250,
    category: 'Courses',
    rarity: 'common',
    requirement_type: 'course_count',
    requirement_value: 1
  },
  {
    title: 'Dual Graduate',
    description: 'Complete 2 courses.',
    icon: 'terminal',
    xp_reward: 400,
    category: 'Courses',
    rarity: 'rare',
    requirement_type: 'course_count',
    requirement_value: 2
  },
  {
    title: 'Triple Crown',
    description: 'Complete 3 courses.',
    icon: 'code',
    xp_reward: 600,
    category: 'Courses',
    rarity: 'rare',
    requirement_type: 'course_count',
    requirement_value: 3
  },
  {
    title: 'Bookworm',
    description: 'Complete 5 courses.',
    icon: 'laptop_mac',
    xp_reward: 900,
    category: 'Courses',
    rarity: 'rare',
    requirement_type: 'course_count',
    requirement_value: 5
  },
  {
    title: 'Polymath',
    description: 'Complete 7 courses.',
    icon: 'developer_board',
    xp_reward: 1200,
    category: 'Courses',
    rarity: 'epic',
    requirement_type: 'course_count',
    requirement_value: 7
  },
  {
    title: 'Code Master',
    description: 'Complete 10 courses.',
    icon: 'extension',
    xp_reward: 1600,
    category: 'Courses',
    rarity: 'epic',
    requirement_type: 'course_count',
    requirement_value: 10
  },
  {
    title: 'System Architect',
    description: 'Complete 15 courses.',
    icon: 'architecture',
    xp_reward: 2500,
    category: 'Courses',
    rarity: 'legendary',
    requirement_type: 'course_count',
    requirement_value: 15
  },
  {
    title: 'Omniscient Pioneer',
    description: 'Complete 20 courses.',
    icon: 'stars',
    xp_reward: 4000,
    category: 'Courses',
    rarity: 'legendary',
    requirement_type: 'course_count',
    requirement_value: 20
  },

  // --- STUDY SESSIONS (8) ---
  {
    title: 'First Step',
    description: 'Log your first study session.',
    icon: 'timer',
    xp_reward: 100,
    category: 'Sessions',
    rarity: 'common',
    requirement_type: 'study_session_count',
    requirement_value: 1
  },
  {
    title: 'Study Routine',
    description: 'Log 3 study sessions.',
    icon: 'schedule',
    xp_reward: 150,
    category: 'Sessions',
    rarity: 'common',
    requirement_type: 'study_session_count',
    requirement_value: 3
  },
  {
    title: 'Focus Pioneer',
    description: 'Log 5 study sessions.',
    icon: 'query_builder',
    xp_reward: 250,
    category: 'Sessions',
    rarity: 'common',
    requirement_type: 'study_session_count',
    requirement_value: 5
  },
  {
    title: 'Deep Work Discipline',
    description: 'Log 10 study sessions.',
    icon: 'hourglass_bottom',
    xp_reward: 400,
    category: 'Sessions',
    rarity: 'rare',
    requirement_type: 'study_session_count',
    requirement_value: 10
  },
  {
    title: 'Concentration Veteran',
    description: 'Log 20 study sessions.',
    icon: 'hourglass_full',
    xp_reward: 700,
    category: 'Sessions',
    rarity: 'rare',
    requirement_type: 'study_session_count',
    requirement_value: 20
  },
  {
    title: 'Flow State Master',
    description: 'Log 35 study sessions.',
    icon: 'speed',
    xp_reward: 1000,
    category: 'Sessions',
    rarity: 'epic',
    requirement_type: 'study_session_count',
    requirement_value: 35
  },
  {
    title: 'Marathon Learner',
    description: 'Log 50 study sessions.',
    icon: 'pace',
    xp_reward: 1500,
    category: 'Sessions',
    rarity: 'epic',
    requirement_type: 'study_session_count',
    requirement_value: 50
  },
  {
    title: 'Unstoppable Focus',
    description: 'Log 100 study sessions.',
    icon: 'history',
    xp_reward: 3000,
    category: 'Sessions',
    rarity: 'legendary',
    requirement_type: 'study_session_count',
    requirement_value: 100
  },

  // --- TARGETS (8) ---
  {
    title: 'Goal Setter',
    description: 'Complete your first target.',
    icon: 'track_changes',
    xp_reward: 100,
    category: 'Targets',
    rarity: 'common',
    requirement_type: 'target_count',
    requirement_value: 1
  },
  {
    title: 'Target Striker',
    description: 'Complete 3 learning targets.',
    icon: 'ads_click',
    xp_reward: 200,
    category: 'Targets',
    rarity: 'common',
    requirement_type: 'target_count',
    requirement_value: 3
  },
  {
    title: 'Milestone Achiever',
    description: 'Complete 5 learning targets.',
    icon: 'flag',
    xp_reward: 350,
    category: 'Targets',
    rarity: 'rare',
    requirement_type: 'target_count',
    requirement_value: 5
  },
  {
    title: 'Task Crusher',
    description: 'Complete 10 learning targets.',
    icon: 'check_circle',
    xp_reward: 600,
    category: 'Targets',
    rarity: 'rare',
    requirement_type: 'target_count',
    requirement_value: 10
  },
  {
    title: 'High Goal Crusher',
    description: 'Complete 15 learning targets.',
    icon: 'verified',
    xp_reward: 900,
    category: 'Targets',
    rarity: 'rare',
    requirement_type: 'target_count',
    requirement_value: 15
  },
  {
    title: 'Target Commander',
    description: 'Complete 25 learning targets.',
    icon: 'star',
    xp_reward: 1400,
    category: 'Targets',
    rarity: 'epic',
    requirement_type: 'target_count',
    requirement_value: 25
  },
  {
    title: 'Goal Virtuoso',
    description: 'Complete 40 learning targets.',
    icon: 'diamond',
    xp_reward: 2000,
    category: 'Targets',
    rarity: 'epic',
    requirement_type: 'target_count',
    requirement_value: 40
  },
  {
    title: 'Overachiever Legend',
    description: 'Complete 60 learning targets.',
    icon: 'trophy',
    xp_reward: 3500,
    category: 'Targets',
    rarity: 'legendary',
    requirement_type: 'target_count',
    requirement_value: 60
  },

  // --- STREAKS (8) ---
  {
    title: 'Spark',
    description: 'Reach a 2-day study streak.',
    icon: 'local_fire_department',
    xp_reward: 100,
    category: 'Streaks',
    rarity: 'common',
    requirement_type: 'streak_days',
    requirement_value: 2
  },
  {
    title: 'Consistency Starter',
    description: 'Reach a 3-day study streak.',
    icon: 'bolt',
    xp_reward: 150,
    category: 'Streaks',
    rarity: 'common',
    requirement_type: 'streak_days',
    requirement_value: 3
  },
  {
    title: 'On Fire',
    description: 'Reach a 7-day study streak.',
    icon: 'whatshot',
    xp_reward: 350,
    category: 'Streaks',
    rarity: 'common',
    requirement_type: 'streak_days',
    requirement_value: 7
  },
  {
    title: 'Unstoppable Momentum',
    description: 'Reach a 10-day study streak.',
    icon: 'electric_bolt',
    xp_reward: 500,
    category: 'Streaks',
    rarity: 'rare',
    requirement_type: 'streak_days',
    requirement_value: 10
  },
  {
    title: 'Fortnight Warrior',
    description: 'Reach a 14-day study streak.',
    icon: 'flare',
    xp_reward: 800,
    category: 'Streaks',
    rarity: 'rare',
    requirement_type: 'streak_days',
    requirement_value: 14
  },
  {
    title: 'Monthly Mastery',
    description: 'Reach a 30-day study streak.',
    icon: 'wb_sunny',
    xp_reward: 1500,
    category: 'Streaks',
    rarity: 'epic',
    requirement_type: 'streak_days',
    requirement_value: 30
  },
  {
    title: 'Seasoned Habit',
    description: 'Reach a 60-day study streak.',
    icon: 'shield',
    xp_reward: 2500,
    category: 'Streaks',
    rarity: 'epic',
    requirement_type: 'streak_days',
    requirement_value: 60
  },
  {
    title: 'Centurion Streak',
    description: 'Reach a 100-day study streak.',
    icon: 'auto_awesome',
    xp_reward: 5000,
    category: 'Streaks',
    rarity: 'legendary',
    requirement_type: 'streak_days',
    requirement_value: 100
  },

  // --- XP (8) ---
  {
    title: 'First XP',
    description: 'Earn your first 100 XP.',
    icon: 'emoji_events',
    xp_reward: 50,
    category: 'XP',
    rarity: 'common',
    requirement_type: 'total_xp',
    requirement_value: 100
  },
  {
    title: 'XP Enthusiast',
    description: 'Reach 500 total XP.',
    icon: 'social_leaderboard',
    xp_reward: 150,
    category: 'XP',
    rarity: 'common',
    requirement_type: 'total_xp',
    requirement_value: 500
  },
  {
    title: 'Bronze Collector',
    description: 'Reach 1,000 total XP.',
    icon: 'stars',
    xp_reward: 250,
    category: 'XP',
    rarity: 'rare',
    requirement_type: 'total_xp',
    requirement_value: 1000
  },
  {
    title: 'Silver Accumulator',
    description: 'Reach 2,500 total XP.',
    icon: 'workspace_premium',
    xp_reward: 500,
    category: 'XP',
    rarity: 'rare',
    requirement_type: 'total_xp',
    requirement_value: 2500
  },
  {
    title: 'Gold Vanguard',
    description: 'Reach 5,000 total XP.',
    icon: 'emoji_events',
    xp_reward: 800,
    category: 'XP',
    rarity: 'rare',
    requirement_type: 'total_xp',
    requirement_value: 5000
  },
  {
    title: 'Platinum Elite',
    description: 'Reach 10,000 total XP.',
    icon: 'trophy',
    xp_reward: 1500,
    category: 'XP',
    rarity: 'epic',
    requirement_type: 'total_xp',
    requirement_value: 10000
  },
  {
    title: 'Diamond Overlord',
    description: 'Reach 25,000 total XP.',
    icon: 'crown',
    xp_reward: 3000,
    category: 'XP',
    rarity: 'epic',
    requirement_type: 'total_xp',
    requirement_value: 25000
  },
  {
    title: 'Mythic Sovereign',
    description: 'Reach 50,000 total XP.',
    icon: 'diamond',
    xp_reward: 5000,
    category: 'XP',
    rarity: 'legendary',
    requirement_type: 'total_xp',
    requirement_value: 50000
  }
];

async function seed() {
  console.log('Fetching existing achievements from Supabase...');
  const { data: existing, error: fetchErr } = await supabase.from('achievements').select('*');
  if (fetchErr) {
    console.error('Fetch error:', fetchErr);
    return;
  }

  console.log(`Current records in Supabase: ${existing ? existing.length : 0}`);
  const existingTitles = new Set((existing || []).map(a => a.title.toLowerCase().trim()));

  const missing = PREDEFINED_ACHIEVEMENTS.filter(pa => !existingTitles.has(pa.title.toLowerCase().trim()));
  console.log(`Missing achievements to insert: ${missing.length}`);

  if (missing.length > 0) {
    const { data: inserted, error: insertErr } = await supabase.from('achievements').insert(missing).select();
    if (insertErr) {
      console.error('Insert error:', insertErr);
    } else {
      console.log(`Successfully inserted ${inserted.length} missing achievements into Supabase!`);
    }
  }

  const { data: finalData } = await supabase.from('achievements').select('*');
  console.log(`Final count in Supabase achievements table: ${finalData ? finalData.length : 0}`);
}

seed();
