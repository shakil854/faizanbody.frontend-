import React from 'react';
import { Server, Activity, Globe } from 'lucide-react';
import { API_BASE_URL } from '../config/api.config';

export const Navbar = ({ isBackendOnline }) => {
  return (
    <header className="navbar">
      <div className="navbar-container">
        <div className="brand">
          <div className="brand-icon">
            <Server size={22} />
          </div>
          <div>
            <h1 className="brand-title">FaizanBody</h1>
            <span className="brand-subtitle">Full-Stack Enterprise Setup</span>
          </div>
        </div>

        <div className="navbar-badges">
          <div className="api-badge" title="Centralized Axios Base URL">
            <Globe size={14} className="badge-icon" />
            <span className="api-badge-label">Active API:</span>
            <code className="api-badge-url">{API_BASE_URL}</code>
          </div>

          <div className={`status-indicator ${isBackendOnline ? 'online' : 'checking'}`}>
            <span className="status-dot"></span>
            <span>{isBackendOnline ? 'Backend Online' : 'Connecting to API...'}</span>
          </div>
        </div>
      </div>
    </header>
  );
};
