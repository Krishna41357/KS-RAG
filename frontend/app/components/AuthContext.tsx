"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:9000';

type User = {
  id: string;
  email: string;
  username: string;
  full_name?: string;
  is_active: boolean;
  is_verified: boolean;
  created_at: string;
};

type AuthContextType = {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, username: string, password: string, fullName?: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load token and user from localStorage on mount
  useEffect(() => {
    const storedToken = localStorage.getItem('auth_token');
    if (storedToken) {
      setToken(storedToken);
      fetchUserInfo(storedToken);
    } else {
      setIsLoading(false);
    }
  }, []);

  const fetchUserInfo = async (authToken: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/users/me`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
      });

      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
      } else {
        // Token is invalid, clear it
        localStorage.removeItem('auth_token');
        setToken(null);
      }
    } catch (error) {
      console.error('Error fetching user info:', error);
      localStorage.removeItem('auth_token');
      setToken(null);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/users/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Login failed');
      }

      const data = await response.json();
      const authToken = data.access_token;
      
      localStorage.setItem('auth_token', authToken);
      setToken(authToken);
      
      // Fetch user info
      await fetchUserInfo(authToken);
    } catch (error: any) {
      throw error;
    }
  };

  const register = async (email: string, username: string, password: string, fullName?: string) => {
    try {
      // Validate inputs
      if (!email || !username || !password) {
        throw new Error('Email, username, and password are required');
      }

      if (username.length < 3 || username.length > 50) {
        throw new Error('Username must be between 3 and 50 characters');
      }

      if (password.length < 8) {
        throw new Error('Password must be at least 8 characters long');
      }

      // Build the request payload
      const payload: any = {
        email: email.trim(),
        username: username.trim(),
        password: password,
      };
      
      // Only add full_name if it's provided and not empty
      if (fullName && fullName.trim()) {
        payload.full_name = fullName.trim();
      }

      const response = await fetch(`${API_BASE_URL}/users/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        
        // Handle validation errors (422 Unprocessable Entity)
        if (response.status === 422 && error.detail && Array.isArray(error.detail)) {
          const errorMessages = error.detail.map((err: any) => {
            const field = err.loc?.[err.loc.length - 1] || 'field';
            return `${field}: ${err.msg}`;
          }).join(', ');
          throw new Error(errorMessages);
        }
        
        // Handle other errors
        throw new Error(error.detail || 'Registration failed');
      }

      // After successful registration, automatically log in
      await login(email, password);
    } catch (error: any) {
      // Re-throw the error to be handled by the component
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem('auth_token');
    setToken(null);
    setUser(null);
  };

  const value = {
    user,
    token,
    isLoading,
    login,
    register,
    logout,
    isAuthenticated: !!token && !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}