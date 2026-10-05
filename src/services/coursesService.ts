import { supabase } from '../lib/supabase';
import { Course } from '../types';

import { isUuid } from './lessonProgressService';

export const coursesService = {
  async getByUserId(userId: string): Promise<Course[]> {
    if (!userId) return [];

    const { data, error } = await supabase
      .from('courses')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching courses:', error.message);
      return [];
    }

    const allCourses = (data as Course[]) || [];
    return allCourses.filter(c => 
      c.user_id === userId || 
      c.description?.includes(`[user:${userId}]`) || 
      c.description?.includes(`User: ${userId}`)
    );
  },

  async getAll(userId?: string): Promise<Course[]> {
    if (userId) {
      return this.getByUserId(userId);
    }
    return [];
  },

  async getById(courseId: string): Promise<Course | null> {
    const { data, error } = await supabase
      .from('courses')
      .select('*')
      .eq('id', courseId)
      .single();

    if (error) {
      console.error('Error fetching course:', error.message);
      return null;
    }
    return data as Course;
  },

  async create(course: Omit<Course, 'id' | 'created_at'> & { id?: string; user_id?: string }): Promise<Course | null> {
    const payload = {
      ...course,
      id: course.id && isUuid(course.id) ? course.id : crypto.randomUUID()
    };

    let { data, error } = await supabase
      .from('courses')
      .insert(payload)
      .select()
      .single();

    if (error && error.code === 'PGRST204' && 'user_id' in payload) {
      const { user_id, ...payloadWithoutUserId } = payload;
      const res = await supabase
        .from('courses')
        .insert(payloadWithoutUserId)
        .select()
        .single();
      data = res.data;
      error = res.error;
    }

    if (error) {
      console.error('Error creating course:', error.message);
      throw error;
    }
    return data as Course;
  },

  async update(courseId: string, updates: Partial<Course>): Promise<Course | null> {
    const { data, error } = await supabase
      .from('courses')
      .update(updates)
      .eq('id', courseId)
      .select()
      .single();

    if (error) {
      console.error('Error updating course:', error.message);
      throw error;
    }
    return data as Course;
  },

  async delete(courseId: string): Promise<boolean> {
    const { error } = await supabase
      .from('courses')
      .delete()
      .eq('id', courseId);

    if (error) {
      console.error('Error deleting course:', error.message);
      throw error;
    }
    return true;
  }
};
