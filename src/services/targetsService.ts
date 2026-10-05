import { supabase } from '../lib/supabase';
import { TargetItem } from '../types';
import { toUuid } from './lessonProgressService';

export const targetsService = {
  async getByUserId(userId: string): Promise<TargetItem[]> {
    const validUserId = toUuid(userId);
    const { data, error } = await supabase
      .from('targets')
      .select('*')
      .eq('user_id', validUserId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching targets:', error.message);
      return [];
    }
    return data as TargetItem[];
  },

  async create(target: Omit<TargetItem, 'id' | 'created_at'>): Promise<TargetItem | null> {
    const validUserId = toUuid(target.user_id);
    const payload = {
      ...target,
      user_id: validUserId
    };
    const { data, error } = await supabase
      .from('targets')
      .insert(payload)
      .select()
      .single();

    if (error) {
      console.error('Error creating target:', error.message);
      throw error;
    }
    return data as TargetItem;
  },

  async update(targetId: string, updates: Partial<TargetItem>): Promise<TargetItem | null> {
    const { data, error } = await supabase
      .from('targets')
      .update(updates)
      .eq('id', targetId)
      .select()
      .single();

    if (error) {
      console.error('Error updating target:', error.message);
      throw error;
    }
    return data as TargetItem;
  },

  async delete(targetId: string): Promise<boolean> {
    const { error } = await supabase
      .from('targets')
      .delete()
      .eq('id', targetId);

    if (error) {
      console.error('Error deleting target:', error.message);
      throw error;
    }
    return true;
  }
};
