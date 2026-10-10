import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageLayout } from '../components/layout/PageLayout';
import { useAuth } from '../context/AuthContext';
import { profileService, usersService } from '../services';
import { supabase } from '../lib/supabase';

export const Settings: React.FC = () => {
  const { userProfile, currentUser, refreshProfile, resetPassword, logout } = useAuth();
  const navigate = useNavigate();

  // Profile Form States
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState(currentUser?.email || userProfile?.email || '');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [resettingPassword, setResettingPassword] = useState(false);


  // Toast & Modal States
  const [toastInfo, setToastInfo] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);

  const resetProfileFields = async () => {
    if (userProfile) {
      const nameParts = (userProfile.display_name || '').trim().split(' ');
      setFirstName(nameParts[0] || '');
      setLastName(nameParts.slice(1).join(' ') || '');

      const initialEmail = currentUser?.email || userProfile.email || '';
      if (initialEmail) {
        setEmail(initialEmail);
      }
      
      const { data: { user } } = await supabase.auth.getUser();
      setEmail(user?.email || initialEmail);

      setAvatarUrl(userProfile.avatar_url || '');
    }
  };

  useEffect(() => {
    if (userProfile) {
      resetProfileFields();
    }
  }, [userProfile]);


  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToastInfo({ message, type });
    setTimeout(() => {
      setToastInfo(null);
    }, 4000);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim()) {
      showToast('First Name is required.', 'error');
      return;
    }

    setSavingProfile(true);
    try {
      const {
        data: { user },
        error: authError
      } = await supabase.auth.getUser();

      if (authError || !user) {
        showToast('Your session has expired. Please sign in again.', 'error');
        return;
      }

      const targetUserId = user.id;

      const display_name = `${firstName} ${lastName}`.trim();

      console.log("[PROFILE DEBUG] Before update", {
        targetUserId,
        firstName,
        lastName,
        display_name,
        avatarUrl
      });

      const updatedProfile = await usersService.update(targetUserId, {
        display_name,
        avatar_url: avatarUrl
      });

      const { data: dbCheckData } = await supabase
        .from('users')
        .select('id, email, display_name, avatar_url')
        .eq('id', targetUserId)
        .maybeSingle();

      console.log("[PROFILE DEBUG] Database value immediately after UPDATE", dbCheckData);

      if (!updatedProfile) {
        throw new Error('Database update returned no data');
      }

      await refreshProfile();

      console.log("[PROFILE DEBUG] After refreshProfile", {
        userProfile
      });
      showToast('Profile information saved successfully!', 'success');
    } catch (err: any) {
      console.error('Failed to save profile:', err);
      showToast(err?.message || 'Failed to update profile information.', 'error');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async () => {
    const targetEmail = email || currentUser?.email;
    if (!targetEmail) {
      showToast('No email address associated with account.', 'error');
      return;
    }

    try {
      setResettingPassword(true);
      await resetPassword(targetEmail);
      showToast(`Password reset link sent to ${targetEmail}`, 'success');
    } catch (err: any) {
      console.error('Password reset error:', err);
      const msg = err?.message || '';
      const code = err?.code || '';
      const status = err?.status;

      if (
        code === 'over_email_send_rate_limit' ||
        status === 429 ||
        msg.toLowerCase().includes('rate limit')
      ) {
        showToast('Too many password reset requests. Please wait a few minutes before trying again.', 'error');
      } else {
        showToast(msg || 'Failed to send password reset email.', 'error');
      }
    } finally {
      setResettingPassword(false);
    }
  };

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (reader.result) {
          setAvatarUrl(reader.result as string);
          showToast('Avatar image selected. Save changes to apply.', 'success');
        }
      };
      reader.readAsDataURL(file);
    }
  };


  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (err) {
      console.error('Logout error:', err);
      showToast('Failed to log out.', 'error');
    }
  };

  const handleDeleteAccount = async () => {
    if (!currentUser?.uid) return;
    setDeletingAccount(true);
    try {
      await usersService.delete(currentUser.uid);
      await logout();
      navigate('/login');
    } catch (err) {
      console.error('Failed to delete account:', err);
      showToast('Failed to delete account. Please try again.', 'error');
      setDeletingAccount(false);
      setShowDeleteModal(false);
    }
  };

  const fullName = `${firstName} ${lastName}`.trim() || userProfile?.display_name || '';
  const displayAvatar =
    avatarUrl ||
    'https://lh3.googleusercontent.com/aida-public/AB6AXuAKgZo2XwuQSqbjj9VdjnnyBqka3Q-58zywTQoYk6uz_sSAxwkMHNpkOGuQoePDeWTqh1mYd_O1SEqfgFgBmAfSG4suLdmvmtoFBfbQN7DhRBXmGbi3bwCuQYdjwMEklAAvweQCGM95oI2q1J-zl2xT8IQvjihBbE2GihZGFrMve27uwq528B6yhCtlW_Rtu_yLWsvwGKbG1qh0x2xRvExNP8HfiPfPYKvevXC710DLXoY2x_mSCrmF';

  return (
    <PageLayout>
      <div className="px-container-padding py-8 flex-1 flex flex-col gap-8 max-w-5xl mx-auto w-full">
        {/* Toast Notification */}
        {toastInfo && (
          <div
            className={`fixed top-5 right-5 z-50 px-5 py-3 rounded-xl shadow-lg border flex items-center gap-3 transition-all ${
              toastInfo.type === 'error'
                ? 'bg-red-50 border-red-200 text-red-800'
                : 'bg-green-50 border-green-200 text-green-800'
            }`}
          >
            <span className="material-symbols-outlined text-lg">
              {toastInfo.type === 'error' ? 'error' : 'check_circle'}
            </span>
            <span className="text-sm font-bold">{toastInfo.message}</span>
          </div>
        )}

        {/* Page Title */}
        <div>
          <h1 className="font-display-lg text-display-lg font-bold text-primary mb-1">
            Account & Settings
          </h1>
          <p className="font-body-md text-sm text-on-surface-variant">
            Manage your personal profile, workspace preferences, and security options.
          </p>
        </div>

        {/* Top Profile Header */}
        <div className="bg-white border border-[#D8CFBF] rounded-[20px] p-6 md:p-8 flex items-center gap-6 shadow-sm">
          <div className="flex items-center gap-5">
            {/* 84px Circular Profile Picture */}
            <div className="relative group">
              <img
                alt={fullName}
                src={displayAvatar}
                className="w-[84px] h-[84px] min-w-[84px] min-h-[84px] rounded-full object-cover border-2 border-[#D8CFBF] bg-[#F8F5EE]"
              />
              <label className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer text-white">
                <span className="material-symbols-outlined text-xl">photo_camera</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  className="hidden"
                />
              </label>
            </div>

            {/* Profile Info */}
            <div className="flex flex-col gap-1">
              <h2 className="text-2xl font-bold text-[#2C2825] leading-tight">
                {fullName}
              </h2>
              <p className="text-sm text-[#8C8275] font-medium">
                {email || currentUser?.email || userProfile?.email || 'No email provided'}
              </p>
              <div className="flex items-center gap-2 mt-1">
                <span className="material-symbols-outlined text-xs text-[#A09587]">
                  calendar_today
                </span>
                <span className="text-xs text-[#A09587] font-medium">Joined September 2026</span>
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 1: Profile Information */}
        <section className="bg-white border border-[#D8CFBF] rounded-[20px] p-6 md:p-8 shadow-sm flex flex-col gap-6">
          <div className="flex items-center justify-between border-b border-[#E7E1D6] pb-4">
            <div>
              <h3 className="font-title-lg text-title-lg font-bold text-primary flex items-center gap-2">
                <span className="material-symbols-outlined text-xl text-[#8C7A5B]">person</span>
                Profile Information
              </h3>
              <p className="text-xs text-on-surface-variant mt-1">
                Update your personal info and account handle visible across LevelUp.
              </p>
            </div>
          </div>

          <form onSubmit={handleSaveProfile} className="flex flex-col gap-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* First Name */}
              <div>
                <label className="block text-xs font-bold text-[#8C8275] uppercase tracking-wider mb-2">
                  First Name
                </label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="e.g. Alex"
                  className="w-full bg-white border border-[#D8CFBF] rounded-xl px-4 py-3 text-[#2C2825] font-medium text-sm focus:border-[#C5A880] focus:ring-1 focus:ring-[#C5A880] outline-none transition-all"
                />
              </div>

              {/* Last Name */}
              <div>
                <label className="block text-xs font-bold text-[#8C8275] uppercase tracking-wider mb-2">
                  Last Name
                </label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="e.g. Morgan"
                  className="w-full bg-white border border-[#D8CFBF] rounded-xl px-4 py-3 text-[#2C2825] font-medium text-sm focus:border-[#C5A880] focus:ring-1 focus:ring-[#C5A880] outline-none transition-all"
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-xs font-bold text-[#8C8275] uppercase tracking-wider mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  readOnly
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="alex@example.com"
                  className="w-full bg-[#F8F5EE] border border-[#D8CFBF] rounded-xl px-4 py-3 text-[#8C8275] font-medium text-sm outline-none cursor-not-allowed"
                />
              </div>
            </div>

            {/* Profile Action Buttons Aligned Bottom Right */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={resetProfileFields}
                disabled={savingProfile}
                className="px-6 py-3 bg-white border border-[#D8CFBF] text-[#2C2825] rounded-xl font-bold text-sm hover:bg-[#F8F5EE] transition-colors cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={savingProfile}
                className="px-6 py-3 bg-[#2C2825] text-white rounded-xl font-bold text-sm hover:opacity-90 transition-opacity flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {savingProfile ? (
                  <>
                    <span className="material-symbols-outlined text-base animate-spin">sync</span>
                    Saving...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-base">check</span>
                    Save Changes
                  </>
                )}
              </button>
            </div>
          </form>
        </section>

        {/* SECTION 2: Security */}
        <section className="bg-white border border-[#D8CFBF] rounded-[20px] p-6 md:p-8 shadow-sm flex flex-col gap-6">
          <div className="border-b border-[#E7E1D6] pb-4">
            <h3 className="font-title-lg text-title-lg font-bold text-primary flex items-center gap-2">
              <span className="material-symbols-outlined text-xl text-[#8C7A5B]">security</span>
              Security
            </h3>
            <p className="text-xs text-on-surface-variant mt-1">
              Manage your password and extra account protection features.
            </p>
          </div>

          <div className="flex flex-col gap-6">
            {/* Change Password */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h4 className="text-base font-bold text-[#2C2825]">Password & Authentication</h4>
                <p className="text-xs text-[#8C8275] mt-0.5">
                  Request a password reset link sent to your registered email address.
                </p>
              </div>

              <button
                type="button"
                onClick={handleChangePassword}
                disabled={resettingPassword}
                className="px-5 py-2.5 rounded-xl border border-[#D8CFBF] bg-white text-[#2C2825] font-bold text-xs hover:bg-[#F8F5EE] transition-colors cursor-pointer flex items-center gap-2 whitespace-nowrap self-start sm:self-auto disabled:opacity-50"
              >
                {resettingPassword ? (
                  <>
                    <span className="material-symbols-outlined text-base animate-spin">sync</span>
                    Sending...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-base">lock_reset</span>
                    Change Password
                  </>
                )}
              </button>
            </div>
          </div>
        </section>

        {/* SECTION 3: Account Management */}
        <section className="bg-white border border-[#D8CFBF] rounded-[20px] p-6 md:p-8 shadow-sm flex flex-col gap-6 mb-8">
          <div className="border-b border-[#E7E1D6] pb-4">
            <h3 className="font-title-lg text-title-lg font-bold text-primary flex items-center gap-2">
              <span className="material-symbols-outlined text-xl text-[#8C7A5B]">manage_accounts</span>
              Account Management
            </h3>
            <p className="text-xs text-on-surface-variant mt-1">
              Manage your active session or delete your account.
            </p>
          </div>

          {/* Sign Out Row */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h4 className="text-base font-bold text-[#2C2825]">Sign Out</h4>
              <p className="text-xs text-[#8C8275] mt-0.5">
                Log out of your current account session on this device.
              </p>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              className="px-5 py-2.5 rounded-xl border border-[#D8CFBF] bg-white text-[#2C2825] font-bold text-xs hover:bg-[#F8F5EE] transition-colors cursor-pointer flex items-center gap-2 whitespace-nowrap self-start sm:self-auto"
            >
              <span className="material-symbols-outlined text-base">logout</span>
              Log Out
            </button>
          </div>

          {/* Delete Account Row */}
          <div className="pt-4 border-t border-[#E7E1D6] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h4 className="text-base font-bold text-red-600">Delete Account</h4>
              <p className="text-xs text-[#8C8275] mt-0.5">
                Permanently delete your LevelUp account and all associated data.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setShowDeleteModal(true)}
              className="px-5 py-2.5 rounded-xl border border-red-200 bg-white text-red-600 font-bold text-xs hover:bg-red-50 transition-colors cursor-pointer flex items-center gap-2 whitespace-nowrap self-start sm:self-auto"
            >
              <span className="material-symbols-outlined text-base">delete</span>
              Delete Account
            </button>
          </div>
        </section>
      </div>

      {/* Delete Account Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-[#D8CFBF] rounded-[20px] p-6 md:p-8 max-w-md w-full shadow-xl flex flex-col gap-5">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center text-red-600 flex-shrink-0 mt-0.5">
                <span className="material-symbols-outlined text-xl">warning</span>
              </div>
              <div>
                <h3 className="text-lg font-bold text-[#2C2825]">Delete your account?</h3>
                <p className="text-xs text-[#8C8275] mt-1.5 leading-relaxed">
                  This action is permanent. Your profile, courses, progress, achievements, targets, and notifications will be permanently removed.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#E7E1D6]">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                disabled={deletingAccount}
                className="px-5 py-2.5 rounded-xl border border-[#D8CFBF] bg-white text-[#2C2825] font-bold text-xs hover:bg-[#F8F5EE] transition-colors cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteAccount}
                disabled={deletingAccount}
                className="px-5 py-2.5 rounded-xl bg-red-600 text-white font-bold text-xs hover:bg-red-700 transition-colors cursor-pointer flex items-center gap-2 disabled:opacity-50"
              >
                {deletingAccount ? (
                  <>
                    <span className="material-symbols-outlined text-base animate-spin">sync</span>
                    Deleting...
                  </>
                ) : (
                  'Delete Forever'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </PageLayout>
  );
};
