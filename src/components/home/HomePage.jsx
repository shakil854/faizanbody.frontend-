import React, { useState, useEffect } from 'react';
import { workerService } from '../../services/workerService';
import { TruckLogo } from '../common/TruckLogo';

export function HomePage({ onNavigate, onQuickAddWorker }) {
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    workerService
      .getWorkers()
      .then((res) => {
        if (res && res.data) {
          setWorkers(res.data);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const totalWorkers = workers.length;
  const activeWorkers = workers.filter((w) => !w.going_date).length;
  const relievedWorkers = totalWorkers - activeWorkers;
  const recentWorkers = workers.slice(0, 4);

  return (
    <div className="home-dashboard">
      {/* Main Executive Dashboard Content */}
      <div className="android-body home-content">
        {/* Executive Hero Banner */}
        <section className="home-hero-card">
          <div className="hero-content">
            <div className="hero-tag-badge">
              <span className="hero-tag-dot"></span>
              <span>ENTERPRISE WORKSHOP PLATFORM</span>
            </div>
            <h2 className="hero-title">Workshop Overview</h2>
            <p className="hero-subtitle">
              Real-time monitoring of workshop workforce, deployment, and body-building operations.
            </p>
          </div>

          <div className="hero-stats-row">
            <div className="hero-stat-box">
              <span className="hero-stat-num">{totalWorkers}</span>
              <span className="hero-stat-lbl">Total Workers</span>
            </div>
            <div className="hero-stat-divider"></div>
            <div className="hero-stat-box">
              <span className="hero-stat-num text-success">{activeWorkers}</span>
              <span className="hero-stat-lbl">Active On Duty</span>
            </div>
            <div className="hero-stat-divider"></div>
            <div className="hero-stat-box">
              <span className="hero-stat-num text-warning">{relievedWorkers}</span>
              <span className="hero-stat-lbl">Relieved</span>
            </div>
          </div>
        </section>

        {/* Section: Main App Modules */}
        <section className="dashboard-section">
          <div className="section-title-row">
            <h3 className="section-heading">Management Modules</h3>
            <span className="section-badge">Fast Access</span>
          </div>

          <div className="modules-grid">
            {/* Primary Module: Workers Page */}
            <div
              className="module-card featured-module"
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
                <span className="module-status-badge">
                  {activeWorkers} On Duty
                </span>
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

            {/* Quick Action Card: Add New Worker */}
            <div
              className="module-card action-shortcut-card"
              onClick={onQuickAddWorker}
              role="button"
              tabIndex={0}
            >
              <div className="module-card-top">
                <div className="module-icon-box add-module-icon">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                </div>
                <span className="shortcut-pill">Quick Action</span>
              </div>
              <div className="module-info">
                <h4 className="module-title">Add New Worker</h4>
                <p className="module-desc">
                  Quickly enroll a new technician with joining date into the system.
                </p>
              </div>
              <div className="module-footer">
                <span className="open-link-text">
                  Enroll Now
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="5" y1="12" x2="19" y2="12" />
                    <polyline points="12 5 19 12 12 19" />
                  </svg>
                </span>
              </div>
            </div>

            {/* Secondary Module: Vehicles / Body Works */}
            <div className="module-card secondary-module">
              <div className="module-card-top">
                <div className="module-icon-box vehicle-module-icon">
                  <TruckLogo size={24} />
                </div>
                <span className="coming-soon-pill">Ready</span>
              </div>
              <div className="module-info">
                <h4 className="module-title">Body Building & Fabrication</h4>
                <p className="module-desc">
                  Commercial vehicle chassis fabrication, specs, and delivery schedules.
                </p>
              </div>
              <div className="module-footer">
                <span className="secondary-tag">Core Division</span>
              </div>
            </div>
          </div>
        </section>

        {/* Section: Recent Workers Snapshot */}
        <section className="dashboard-section">
          <div className="section-title-row">
            <h3 className="section-heading">Recent Workers</h3>
            <button
              type="button"
              className="view-all-btn"
              onClick={() => onNavigate('workers')}
            >
              View All ({totalWorkers}) →
            </button>
          </div>

          {loading ? (
            <div className="home-loading-box">
              <div className="luxury-spinner"></div>
              <span>Loading worker records...</span>
            </div>
          ) : recentWorkers.length === 0 ? (
            <div className="home-empty-box">
              <div className="empty-icon-circle">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                </svg>
              </div>
              <p>No workers enrolled yet.</p>
              <button
                type="button"
                className="btn btn-primary"
                onClick={onQuickAddWorker}
              >
                + Add First Worker
              </button>
            </div>
          ) : (
            <div className="recent-workers-list">
              {recentWorkers.map((w) => (
                <div
                  key={w.id}
                  className="recent-worker-item"
                  onClick={() => onNavigate('workers')}
                >
                  <div className="recent-worker-avatar">
                    {(w.name || 'W').slice(0, 2).toUpperCase()}
                  </div>
                  <div className="recent-worker-meta">
                    <span className="recent-worker-name">{w.name}</span>
                    <span className="recent-worker-date">
                      Joined: {w.coming_date || 'N/A'}
                    </span>
                  </div>
                  <div className="recent-worker-status">
                    {!w.going_date ? (
                      <span className="status-badge-clean active-badge">
                        <span className="status-dot-active"></span>
                        Working
                      </span>
                    ) : (
                      <span className="status-badge-clean relieved-badge">
                        <span className="status-dot-relieved"></span>
                        Relieved
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

export default HomePage;
