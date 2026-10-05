import { supabase } from '../lib/supabase';
import { Lesson } from '../types';

import { isUuid } from './lessonProgressService';

export const getSortedLessons = (lessons: Lesson[] = []): Lesson[] => {
  return [...lessons].sort((a, b) => {
    const idxA = typeof a.order_index === 'number' ? a.order_index : 0;
    const idxB = typeof b.order_index === 'number' ? b.order_index : 0;
    if (idxA !== idxB) return idxA - idxB;
    return (a.title || '').localeCompare(b.title || '');
  });
};

export const lessonsService = {
  async getByCourseId(courseId: string): Promise<Lesson[]> {
    const { data, error } = await supabase
      .from('lessons')
      .select('*')
      .eq('course_id', courseId)
      .order('order_index', { ascending: true });

    if (error) {
      console.error('Error fetching lessons:', error.message);
      return [];
    }
    return getSortedLessons(data as Lesson[]);
  },

  async create(lesson: Omit<Lesson, 'id' | 'created_at'> & { id?: string }): Promise<Lesson | null> {
    const payload = {
      ...lesson,
      id: lesson.id && isUuid(lesson.id) ? lesson.id : crypto.randomUUID()
    };
    const { data, error } = await supabase
      .from('lessons')
      .insert(payload)
      .select()
      .single();

    if (error) {
      console.error('Error creating lesson:', error.message);
      throw error;
    }
    return data as Lesson;
  },

  async createMany(lessonsList: (Omit<Lesson, 'id' | 'created_at'> & { id?: string })[]): Promise<Lesson[]> {
    const payload = lessonsList.map(l => ({
      ...l,
      id: l.id && isUuid(l.id) ? l.id : crypto.randomUUID()
    }));
    const { data, error } = await supabase
      .from('lessons')
      .insert(payload)
      .select();

    if (error) {
      console.error('Error creating lessons:', error.message);
      throw error;
    }
    return getSortedLessons(data as Lesson[]);
  },

  async update(lessonId: string, updates: Partial<Lesson>): Promise<Lesson | null> {
    const { data, error } = await supabase
      .from('lessons')
      .update(updates)
      .eq('id', lessonId)
      .select()
      .single();

    if (error) {
      console.error('Error updating lesson:', error.message);
      throw error;
    }
    return data as Lesson;
  },

  async delete(lessonId: string): Promise<boolean> {
    const { error } = await supabase
      .from('lessons')
      .delete()
      .eq('id', lessonId);

    if (error) {
      console.error('Error deleting lesson:', error.message);
      throw error;
    }
    return true;
  }
};
