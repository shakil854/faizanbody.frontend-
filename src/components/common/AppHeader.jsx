import React, { useState, useRef, useEffect } from 'react';
import { TruckLogo } from './TruckLogo';
import { useAuth } from '../../context/AuthContext';

export function AppHeader({ onOpenChangePassword, onNotify, onNavigate, onOpenBackup }) {
  const { user, role, isAdmin, canAccessModule, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    setMenuOpen(false);
    logout();
    if (onNotify) {
      onNotify('You have been logged out successfully.', 'info');
    }
  };

  const userInitial = user?.name ? user.name.charAt(0).toUpperCase() : 'U';

  return (
    <header className="android-top-app-bar luxury-header" role="banner">
      <div className="top-bar-inner">
        <div className="top-bar-content">
          <div
            className="top-bar-left"
            onClick={() => onNavigate && onNavigate('home')}
            style={{ cursor: 'pointer' }}
            title="Go to Home Dashboard"
          >
            {/* Executive Automotive Emblem Container */}
            <div className="luxury-logo-badge">
              <TruckLogo size={32} />
            </div>

            <div className="brand-text-container">
              <div className="brand-title-line">
                <span className="brand-title-faizan">Faizan</span>
                <span className="brand-title-body">BODY</span>
              </div>
              <span className="brand-subtitle-tag">WORKSHOP MANAGEMENT</span>
            </div>
          </div>

          {/* Right side user profile menu */}
          <div className="top-bar-right" ref={menuRef}>
            {/* Role Badge & Profile Button */}
            {user && (
              <div className="user-profile-menu-container">
                <button
                  type="button"
                  className="user-profile-btn"
                  onClick={() => setMenuOpen(!menuOpen)}
                  aria-expanded={menuOpen}
                  title={`${user.name} (${role})`}
                >
                  <span className={`header-role-pill ${isAdmin ? 'role-admin' : 'role-user'}`}>
                    {isAdmin ? 'ADMIN' : 'USER'}
                  </span>
                  <div className="user-avatar-circle">
                    {userInitial}
                  </div>
                </button>

                {/* Dropdown Menu */}
                {menuOpen && (
                  <div className="user-dropdown-card">
                    <div className="user-dropdown-header">
                      <div className="dropdown-user-avatar">{userInitial}</div>
                      <div className="dropdown-user-details">
                        <span className="dropdown-user-name">{user.name}</span>
                        <span className="dropdown-user-email">{user.email}</span>
                        <span className={`dropdown-role-tag ${isAdmin ? 'tag-admin' : 'tag-user'}`}>
                          {isAdmin ? '👑 Administrator' : '👤 Staff Member'}
                        </span>
                      </div>
                    </div>

                    <div className="dropdown-divider"></div>

                    <div className="dropdown-menu-items">
                      {canAccessModule && canAccessModule('truck_accounts') && (
                        <button
                          type="button"
                          className="dropdown-menu-item"
                          onClick={() => {
                            setMenuOpen(false);
                            if (onNavigate) onNavigate('truck_accounts');
                          }}
                        >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="1" y="3" width="15" height="13" />
                          <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
                          <circle cx="5.5" cy="18.5" r="2.5" />
                          <circle cx="18.5" cy="18.5" r="2.5" />
                        </svg>
                        <span>Truck Account (ગાડી ખાતાવહી)</span>
                      </button>
                      )}

                      {canAccessModule && canAccessModule('rojmed') && (
                        <button
                          type="button"
                          className="dropdown-menu-item"
                          onClick={() => {
                            setMenuOpen(false);
                            if (onNavigate) onNavigate('rojmed');
                          }}
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                          </svg>
                          <span>Daily Rojmed (રોજમેળ)</span>
                        </button>
                      )}

                      {isAdmin && (
                        <button
                          type="button"
                          className="dropdown-menu-item"
                          onClick={() => {
                            setMenuOpen(false);
                            if (onNavigate) onNavigate('users');
                          }}
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                            <circle cx="9" cy="7" r="4" />
                            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                          </svg>
                          <span>Manage Users & Permissions</span>
                        </button>
                      )}

                      {isAdmin && (
                        <button
                          type="button"
                          className="dropdown-menu-item"
                          onClick={() => {
                            setMenuOpen(false);
                            if (onNavigate) onNavigate('backup');
                          }}
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                            <polyline points="7 10 12 15 17 10" />
                            <line x1="12" y1="15" x2="12" y2="3" />
                          </svg>
                          <span>Database Backup & Restore (બેકઅપ)</span>
                        </button>
                      )}

                      <button
                        type="button"
                        className="dropdown-menu-item"
                        onClick={() => {
                          setMenuOpen(false);
                          if (onOpenChangePassword) onOpenChangePassword();
                        }}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                        </svg>
                        <span>Change Password</span>
                      </button>

                      <button
                        type="button"
                        className="dropdown-menu-item item-logout"
                        onClick={handleLogout}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                          <polyline points="16 17 21 12 16 7" />
                          <line x1="21" y1="12" x2="9" y2="12" />
                        </svg>
                        <span>Sign Out</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

export default AppHeader;
