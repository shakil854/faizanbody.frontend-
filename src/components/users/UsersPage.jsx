import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { userService } from '../../services/userService';
import { useAuth } from '../../context/AuthContext';
import { APP_MODULES, calculatePermissionCounts } from '../../config/permissionsConfig';
import { UserFormModal } from './UserFormModal';
import { UserDeleteModal } from './UserDeleteModal';
import { Snackbar } from '../workers/Snackbar';

export function UsersPage({ onBackToHome }) {
  const { user: currentAuthUser } = useAuth();
  const [users, setUsers] = useState(() => userService.getCachedUsers());
  const [loading, setLoading] = useState(users.length === 0);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all'); // all | admin | user
  const [statusFilter, setStatusFilter] = useState('all'); // all | active | suspended

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

  return (
    <div className="workers-page-shell user-mgmt-page">
      <main className="android-body">
        {/* Page Top Action Bar */}
        <div className="user-mgmt-topbar">
          <div className="user-mgmt-top-left">
            <button
              type="button"
              className="btn btn-secondary btn-back-round"
              onClick={onBackToHome}
              title="Back to Home Dashboard"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="19" y1="12" x2="5" y2="12" />
                <polyline points="12 19 5 12 12 5" />
              </svg>
            </button>
            <div>
              <h2 className="user-page-title">User Management & Permissions</h2>
              <p className="user-page-subtitle">
                Create sub-accounts, manage credentials & set screen-level granular permissions
              </p>
            </div>
          </div>

          <button
            type="button"
            className="btn btn-primary btn-add-user-top"
            onClick={() => {
              setEditingUser(null);
              setIsFormOpen(true);
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            <span>Add New User</span>
          </button>
        </div>

        {/* Executive Stats Summary Cards */}
        <div className="user-stats-strip">
          <div className="user-stat-card">
            <div className="user-stat-number">{totalUsers}</div>
            <div className="user-stat-label">Total Users</div>
          </div>
          <div className="user-stat-card">
            <div className="user-stat-number stat-active">{activeCount}</div>
            <div className="user-stat-label">Active Users</div>
          </div>
          <div className="user-stat-card">
            <div className="user-stat-number stat-admin">{adminCount}</div>
            <div className="user-stat-label">Admins</div>
          </div>
          <div className="user-stat-card">
            <div className="user-stat-number stat-staff">{staffCount}</div>
            <div className="user-stat-label">Staff Users</div>
          </div>
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
      </main>

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
