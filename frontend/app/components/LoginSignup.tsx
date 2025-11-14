"use client";

import React, { useState, useEffect } from 'react';
import { Mail, Lock, User, UserPlus, LogIn, AlertCircle, Loader2, Moon, Sun } from 'lucide-react';
import { useAuth } from './AuthContext';

export default function LoginSignup() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  const { login, register } = useAuth();

  // Set initial dark mode based on system preference
  useEffect(() => {
    const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    setDarkMode(isDark);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      if (isLogin) {
        await login(email, password);
      } else {
        if (!username.trim()) {
          throw new Error('Username is required');
        }
        await register(email, username, password, fullName);
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleMode = () => {
    setIsLogin(!isLogin);
    setError('');
    setEmail('');
    setPassword('');
    setUsername('');
    setFullName('');
  };

  return (
    <div className={`min-h-screen transition-all duration-500 ${
      darkMode 
        ? 'bg-gradient-to-br from-slate-950 via-red-950 to-slate-900' 
        : 'bg-gradient-to-br from-white via-red-50 to-white'
    } flex items-center justify-center p-4 relative overflow-hidden`}>
      {/* Animated background elements */}
      <div className={`absolute inset-0 overflow-hidden pointer-events-none ${darkMode ? 'opacity-30' : 'opacity-20'}`}>
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-red-500 rounded-full blur-3xl opacity-30 animate-pulse" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-red-600 rounded-full blur-3xl opacity-20 animate-pulse animation-delay-2000" />
        <div className="absolute top-1/2 right-0 w-96 h-96 bg-red-700 rounded-full blur-3xl opacity-25 animate-pulse animation-delay-4000" />
      </div>

      {/* Theme Toggle Button - Bottom Right */}
      <button
        onClick={() => setDarkMode(!darkMode)}
        className={`fixed bottom-8 right-8 w-14 h-14 rounded-full shadow-lg transition-all duration-300 flex items-center justify-center z-50 hover:scale-110 ${
          darkMode
            ? 'bg-gradient-to-br from-yellow-400 to-orange-500 text-slate-900'
            : 'bg-gradient-to-br from-slate-700 to-slate-900 text-yellow-300'
        }`}
      >
        {darkMode ? <Sun className="w-6 h-6" /> : <Moon className="w-6 h-6" />}
      </button>

      <div className="w-full max-w-md relative z-10">
        {/* Header */}
        <div className="text-center mb-8">
          <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full mb-4 bg-gradient-to-br from-red-500 to-red-700 shadow-lg transform transition-transform hover:scale-110`}>
            <UserPlus className="w-8 h-8 text-white" />
          </div>
          <h1 className={`text-4xl font-bold mb-2 ${
            darkMode ? 'text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-orange-400' : 'text-transparent bg-clip-text bg-gradient-to-r from-red-600 to-red-700'
          }`}>
            {isLogin ? 'Welcome Back' : 'Create Account'}
          </h1>
          <p className={`${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
            {isLogin 
              ? 'Sign in to access your RAG chatbot' 
              : 'Sign up to start using RAG chatbot'}
          </p>
        </div>

        {/* Form Card */}
        <div className={`backdrop-blur-xl border transition-all duration-300 rounded-3xl shadow-2xl p-8 ${
          darkMode
            ? 'bg-slate-800/40 border-red-500/20 hover:border-red-500/40'
            : 'bg-white/80 border-red-200/50 hover:border-red-400/50'
        }`}>
          {error && (
            <div className={`mb-6 p-4 rounded-xl flex items-start gap-3 animate-shake ${
              darkMode
                ? 'bg-red-900/30 border border-red-700/50'
                : 'bg-red-50 border border-red-300'
            }`}>
              <AlertCircle className={`w-5 h-5 flex-shrink-0 mt-0.5 ${darkMode ? 'text-red-400' : 'text-red-600'}`} />
              <p className={`text-sm ${darkMode ? 'text-red-300' : 'text-red-800'}`}>{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email Field */}
            <div>
              <label className={`block text-sm font-medium mb-2 ${
                darkMode ? 'text-gray-300' : 'text-gray-700'
              }`}>
                Email Address
              </label>
              <div className="relative group">
                <Mail className={`absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 transition-colors ${
                  darkMode ? 'text-gray-400 group-focus-within:text-red-400' : 'text-gray-400 group-focus-within:text-red-500'
                }`} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  className={`w-full pl-12 pr-4 py-3 rounded-xl border-2 transition-all focus:outline-none focus:scale-105 ${
                    darkMode
                      ? 'bg-slate-700/50 border-slate-600 focus:border-red-500 text-white placeholder-gray-400'
                      : 'bg-white border-gray-300 focus:border-red-500 text-black placeholder-gray-400'
                  }`}
                />
              </div>
            </div>

            {/* Username Field (Sign Up Only) */}
            {!isLogin && (
              <div>
                <label className={`block text-sm font-medium mb-2 ${
                  darkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  Username
                </label>
                <div className="relative group">
                  <User className={`absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 transition-colors ${
                    darkMode ? 'text-gray-400 group-focus-within:text-red-400' : 'text-gray-400 group-focus-within:text-red-500'
                  }`} />
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="johndoe"
                    required
                    className={`w-full pl-12 pr-4 py-3 rounded-xl border-2 transition-all focus:outline-none focus:scale-105 ${
                      darkMode
                        ? 'bg-slate-700/50 border-slate-600 focus:border-red-500 text-white placeholder-gray-400'
                        : 'bg-white border-gray-300 focus:border-red-500 text-black placeholder-gray-400'
                    }`}
                  />
                </div>
              </div>
            )}

            {/* Full Name Field (Sign Up Only) */}
            {!isLogin && (
              <div>
                <label className={`block text-sm font-medium mb-2 ${
                  darkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  Full Name (Optional)
                </label>
                <div className="relative group">
                  <User className={`absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 transition-colors ${
                    darkMode ? 'text-gray-400 group-focus-within:text-red-400' : 'text-gray-400 group-focus-within:text-red-500'
                  }`} />
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="John Doe"
                    className={`w-full pl-12 pr-4 py-3 rounded-xl border-2 transition-all focus:outline-none focus:scale-105 ${
                      darkMode
                        ? 'bg-slate-700/50 border-slate-600 focus:border-red-500 text-white placeholder-gray-400'
                        : 'bg-white border-gray-300 focus:border-red-500 text-black placeholder-gray-400'
                    }`}
                  />
                </div>
              </div>
            )}

            {/* Password Field */}
            <div>
              <label className={`block text-sm font-medium mb-2 ${
                darkMode ? 'text-gray-300' : 'text-gray-700'
              }`}>
                Password
              </label>
              <div className="relative group">
                <Lock className={`absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 transition-colors ${
                  darkMode ? 'text-gray-400 group-focus-within:text-red-400' : 'text-gray-400 group-focus-within:text-red-500'
                }`} />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={6}
                  className={`w-full pl-12 pr-4 py-3 rounded-xl border-2 transition-all focus:outline-none focus:scale-105 ${
                    darkMode
                      ? 'bg-slate-700/50 border-slate-600 focus:border-red-500 text-white placeholder-gray-400'
                      : 'bg-white border-gray-300 focus:border-red-500 text-black placeholder-gray-400'
                  }`}
                />
              </div>
              {!isLogin && (
                <p className={`mt-1 text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  Password must be at least 6 characters
                </p>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-8 bg-gradient-to-r from-red-500 to-red-700 hover:from-red-600 hover:to-red-800 disabled:from-gray-400 disabled:to-gray-500 text-white py-3 rounded-xl font-bold transition-all duration-300 flex items-center justify-center gap-2 shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  {isLogin ? 'Signing in...' : 'Creating account...'}
                </>
              ) : (
                <>
                  {isLogin ? <LogIn className="w-5 h-5" /> : <UserPlus className="w-5 h-5" />}
                  {isLogin ? 'Sign In' : 'Sign Up'}
                </>
              )}
            </button>
          </form>

          {/* Toggle Mode */}
          <div className="mt-6 text-center">
            <p className={`${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
              {isLogin ? "Don't have an account? " : 'Already have an account? '}
              <button
                onClick={toggleMode}
                className="bg-gradient-to-r from-red-500 to-red-700 bg-clip-text text-transparent hover:from-red-600 hover:to-red-800 font-bold transition-all duration-300"
              >
                {isLogin ? 'Sign up' : 'Sign in'}
              </button>
            </p>
          </div>
        </div>

        {/* Footer */}
        <p className={`text-center text-xs mt-6 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
          By continuing, you agree to our Terms of Service and Privacy Policy
        </p>
      </div>
    </div>
  );
}