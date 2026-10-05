import { supabase } from '../lib/supabase';
import { TodoItem } from '../types';
import { toUuid } from './lessonProgressService';

export const todosService = {
  async getByUserId(userId: string): Promise<TodoItem[]> {
    const validUserId = toUuid(userId);
    const { data, error } = await supabase
      .from('todos')
      .select('*')
      .eq('user_id', validUserId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching todos:', error.message);
      return [];
    }
    return data as TodoItem[];
  },

  async create(todo: Omit<TodoItem, 'id'> & { created_at?: string }): Promise<TodoItem | null> {
    const validUserId = toUuid(todo.user_id);

    // Ensure parent user record exists in public.users to satisfy Foreign Key constraint (todos_user_id_fkey)
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

    const payload = {
      user_id: validUserId,
      title: todo.title,
      category: todo.category || 'General',
      priority: todo.priority || 'medium',
      due_date: todo.due_date,
      completed: todo.completed ?? false,
      created_at: todo.created_at || new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('todos')
      .insert(payload)
      .select()
      .single();

    if (error) {
      console.error('Error creating todo:', error.message);
      throw error;
    }
    return data as TodoItem;
  },

  async update(todoId: string, updates: Partial<TodoItem>): Promise<TodoItem | null> {
    const { data, error } = await supabase
      .from('todos')
      .update(updates)
      .eq('id', todoId)
      .select()
      .single();

    if (error) {
      console.error('Error updating todo:', error.message);
      throw error;
    }
    return data as TodoItem;
  },

  async delete(todoId: string): Promise<boolean> {
    const { error } = await supabase
      .from('todos')
      .delete()
      .eq('id', todoId);

    if (error) {
      console.error('Error deleting todo:', error.message);
      throw error;
    }
    return true;
  }
};
