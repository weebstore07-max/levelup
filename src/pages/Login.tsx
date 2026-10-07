import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { checkPasswordRequirements, getPasswordValidationError } from '../utils/passwordValidation';

export const Login: React.FC = () => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [googleSubmitting, setGoogleSubmitting] = useState(false);

  const { login, signup, resetPassword, isPasswordRecovery } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isPasswordRecovery) {
      navigate('/reset-password');
    }
  }, [isPasswordRecovery, navigate]);

  const handleGoogleSignIn = async () => {
    try {
      setGoogleSubmitting(true);
      setError('');
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/dashboard`
        }
      });
      if (error) {
        setError(error.message);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to connect with Google.');
    } finally {
      setGoogleSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');

    const cleanEmail = email.trim();
    const GMAIL_REGEX = /^[A-Za-z0-9._%+-]+@gmail\.com$/i;

    if (!cleanEmail || !password) {
      setError('Please fill in both email and password.');
      return;
    }

    if (/\s/.test(password)) {
      setError('Password cannot contain blank spaces.');
      return;
    }

    if (isSignUp) {
      const passwordErr = getPasswordValidationError(password);
      if (passwordErr) {
        setError(passwordErr);
        return;
      }
    }

    if (!GMAIL_REGEX.test(cleanEmail)) {
      setError('Please use a Gmail address ending in @gmail.com.');
      return;
    }

    try {
      setSubmitting(true);
      if (isSignUp) {
        const res = await signup(cleanEmail, password, displayName);
        if (res.confirmationRequired) {
          setMessage('Account created. Please check your Gmail inbox to confirm your email before signing in.');
        } else {
          navigate('/dashboard');
        }
      } else {
        await login(cleanEmail, password);
        navigate('/dashboard');
      }
    } catch (err: any) {
      console.error('Auth error:', err);
      const msg = err.message || '';
      if (err.code === 'oauth_account_only' || msg.includes('uses Google Sign-In')) {
        setError('This account uses Google Sign-In. Please continue with Google.');
      } else if (err.code === 'email_not_confirmed' || msg.includes('confirm your email')) {
        setError('Please confirm your email address before signing in. Check your inbox for the confirmation link.');
      } else if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || msg.includes('Invalid login credentials') || err.code === 'invalid_credentials') {
        setError('Invalid email or password.');
      } else if (err.code === 'auth/email-already-in-use' || msg.includes('User already registered') || msg.includes('already registered')) {
        setError('An account with this email already exists.');
      } else if (err.code === 'auth/weak-password' || msg.includes('Password should be at least 6 characters')) {
        setError('Password should be at least 6 characters.');
      } else if (msg.includes('rate limit')) {
        setError('Too many requests. Please wait a few minutes before trying again or use Google Sign-In.');
      } else {
        setError(msg || 'Authentication failed. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleForgotPassword = async () => {
    const cleanEmail = email.trim();
    const GMAIL_REGEX = /^[A-Za-z0-9._%+-]+@gmail\.com$/i;

    if (!cleanEmail) {
      setError('Please enter your email address to reset password.');
      return;
    }

    if (!GMAIL_REGEX.test(cleanEmail)) {
      setError('Please use a Gmail address ending in @gmail.com.');
      return;
    }

    setError('');
    setMessage('');
    try {
      setSubmitting(true);
      await resetPassword(cleanEmail);
      setMessage('Password reset email sent! Check your inbox.');
    } catch (err: any) {
      const msg = err.message || '';
      if (err.code === 'oauth_account_only' || msg.includes('uses Google Sign-In')) {
        setError('This account uses Google Sign-In. Please continue with Google.');
      } else {
        setError(msg || 'Failed to send reset email.');
      }
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

      {/* Right Side: Login Form */}
      <div className="flex-1 flex flex-col justify-center px-8 md:px-16 lg:px-24 xl:px-32 h-screen bg-background overflow-y-auto">
        {/* Mobile Logo */}
        <div className="md:hidden flex items-center gap-3 mb-8">
          <span className="material-symbols-outlined text-3xl text-primary">menu_book</span>
          <div className="font-headline-md text-headline-md text-primary">Level Up</div>
        </div>

        <div className="w-full mx-auto max-w-md">
          <h2 className="font-display-lg text-[40px] leading-[1.2] font-bold text-primary mb-2">
            {isSignUp ? 'Create account' : 'Welcome back'}
          </h2>
          <p className="font-body-lg text-body-lg text-on-surface-variant mb-6">
            {isSignUp ? 'Sign up to start your gamified learning journey.' : 'Please enter your details to sign in.'}
          </p>

          {error && (
            <div className="mb-6 p-4 rounded-lg bg-error-container text-on-error-container font-body-md border border-error/30 text-sm">
              {error}
            </div>
          )}

          {message && (
            <div className="mb-6 p-4 rounded-lg bg-surface-container-high text-primary font-body-md border card-border text-sm">
              {message}
            </div>
          )}

          {/* Continue with Google Button */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={googleSubmitting}
            className="w-full bg-white border border-outline-variant text-[#2C2825] font-label-md text-label-md py-3.5 px-4 rounded-[10px] shadow-sm hover:bg-[#F8F5EE] transition-colors flex items-center justify-center gap-3 cursor-pointer disabled:opacity-50"
          >
            <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>{googleSubmitting ? 'Connecting...' : 'Continue with Google'}</span>
          </button>

          {/* OR Divider */}
          <div className="relative my-6 flex items-center justify-center">
            <div className="border-t border-outline-variant w-full absolute" />
            <span className="bg-background px-3 font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider relative z-10">
              OR
            </span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {isSignUp && (
              <div>
                <label className="block font-label-md text-label-md text-on-background mb-2" htmlFor="name">
                  Full Name
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="material-symbols-outlined text-on-surface-variant text-[20px]">person</span>
                  </div>
                  <input 
                    id="name"
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Jane Doe"
                    className="block w-full pl-10 pr-3 py-3 border border-outline-variant rounded-lg bg-surface-container-lowest text-on-background placeholder:text-outline focus:ring-1 focus:ring-primary focus:border-primary transition-colors font-body-md text-body-md shadow-sm"
                  />
                </div>
              </div>
            )}

            {/* Email Input */}
            <div>
              <label className="block font-label-md text-label-md text-on-background mb-2" htmlFor="email">
                Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="material-symbols-outlined text-on-surface-variant text-[20px]">mail</span>
                </div>
                <input 
                  id="email" 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email" 
                  className="block w-full pl-10 pr-3 py-3 border border-outline-variant rounded-lg bg-surface-container-lowest text-on-background placeholder:text-outline focus:ring-1 focus:ring-primary focus:border-primary transition-colors font-body-md text-body-md shadow-sm"
                  required
                />
              </div>
            </div>

            {/* Password Input */}
            <div>
              <label className="block font-label-md text-label-md text-on-background mb-2" htmlFor="password">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="material-symbols-outlined text-on-surface-variant text-[20px]">lock</span>
                </div>
                <input 
                  id="password" 
                  type={showPassword ? "text" : "password"} 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
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
              {!isSignUp && (
                <div className="flex justify-end mt-2">
                  <button
                    type="button"
                    onClick={handleForgotPassword}
                    className="font-label-md text-label-md text-primary hover:text-on-surface-variant transition-colors"
                  >
                    Forgot password?
                  </button>
                </div>
              )}

              {isSignUp && password.length > 0 && (() => {
                const { reqs, strengthLabel } = checkPasswordRequirements(password);
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

            {/* Submit Action Buttons: Left = Cancel, Right = Sign In / Sign Up */}
            <div className="pt-2">
              <div className="flex gap-4">
                <button 
                  type="button"
                  onClick={() => navigate('/')}
                  className="flex-1 flex justify-center items-center gap-2 py-3.5 px-4 border border-outline-variant rounded-[10px] shadow-sm font-label-md text-label-md text-[#2C2825] bg-white hover:bg-[#F8F5EE] transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={submitting}
                  className="flex-1 flex justify-center items-center gap-2 py-3.5 px-4 border border-transparent rounded-[10px] shadow-sm font-label-md text-label-md text-on-primary bg-primary focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-colors hover:opacity-90 disabled:opacity-50 cursor-pointer"
                >
                  {submitting ? 'Please wait...' : isSignUp ? 'Sign Up' : 'Sign in'}
                </button>
              </div>
            </div>
          </form>

          {/* Switch Mode Footer */}
          <p className="mt-8 text-center font-body-md text-body-md text-on-surface-variant">
            {isSignUp ? 'Already have an account? ' : "Don't have an account? "}
            <button 
              type="button"
              onClick={() => {
                setIsSignUp(!isSignUp);
                setError('');
                setMessage('');
              }}
              className="font-label-md text-label-md text-primary hover:text-on-surface-variant transition-colors underline cursor-pointer"
            >
              {isSignUp ? 'Sign in' : 'Sign up'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
