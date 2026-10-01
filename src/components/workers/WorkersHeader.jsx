import React from 'react';
import { TruckLogo } from '../common/TruckLogo';

export function WorkersHeader({ isBackendOnline, onRefresh, onAddNew, isRefreshing, onBackToHome }) {
  return (
    <header className="android-top-app-bar premium-app-bar">
      <div className="top-bar-content">
        <div className="top-bar-left">
          {onBackToHome && (
            <button
              type="button"
              className="top-back-btn"
              onClick={onBackToHome}
              title="Back to Home"
              aria-label="Back to Home"
            >
              ←
            </button>
          )}
          <div className="brand-logo-badge">
            <TruckLogo size={24} color="#ffffff" />
          </div>
          <div className="title-group">
            <h1 className="app-title">Workers Directory</h1>
            <span className="app-subtitle">FaizanBody • कामगार प्रबंधन</span>
          </div>
        </div>

        <div className="top-bar-right">
          {/* Online/Offline status pill */}
          <div
            className={`connection-pill ${isBackendOnline ? 'online' : 'offline'}`}
            title={isBackendOnline ? 'Backend Connected' : 'Connecting / Offline'}
          >
            <span className="status-dot"></span>
            <span className="status-text">{isBackendOnline ? 'Online' : 'Offline'}</span>
          </div>

          {/* Quick Refresh */}
          <button
            type="button"
            className={`top-icon-btn ${isRefreshing ? 'is-spinning' : ''}`}
            onClick={onRefresh}
            title="Refresh List"
            aria-label="Refresh List"
          >
            🔄
          </button>

          {/* Add Worker button for Tablet & Desktop */}
          <button
            type="button"
            className="btn btn-primary header-add-btn"
            onClick={onAddNew}
          >
            <span className="plus-sign">+</span>
            <span>Add Worker</span>
          </button>
        </div>
      </div>
    </header>
  );
}
