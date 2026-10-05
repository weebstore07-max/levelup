import { usersService } from './usersService';
import { UserProfile } from '../types';

export const profileService = {
  async updateProfile(userId: string, fields: { first_name?: string; last_name?: string; username?: string; avatar_url?: string; email?: string; updated_at?: string }): Promise<UserProfile | null> {
    const fullDisplayName = [fields.first_name, fields.last_name].filter(Boolean).join(' ').trim() || undefined;
    return usersService.update(userId, {
      display_name: fullDisplayName,
      avatar_url: fields.avatar_url,
      email: fields.email,
      updated_at: fields.updated_at
    });
  },

  async update(userId: string, fields: any): Promise<UserProfile | null> {
    return this.updateProfile(userId, fields);
  }
};
