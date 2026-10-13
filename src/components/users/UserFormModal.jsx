import React, { useState, useEffect } from 'react';
import { APP_MODULES, getAllPermissionKeys, getModulePermissionKeys } from '../../config/permissionsConfig';

export function UserFormModal({ isOpen, onClose, onSave, initialData }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('user');
  const [isActive, setIsActive] = useState(true);
  const [selectedPermissions, setSelectedPermissions] = useState(new Set());
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (initialData) {
      setName(initialData.name || '');
      setEmail(initialData.email || '');
      setMobile(initialData.mobile || '');
      setPassword(''); // Password blank on edit unless changing
      setRole(initialData.role || 'user');
      setIsActive(initialData.is_active !== false);
      const perms = Array.isArray(initialData.permissions) ? initialData.permissions : [];
      setSelectedPermissions(new Set(perms));
    } else {
      setName('');
      setEmail('');
      setMobile('');
      setPassword('');
      setRole('user');
      setIsActive(true);
      // For new user, default to standard basic viewing permissions
      setSelectedPermissions(new Set(['orders:view', 'stock:view', 'workers:view']));
    }
    setError('');
    setIsSubmitting(false);
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  // Toggle individual permission
  const handleTogglePermission = (key) => {
    setSelectedPermissions((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  // Select all permissions across entire app
  const handleSelectAll = () => {
    setSelectedPermissions(new Set(getAllPermissionKeys()));
  };

  // Clear all permissions
  const handleClearAll = () => {
    setSelectedPermissions(new Set());
  };

  // Toggle all permissions for a specific module
  const handleToggleModule = (moduleId) => {
    const modKeys = getModulePermissionKeys(moduleId);
    const allSelected = modKeys.every((k) => selectedPermissions.has(k));

    setSelectedPermissions((prev) => {
      const next = new Set(prev);
      if (allSelected) {
        modKeys.forEach((k) => next.delete(k));
      } else {
        modKeys.forEach((k) => next.add(k));
      }
      return next;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Please enter the user full name.');
      return;
    }

    if (!email.trim()) {
      setError('Please enter user email address.');
      return;
    }

    if (!initialData && (!password || password.length < 6)) {
      setError('Password is required and must be at least 6 characters long.');
      return;
    }

    if (password && password.length < 6) {
      setError('New password must be at least 6 characters long.');
      return;
    }

    try {
      setIsSubmitting(true);
      const payload = {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        mobile: mobile.trim() || null,
        role,
        is_active: isActive,
        permissions: role === 'admin' ? getAllPermissionKeys() : Array.from(selectedPermissions),
      };

      if (password && password.trim()) {
        payload.password = password.trim();
      }

      await onSave(payload);
      onClose();
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Error saving user';
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="android-bottom-sheet luxury-bottom-sheet user-form-sheet"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {/* Mobile handle */}
        <div className="sheet-handle-bar">
          <div className="sheet-handle"></div>
        </div>

        {/* Modal Header */}
        <div className="sheet-header">
          <div className="sheet-title-group">
            <div className="sheet-icon-squircle" style={{ background: '#eff6ff', color: '#2563eb' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </div>
            <div>
              <h3 className="sheet-title">
                {initialData ? `Edit User: ${initialData.name}` : 'Create New User Account'}
              </h3>
              <p className="sheet-subtitle">
                Configure user profile credentials and screen-by-screen granular permissions
              </p>
            </div>
          </div>
          <button
            type="button"
            className="sheet-close-btn"
            onClick={onClose}
            aria-label="Close"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="user-form-content">
          {error && (
            <div className="form-alert-error">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          {/* Section 1: Basic Information */}
          <div className="user-form-section">
            <h4 className="user-section-title">
              <span className="section-step-badge">1</span>
              User Profile & Credentials
            </h4>

            <div className="form-grid-two-cols">
              {/* Full Name */}
              <div className="form-group">
                <label className="form-label">
                  Full Name <span className="required-star">*</span>
                </label>
                <div className="input-with-icon">
                  <span className="field-icon">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                  </span>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Aslam Bhai"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
              </div>

              {/* Email Address */}
              <div className="form-group">
                <label className="form-label">
                  Email Address (Login ID) <span className="required-star">*</span>
                </label>
                <div className="input-with-icon">
                  <span className="field-icon">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2">
                      <rect x="2" y="4" width="20" height="16" rx="2" />
                      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                    </svg>
                  </span>
                  <input
                    type="email"
                    className="form-input"
                    placeholder="user@faizanbody.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              {/* Mobile Number */}
              <div className="form-group">
                <label className="form-label">Mobile Number</label>
                <div className="input-with-icon">
                  <span className="field-icon">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2">
                      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                    </svg>
                  </span>
                  <input
                    type="tel"
                    className="form-input"
                    placeholder="10-digit mobile"
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value)}
                  />
                </div>
              </div>

              {/* Password */}
              <div className="form-group">
                <label className="form-label">
                  {initialData ? 'Change Password (Optional)' : 'Password *'}
                </label>
                <div className="input-with-icon">
                  <span className="field-icon">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                  </span>
                  <input
                    type="password"
                    className="form-input"
                    placeholder={initialData ? 'Leave blank to keep unchanged' : 'Min 6 characters'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required={!initialData}
                  />
                </div>
              </div>
            </div>

            {/* Role & Status Row */}
            <div className="user-role-status-row">
              <div className="role-selection-box">
                <label className="form-label">System Role</label>
                <div className="role-pills-group">
                  <button
                    type="button"
                    className={`role-choice-pill ${role === 'user' ? 'active-pill' : ''}`}
                    onClick={() => setRole('user')}
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                    <span>Staff Member (Custom Permissions)</span>
                  </button>

                  <button
                    type="button"
                    className={`role-choice-pill ${role === 'admin' ? 'active-pill admin-pill' : ''}`}
                    onClick={() => setRole('admin')}
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                    </svg>
                    <span>👑 Administrator (Full Master Access)</span>
                  </button>
                </div>
              </div>

              {/* Status Toggle */}
              <div className="user-active-toggle-wrap">
                <label className="form-label">Account Status</label>
                <label className="toggle-switch-label">
                  <input
                    type="checkbox"
                    className="toggle-switch-input"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                  />
                  <span className="toggle-switch-slider"></span>
                  <span className={`toggle-status-text ${isActive ? 'text-active' : 'text-inactive'}`}>
                    {isActive ? 'Active (Can Log In)' : 'Suspended (Blocked)'}
                  </span>
                </label>
              </div>
            </div>
          </div>

          {/* Section 2: Granular Screen Permissions Matrix */}
          <div className="user-form-section">
            <div className="permissions-header-row">
              <div>
                <h4 className="user-section-title">
                  <span className="section-step-badge">2</span>
                  Screen & Module Permissions
                </h4>
                <p className="permissions-subtext">
                  Control exactly which screens this user can open, and what actions (Add, Edit, Delete, Photos) they are allowed to perform.
                </p>
              </div>

              {role === 'user' && (
                <div className="permissions-global-actions">
                  <button
                    type="button"
                    className="btn btn-secondary btn-perm-quick"
                    onClick={handleSelectAll}
                  >
                    Select All
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary btn-perm-quick"
                    onClick={handleClearAll}
                  >
                    Clear All
                  </button>
                </div>
              )}
            </div>

            {role === 'admin' ? (
              <div className="admin-full-access-banner">
                <div className="admin-crown-icon">👑</div>
                <div>
                  <strong>Full System Administrator Access</strong>
                  <p>
                    Administrators have automatic 100% permissions across all modules, orders, stock adjustments, worker records, and can create/manage other users.
                  </p>
                </div>
              </div>
            ) : (
              <div className="modules-permissions-container">
                {APP_MODULES.map((mod) => {
                  const modKeys = getModulePermissionKeys(mod.id);
                  const selectedInMod = modKeys.filter((k) => selectedPermissions.has(k)).length;
                  const isAllModSelected = selectedInMod === modKeys.length;

                  return (
                    <div key={mod.id} className="module-perm-card">
                      <div className="module-perm-card-header">
                        <div className="module-perm-info">
                          <span
                            className="module-perm-indicator-dot"
                            style={{ background: mod.color }}
                          ></span>
                          <div>
                            <h5 className="module-perm-name">{mod.name}</h5>
                            <span className="module-perm-desc">{mod.description}</span>
                          </div>
                        </div>

                        <div className="module-perm-header-actions">
                          <span className="perm-counter-pill">
                            {selectedInMod} / {modKeys.length} Granted
                          </span>
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm-toggle"
                            onClick={() => handleToggleModule(mod.id)}
                          >
                            {isAllModSelected ? 'Deselect Screen' : 'Select All'}
                          </button>
                        </div>
                      </div>

                      {/* Individual Granular Actions Grid */}
                      <div className="granular-perms-grid">
                        {mod.permissions.map((perm) => {
                          const isChecked = selectedPermissions.has(perm.key);
                          const isDestructive = perm.key.includes('delete');
                          return (
                            <label
                              key={perm.key}
                              className={`perm-checkbox-card ${isChecked ? 'checked' : ''} ${isDestructive ? 'destructive-perm' : ''}`}
                            >
                              <div className="perm-checkbox-left">
                                <input
                                  type="checkbox"
                                  className="perm-checkbox-native"
                                  checked={isChecked}
                                  onChange={() => handleTogglePermission(perm.key)}
                                />
                                <div className="perm-custom-checkbox">
                                  {isChecked && (
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3">
                                      <polyline points="20 6 9 17 4 12" />
                                    </svg>
                                  )}
                                </div>
                              </div>
                              <div className="perm-label-wrap">
                                <span className="perm-label-title">{perm.label}</span>
                                <span className="perm-label-caption">{perm.description}</span>
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Form Footer Actions */}
          <div className="sheet-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                'Saving User...'
              ) : initialData ? (
                'Update User & Permissions'
              ) : (
                'Create User Account'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default UserFormModal;
