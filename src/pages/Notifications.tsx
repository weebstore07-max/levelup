import React, { useEffect, useState } from 'react';
import { PageLayout } from '../components/layout/PageLayout';
import { useAuth } from '../context/AuthContext';
import { notificationsService, targetsService } from '../services';
import { NotificationItem, TargetItem } from '../types';
import { supabase } from '../lib/supabase';

export const Notifications: React.FC = () => {
  const { currentUser } = useAuth();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  useEffect(() => {
    fetchAndCheckNotifications();

    window.addEventListener('notifications-updated', fetchAndCheckNotifications);
    return () => {
      window.removeEventListener('notifications-updated', fetchAndCheckNotifications);
    };
  }, [currentUser]);

  const fetchAndCheckNotifications = async () => {
    try {
      setLoading(true);
      if (currentUser?.uid) {
        // 1. Fetch live notifications ordered newest first
        let data = await notificationsService.getByUserId(currentUser.uid);

        // 2. Check targets for deadline tomorrow / overdue and trigger automatic notifications
        const targets: TargetItem[] = await targetsService.getByUserId(currentUser.uid);
        const todayStr = new Date().toISOString().split('T')[0];
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowStr = tomorrow.toISOString().split('T')[0];

        const existingTitles = new Set(data.map(n => n.title));

        for (const target of targets) {
          if (target.target_date === tomorrowStr && target.status !== 'completed') {
            const notifTitle = `Target Due Tomorrow: ${target.title}`;
            if (!existingTitles.has(notifTitle)) {
              await notificationsService.create({
                user_id: currentUser.uid,
                title: notifTitle,
                message: `Your target deadline for "${target.title}" is coming up tomorrow.`,
                type: 'target',
                is_read: false
              });
            }
          } else if (target.target_date && target.target_date < todayStr && target.status !== 'completed') {
            const notifTitle = `Target Overdue: ${target.title}`;
            if (!existingTitles.has(notifTitle)) {
              await notificationsService.create({
                user_id: currentUser.uid,
                title: notifTitle,
                message: `The deadline for target "${target.title}" has passed.`,
                type: 'target',
                is_read: false
              });
            }
          }
        }

        // Re-fetch notifications after automated check
        data = await notificationsService.getByUserId(currentUser.uid);
        setNotifications(data || []);
      }
    } catch (err) {
      console.warn('Notifications fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAllAsRead = async () => {
    if (!currentUser?.uid) return;
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    try {
      await notificationsService.markAllAsRead(currentUser.uid);
    } catch (err) {
      console.error('Failed to mark all as read:', err);
      fetchAndCheckNotifications();
    }
  };

  const handleMarkAsRead = async (notification: NotificationItem) => {
    if (notification.is_read) return;
    setNotifications(prev => prev.map(n => n.id === notification.id ? { ...n, is_read: true } : n));
    try {
      await notificationsService.markAsRead(notification.id);
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
      fetchAndCheckNotifications();
    }
  };

  // Formatters to remove redundant prefixes
  const formatNotificationTitle = (title: string) => {
    return title
      .replace(/^Badge Unlocked:\s*/i, '')
      .replace(/^Target Created:\s*/i, '')
      .replace(/^Target Completed:\s*/i, '')
      .replace(/^Task Completed:\s*/i, '')
      .replace(/^Video Imported:\s*/i, '')
      .replace(/^Course Imported:\s*/i, '');
  };

  const formatNotificationMessage = (msg: string) => {
    return msg
      .replace(/^Congratulations!\s*/i, '')
      .replace(/Congratulations!\s*/i, '')
      .trim();
  };

  // Helper for Notification Category Icon & Colors
  const getCategoryDetails = (type: string, title?: string) => {
    if (type === 'todo' || (type === 'target' && title && (title.includes('Task') || title.includes('To-Do')))) {
      return {
        icon: 'task_alt',
        bgColor: 'bg-[#E6F4EA]',
        textColor: 'text-[#1E8E3E]',
        badgeBg: 'bg-[#E6F4EA] text-[#1E8E3E] border-[#C2E7C9]',
        label: 'To-Do'
      };
    }
    switch (type) {
      case 'achievement':
        return {
          icon: 'emoji_events',
          bgColor: 'bg-[#F3E8FD]',
          textColor: 'text-[#9333EA]',
          badgeBg: 'bg-[#F3E8FD] text-[#9333EA] border-[#E9D5FF]',
          label: 'Achievement'
        };
      case 'course':
      case 'track':
        return {
          icon: 'menu_book',
          bgColor: 'bg-[#E8F0FE]',
          textColor: 'text-[#1A73E8]',
          badgeBg: 'bg-[#E8F0FE] text-[#1A73E8] border-[#D2E3FC]',
          label: 'Course'
        };
      case 'target':
        return {
          icon: 'track_changes',
          bgColor: 'bg-[#FCE8E6]',
          textColor: 'text-[#D93025]',
          badgeBg: 'bg-[#FCE8E6] text-[#D93025] border-[#F5C2C0]',
          label: 'Target'
        };
      case 'todo':
        return {
          icon: 'task_alt',
          bgColor: 'bg-[#E6F4EA]',
          textColor: 'text-[#1E8E3E]',
          badgeBg: 'bg-[#E6F4EA] text-[#1E8E3E] border-[#C2E7C9]',
          label: 'To-Do'
        };
      case 'system':
      default:
        return {
          icon: 'bolt',
          bgColor: 'bg-[#FEF3D6]',
          textColor: 'text-[#B07200]',
          badgeBg: 'bg-[#FEF3D6] text-[#B07200] border-[#F5E2B3]',
          label: 'System'
        };
    }
  };

  // Format Relative Timestamp
  const formatRelativeTime = (dateStr?: string) => {
    if (!dateStr) return 'Recently';
    const now = new Date();
    const date = new Date(dateStr);
    const diffInMs = now.getTime() - date.getTime();
    const diffInSecs = Math.floor(diffInMs / 1000);
    const diffInMins = Math.floor(diffInSecs / 60);
    const diffInHours = Math.floor(diffInMins / 60);
    const diffInDays = Math.floor(diffInHours / 24);

    if (diffInMins < 1) return 'Just now';
    if (diffInMins < 60) return `${diffInMins} min`;
    if (diffInHours < 24) return `${diffInHours} hour${diffInHours > 1 ? 's' : ''}`;
    if (diffInDays === 1) return 'Yesterday';
    if (diffInDays < 7) return `${diffInDays} days`;

    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  // Grouping Notifications Chronologically
  const filteredNotifications = selectedCategory === 'all' 
    ? notifications 
    : notifications.filter(n => {
        if (selectedCategory === 'course') return n.type === 'course' || n.type === 'track';
        if (selectedCategory === 'todo') return n.type === 'todo' || (n.type === 'target' && (n.title.includes('Task') || n.title.includes('To-Do')));
        if (selectedCategory === 'target') return n.type === 'target' && !n.title.includes('Task') && !n.title.includes('To-Do');
        return n.type === selectedCategory;
      });

  const groupNotificationsByDate = (notifs: NotificationItem[]) => {
    const todayStr = new Date().toDateString();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toDateString();

    const todayItems: NotificationItem[] = [];
    const yesterdayItems: NotificationItem[] = [];
    const olderItems: NotificationItem[] = [];

    notifs.forEach(n => {
      if (!n.created_at) {
        todayItems.push(n);
        return;
      }
      const itemDate = new Date(n.created_at).toDateString();
      if (itemDate === todayStr) {
        todayItems.push(n);
      } else if (itemDate === yesterdayStr) {
        yesterdayItems.push(n);
      } else {
        olderItems.push(n);
      }
    });

    const groups: { title: string; items: NotificationItem[] }[] = [];
    if (todayItems.length > 0) groups.push({ title: 'Today', items: todayItems });
    if (yesterdayItems.length > 0) groups.push({ title: 'Yesterday', items: yesterdayItems });
    if (olderItems.length > 0) groups.push({ title: 'Older', items: olderItems });

    return groups;
  };

  const notificationGroups = groupNotificationsByDate(filteredNotifications);
  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <PageLayout>
      <div className="px-container-padding py-8 flex-1 flex flex-col gap-8 max-w-7xl mx-auto w-full">
        {/* Header & Controls */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-[#E7E1D6] pb-6">
          <div>
            <h2 className="font-display-lg text-display-lg text-primary mb-1 font-bold">Notifications</h2>
            <p className="font-body-md text-body-md text-on-surface-variant">
              Stay updated with your learning journey.
            </p>
          </div>

          <button
            onClick={handleMarkAllAsRead}
            disabled={unreadCount === 0}
            className={`px-4 py-2.5 rounded-xl border border-[#D8CFBF] font-bold text-sm flex items-center gap-2 transition-all cursor-pointer ${
              unreadCount > 0 
                ? 'bg-white text-primary hover:bg-[#F8F5EE] shadow-sm' 
                : 'bg-surface-container-lowest text-on-surface-variant/50 border-outline-variant/30 cursor-not-allowed'
            }`}
          >
            <span className="material-symbols-outlined text-lg">done_all</span>
            Mark all as read
          </button>
        </div>

        {/* Category Filters Bar */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              selectedCategory === 'all'
                ? 'bg-primary text-on-primary shadow-sm'
                : 'bg-white text-on-surface-variant border border-[#D8CFBF] hover:bg-[#F8F5EE]'
            }`}
          >
            All Notifications ({notifications.length})
          </button>

          <button
            onClick={() => setSelectedCategory('achievement')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              selectedCategory === 'achievement'
                ? 'bg-[#9333EA] text-white shadow-sm'
                : 'bg-white text-on-surface-variant border border-[#D8CFBF] hover:bg-[#F3E8FD]'
            }`}
          >
            <span>🏆</span> Achievement
          </button>

          <button
            onClick={() => setSelectedCategory('course')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              selectedCategory === 'course'
                ? 'bg-[#1A73E8] text-white shadow-sm'
                : 'bg-white text-on-surface-variant border border-[#D8CFBF] hover:bg-[#E8F0FE]'
            }`}
          >
            <span>📚</span> Course
          </button>

          <button
            onClick={() => setSelectedCategory('target')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              selectedCategory === 'target'
                ? 'bg-[#D93025] text-white shadow-sm'
                : 'bg-white text-on-surface-variant border border-[#D8CFBF] hover:bg-[#FCE8E6]'
            }`}
          >
            <span>🎯</span> Target
          </button>

          <button
            onClick={() => setSelectedCategory('todo')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              selectedCategory === 'todo'
                ? 'bg-[#1E8E3E] text-white shadow-sm'
                : 'bg-white text-on-surface-variant border border-[#D8CFBF] hover:bg-[#E6F4EA]'
            }`}
          >
            <span>✅</span> To-Do
          </button>

          <button
            onClick={() => setSelectedCategory('system')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              selectedCategory === 'system'
                ? 'bg-[#B07200] text-white shadow-sm'
                : 'bg-white text-on-surface-variant border border-[#D8CFBF] hover:bg-[#FEF3D6]'
            }`}
          >
            <span>⚡</span> System
          </button>
        </div>

        {/* Notifications Chronological Feed */}
        {loading ? (
          <div className="flex flex-col gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-28 bg-[#F8F5EE] border border-[#E8E1D4] rounded-[20px] animate-pulse"></div>
            ))}
          </div>
        ) : notificationGroups.length === 0 ? (
          /* Empty State */
          <div className="bg-[#F8F5EE] border border-[#E8E1D4] rounded-[24px] p-12 text-center flex flex-col items-center justify-center max-w-lg mx-auto shadow-sm my-6">
            <div className="w-16 h-16 rounded-full bg-surface-container-highest flex items-center justify-center border border-outline-variant/30 text-primary mb-4">
              <span className="material-symbols-outlined text-3xl">notifications</span>
            </div>
            <h3 className="font-display-md text-display-md font-bold text-primary mb-2">You're all caught up</h3>
            <p className="font-body-md text-body-md text-on-surface-variant text-center max-w-md">
              New learning updates and achievements will appear here.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-8">
            {notificationGroups.map(group => (
              <div key={group.title} className="flex flex-col gap-4">
                {/* Group Date Header */}
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-2 h-2 rounded-full bg-[#C5A880]"></span>
                  <h3 className="font-title-md text-title-md font-bold text-primary">
                    {group.title}
                  </h3>
                  <span className="text-xs text-on-surface-variant font-medium">({group.items.length})</span>
                </div>

                {/* Cards List - Notion / Linear Style */}
                <div className="flex flex-col gap-4">
                  {group.items.map(item => {
                    const category = getCategoryDetails(item.type, item.title);

                    return (
                      <div
                        key={item.id}
                        onClick={() => handleMarkAsRead(item)}
                        className={`bg-[#F8F5EE] border border-[#E8E1D4] rounded-[20px] p-5 md:p-6 transition-all duration-200 hover:shadow-sm hover:border-[#C5A880]/60 cursor-pointer relative flex flex-col gap-4 ${
                          !item.is_read ? 'ring-1 ring-[#C5A880]/60' : 'opacity-85'
                        }`}
                      >
                        {/* Top Row: Icon + Title/Description + Timestamp */}
                        <div className="flex items-start justify-between gap-4">
                          {/* Left: 44px Icon + Center Text */}
                          <div className="flex items-start gap-4 flex-1 min-w-0">
                            {/* 44px Icon Container */}
                            <div className={`w-[44px] h-[44px] min-w-[44px] min-h-[44px] rounded-full flex items-center justify-center flex-shrink-0 ${category.bgColor} ${category.textColor}`}>
                              <span className="material-symbols-outlined text-[22px]">{category.icon}</span>
                            </div>

                            {/* Center: Title (18px) + Description (14-15px) */}
                            <div className="min-w-0 flex-1 pt-0.5">
                              <h4 className="font-bold text-[#2C2825] text-[18px] leading-snug truncate">
                                {formatNotificationTitle(item.title)}
                              </h4>
                              <p className="font-body-md text-[14px] text-on-surface-variant mt-1 leading-relaxed">
                                {formatNotificationMessage(item.message)}
                              </p>
                            </div>
                          </div>

                          {/* Right: Timestamp & Unread Dot */}
                          <div className="flex items-center gap-2.5 flex-shrink-0 pt-1">
                            <span className="text-xs font-semibold text-[#8C8275] whitespace-nowrap">
                              {formatRelativeTime(item.created_at)}
                            </span>

                            {!item.is_read && (
                              <span className="w-2.5 h-2.5 rounded-full bg-[#2C2825] min-w-[10px] min-h-[10px]" title="Unread"></span>
                            )}
                          </div>
                        </div>

                        {/* Bottom Row: Divider + Right-aligned Category Badge */}
                        <div className="border-t border-[#E8E1D4] pt-3 flex justify-end items-center">
                          <span className={`px-3 py-1 rounded-full text-[11px] font-bold border uppercase tracking-wider ${category.badgeBg}`}>
                            {category.label}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </PageLayout>
  );
};

