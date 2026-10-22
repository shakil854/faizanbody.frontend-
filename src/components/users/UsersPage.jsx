import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { userService } from '../../services/userService';
import { authService } from '../../services/authService';
import { useAuth } from '../../context/AuthContext';
import { APP_MODULES, calculatePermissionCounts } from '../../config/permissionsConfig';
import { UserFormModal } from './UserFormModal';
import { UserDeleteModal } from './UserDeleteModal';
import { UserFab } from './UserFab';
import { Snackbar } from '../workers/Snackbar';

export function UsersPage({ onBackToHome }) {
  const { user: currentAuthUser } = useAuth();
  const [activeTab, setActiveTab] = useState('users'); // 'users' | 'sessions'
  const [users, setUsers] = useState(() => userService.getCachedUsers());
  const [loading, setLoading] = useState(users.length === 0);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all'); // all | admin | user
  const [statusFilter, setStatusFilter] = useState('all'); // all | active | suspended

  // Device Tracking & Sessions State
  const [sessions, setSessions] = useState([]);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [sessionSearch, setSessionSearch] = useState('');
  const [revokingSession, setRevokingSession] = useState(null);
  const [isRevoking, setIsRevoking] = useState(false);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [deletingUser, setDeletingUser] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [snackbar, setSnackbar] = useState({ message: '', type: 'info' });

  const showSnackbar = (msg, type = 'info') => {
    setSnackbar({ message: msg, type });
  };

  const fetchUsers = useCallback(async () => {
    try {
      const res = await userService.getUsers();
      if (res && res.data) {
        setUsers(res.data);
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to fetch users';
      showSnackbar(msg, 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
    const unsub = userService.subscribeUsers((updatedList) => {
      setUsers(updatedList);
    });
    return () => unsub();
  }, [fetchUsers]);

  // Handle Save (Create / Update)
  const handleSaveUser = async (formData) => {
    try {
      if (editingUser) {
        await userService.updateUser(editingUser.id, formData);
        showSnackbar(`User "${formData.name}" updated successfully!`, 'success');
      } else {
        await userService.createUser(formData);
        showSnackbar(`User "${formData.name}" created successfully!`, 'success');
      }
      setIsFormOpen(false);
      setEditingUser(null);
      fetchUsers();
    } catch (err) {
      const msg = err.response?.data?.message || 'Error saving user';
      showSnackbar(msg, 'error');
      throw err;
    }
  };

  // Handle Status Toggle (Active / Suspended)
  const handleToggleStatus = async (user) => {
    if (user.id === currentAuthUser?.id) {
      showSnackbar('You cannot change the status of your own active session.', 'error');
      return;
    }

    try {
      await userService.toggleUserStatus(user.id);
      showSnackbar(
        `User "${user.name}" is now ${user.is_active ? 'suspended' : 'active'}.`,
        'success'
      );
      fetchUsers();
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to update user status';
      showSnackbar(msg, 'error');
    }
  };

  // Handle Delete Confirmation
  const handleConfirmDelete = async (userId) => {
    try {
      setIsDeleting(true);
      await userService.deleteUser(userId);
      showSnackbar('User account deleted successfully.', 'success');
      setDeletingUser(null);
      fetchUsers();
    } catch (err) {
      const msg = err.response?.data?.message || 'Error deleting user';
      showSnackbar(msg, 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  // Filtered & Searched Users
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        u.name?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q) ||
        u.mobile?.includes(q);

      const matchesRole =
        roleFilter === 'all' ||
        (roleFilter === 'admin' && u.role === 'admin') ||
        (roleFilter === 'user' && u.role === 'user');

      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' && u.is_active) ||
        (statusFilter === 'suspended' && !u.is_active);

      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [users, searchQuery, roleFilter, statusFilter]);

  // Statistics
  const totalUsers = users.length;
  const activeCount = users.filter((u) => u.is_active).length;
  const adminCount = users.filter((u) => u.role === 'admin').length;
  const staffCount = users.filter((u) => u.role === 'user').length;

  // Fetch active sessions
  const fetchSessions = useCallback(async () => {
    try {
      setLoadingSessions(true);
      const data = await authService.getSessions();
      setSessions(data || []);
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to fetch active device sessions';
      showSnackbar(msg, 'error');
    } finally {
      setLoadingSessions(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'sessions') {
      fetchSessions();
    }
  }, [activeTab, fetchSessions]);

  // Handle remote logout confirmation
  const handleConfirmRevokeSession = async () => {
    if (!revokingSession) return;
    try {
      setIsRevoking(true);
      await authService.revokeSession(revokingSession.id);
      showSnackbar(
        `Device session for "${revokingSession.user_name}" has been remotely logged out!`,
        'success'
      );
      setRevokingSession(null);
      fetchSessions();
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to logout device session';
      showSnackbar(msg, 'error');
    } finally {
      setIsRevoking(false);
    }
  };

  // Filtered Sessions
  const filteredSessions = useMemo(() => {
    return sessions.filter((s) => {
      const q = sessionSearch.toLowerCase().trim();
      if (!q) return true;
      return (
        s.user_name?.toLowerCase().includes(q) ||
        s.user_email?.toLowerCase().includes(q) ||
        s.user_mobile?.includes(q) ||
        s.device_name?.toLowerCase().includes(q) ||
        s.ip_address?.toLowerCase().includes(q) ||
        s.browser?.toLowerCase().includes(q) ||
        s.os?.toLowerCase().includes(q)
      );
    });
  }, [sessions, sessionSearch]);

  const activeSessionsCount = useMemo(() => {
    return sessions.filter((s) => s.is_active === 1 || s.is_active === true).length;
  }, [sessions]);

  return (
    <div className="workers-page-shell user-mgmt-page">
      <main className="android-body">
        {/* Page Top Action Bar */}
        <div className="user-mgmt-topbar">
          <div className="user-mgmt-top-left">
            <h2 className="user-page-title">User & Device Security</h2>
          </div>

          {/* Segmented Switcher: Team Accounts vs Active Devices */}
          <div className="user-segment-tabs">
            <button
              type="button"
              className={`user-segment-btn ${activeTab === 'users' ? 'active' : ''}`}
              onClick={() => setActiveTab('users')}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
              <span>Accounts ({totalUsers})</span>
            </button>

            <button
              type="button"
              className={`user-segment-btn ${activeTab === 'sessions' ? 'active' : ''}`}
              onClick={() => {
                setActiveTab('sessions');
                fetchSessions();
              }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                <line x1="8" y1="21" x2="16" y2="21" />
                <line x1="12" y1="17" x2="12" y2="21" />
              </svg>
              <span>Active Devices ({activeSessionsCount})</span>
            </button>
          </div>
        </div>

        {activeTab === 'users' ? (
          <>

        {/* Executive Stats Summary Cards (Compact KPI Strip) */}
        <div className="user-stats-strip">
          <button
            type="button"
            className={`user-stat-card ${roleFilter === 'all' && statusFilter === 'all' ? 'active-stat-card' : ''}`}
            onClick={() => {
              setRoleFilter('all');
              setStatusFilter('all');
            }}
            title="Show all users"
          >
            <div className="user-stat-number">{totalUsers}</div>
            <div className="user-stat-label">Total</div>
          </button>

          <button
            type="button"
            className={`user-stat-card ${statusFilter === 'active' ? 'active-stat-card' : ''}`}
            onClick={() => {
              setStatusFilter((prev) => (prev === 'active' ? 'all' : 'active'));
            }}
            title="Filter active users"
          >
            <div className="user-stat-number stat-active">{activeCount}</div>
            <div className="user-stat-label">Active</div>
          </button>

          <button
            type="button"
            className={`user-stat-card ${roleFilter === 'admin' ? 'active-stat-card' : ''}`}
            onClick={() => {
              setRoleFilter((prev) => (prev === 'admin' ? 'all' : 'admin'));
            }}
            title="Filter admins"
          >
            <div className="user-stat-number stat-admin">{adminCount}</div>
            <div className="user-stat-label">Admins</div>
          </button>

          <button
            type="button"
            className={`user-stat-card ${roleFilter === 'user' ? 'active-stat-card' : ''}`}
            onClick={() => {
              setRoleFilter((prev) => (prev === 'user' ? 'all' : 'user'));
            }}
            title="Filter staff users"
          >
            <div className="user-stat-number stat-staff">{staffCount}</div>
            <div className="user-stat-label">Staff</div>
          </button>
        </div>

        {/* Search & Filter Controls */}
        <div className="search-pill-container luxury-search-wrap">
          <div className="search-pill-box">
            <span className="search-pill-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </span>
            <input
              type="text"
              className="search-pill-input"
              placeholder="Search by user name, email, or mobile..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                type="button"
                className="search-clear-btn"
                onClick={() => setSearchQuery('')}
                title="Clear search"
              >
                &times;
              </button>
            )}
          </div>
        </div>

        {/* Quick Filter Filter Tabs */}
        <div className="user-filters-bar">
          <div className="filter-pill-group">
            <span className="filter-group-label">Role:</span>
            <button
              type="button"
              className={`filter-chip ${roleFilter === 'all' ? 'active' : ''}`}
              onClick={() => setRoleFilter('all')}
            >
              All
            </button>
            <button
              type="button"
              className={`filter-chip ${roleFilter === 'admin' ? 'active' : ''}`}
              onClick={() => setRoleFilter('admin')}
            >
              👑 Admins
            </button>
            <button
              type="button"
              className={`filter-chip ${roleFilter === 'user' ? 'active' : ''}`}
              onClick={() => setRoleFilter('user')}
            >
              👤 Staff Users
            </button>
          </div>

          <div className="filter-pill-group">
            <span className="filter-group-label">Status:</span>
            <button
              type="button"
              className={`filter-chip ${statusFilter === 'all' ? 'active' : ''}`}
              onClick={() => setStatusFilter('all')}
            >
              All
            </button>
            <button
              type="button"
              className={`filter-chip ${statusFilter === 'active' ? 'active' : ''}`}
              onClick={() => setStatusFilter('active')}
            >
              Active
            </button>
            <button
              type="button"
              className={`filter-chip ${statusFilter === 'suspended' ? 'active' : ''}`}
              onClick={() => setStatusFilter('suspended')}
            >
              Suspended
            </button>
          </div>
        </div>

        {/* User Cards Grid / Empty State */}
        <div className="users-list-section">
          {loading && users.length === 0 ? (
            <div className="loading-state-container">
              <div className="splash-pulse-bar"></div>
              <p className="loading-text">Loading user records...</p>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="empty-workers-state">
              <div className="empty-luxury-illustration">
                <svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="32" cy="32" r="30" fill="#f0f7ff" stroke="#e0e7ff" strokeWidth="1.5" />
                  <circle cx="32" cy="24" r="10" fill="#dbeafe" stroke="#2563eb" strokeWidth="2" />
                  <path d="M16 48c0-8.84 7.16-16 16-16s16 7.16 16 16" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" />
                  <circle cx="45" cy="45" r="7" fill="#2563eb" />
                  <path d="M45 42v6M42 45h6" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </div>
              <h3>No Users Found</h3>
              <p>
                {searchQuery
                  ? `No user accounts match "${searchQuery}". Try adjusting your filters.`
                  : 'Start adding team members and sub-users to assign permissions.'}
              </p>
              <button
                type="button"
                className="btn btn-primary btn-empty-cta"
                onClick={() => {
                  setSearchQuery('');
                  setEditingUser(null);
                  setIsFormOpen(true);
                }}
              >
                + Add First User Account
              </button>
            </div>
          ) : (
            <div className="workers-grid">
              {filteredUsers.map((user) => {
                const isAdmin = user.role === 'admin';
                const isSelf = user.id === currentAuthUser?.id;
                const permStats = calculatePermissionCounts(user.permissions);
                const userInitial = user.name ? user.name.charAt(0).toUpperCase() : 'U';

                return (
                  <div
                    key={user.id}
                    className={`worker-card user-account-card ${!user.is_active ? 'user-suspended-card' : ''}`}
                  >
                    {/* Top Identity Row */}
                    <div className="user-card-header">
                      <div className="user-avatar-wrap">
                        <div className="user-avatar-squircle">
                          {userInitial}
                        </div>
                        <span
                          className={`user-online-dot ${user.is_active ? 'dot-active' : 'dot-inactive'}`}
                          title={user.is_active ? 'Account is Active' : 'Account is Suspended'}
                        ></span>
                      </div>

                      <div className="user-details-wrap">
                        <div className="user-name-title-row">
                          <h4 className="user-card-name">{user.name}</h4>
                          {isSelf && <span className="self-badge">You</span>}
                        </div>
                        <div className="user-meta-lines">
                          <span className="user-meta-item">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <rect x="2" y="4" width="20" height="16" rx="2" />
                              <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                            </svg>
                            {user.email}
                          </span>
                          {user.mobile && (
                            <span className="user-meta-item">
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                              </svg>
                              {user.mobile}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="user-badges-column">
                        <span className={`user-role-badge ${isAdmin ? 'badge-admin' : 'badge-staff'}`}>
                          {isAdmin ? '👑 Admin' : '👤 Staff'}
                        </span>
                        <span className={`user-status-pill ${user.is_active ? 'pill-active' : 'pill-suspended'}`}>
                          {user.is_active ? 'Active' : 'Suspended'}
                        </span>
                      </div>
                    </div>

                    {/* Permissions Overview Strip */}
                    <div className="user-perms-overview">
                      <div className="perms-overview-label">
                        <span>Screen Permissions:</span>
                      </div>

                      {isAdmin ? (
                        <div className="admin-access-pill">
                          <span className="admin-sparkle">✨</span>
                          Full Unrestricted Master Access to All Screens & Actions
                        </div>
                      ) : (
                        <div className="module-perms-pills">
                          {permStats.map((stat) => (
                            <span
                              key={stat.moduleId}
                              className={`perm-stat-pill ${stat.hasFull ? 'full' : stat.hasPartial ? 'partial' : 'none'}`}
                              title={`${stat.moduleName}: ${stat.granted}/${stat.total} actions allowed`}
                            >
                              <span className="pill-dot"></span>
                              <span className="pill-title">{stat.moduleName.split(' ')[0]}:</span>
                              <strong>{stat.granted}/{stat.total}</strong>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="user-card-footer-actions">
                      <button
                        type="button"
                        className="btn btn-secondary btn-action-edit"
                        onClick={() => {
                          setEditingUser(user);
                          setIsFormOpen(true);
                        }}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                        <span>Edit Permissions</span>
                      </button>

                      {!isSelf && (
                        <button
                          type="button"
                          className={`btn ${user.is_active ? 'btn-secondary btn-suspend' : 'btn-primary btn-activate'}`}
                          onClick={() => handleToggleStatus(user)}
                        >
                          {user.is_active ? 'Suspend' : 'Activate'}
                        </button>
                      )}

                      {!isSelf && (
                        <button
                          type="button"
                          className="btn btn-danger btn-action-del"
                          onClick={() => setDeletingUser(user)}
                          title="Delete user permanently"
                        >
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        </>
        ) : (
          /* ============================================================== */
          /* TAB 2: ACTIVE DEVICES & SESSIONS TRACKING                      */
          /* ============================================================== */
          <div className="sessions-list-section" style={{ padding: '0.25rem 0.5rem 1rem' }}>
            {/* Search Pill for Devices */}
            <div className="search-pill-container luxury-search-wrap" style={{ marginTop: '0.25rem', marginBottom: '0.75rem' }}>
              <div className="search-pill-box">
                <span className="search-pill-icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                </span>
                <input
                  type="text"
                  className="search-pill-input"
                  placeholder="Search by user, IP address, device, or browser..."
                  value={sessionSearch}
                  onChange={(e) => setSessionSearch(e.target.value)}
                />
                {sessionSearch && (
                  <button
                    type="button"
                    className="search-clear-btn"
                    onClick={() => setSessionSearch('')}
                    title="Clear search"
                  >
                    &times;
                  </button>
                )}
              </div>
            </div>

            {/* Loading Indicator */}
            {loadingSessions && sessions.length === 0 ? (
              <div className="loading-state-container">
                <div className="splash-pulse-bar"></div>
                <p className="loading-text">Tracking logged in devices...</p>
              </div>
            ) : filteredSessions.length === 0 ? (
              <div className="empty-workers-state">
                <div className="empty-luxury-illustration">
                  <svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect x="12" y="14" width="40" height="28" rx="4" fill="#f0f7ff" stroke="#2563eb" strokeWidth="2" />
                    <line x1="24" y1="50" x2="40" y2="50" stroke="#2563eb" strokeWidth="2.5" strokeLinecap="round" />
                    <line x1="32" y1="42" x2="32" y2="50" stroke="#2563eb" strokeWidth="2.5" strokeLinecap="round" />
                    <circle cx="32" cy="28" r="6" fill="#dbeafe" stroke="#2563eb" strokeWidth="1.5" />
                  </svg>
                </div>
                <h3>No Device Sessions Found</h3>
                <p>
                  {sessionSearch
                    ? `No active device sessions match "${sessionSearch}".`
                    : 'Active user and admin device sessions will be recorded and shown here.'}
                </p>
                <button
                  type="button"
                  className="btn btn-primary btn-empty-cta"
                  onClick={fetchSessions}
                >
                  Refresh Sessions
                </button>
              </div>
            ) : (
              <div className="workers-grid" style={{ marginTop: '0.25rem' }}>
                {filteredSessions.map((session) => {
                  const isActive = session.is_active === 1 || session.is_active === true;
                  const isUserAdmin = session.user_role === 'admin';
                  const isMobileDevice = /mobile|android|iphone/i.test(session.device_name || '');

                  return (
                    <div
                      key={session.id}
                      className={`session-card ${!isActive ? 'is-revoked' : ''}`}
                    >
                      <div className="session-card-header">
                        <div className="session-device-badge">
                          <div className="session-device-avatar">
                            {isMobileDevice ? (
                              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
                                <line x1="12" y1="18" x2="12.01" y2="18" />
                              </svg>
                            ) : (
                              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                                <line x1="8" y1="21" x2="16" y2="21" />
                                <line x1="12" y1="17" x2="12" y2="21" />
                              </svg>
                            )}
                          </div>
                          <div className="session-device-meta">
                            <span className="session-device-title">
                              {session.device_name || 'Web Browser'}
                            </span>
                            <span className="session-user-subtitle">
                              <strong>{session.user_name}</strong>
                              <span className={`user-role-badge ${isUserAdmin ? 'badge-admin' : 'badge-staff'}`} style={{ fontSize: '0.65rem', padding: '0.1rem 0.4rem' }}>
                                {isUserAdmin ? '👑 Admin' : '👤 Staff'}
                              </span>
                            </span>
                          </div>
                        </div>

                        <span className={`session-status-badge ${isActive ? 'active' : 'revoked'}`}>
                          {isActive && <span className="session-pulse-dot"></span>}
                          {isActive ? 'Active' : 'Logged Out'}
                        </span>
                      </div>

                      {/* IP & Browser Spec Row */}
                      <div className="session-ip-row">
                        <span>IP:</span>
                        <span className="session-ip-badge">{session.ip_address || 'Unknown IP'}</span>
                        <span style={{ margin: '0 0.25rem', color: '#cbd5e1' }}>&bull;</span>
                        <span>{session.browser || 'Browser'}</span>
                        <span style={{ margin: '0 0.25rem', color: '#cbd5e1' }}>&bull;</span>
                        <span>{session.os || 'OS'}</span>
                      </div>

                      {/* Timestamps Row */}
                      <div className="session-time-row">
                        <span>
                          Login: {session.created_at ? new Date(session.created_at).toLocaleDateString() : 'N/A'}
                        </span>
                        <span>
                          Active: {session.last_active_at ? new Date(session.last_active_at).toLocaleTimeString() : 'N/A'}
                        </span>
                      </div>

                      {/* Action: Remote Logout Device */}
                      {isActive && (
                        <div style={{ marginTop: '0.2rem', display: 'flex', justifyContent: 'flex-end' }}>
                          <button
                            type="button"
                            className="btn btn-danger btn-revoke-session"
                            onClick={() => setRevokingSession(session)}
                            title="Remotely terminate this device session"
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M18.36 6.64a9 9 0 1 1-12.73 0" />
                              <line x1="12" y1="2" x2="12" y2="12" />
                            </svg>
                            <span>Logout Device</span>
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Floating Action Button (FAB) matching Workers, Orders, and Stock pages - only on Accounts tab */}
      {activeTab === 'users' && (
        <UserFab
          onAddNew={() => {
            setEditingUser(null);
            setIsFormOpen(true);
          }}
        />
      )}

      {/* User Create / Edit Modal */}
      <UserFormModal
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setEditingUser(null);
        }}
        onSave={handleSaveUser}
        initialData={editingUser}
      />

      {/* User Delete Confirmation Dialog */}
      <UserDeleteModal
        isOpen={!!deletingUser}
        user={deletingUser}
        onCancel={() => setDeletingUser(null)}
        onConfirm={handleConfirmDelete}
        isDeleting={isDeleting}
      />

      {/* Remote Device Logout Confirmation Modal (Rule 3 Android Luxury Dialog) */}
      {revokingSession && (
        <div className="modal-backdrop" onClick={() => !isRevoking && setRevokingSession(null)}>
          <div
            className="android-dialog luxury-dialog"
            onClick={(e) => e.stopPropagation()}
            role="alertdialog"
            aria-modal="true"
          >
            <div className="dialog-icon-wrapper delete-dialog-icon">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18.36 6.64a9 9 0 1 1-12.73 0" />
                <line x1="12" y1="2" x2="12" y2="12" />
              </svg>
            </div>
            <h3 className="dialog-title">Logout Device Session?</h3>
            <p className="dialog-message">
              Are you sure you want to remotely log out <strong>{revokingSession.user_name}</strong> from device <strong>{revokingSession.device_name}</strong> (IP: {revokingSession.ip_address})?
              <br /><br />
              This device will be immediately terminated and kicked back to the login screen.
            </p>

            <div className="dialog-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setRevokingSession(null)}
                disabled={isRevoking}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={handleConfirmRevokeSession}
                disabled={isRevoking}
              >
                {isRevoking ? 'Logging Out...' : 'Logout Device'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Feedback */}
      <Snackbar
        message={snackbar.message}
        type={snackbar.type}
        onClose={() => setSnackbar({ message: '', type: 'info' })}
      />
    </div>
  );
}

export default UsersPage;
