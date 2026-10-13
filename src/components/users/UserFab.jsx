import React from 'react';

export function UserFab({ onAddNew }) {
  return (
    <button
      type="button"
      className="android-fab luxury-fab user-fab"
      onClick={onAddNew}
      title="Add New User"
      aria-label="Add New User"
    >
      <span className="fab-plus-icon">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round">
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </span>
      <span className="fab-label">Add User</span>
    </button>
  );
}

export default UserFab;
