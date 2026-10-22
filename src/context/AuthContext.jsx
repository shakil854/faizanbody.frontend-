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

  const logout = useCallback(() => {
    authService.logout();
    setUser(null);
    setToken(null);
  }, []);

  // Listen for remote session revocation by admin
  useEffect(() => {
    const handleRevoked = (e) => {
      logout();
      alert(e.detail || 'Your device session has been logged out remotely by administrator.');
    };
    window.addEventListener('auth:session_revoked', handleRevoked);
    return () => window.removeEventListener('auth:session_revoked', handleRevoked);
  }, [logout]);

  const login = useCallback(async (identifier, password) => {
    const result = await authService.login(identifier, password);
    if (result && !result.requiresOtp && result.token) {
      setUser(result.user);
      setToken(result.token);
    }
    return result;
  }, []);

  const verifyLoginOtp = useCallback(async (userId, otp) => {
    const result = await authService.verifyLoginOtp(userId, otp);
    if (result?.token) {
      setUser(result.user);
      setToken(result.token);
    }
    return result;
  }, []);

  const resendLoginOtp = useCallback(async (userId) => {
    return await authService.resendLoginOtp(userId);
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

  /**
   * Check if current user possesses a specific granular permission.
   * Administrators automatically have 100% permissions across all modules.
   */
  const hasPermission = useCallback((permissionKey) => {
    if (!isAuthenticated) return false;
    if (isAdmin) return true;

    const permissions = Array.isArray(user?.permissions) ? user.permissions : [];
    return permissions.includes(permissionKey);
  }, [isAuthenticated, isAdmin, user?.permissions]);

  /**
   * Check if user has access to view a high-level module screen.
   */
  const canAccessModule = useCallback((moduleId) => {
    if (!isAuthenticated) return false;
    if (isAdmin) return true;

    if (moduleId === 'users') return false; // Strictly admin only
    if (moduleId === 'orders') return hasPermission('orders:view');
    if (moduleId === 'stock') return hasPermission('stock:view');
    if (moduleId === 'workers') return hasPermission('workers:view');

    return false;
  }, [isAuthenticated, isAdmin, hasPermission]);

  const value = {
    user,
    role,
    isAdmin,
    isUser,
    token,
    isAuthenticated,
    loading,
    login,
    verifyLoginOtp,
    resendLoginOtp,
    logout,
    updateUser,
    hasPermission,
    canAccessModule,
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
