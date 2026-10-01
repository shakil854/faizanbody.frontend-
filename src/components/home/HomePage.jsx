import React, { useState, useEffect } from 'react';
import { workerService } from '../../services/workerService';
import { isLeavingSoon } from '../../utils/dateAlerts';

export function HomePage({ onNavigate }) {
  const [workers, setWorkers] = useState([]);

  useEffect(() => {
    workerService
      .getWorkers()
      .then((res) => {
        if (res && res.data) {
          setWorkers(res.data);
        }
      })
      .catch(() => {});
  }, []);

  const totalWorkers = workers.length;
  const activeWorkers = workers.filter((w) => !w.going_date).length;
  const leavingSoonCount = workers.filter((w) => isLeavingSoon(w.going_date)).length;

  return (
    <div className="home-dashboard">
      <div className="android-body home-content">
        {/* Management Modules Section */}
        <section className="dashboard-section">
          <div className="section-title-row">
            <h3 className="section-heading">Management Modules</h3>
            <span className="section-badge">Fast Access</span>
          </div>

          <div className="modules-grid single-column-grid">
            {/* Workers Directory Card */}
            <div
              className={`module-card featured-module ${leavingSoonCount > 0 ? 'module-card-with-alert' : ''}`}
              onClick={() => onNavigate('workers')}
              role="button"
              tabIndex={0}
            >
              <div className="module-card-top">
                <div className="module-icon-box worker-module-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                  </svg>
                </div>
                
                <div className="module-badge-group">
                  {leavingSoonCount > 0 && (
                    <span className="module-red-alert-pill">
                      <span className="pulse-red-dot"></span>
                      {leavingSoonCount} Leaving Soon
                    </span>
                  )}
                  <span className="module-status-badge">
                    {activeWorkers} On Duty
                  </span>
                </div>
              </div>
              <div className="module-info">
                <h4 className="module-title">Workers Directory</h4>
                <p className="module-desc">
                  Manage worker records, coming & going dates, profiles, and attendance.
                </p>
              </div>
              <div className="module-footer">
                <span className="open-link-text">
                  Open Directory
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="5" y1="12" x2="19" y2="12" />
                    <polyline points="12 5 19 12 12 19" />
                  </svg>
                </span>
                <span className="module-count-pill">{totalWorkers} Workers</span>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

export default HomePage;
