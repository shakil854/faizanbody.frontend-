import React, { useState, useEffect } from 'react';
import { workerService } from '../../services/workerService';
import { orderService } from '../../services/orderService';
import { isLeavingSoon } from '../../utils/dateAlerts';

export function HomePage({ onNavigate, onQuickAddOrder }) {
  // Initialize with cached workers instantly (0ms loading)
  const [workers, setWorkers] = useState(() => workerService.getCachedWorkers());
  const [orders, setOrders] = useState(() => orderService.getCachedOrders());

  useEffect(() => {
    // 1. Subscribe to real-time cache updates
    const unsubWorkers = workerService.subscribe((updatedList) => {
      setWorkers(updatedList);
    });

    const unsubOrders = orderService.subscribe((updatedList) => {
      setOrders(updatedList);
    });

    // 2. Fetch/revalidate silently in background
    workerService
      .getWorkers()
      .then((res) => {
        if (res && res.data) {
          setWorkers(res.data);
        }
      })
      .catch(() => {});

    orderService
      .getOrders()
      .then((res) => {
        if (res && res.data) {
          setOrders(res.data);
        }
      })
      .catch(() => {});

    return () => {
      unsubWorkers();
      unsubOrders();
    };
  }, []);

  const totalWorkers = workers.length;
  const activeWorkers = workers.filter((w) => !w.going_date).length;
  const leavingSoonCount = workers.filter((w) => isLeavingSoon(w.going_date)).length;

  const totalOrders = orders.length;
  const activeOrders = orders.filter((o) => o.status === 'In Progress').length;

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
            {/* 1. Work Orders / Job Cards Card */}
            <div
              className="module-card featured-module order-featured-card"
              onClick={() => onNavigate('orders')}
              role="button"
              tabIndex={0}
            >
              <div className="module-card-top">
                <div className="module-icon-box" style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)', color: '#fff' }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="16" y1="13" x2="8" y2="13" />
                    <line x1="16" y1="17" x2="8" y2="17" />
                    <polyline points="10 9 9 9 8 9" />
                  </svg>
                </div>

                <div className="module-badge-group">
                  <span className="module-status-badge" style={{ background: '#eff6ff', color: '#1d4ed8', borderColor: '#bfdbfe' }}>
                    {activeOrders} In Progress
                  </span>
                </div>
              </div>
              <div className="module-info">
                <h4 className="module-title">Orders</h4>
                <p className="module-desc">
                  Track truck body fabrication, cabin, finishing tasks, task checkoffs & digital job sheets.
                </p>
              </div>
              <div className="module-footer">
                <span className="open-link-text">
                  Open Orders
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="5" y1="12" x2="19" y2="12" />
                    <polyline points="12 5 19 12 12 19" />
                  </svg>
                </span>
                <span className="module-count-pill" style={{ background: '#dbeafe', color: '#1e40af' }}>{totalOrders} Orders</span>
              </div>
            </div>

            {/* 2. Workers Directory Card */}
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
