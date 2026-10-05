import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { checkPasswordRequirements, getPasswordValidationError } from '../utils/passwordValidation';

export const ResetPassword: React.FC = () => {
  const { isPasswordRecovery, setIsPasswordRecovery } = useAuth();
  const navigate = useNavigate();

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [isValidRecovery, setIsValidRecovery] = useState<boolean | null>(null);

  useEffect(() => {
    const checkRecoverySession = async () => {
      if (isPasswordRecovery) {
        setIsValidRecovery(true);
        return;
      }

      if (window.location.hash.includes('type=recovery') || window.location.search.includes('type=recovery')) {
        setIsPasswordRecovery(true);
        setIsValidRecovery(true);
        return;
      }

      // Check if user has an active session from recovery link
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user && isPasswordRecovery) {
        setIsValidRecovery(true);
      } else {
        setIsValidRecovery(false);
      }
    };

    checkRecoverySession();
  }, [isPasswordRecovery, setIsPasswordRecovery]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    if (!newPassword || !confirmPassword) {
      setError('Please fill in both password fields.');
      return;
    }

    const passwordErr = getPasswordValidationError(newPassword);
    if (passwordErr) {
      setError(passwordErr);
      return;
    }

    if (/\s/.test(confirmPassword)) {
      setError('Password cannot contain blank spaces.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    try {
      setSubmitting(true);
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (updateError) {
        setError(updateError.message || 'Failed to update password.');
        return;
      }

      setSuccessMessage('Password updated successfully! Redirecting to sign in...');

      setTimeout(async () => {
        try {
          await supabase.auth.signOut();
        } catch (e) {
          // ignore
        }
        setIsPasswordRecovery(false);
        navigate('/login');
      }, 1500);

    } catch (err: any) {
      setError(err?.message || 'An error occurred while resetting your password.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-background min-h-screen flex text-on-background font-body-md w-full">
      {/* Left Side: Hero Artwork */}
      <div className="hidden md:flex w-1/2 bg-surface-container-low border-r border-outline-variant relative overflow-hidden h-screen items-center justify-center p-6 lg:p-12">
        <img 
          src="/wide_minimalist_soft_pastel_illustration_hero_pa.png" 
          alt="Level Up - Turn your learning journey into a game" 
          className="w-full h-full object-contain"
        />
      </div>

      {/* Right Side: Reset Form or Invalid Link Message */}
      <div className="flex-1 flex flex-col justify-center px-8 md:px-16 lg:px-24 xl:px-32 h-screen bg-background overflow-y-auto">
        {/* Mobile Logo */}
        <div className="md:hidden flex items-center gap-3 mb-8">
          <span className="material-symbols-outlined text-3xl text-primary">menu_book</span>
          <div className="font-headline-md text-headline-md text-primary">Level Up</div>
        </div>

        <div className="w-full mx-auto max-w-md">
          {isValidRecovery === null ? (
            <div className="flex items-center gap-3 text-primary">
              <span className="material-symbols-outlined animate-spin text-2xl">progress_activity</span>
              <span>Verifying reset link...</span>
            </div>
          ) : !isValidRecovery ? (
            /* Invalid or Expired Session View */
            <div className="text-center sm:text-left">
              <div className="w-12 h-12 rounded-full bg-error-container text-on-error-container flex items-center justify-center mb-4 mx-auto sm:mx-0">
                <span className="material-symbols-outlined text-2xl">link_off</span>
              </div>
              <h2 className="font-display-lg text-[36px] leading-[1.2] font-bold text-primary mb-2">
                Invalid or expired link
              </h2>
              <p className="font-body-lg text-body-lg text-on-surface-variant mb-6">
                Your password reset link is invalid or has expired. Please request a new password reset link from the Sign In page.
              </p>

              <button
                type="button"
                onClick={() => navigate('/login')}
                className="w-full bg-[#2C2825] text-white font-label-md text-label-md py-3.5 px-4 rounded-[10px] shadow-sm hover:opacity-90 transition-opacity cursor-pointer flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-base">arrow_back</span>
                Back to Sign In
              </button>
            </div>
          ) : (
            /* Reset Password Form */
            <div>
              <h2 className="font-display-lg text-[40px] leading-[1.2] font-bold text-primary mb-2">
                Reset Password
              </h2>
              <p className="font-body-lg text-body-lg text-on-surface-variant mb-6">
                Enter your new password below to secure your LevelUp account.
              </p>

              {error && (
                <div className="mb-6 p-4 rounded-lg bg-error-container text-on-error-container font-body-md border border-error/30 text-sm">
                  {error}
                </div>
              )}

              {successMessage && (
                <div className="mb-6 p-4 rounded-lg bg-green-50 text-green-800 font-body-md border border-green-200 text-sm flex items-center gap-2">
                  <span className="material-symbols-outlined text-lg">check_circle</span>
                  <span>{successMessage}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                {/* New Password Input */}
                <div>
                  <label className="block font-label-md text-label-md text-on-background mb-2" htmlFor="newPassword">
                    New Password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <span className="material-symbols-outlined text-on-surface-variant text-[20px]">lock</span>
                    </div>
                    <input 
                      id="newPassword" 
                      type={showPassword ? "text" : "password"} 
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="••••••••" 
                      className="block w-full pl-10 pr-10 py-3 border border-outline-variant rounded-lg bg-surface-container-lowest text-on-background placeholder:text-outline focus:ring-1 focus:ring-primary focus:border-primary transition-colors font-body-md text-body-md shadow-sm"
                      required
                    />
                    <button 
                      type="button" 
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-on-surface-variant hover:text-primary transition-colors"
                    >
                      <span className="material-symbols-outlined text-[20px]">
                        {showPassword ? 'visibility' : 'visibility_off'}
                      </span>
                    </button>
                  </div>

                  {newPassword.length > 0 && (() => {
                    const { reqs, strengthLabel } = checkPasswordRequirements(newPassword);
                    return (
                      <div className="mt-3 p-3 bg-[#F8F5EE] border border-[#D8CFBF] rounded-lg text-xs space-y-2">
                        <div className="flex items-center justify-between font-bold text-[#2C2825]">
                          <span>Password Strength:</span>
                          <span className={
                            strengthLabel === 'Strong' ? 'text-green-700 font-bold' :
                            strengthLabel === 'Medium' ? 'text-amber-700 font-bold' : 'text-red-600 font-bold'
                          }>
                            {strengthLabel}
                          </span>
                        </div>
                        
                        <div className="w-full bg-[#E7E1D6] rounded-full h-1.5 overflow-hidden">
                          <div 
                            className={`h-full transition-all duration-300 ${
                              strengthLabel === 'Strong' ? 'bg-green-600 w-full' :
                              strengthLabel === 'Medium' ? 'bg-amber-500 w-2/3' : 'bg-red-500 w-1/3'
                            }`}
                          />
                        </div>

                        <div className="pt-1 text-[#444748] space-y-1">
                          <div className={`flex items-center gap-1.5 ${reqs.minLength ? 'text-green-700 font-medium' : 'text-[#8C8275]'}`}>
                            <span className="material-symbols-outlined text-[14px]">
                              {reqs.minLength ? 'check_circle' : 'cancel'}
                            </span>
                            <span>At least 8 characters</span>
                          </div>
                          <div className={`flex items-center gap-1.5 ${reqs.hasUppercase ? 'text-green-700 font-medium' : 'text-[#8C8275]'}`}>
                            <span className="material-symbols-outlined text-[14px]">
                              {reqs.hasUppercase ? 'check_circle' : 'cancel'}
                            </span>
                            <span>One uppercase letter (A-Z)</span>
                          </div>
                          <div className={`flex items-center gap-1.5 ${reqs.hasLowercase ? 'text-green-700 font-medium' : 'text-[#8C8275]'}`}>
                            <span className="material-symbols-outlined text-[14px]">
                              {reqs.hasLowercase ? 'check_circle' : 'cancel'}
                            </span>
                            <span>One lowercase letter (a-z)</span>
                          </div>
                          <div className={`flex items-center gap-1.5 ${reqs.hasNumber ? 'text-green-700 font-medium' : 'text-[#8C8275]'}`}>
                            <span className="material-symbols-outlined text-[14px]">
                              {reqs.hasNumber ? 'check_circle' : 'cancel'}
                            </span>
                            <span>One number (0-9)</span>
                          </div>
                          <div className={`flex items-center gap-1.5 ${reqs.hasSpecial ? 'text-green-700 font-medium' : 'text-[#8C8275]'}`}>
                            <span className="material-symbols-outlined text-[14px]">
                              {reqs.hasSpecial ? 'check_circle' : 'cancel'}
                            </span>
                            <span>One special character (!@#$%^&*)</span>
                          </div>
                          <div className={`flex items-center gap-1.5 ${reqs.noWhitespace ? 'text-green-700 font-medium' : 'text-red-600 font-medium'}`}>
                            <span className="material-symbols-outlined text-[14px]">
                              {reqs.noWhitespace ? 'check_circle' : 'cancel'}
                            </span>
                            <span>No blank spaces</span>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* Confirm Password Input */}
                <div>
                  <label className="block font-label-md text-label-md text-on-background mb-2" htmlFor="confirmPassword">
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <span className="material-symbols-outlined text-on-surface-variant text-[20px]">lock_reset</span>
                    </div>
                    <input 
                      id="confirmPassword" 
                      type={showConfirmPassword ? "text" : "password"} 
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••" 
                      className="block w-full pl-10 pr-10 py-3 border border-outline-variant rounded-lg bg-surface-container-lowest text-on-background placeholder:text-outline focus:ring-1 focus:ring-primary focus:border-primary transition-colors font-body-md text-body-md shadow-sm"
                      required
                    />
                    <button 
                      type="button" 
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-on-surface-variant hover:text-primary transition-colors"
                    >
                      <span className="material-symbols-outlined text-[20px]">
                        {showConfirmPassword ? 'visibility' : 'visibility_off'}
                      </span>
                    </button>
                  </div>
                </div>

                {/* Submit Button */}
                <div className="pt-2">
                  <button 
                    type="submit"
                    disabled={submitting || !!successMessage}
                    className="w-full flex justify-center items-center gap-2 py-3.5 px-4 border border-transparent rounded-[10px] shadow-sm font-label-md text-label-md text-on-primary bg-primary focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-colors hover:opacity-90 disabled:opacity-50 cursor-pointer"
                  >
                    {submitting ? (
                      <>
                        <span className="material-symbols-outlined text-base animate-spin">sync</span>
                        Updating password...
                      </>
                    ) : (
                      'Reset Password'
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
