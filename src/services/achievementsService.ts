import { supabase } from '../lib/supabase';
import { AchievementItem } from '../types';
import { PREDEFINED_ACHIEVEMENTS } from '../data/predefinedAchievements';

export const achievementsService = {
  async getAll(): Promise<AchievementItem[]> {
    const { data, error } = await supabase
      .from('achievements')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching achievements:', error.message);
      return [];
    }
    return data as AchievementItem[];
  },

  async seedPredefinedAchievements(): Promise<AchievementItem[]> {
    try {
      const existing = await this.getAll();
      const existingTitles = new Set((existing || []).map(a => a.title.toLowerCase().trim()));

      const toInsert = PREDEFINED_ACHIEVEMENTS.filter(
        pa => !existingTitles.has(pa.title.toLowerCase().trim())
      );

      if (toInsert.length > 0) {
        const { error } = await supabase
          .from('achievements')
          .insert(toInsert);

        if (error) {
          console.error('Error seeding predefined achievements:', error.message);
        }
      }

      return await this.getAll();
    } catch (err) {
      console.error('Failed to seed achievements:', err);
      return await this.getAll();
    }
  },

  async create(achievement: Omit<AchievementItem, 'id'>): Promise<AchievementItem | null> {
    const { data, error } = await supabase
      .from('achievements')
      .insert(achievement)
      .select()
      .single();

    if (error) {
      console.error('Error creating achievement:', error.message);
      throw error;
    }
    return data as AchievementItem;
  },

  async update(id: string, updates: Partial<AchievementItem>): Promise<AchievementItem | null> {
    const { data, error } = await supabase
      .from('achievements')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating achievement:', error.message);
      throw error;
    }
    return data as AchievementItem;
  },

  async delete(id: string): Promise<boolean> {
    const { error } = await supabase
      .from('achievements')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting achievement:', error.message);
      throw error;
    }
    return true;
  }
};
