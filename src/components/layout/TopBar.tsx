import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { notificationsService } from '../../services';
import { supabase } from '../../lib/supabase';

export const TopBar: React.FC = () => {
  const { userProfile, currentUser, logout } = useAuth();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [authEmail, setAuthEmail] = useState<string>('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchAuthEmail = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.email) {
          setAuthEmail(user.email);
        }
      } catch (err) {
        console.warn('Failed to fetch auth user email:', err);
      }
    };
    fetchAuthEmail();
  }, []);

  useEffect(() => {
    const fetchUnread = () => {
      if (currentUser?.uid) {
        notificationsService.getByUserId(currentUser.uid).then(data => {
          if (data) {
            setUnreadCount(data.filter(n => !n.is_read).length);
          }
        }).catch(err => console.warn('Failed to fetch unread notifications count:', err));
      } else {
        setUnreadCount(0);
      }
    };

    fetchUnread();

    window.addEventListener('focus', fetchUnread);
    window.addEventListener('notifications-updated', fetchUnread);

    return () => {
      window.removeEventListener('focus', fetchUnread);
      window.removeEventListener('notifications-updated', fetchUnread);
    };
  }, [currentUser]);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  const avatarUrl = userProfile?.avatar_url || 'https://lh3.googleusercontent.com/aida-public/AB6AXuAKgZo2XwuQSqbjj9VdjnnyBqka3Q-58zywTQoYk6uz_sSAxwkMHNpkOGuQoePDeWTqh1mYd_O1SEqfgFgBmAfSG4suLdmvmtoFBfbQN7DhRBXmGbi3bwCuQYdjwMEklAAvweQCGM95oI2q1J-zl2xT8IQvjihBbE2GihZGFrMve27uwq528B6yhCtlW_Rtu_yLWsvwGKbG1qh0x2xRvExNP8HfiPfPYKvevXC710DLXoY2x_mSCrmF';

  return (
    <header className="h-topbar-height w-full sticky top-0 bg-background flex items-center px-container-padding z-10 justify-end border-b border-outline-variant/30">
      <div className="hidden">Level Up</div>
      <div className="flex items-center gap-6">
        {/* Notifications Icon with Unread Badge Counter */}
        <Link 
          to="/notifications" 
          className="relative cursor-pointer hover:opacity-80 transition-opacity flex items-center justify-center w-10 h-10"
          title="Notifications"
        >
          <span className="material-symbols-outlined text-on-surface-variant">notifications</span>
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-error text-white font-bold text-[10px] min-w-[18px] h-[18px] px-1 rounded-full flex items-center justify-center border-2 border-background shadow-sm">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Link>

        {/* User Profile Avatar Dropdown */}
        <div className="relative">
          <button 
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
            title="User menu"
          >
            <img 
              alt="User profile photo" 
              className="w-10 h-10 rounded-full object-cover border border-outline-variant" 
              src={avatarUrl}
            />
            <span className="material-symbols-outlined text-on-surface-variant" data-icon="expand_more">
              expand_more
            </span>
          </button>

          {/* Profile Menu Popup */}
          {showProfileMenu && (
            <div className="absolute right-0 mt-2 w-48 bg-surface-container-lowest border card-border rounded-xl shadow-lg py-2 z-50">
              <div className="px-4 py-2 border-b border-outline-variant/40">
                <p className="font-label-md text-label-md font-bold text-primary truncate">
                  {userProfile?.display_name || 'Learner'}
                </p>
                <p className="font-label-sm text-label-sm text-on-surface-variant truncate">
                  {authEmail}
                </p>
              </div>
              <Link 
                to="/settings" 
                onClick={() => setShowProfileMenu(false)}
                className="flex items-center gap-2 px-4 py-2 text-body-md text-on-surface hover:bg-surface-container-highest transition-colors"
              >
                <span className="material-symbols-outlined text-sm">settings</span>
                Settings
              </Link>
              <button 
                onClick={handleLogout}
                className="w-full flex items-center gap-2 px-4 py-2 text-body-md text-error hover:bg-error-container/20 transition-colors text-left"
              >
                <span className="material-symbols-outlined text-sm">logout</span>
                Log Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

