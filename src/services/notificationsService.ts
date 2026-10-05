import { supabase } from '../lib/supabase';
import { NotificationItem } from '../types';
import { toUuid } from './lessonProgressService';

const inFlightCreates = new Map<string, Promise<NotificationItem | null>>();

export const notificationsService = {
  async getByUserId(userId: string): Promise<NotificationItem[]> {
    if (!userId) {
      console.warn('getByUserId called with no userId');
      return [];
    }
    const validUserId = toUuid(userId);

    console.log("Auth user ID:", validUserId);

    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', validUserId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Supabase fetch error:', error);
      return [];
    }
    console.log("Notifications fetched:", data);
    return data as NotificationItem[];
  },

  async create(notification: Omit<NotificationItem, 'id' | 'created_at'> & { created_at?: string }): Promise<NotificationItem | null> {
    if (!notification.user_id) {
      const err = new Error('User not authenticated for notification creation');
      console.error('Supabase insert error:', err);
      throw err;
    }

    const validUserId = toUuid(notification.user_id);
    const dedupeKey = `${validUserId}::${notification.type}::${notification.title}::${notification.message}`;

    if (inFlightCreates.has(dedupeKey)) {
      return inFlightCreates.get(dedupeKey)!;
    }

    const createPromise = (async () => {
      // Deduplication check: verify if identical notification already exists in database
      const { data: existingNotifs } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', validUserId)
        .eq('title', notification.title)
        .eq('message', notification.message);

      if (existingNotifs && existingNotifs.length > 0) {
        const isAchievement = notification.type === 'achievement';
        const now = Date.now();
        const hasDuplicate = existingNotifs.some(n => {
          if (isAchievement) return true; // Achievements should only be notified once
          const createdAt = new Date(n.created_at).getTime();
          return (now - createdAt) < 5 * 60 * 1000; // 5 minute window for non-achievement notifications
        });

        if (hasDuplicate) {
          console.log("Duplicate notification prevented:", notification.title);
          return existingNotifs[0] as NotificationItem;
        }
      }

      // Ensure parent user record exists in public.users to satisfy Foreign Key constraint
      const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('id', validUserId)
        .maybeSingle();

      if (!existingUser) {
        const { data: { user: sbAuthUser } } = await supabase.auth.getUser();
        const realEmail = sbAuthUser?.email || `user_${validUserId.slice(0, 8)}@levelup.internal`;
        const realName = sbAuthUser?.user_metadata?.full_name || sbAuthUser?.user_metadata?.name || sbAuthUser?.email?.split('@')[0] || 'Learner';
        const realAvatar = sbAuthUser?.user_metadata?.avatar_url || sbAuthUser?.user_metadata?.picture;

        await supabase.from('users').insert({
          id: validUserId,
          email: realEmail,
          display_name: realName,
          avatar_url: realAvatar
        });
      }

      // Map frontend type to database allowed type for notifications_type_check constraint
      const dbType = notification.type === 'todo' ? 'target' : notification.type === 'course' ? 'track' : notification.type;

      const payload = {
        ...notification,
        id: crypto.randomUUID(),
        user_id: validUserId,
        type: dbType,
        created_at: notification.created_at || new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('notifications')
        .insert(payload)
        .select()
        .single();

      if (error) {
        console.error('Supabase insert error:', error);
        throw error;
      }

      console.log("Notification insert success:", data);

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('notifications-updated'));
      }
      return data as NotificationItem;
    })();

    inFlightCreates.set(dedupeKey, createPromise);

    try {
      return await createPromise;
    } finally {
      inFlightCreates.delete(dedupeKey);
    }
  },

  async markAsRead(id: string): Promise<boolean> {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', id);

    if (error) {
      console.error('Supabase update error:', error);
      throw error;
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('notifications-updated'));
    }
    return true;
  },

  async markAllAsRead(userId: string): Promise<boolean> {
    if (!userId) return false;
    const validUserId = toUuid(userId);

    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', validUserId);

    if (error) {
      console.error('Supabase update error:', error);
      throw error;
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('notifications-updated'));
    }
    return true;
  },

  async delete(id: string): Promise<boolean> {
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting notification:', error.message);
      throw error;
    }
    return true;
  }
};
