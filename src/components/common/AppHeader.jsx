import React from 'react';
import { TruckLogo } from './TruckLogo';

export function AppHeader() {
  // Format today's date in luxury format (e.g. 1 Oct 2026)
  const todayStr = new Date().toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
  });

  return (
    <header className="android-top-app-bar luxury-header" role="banner">
      <div className="top-bar-inner">
        <div className="top-bar-content">
          <div className="top-bar-left">
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

          {/* Right side luxury status pill */}
          <div className="top-bar-right">
            <div className="luxury-system-chip">
              <span className="system-chip-pulse"></span>
              <span className="system-chip-text">{todayStr}</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

export default AppHeader;
