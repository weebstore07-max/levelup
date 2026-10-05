import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { usersService } from '../services';
import { UserProfile } from '../types';

export interface AppUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}

export interface SignUpResult {
  session: any | null;
  user: any | null;
  confirmationRequired: boolean;
}

interface AuthContextType {
  currentUser: AppUser | null;
  userProfile: UserProfile | null;
  loading: boolean;
  isPasswordRecovery: boolean;
  setIsPasswordRecovery: (val: boolean) => void;
  login: (email: string, pass: string) => Promise<void>;
  signup: (email: string, pass: string, name?: string) => Promise<SignUpResult>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPasswordRecovery, setIsPasswordRecovery] = useState<boolean>(() => {
    return window.location.hash.includes('type=recovery') || window.location.search.includes('type=recovery');
  });

  const inFlightProfileFetches = React.useRef<Map<string, Promise<void>>>(new Map());

  const fetchOrCreateProfile = async (
    userId: string,
    email: string | null,
    displayName: string | null,
    photoURL: string | null
  ): Promise<void> => {
    if (inFlightProfileFetches.current.has(userId)) {
      return inFlightProfileFetches.current.get(userId)!;
    }

    const promise = (async () => {
      try {
        const data = await usersService.getById(userId);

        if (data) {
          setUserProfile(data);
        } else {
          const defaultName = displayName || email?.split('@')[0] || 'Learner';
          const defaultAvatar = photoURL || 'https://lh3.googleusercontent.com/aida-public/AB6AXuAKgZo2XwuQSqbjj9VdjnnyBqka3Q-58zywTQoYk6uz_sSAxwkMHNpkOGuQoePDeWTqh1mYd_O1SEqfgFgBmAfSG4suLdmvmtoFBfbQN7DhRBXmGbi3bwCuQYdjwMEklAAvweQCGM95oI2q1J-zl2xT8IQvjihBbE2GihZGFrMve27uwq528B6yhCtlW_Rtu_yLWsvwGKbG1qh0x2xRvExNP8HfiPfPYKvevXC710DLXoY2x_mSCrmF';

          const newProfile: Partial<UserProfile> & { id: string; email: string } = {
            id: userId,
            email: email || '',
            display_name: defaultName,
            avatar_url: defaultAvatar,
            xp: 0,
            level: 1,
            level_title: 'Beginner',
            streak_days: 0,
            daily_goal_minutes: 60
          };

          const created = await usersService.create(newProfile);
          if (created) {
            setUserProfile(created);
          } else {
            setUserProfile(newProfile as UserProfile);
          }
        }
      } catch (err) {
        console.warn('Profile sync exception:', err);
      } finally {
        inFlightProfileFetches.current.delete(userId);
      }
    })();

    inFlightProfileFetches.current.set(userId, promise);
    return promise;
  };

  useEffect(() => {
    let isMounted = true;

    // 1. Initial check for existing Supabase session (e.g. after OAuth redirect or page reload)
    const initSupabaseAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user && isMounted) {
          const sbUser = session.user;
          const mappedUser: AppUser = {
            uid: sbUser.id,
            email: sbUser.email || '',
            displayName: sbUser.user_metadata?.full_name || sbUser.user_metadata?.name || sbUser.email?.split('@')[0] || 'Learner',
            photoURL: sbUser.user_metadata?.avatar_url || sbUser.user_metadata?.picture || null
          };
          setCurrentUser(mappedUser);
          await fetchOrCreateProfile(mappedUser.uid, mappedUser.email, mappedUser.displayName, mappedUser.photoURL);
          if (isMounted) setLoading(false);
          return true;
        }
      } catch (err) {
        console.warn('Error checking Supabase session:', err);
      }
      return false;
    };

    // 2. Subscribe to Supabase auth state changes (login, signup, OAuth redirect, logout)
    const { data: { subscription: sbSubscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!isMounted) return;

      if (event === 'PASSWORD_RECOVERY') {
        setIsPasswordRecovery(true);
      }

      if (session?.user) {
        const sbUser = session.user;
        const mappedUser: AppUser = {
          uid: sbUser.id,
          email: sbUser.email || '',
          displayName: sbUser.user_metadata?.full_name || sbUser.user_metadata?.name || sbUser.email?.split('@')[0] || 'Learner',
          photoURL: sbUser.user_metadata?.avatar_url || sbUser.user_metadata?.picture || null
        };
        setCurrentUser(mappedUser);
        await fetchOrCreateProfile(mappedUser.uid, mappedUser.email, mappedUser.displayName, mappedUser.photoURL);
        if (isMounted) setLoading(false);
      } else {
        setCurrentUser(null);
        setUserProfile(null);
        if (isMounted) setLoading(false);
      }
    });

    initSupabaseAuth().then((hasSbUser) => {
      if (!hasSbUser && isMounted) {
        setLoading(false);
      }
    });

    return () => {
      isMounted = false;
      sbSubscription.unsubscribe();
    };
  }, []);

  const login = async (email: string, pass: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password: pass
    });

    if (error) {
      const msg = error.message || '';

      if (msg.includes('Email not confirmed')) {
        const err = new Error('Please confirm your email address before signing in. Check your inbox for the confirmation link.');
        (err as any).code = 'email_not_confirmed';
        throw err;
      }

      if (error.status === 400 && (error.code === 'invalid_credentials' || msg.includes('Invalid login credentials'))) {
        const err = new Error('Invalid email or password.');
        (err as any).code = 'invalid_credentials';
        throw err;
      }

      throw error;
    }
  };

  const signup = async (email: string, pass: string, name?: string): Promise<SignUpResult> => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password: pass,
      options: {
        data: {
          full_name: name || email.split('@')[0] || 'Learner'
        }
      }
    });

    if (error) {
      throw error;
    }

    const confirmationRequired = !data.session;
    return {
      session: data.session,
      user: data.user,
      confirmationRequired
    };
  };

  const logout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      // ignore
    }
    setCurrentUser(null);
    setUserProfile(null);
    setIsPasswordRecovery(false);
  };

  const resetPassword = async (email: string) => {
    // Determine provider capabilities from canonical Supabase Auth user identity metadata
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user && user.email?.toLowerCase().trim() === email.toLowerCase().trim()) {
        const providers: string[] = user.app_metadata?.providers || (user.identities?.map((i: any) => i.provider) || []);
        if (user.app_metadata?.provider) {
          providers.push(user.app_metadata.provider);
        }

        const hasEmail = providers.includes('email');
        const hasGoogle = providers.includes('google');

        if (hasGoogle && !hasEmail) {
          const err = new Error('This account uses Google Sign-In. Please continue with Google.');
          (err as any).code = 'oauth_account_only';
          throw err;
        }
      }
    } catch (checkErr: any) {
      if (checkErr.code === 'oauth_account_only') throw checkErr;
    }

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`
    });

    if (error) {
      throw error;
    }
  };

  const refreshProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await fetchOrCreateProfile(
          user.id,
          user.email || null,
          user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || null,
          user.user_metadata?.avatar_url || user.user_metadata?.picture || null
        );
      }
    } catch (err) {
      console.warn('Error refreshing profile:', err);
    }
  };

  const value = {
    currentUser,
    userProfile,
    loading,
    isPasswordRecovery,
    setIsPasswordRecovery,
    login,
    signup,
    logout,
    resetPassword,
    refreshProfile
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
