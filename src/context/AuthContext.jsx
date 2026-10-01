import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authService } from '../services/authService';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => authService.getCachedUser());
  const [token, setToken] = useState(() => authService.getToken());
  const [loading, setLoading] = useState(true);

  // Sync session on mount
  useEffect(() => {
    const initAuth = async () => {
      const savedToken = authService.getToken();
      if (savedToken) {
        try {
          const profile = await authService.getMe();
          setUser(profile);
          setToken(savedToken);
        } catch {
          // If token expired or invalid, reset
          authService.logout();
          setUser(null);
          setToken(null);
        }
      } else {
        setUser(null);
        setToken(null);
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const login = useCallback(async (email, password) => {
    const result = await authService.login(email, password);
    setUser(result.user);
    setToken(result.token);
    return result;
  }, []);

  const logout = useCallback(() => {
    authService.logout();
    setUser(null);
    setToken(null);
  }, []);

  const updateUser = useCallback((updatedFields) => {
    setUser((prev) => {
      const merged = { ...prev, ...updatedFields };
      localStorage.setItem('faizanbody_auth_user', JSON.stringify(merged));
      return merged;
    });
  }, []);

  const role = user?.role || 'user';
  const isAdmin = role === 'admin';
  const isUser = role === 'user';
  const isAuthenticated = !!token && !!user;

  const value = {
    user,
    role,
    isAdmin,
    isUser,
    token,
    isAuthenticated,
    loading,
    login,
    logout,
    updateUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;
