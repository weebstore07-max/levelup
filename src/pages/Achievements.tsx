import React, { useEffect, useState } from 'react';
import { PageLayout } from '../components/layout/PageLayout';
import { useAuth } from '../context/AuthContext';
import { achievementsService, userAchievementsService, checkAchievements } from '../services';
import { AchievementItem, AchievementRarity, UserAchievement } from '../types';
import { PREDEFINED_ACHIEVEMENTS } from '../data/predefinedAchievements';

export const Achievements: React.FC = () => {
  const { currentUser } = useAuth();
  const [achievements, setAchievements] = useState<AchievementItem[]>([]);
  const [userAchievements, setUserAchievements] = useState<Record<string, UserAchievement>>({});
  const [activeFilter, setActiveFilter] = useState<'All' | 'Unlocked' | 'Locked' | 'Common' | 'Rare' | 'Epic' | 'Legendary'>('All');
  const [loading, setLoading] = useState(true);

  const activeUserId = currentUser?.uid;

  useEffect(() => {
    if (activeUserId) {
      loadAndEvaluate();
    } else {
      setLoading(false);
    }
  }, [currentUser]);

  const loadAndEvaluate = async () => {
    if (!activeUserId) return;
    try {
      setLoading(true);

      // 1. Run automatic evaluator against live Supabase data
      await checkAchievements(activeUserId);

      // 2. Fetch all achievements from Supabase and merge with predefined dataset
      const dbAch = await achievementsService.getAll();
      const dbTitlesMap = new Map((dbAch || []).map(a => [a.title.toLowerCase().trim(), a]));
      
      const mergedAch: AchievementItem[] = PREDEFINED_ACHIEVEMENTS.map((pa, idx) => {
        const matched = dbTitlesMap.get(pa.title.toLowerCase().trim());
        if (matched) return matched;
        return {
          id: `predefined-${idx + 1}`,
          title: pa.title,
          description: pa.description,
          icon: pa.icon,
          xp_reward: pa.xp_reward,
          category: pa.category,
          rarity: pa.rarity,
          requirement_type: pa.requirement_type,
          requirement_value: pa.requirement_value
        };
      });

      // Include any extra custom achievements from DB
      (dbAch || []).forEach(da => {
        const titleLower = da.title.toLowerCase().trim();
        if (!PREDEFINED_ACHIEVEMENTS.some(pa => pa.title.toLowerCase().trim() === titleLower)) {
          mergedAch.push(da);
        }
      });

      setAchievements(mergedAch);

      // 3. Fetch user achievement records from Supabase
      const userAchList = await userAchievementsService.getByUserId(activeUserId);
      const userAchMap: Record<string, UserAchievement> = {};
      userAchList.forEach(ua => {
        if (ua.achievement_id) {
          userAchMap[ua.achievement_id] = ua;
        }
        if (ua.achievements?.title) {
          userAchMap[ua.achievements.title.toLowerCase().trim()] = ua;
        }
      });
      setUserAchievements(userAchMap);
    } catch (err) {
      console.warn('Error loading achievements:', err);
    } finally {
      setLoading(false);
    }
  };

  const getUserAch = (item: AchievementItem): UserAchievement | undefined => {
    return userAchievements[item.id] || userAchievements[item.title.toLowerCase().trim()];
  };

  // Metrics Calculations
  const totalBadgesCount = achievements.length || 48;
  const unlockedList = achievements.filter(a => getUserAch(a)?.unlocked);
  const unlockedBadgesCount = unlockedList.length;
  
  const totalXpEarned = unlockedList.reduce((acc, a) => acc + (a.xp_reward || 0), 0);
  const rareAndAboveCount = unlockedList.filter(a => {
    const r = (a.rarity || 'common').toLowerCase();
    return r === 'rare' || r === 'epic' || r === 'legendary';
  }).length;
  const completionPercentage = totalBadgesCount > 0 ? Math.round((unlockedBadgesCount / totalBadgesCount) * 100) : 0;

  // Featured Achievement (Top unlocked badge or first legendary/epic)
  const featuredAchievement = unlockedList.length > 0 
    ? [...unlockedList].sort((a, b) => {
        const rarityOrder: Record<string, number> = { legendary: 4, epic: 3, rare: 2, common: 1 };
        return (rarityOrder[b.rarity || 'common'] || 1) - (rarityOrder[a.rarity || 'common'] || 1);
      })[0]
    : achievements[0];

  // Recent Unlocks (Sorted by unlocked_at desc)
  const recentUnlocks = unlockedList
    .map(a => ({ achievement: a, userAch: getUserAch(a) }))
    .filter(item => item.userAch?.unlocked_at)
    .sort((a, b) => new Date(b.userAch!.unlocked_at!).getTime() - new Date(a.userAch!.unlocked_at!).getTime())
    .slice(0, 5);

  // Filtered Achievements
  const filteredAchievements = achievements.filter(item => {
    const userAch = getUserAch(item);
    const isUnlocked = !!userAch?.unlocked;
    const rarity = (item.rarity || 'common').toLowerCase();

    if (activeFilter === 'Unlocked') return isUnlocked;
    if (activeFilter === 'Locked') return !isUnlocked;
    if (activeFilter === 'Common') return rarity === 'common';
    if (activeFilter === 'Rare') return rarity === 'rare';
    if (activeFilter === 'Epic') return rarity === 'epic';
    if (activeFilter === 'Legendary') return rarity === 'legendary';
    return true; // 'All'
  });

  // Helper for Rarity Tag Styling
  const getRarityBadgeStyle = (rarity?: AchievementRarity, isUnlocked = false) => {
    const r = (rarity || 'common').toLowerCase();
    if (!isUnlocked) {
      return 'bg-[#F6F2E8] text-[#6F6B63] border-[#DDD4C6]';
    }
    switch (r) {
      case 'legendary':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300 font-bold';
      case 'epic':
        return 'bg-purple-100 text-purple-800 border-purple-300 font-bold';
      case 'rare':
        return 'bg-amber-100 text-amber-800 border-amber-300 font-bold';
      default:
        return 'bg-blue-100 text-blue-800 border-blue-300 font-semibold';
    }
  };

  return (
    <PageLayout>
      <div className="space-y-8 pb-12">
        {/* 1. Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-display-lg text-display-lg font-bold text-primary mb-2">Achievements</h1>
            <p className="font-body-md text-sm text-[#6F6B63] mt-1">
              Track your milestones, collect badges, and showcase your learning journey.
            </p>
          </div>
          <button
            onClick={loadAndEvaluate}
            className="self-start sm:self-auto px-4 py-2 rounded-[12px] bg-[#FBFAF7] border border-[#DDD4C6] text-[#111111] text-xs font-semibold hover:bg-[#F6F2E8] transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <span className="material-symbols-outlined text-[16px]">refresh</span>
            Refresh Progress
          </button>
        </div>

        {/* 2. Top Statistics (4 cards) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Total Unlocked */}
          <div className="bg-[#FBFAF7] border border-[#DDD4C6] rounded-[20px] p-5 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-[#6F6B63] uppercase tracking-wider mb-1">Total Unlocked</p>
              <h3 className="font-mono text-2xl font-bold text-[#111111]">{unlockedBadgesCount} / {totalBadgesCount}</h3>
            </div>
            <div className="w-11 h-11 rounded-full bg-[#D4AF37]/15 border border-[#D4AF37]/30 flex items-center justify-center text-[#D4AF37]">
              <span className="material-symbols-outlined text-[22px]">trophy</span>
            </div>
          </div>

          {/* Card 2: XP Earned */}
          <div className="bg-[#FBFAF7] border border-[#DDD4C6] rounded-[20px] p-5 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-[#6F6B63] uppercase tracking-wider mb-1">Achievement XP Earned</p>
              <h3 className="font-mono text-2xl font-bold text-[#111111]">+{totalXpEarned.toLocaleString()}</h3>
            </div>
            <div className="w-11 h-11 rounded-full bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-700">
              <span className="material-symbols-outlined text-[22px]">bolt</span>
            </div>
          </div>

          {/* Card 3: Rare & Above */}
          <div className="bg-[#FBFAF7] border border-[#DDD4C6] rounded-[20px] p-5 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-[#6F6B63] uppercase tracking-wider mb-1">Rare & Above</p>
              <h3 className="font-mono text-2xl font-bold text-[#111111]">{rareAndAboveCount}</h3>
            </div>
            <div className="w-11 h-11 rounded-full bg-purple-100 border border-purple-300 flex items-center justify-center text-purple-700">
              <span className="material-symbols-outlined text-[22px]">workspace_premium</span>
            </div>
          </div>

          {/* Card 4: Completion Rate */}
          <div className="bg-[#FBFAF7] border border-[#DDD4C6] rounded-[20px] p-5 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-[#6F6B63] uppercase tracking-wider mb-1">Completion</p>
              <h3 className="font-mono text-2xl font-bold text-[#111111]">{completionPercentage}%</h3>
            </div>
            <div className="w-11 h-11 rounded-full bg-emerald-100 border border-emerald-300 flex items-center justify-center text-emerald-700">
              <span className="material-symbols-outlined text-[22px]">pie_chart</span>
            </div>
          </div>
        </div>

        {/* 3. Featured Achievement */}
        {featuredAchievement && (
          <div className="bg-[#FBFAF7] border border-[#DDD4C6] rounded-[22px] p-6 shadow-xs relative overflow-hidden">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex items-center gap-5">
                <div className="w-16 h-16 rounded-full bg-[#D4AF37]/15 border-2 border-[#D4AF37] flex items-center justify-center text-[#D4AF37] flex-shrink-0 shadow-sm">
                  <span className="material-symbols-outlined text-3xl">{featuredAchievement.icon || 'military_tech'}</span>
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] uppercase font-bold tracking-wider bg-[#D4AF37] text-white">
                      Featured Badge
                    </span>
                    <span className={`px-2.5 py-0.5 rounded-full text-[11px] uppercase font-bold tracking-wider border ${getRarityBadgeStyle(featuredAchievement.rarity, true)}`}>
                      {featuredAchievement.rarity || 'Common'}
                    </span>
                  </div>
                  <h2 className="font-title-lg text-xl font-bold text-[#111111]">{featuredAchievement.title}</h2>
                  <p className="font-body-md text-sm text-[#6F6B63] mt-0.5">{featuredAchievement.description}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 self-end md:self-auto">
                <div className="px-4 py-2 rounded-[14px] bg-[#F6F2E8] border border-[#DDD4C6] text-center">
                  <p className="text-[11px] font-semibold text-[#6F6B63] uppercase">Reward</p>
                  <p className="font-mono text-base font-bold text-[#D4AF37]">+{featuredAchievement.xp_reward} XP</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 4. Filters & Badge Collection Header */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#DDD4C6] pb-3">
            <h2 className="font-title-lg text-xl font-bold text-[#111111]">
              Badge Collection <span className="text-sm font-normal text-[#6F6B63]">({filteredAchievements.length})</span>
            </h2>

            {/* Filter Tabs */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {(['All', 'Unlocked', 'Locked', 'Common', 'Rare', 'Epic', 'Legendary'] as const).map(filter => {
                const isActive = activeFilter === filter;
                return (
                  <button
                    key={filter}
                    onClick={() => setActiveFilter(filter)}
                    className={`px-3 py-1.5 rounded-[12px] text-xs font-semibold transition-all cursor-pointer border ${
                      isActive
                        ? 'bg-[#111111] text-[#FBFAF7] border-[#111111] shadow-xs'
                        : 'bg-[#FBFAF7] text-[#6F6B63] border-[#DDD4C6] hover:bg-[#F6F2E8] hover:text-[#111111]'
                    }`}
                  >
                    {filter}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Badge Collection Grid */}
          {loading ? (
            <div className="bg-[#FBFAF7] border border-[#DDD4C6] rounded-[20px] p-12 text-center text-[#6F6B63] font-body-md">
              Loading achievements from Supabase...
            </div>
          ) : filteredAchievements.length === 0 ? (
            <div className="bg-[#FBFAF7] border border-[#DDD4C6] rounded-[20px] p-12 text-center flex flex-col items-center justify-center gap-3 shadow-xs">
              <div className="w-16 h-16 rounded-full bg-[#D4AF37]/15 border border-[#D4AF37]/30 flex items-center justify-center text-[#D4AF37] mb-1">
                <span className="material-symbols-outlined text-3xl">{activeFilter === 'Unlocked' ? 'emoji_events' : 'search_off'}</span>
              </div>
              <p className="font-display-md text-display-md font-bold text-[#111111]">
                {activeFilter === 'Unlocked' ? 'Your trophy shelf is waiting' : 'No Badges Found'}
              </p>
              <p className="font-body-md text-sm text-[#6F6B63] max-w-md">
                {activeFilter === 'Unlocked' 
                  ? 'Complete lessons and challenges to unlock your first achievement.'
                  : 'No achievements match the selected filter.'}
              </p>
              {activeFilter === 'Unlocked' && (
                <button
                  type="button"
                  onClick={() => window.location.href = '/tracks'}
                  className="bg-[#111111] text-white font-label-md text-label-md px-5 py-2.5 rounded-xl hover:opacity-90 transition-opacity flex items-center gap-2 cursor-pointer shadow-xs mt-2"
                >
                  <span>Start Learning</span>
                  <span className="material-symbols-outlined text-sm">arrow_forward</span>
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredAchievements.map(item => {
                const userAch = getUserAch(item);
                const isUnlocked = !!userAch?.unlocked;
                const progress = userAch?.progress ?? 0;
                const maxProgress = userAch?.max_progress || item.requirement_value || 1;
                const pct = Math.min(100, Math.round((progress / maxProgress) * 100));

                return (
                  <div
                    key={item.id}
                    className={`bg-[#FBFAF7] border border-[#DDD4C6] rounded-[20px] p-5 shadow-xs flex flex-col justify-between transition-all duration-200 ${
                      isUnlocked ? 'hover:-translate-y-1 hover:shadow-md' : 'opacity-70 bg-[#F7F3EA]/50'
                    }`}
                  >
                    <div>
                      {/* Top Row: Rarity Badge + XP Reward */}
                      <div className="flex justify-between items-center gap-2 mb-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] uppercase font-bold tracking-wider border ${getRarityBadgeStyle(item.rarity, isUnlocked)}`}>
                          {item.rarity || 'Common'}
                        </span>
                        <span className="font-mono text-xs font-bold text-[#D4AF37]">
                          +{item.xp_reward} XP
                        </span>
                      </div>

                      {/* Icon & Title */}
                      <div className="flex flex-col items-center text-center space-y-2 my-2">
                        <div className={`w-14 h-14 rounded-full flex items-center justify-center border shadow-xs ${
                          isUnlocked
                            ? 'bg-[#D4AF37]/15 border-[#D4AF37] text-[#D4AF37]'
                            : 'bg-[#F6F2E8] border-[#DDD4C6] text-[#6F6B63] grayscale'
                        }`}>
                          <span className="material-symbols-outlined text-3xl">
                            {isUnlocked ? (item.icon || 'military_tech') : 'lock'}
                          </span>
                        </div>

                        <div>
                          <h3 className="font-title-lg text-base font-bold text-[#111111] leading-snug">{item.title}</h3>
                          <p className="font-body-md text-xs text-[#6F6B63] mt-1 line-clamp-2">{item.description}</p>
                        </div>
                      </div>
                    </div>

                    {/* Progress / Status Footer */}
                    <div className="mt-4 pt-3 border-t border-[#DDD4C6]/40">
                      {isUnlocked ? (
                        <div className="flex items-center justify-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 py-1.5 rounded-[10px]">
                          <span className="material-symbols-outlined text-[16px]">check_circle</span>
                          Unlocked
                        </div>
                      ) : (
                        <div className="space-y-1.5">
                          <div className="flex justify-between items-center text-[11px] font-semibold text-[#6F6B63]">
                            <span>Progress</span>
                            <span className="font-mono">{progress} / {maxProgress}</span>
                          </div>
                          <div className="h-1.5 w-full bg-[#DDD4C6]/50 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-[#D4AF37] rounded-full transition-all duration-300"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 5. Recent Unlocks Section */}
        {recentUnlocks.length > 0 && (
          <div className="bg-[#FBFAF7] border border-[#DDD4C6] rounded-[22px] p-6 shadow-xs space-y-4">
            <h3 className="font-title-lg text-lg font-bold text-[#111111] flex items-center gap-2">
              <span className="material-symbols-outlined text-[#D4AF37]">history</span>
              Recent Unlocks
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
              {recentUnlocks.map(({ achievement, userAch }) => (
                <div key={achievement.id} className="bg-[#F6F2E8] border border-[#DDD4C6] rounded-[16px] p-3 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#D4AF37]/15 border border-[#D4AF37]/40 flex items-center justify-center text-[#D4AF37] flex-shrink-0">
                    <span className="material-symbols-outlined text-xl">{achievement.icon || 'military_tech'}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-title-lg text-xs font-bold text-[#111111] truncate">{achievement.title}</p>
                    <p className="text-[10px] text-[#6F6B63]">
                      {userAch?.unlocked_at ? new Date(userAch.unlocked_at).toLocaleDateString() : 'Unlocked'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </PageLayout>
  );
};
