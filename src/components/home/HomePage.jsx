import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { workerService } from '../../services/workerService';
import { orderService } from '../../services/orderService';
import { quotationService } from '../../services/quotationService';
import { stockService } from '../../services/stockService';
import { isLeavingSoon } from '../../utils/dateAlerts';

export function HomePage({ onNavigate, onQuickAddWorker }) {
  const { user, isAdmin, canAccessModule } = useAuth();

  // Instant SWR cache initialization
  const [workers, setWorkers] = useState(() => workerService.getCachedWorkers());
  const [orders, setOrders] = useState(() => orderService.getCachedOrders());
  const [quotations, setQuotations] = useState(() => quotationService.getCachedQuotations());
  const [stockItems, setStockItems] = useState(() => stockService.getCachedItems());
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const searchContainerRef = useRef(null);

  useEffect(() => {
    // Real-time cache subscriptions
    const unsubWorkers = workerService.subscribe((list) => setWorkers(list));
    const unsubOrders = orderService.subscribe((list) => setOrders(list));
    const unsubStock = stockService.subscribeItems((list) => setStockItems(list));
    let unsubQuotes = () => {};

    if (isAdmin) {
      unsubQuotes = quotationService.subscribe((list) => setQuotations(list));
      quotationService.getQuotations().then((res) => {
        if (res?.data) setQuotations(res.data);
      }).catch(() => {});
    }

    // Silent background fetch
    workerService.getWorkers().then((res) => {
      if (res?.data) setWorkers(res.data);
    }).catch(() => {});

    orderService.getOrders().then((res) => {
      if (res?.data) setOrders(res.data);
    }).catch(() => {});

    stockService.getItems().then((res) => {
      if (res?.data) setStockItems(res.data);
    }).catch(() => {});

    return () => {
      unsubWorkers();
      unsubOrders();
      unsubQuotes();
      unsubStock();
    };
  }, [isAdmin]);

  // Close search dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target)) {
        setIsSearchFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Compute live counts
  const totalWorkers = workers.length;
  const activeWorkers = workers.filter((w) => !w.going_date).length;
  const leavingSoonCount = workers.filter((w) => isLeavingSoon(w.going_date)).length;

  const totalQuotations = quotations.length;
  const totalOrders = orders.length;
  const incomingOrders = orders.filter((o) => o.status === 'Incoming').length;
  const activeOrders = orders.filter((o) => o.status === 'In Progress').length;

  const totalStockItems = stockItems.length;
  const lowStockCount = stockItems.filter(
    (i) => Number(i.quantity) <= Number(i.min_alert_quantity)
  ).length;

  // Instant search results from orders
  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];

    const matchedOrders = orders.filter((o) =>
      (o.truck_chassis_no && o.truck_chassis_no.toLowerCase().includes(q)) ||
      (o.owner_name && o.owner_name.toLowerCase().includes(q)) ||
      (o.order_no && o.order_no.toLowerCase().includes(q)) ||
      (o.mobile_number && o.mobile_number.includes(q))
    ).slice(0, 5);

    return matchedOrders;
  }, [searchQuery, orders]);

  // Time-based English greeting
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  const todayDateStr = new Date().toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });

  return (
    <div className="home-dashboard compact-home-shell">
      <div className="android-body compact-home-content">

        {/* 1. Greeting & Live Pulse Bar */}
        <div className="home-pulse-bar">
          <div className="pulse-greeting-group">
            <span className="pulse-greeting-text">
              {greeting}, <strong>{user?.name || 'Faizan Body'}</strong>
            </span>
            <span className="pulse-date-tag">📅 {todayDateStr}</span>
          </div>

          <div className="pulse-status-badge">
            <span className="pulse-indicator-dot"></span>
            <span className="pulse-status-text">Workshop Active</span>
          </div>
        </div>

        {/* 2. Instant Chassis & Order Quick Search Bar */}
        <div className="home-quick-search-box" ref={searchContainerRef}>
          <div className="search-input-wrapper">
            <svg className="search-lens-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              className="search-input-field"
              placeholder="Search chassis number, owner, or order #..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setIsSearchFocused(true)}
            />
            {searchQuery && (
              <button
                type="button"
                className="btn-search-clear"
                onClick={() => setSearchQuery('')}
                title="Clear search"
              >
                ✕
              </button>
            )}
          </div>

          {/* Live Search Results Dropdown */}
          {isSearchFocused && searchQuery.trim() && (
            <div className="search-results-floating-card animate-fade-in">
              <div className="search-results-head">
                <span>Search Results ({searchResults.length}):</span>
              </div>
              {searchResults.length === 0 ? (
                <div className="search-no-match">
                  <span>No matching orders found</span>
                </div>
              ) : (
                <div className="search-results-list">
                  {searchResults.map((ord) => (
                    <div
                      key={ord.id}
                      className="search-result-row"
                      onClick={() => {
                        onNavigate('orders');
                        setIsSearchFocused(false);
                      }}
                    >
                      <div className="search-row-main">
                        <span className="search-chassis-no">
                          🚛 {ord.truck_chassis_no || 'No Chassis'}
                        </span>
                        <span className="search-owner-text">
                          {ord.owner_name} {ord.order_no ? `(#${ord.order_no})` : ''}
                        </span>
                      </div>
                      <span className={`search-status-tag status-${ord.status === 'Incoming' ? 'incoming' : 'progress'}`}>
                        {ord.status || 'In Progress'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* 3. Quick Action Buttons Row (Placed directly below Search Box, 100% Mobile Responsive) */}
        <div className="home-compact-actions-row">
          {canAccessModule('orders') && (
            <button
              type="button"
              className="compact-action-btn action-order"
              onClick={() => onNavigate('orders')}
            >
              <span className="action-btn-icon bg-btn-blue">＋</span>
              <span className="action-btn-text">New Order</span>
            </button>
          )}

          {canAccessModule('quotations') && (
            <button
              type="button"
              className="compact-action-btn action-quote"
              onClick={() => onNavigate('quotations')}
            >
              <span className="action-btn-icon bg-btn-amber">📋</span>
              <span className="action-btn-text">Quotation</span>
            </button>
          )}

          {canAccessModule('stock') && (
            <button
              type="button"
              className="compact-action-btn action-stock"
              onClick={() => onNavigate('stock')}
            >
              <span className="action-btn-icon bg-btn-cyan">📦</span>
              <span className="action-btn-text">Add Stock</span>
            </button>
          )}

          {canAccessModule('workers') && (
            <button
              type="button"
              className="compact-action-btn action-worker"
              onClick={() => {
                if (onQuickAddWorker) onQuickAddWorker();
                else onNavigate('workers');
              }}
            >
              <span className="action-btn-icon bg-btn-emerald">👷</span>
              <span className="action-btn-text">Add Worker</span>
            </button>
          )}
        </div>

        {/* 4. 2x2 COMPACT MODULE TILES */}
        <div className="compact-tiles-grid">
          {/* Quotations Tile */}
          {canAccessModule('quotations') && (
            <div
              className="compact-tile tile-theme-quotations"
              onClick={() => onNavigate('quotations')}
              role="button"
              tabIndex={0}
            >
              <div className="compact-tile-top">
                <div className="compact-icon-wrapper bg-amber-grad">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="9" y1="13" x2="15" y2="13" />
                    <line x1="9" y1="17" x2="13" y2="17" />
                  </svg>
                </div>
                <span className="compact-stat-bubble bubble-amber">{totalQuotations} Quotes</span>
              </div>

              <div className="compact-tile-middle">
                <h3 className="compact-module-heading">Quotations</h3>
                <p className="compact-status-hint text-amber">
                  Rates, Estimates & Discounts
                </p>
              </div>

              <div className="compact-tile-bottom">
                <span className="compact-open-tag">Open Quotations</span>
                <span className="compact-arrow-icon">→</span>
              </div>
            </div>
          )}

          {/* Work Orders Tile */}
          {canAccessModule('orders') && (
            <div
              className="compact-tile tile-theme-orders"
              onClick={() => onNavigate('orders')}
              role="button"
              tabIndex={0}
            >
              <div className="compact-tile-top">
                <div className="compact-icon-wrapper bg-blue-grad">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="16" y1="13" x2="8" y2="13" />
                    <line x1="16" y1="17" x2="8" y2="17" />
                  </svg>
                </div>
                <span className="compact-stat-bubble bubble-blue">{totalOrders} Orders</span>
              </div>

              <div className="compact-tile-middle">
                <h3 className="compact-module-heading">Work Orders</h3>
                <p className="compact-status-hint text-blue">
                  {activeOrders > 0 ? `⚡ ${activeOrders} In Progress` : 'Truck Body Fabrication'}
                  {incomingOrders > 0 ? ` • ${incomingOrders} Incoming` : ''}
                </p>
              </div>

              <div className="compact-tile-bottom">
                <span className="compact-open-tag">Open Orders</span>
                <span className="compact-arrow-icon">→</span>
              </div>
            </div>
          )}

          {/* Stock & Inventory Tile */}
          {canAccessModule('stock') && (
            <div
              className={`compact-tile tile-theme-stock ${lowStockCount > 0 ? 'tile-has-warning' : ''}`}
              onClick={() => onNavigate('stock')}
              role="button"
              tabIndex={0}
            >
              <div className="compact-tile-top">
                <div className="compact-icon-wrapper bg-cyan-grad">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
                    <path d="m3.3 7 8.7 5 8.7-5" />
                    <path d="M12 22V12" />
                  </svg>
                </div>
                <span className="compact-stat-bubble bubble-cyan">{totalStockItems} Materials</span>
              </div>

              <div className="compact-tile-middle">
                <h3 className="compact-module-heading">Stock & Inventory</h3>
                <p className={`compact-status-hint ${lowStockCount > 0 ? 'text-red' : 'text-cyan'}`}>
                  {lowStockCount > 0 ? `⚠️ ${lowStockCount} Low Stock Alert` : '✓ Optimal Inventory'}
                </p>
              </div>

              <div className="compact-tile-bottom">
                <span className="compact-open-tag">View Stock</span>
                <span className="compact-arrow-icon">→</span>
              </div>
            </div>
          )}

          {/* Workers Directory Tile */}
          {canAccessModule('workers') && (
            <div
              className={`compact-tile tile-theme-workers ${leavingSoonCount > 0 ? 'tile-has-warning' : ''}`}
              onClick={() => onNavigate('workers')}
              role="button"
              tabIndex={0}
            >
              <div className="compact-tile-top">
                <div className="compact-icon-wrapper bg-emerald-grad">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                  </svg>
                </div>
                <span className="compact-stat-bubble bubble-emerald">{totalWorkers} Workers</span>
              </div>

              <div className="compact-tile-middle">
                <h3 className="compact-module-heading">Workers Directory</h3>
                <p className={`compact-status-hint ${leavingSoonCount > 0 ? 'text-amber' : 'text-emerald'}`}>
                  {activeWorkers} On Duty
                  {leavingSoonCount > 0 ? ` • ${leavingSoonCount} Leaving Soon` : ''}
                </p>
              </div>

              <div className="compact-tile-bottom">
                <span className="compact-open-tag">Workers Khata</span>
                <span className="compact-arrow-icon">→</span>
              </div>
            </div>
          )}

          {/* User Access & Security Tile (Admin Only) */}
          {isAdmin && (
            <div
              className="compact-tile tile-theme-users"
              onClick={() => onNavigate('users')}
              role="button"
              tabIndex={0}
            >
              <div className="compact-tile-top">
                <div className="compact-icon-wrapper bg-purple-grad">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
                    <path d="m9 12 2 2 4-4" />
                  </svg>
                </div>
                <span className="compact-stat-bubble bubble-purple">👑 Admin</span>
              </div>

              <div className="compact-tile-middle">
                <h3 className="compact-module-heading">User & Security</h3>
                <p className="compact-status-hint text-purple">
                  Staff Permissions & Sessions
                </p>
              </div>

              <div className="compact-tile-bottom">
                <span className="compact-open-tag">Manage Access</span>
                <span className="compact-arrow-icon">→</span>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

export default HomePage;
