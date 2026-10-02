import React from 'react';

/**
 * Ultra-Luxury Bottom Navigation Bar (Compact & Sleek)
 * High-fidelity vector icons, smooth pill indicator, and red notification badge for leaving alerts.
 */
export function BottomNav({ activeTab, onTabChange, workerCount, alertCount = 0 }) {
  return (
    <nav className="mobile-bottom-bar android-nav-bar luxury-bottom-bar" aria-label="App Navigation">
      <div className="bottom-nav-container">
        {/* Tab 1: Dashboard Home */}
        <button
          type="button"
          className={`bottom-nav-item ${activeTab === 'home' ? 'active' : ''}`}
          onClick={() => onTabChange('home')}
          aria-label="Home Dashboard"
        >
          <div className="nav-icon-pill">
            <svg
              className="nav-svg-icon"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              {activeTab === 'home' ? (
                <>
                  <path
                    d="M10.5 2.8a2.5 2.5 0 0 1 3 0l7 5.25a2 2 0 0 1 .8 1.6V19a3 3 0 0 1-3 3H5.7a3 3 0 0 1-3-3V9.65a2 2 0 0 1 .8-1.6l7-5.25z"
                    fill="url(#navActiveHomeGrad)"
                  />
                  <path
                    d="M9.5 22v-6a2.5 2.5 0 0 1 5 0v6"
                    stroke="#ffffff"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                  <defs>
                    <linearGradient id="navActiveHomeGrad" x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
                      <stop stopColor="#2563eb" />
                      <stop offset="1" stopColor="#1d4ed8" />
                    </linearGradient>
                  </defs>
                </>
              ) : (
                <path
                  d="M3 10.5L12 3l9 7.5V20a2 2 0 0 1-2 2h-4a1 1 0 0 1-1-1v-5a2 2 0 0 0-2-2h-0a2 2 0 0 0-2 2v5a1 1 0 0 1-1 1H5a2 2 0 0 1-2-2V10.5z"
                  stroke="#64748b"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}
            </svg>
          </div>
          <span className="nav-label">Home</span>
        </button>

        {/* Tab 2: Work Orders / Job Cards */}
        <button
          type="button"
          className={`bottom-nav-item ${activeTab === 'orders' ? 'active' : ''}`}
          onClick={() => onTabChange('orders')}
          aria-label="Orders"
        >
          <div className="nav-icon-pill">
            <svg
              className="nav-svg-icon"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              {activeTab === 'orders' ? (
                <>
                  <path
                    d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"
                    fill="url(#navActiveOrderGrad)"
                  />
                  <polyline points="14 2 14 8 20 8" fill="#93c5fd" />
                  <line x1="16" y1="13" x2="8" y2="13" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" />
                  <line x1="16" y1="17" x2="8" y2="17" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" />
                  <polyline points="10 9 9 9 8 9" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" />
                  <defs>
                    <linearGradient id="navActiveOrderGrad" x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
                      <stop stopColor="#2563eb" />
                      <stop offset="1" stopColor="#1d4ed8" />
                    </linearGradient>
                  </defs>
                </>
              ) : (
                <>
                  <path
                    d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"
                    stroke="#64748b"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <polyline points="14 2 14 8 20 8" stroke="#64748b" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  <line x1="16" y1="13" x2="8" y2="13" stroke="#64748b" strokeWidth="1.8" strokeLinecap="round" />
                  <line x1="16" y1="17" x2="8" y2="17" stroke="#64748b" strokeWidth="1.8" strokeLinecap="round" />
                </>
              )}
            </svg>
          </div>
          <span className="nav-label">Orders</span>
        </button>

        {/* Tab 3: Workers */}
        <button
          type="button"
          className={`bottom-nav-item ${activeTab === 'workers' ? 'active' : ''}`}
          onClick={() => onTabChange('workers')}
          aria-label="Workers Management"
        >
          <div className="nav-icon-pill">
            <svg
              className="nav-svg-icon"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              {activeTab === 'workers' ? (
                <>
                  <defs>
                    <linearGradient id="navActiveWorkerGrad" x1="2" y1="3" x2="22" y2="21" gradientUnits="userSpaceOnUse">
                      <stop stopColor="#2563eb" />
                      <stop offset="1" stopColor="#1d4ed8" />
                    </linearGradient>
                  </defs>
                  {/* Primary Leader */}
                  <circle cx="9" cy="7" r="3.5" fill="url(#navActiveWorkerGrad)" />
                  <path
                    d="M2 19c0-3.3 2.7-6 6-6h2c3.3 0 6 2.7 6 6v1H2v-1z"
                    fill="url(#navActiveWorkerGrad)"
                  />
                  {/* Secondary Team Member */}
                  <circle cx="17.5" cy="8.5" r="2.5" fill="#3b82f6" fillOpacity="0.75" />
                  <path
                    d="M17 14.5c2.5 0 4.5 2 4.5 4.5v1h-3.8c.2-.5.3-1 .3-1.5 0-1.7-.7-3.2-1.8-4.2.3.1.5.2.8.2z"
                    fill="#3b82f6"
                    fillOpacity="0.75"
                  />
                </>
              ) : (
                <>
                  {/* Primary person outline */}
                  <circle cx="9" cy="7" r="3.2" stroke="#64748b" strokeWidth="1.8" />
                  <path
                    d="M2.5 19.5c0-3.3 2.9-6 6.5-6s6.5 2.7 6.5 6"
                    stroke="#64748b"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  />
                  {/* Secondary team member outline */}
                  <path
                    d="M15.5 4.5a3 3 0 0 1 0 5.5"
                    stroke="#64748b"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  />
                  <path
                    d="M18 14.5c1.8.6 3 2.2 3 4.5"
                    stroke="#64748b"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  />
                </>
              )}
            </svg>

            {/* Red Alert Notification Badge for workers leaving within 5 days */}
            {alertCount > 0 ? (
              <span className="nav-alert-badge" title={`${alertCount} worker(s) leaving within 5 days`}>
                <span className="alert-pulse-ring"></span>
                {alertCount}
              </span>
            ) : workerCount !== undefined && workerCount > 0 ? (
              <span className="nav-badge-dot">{workerCount}</span>
            ) : null}
          </div>
          <span className="nav-label">
            Workers
          </span>
        </button>
      </div>
    </nav>
  );
}

export default BottomNav;
