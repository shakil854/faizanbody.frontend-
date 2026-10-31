import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './context/AuthContext';
import { LoginPage } from './components/auth/LoginPage';
import { ChangePasswordModal } from './components/auth/ChangePasswordModal';
import { AppHeader } from './components/common/AppHeader';
import { HomePage } from './components/home/HomePage';
import { WorkersPage } from './components/workers/WorkersPage';
import { OrdersPage } from './components/orders/OrdersPage';
import { QuotationsPage } from './components/quotations/QuotationsPage';
import { StockPage } from './components/stock/StockPage';
import { UsersPage } from './components/users/UsersPage';
import { WorkerFormModal } from './components/workers/WorkerFormModal';
import { Snackbar } from './components/workers/Snackbar';
import { BottomNav } from './components/common/BottomNav';
import { workerService } from './services/workerService';
import { stockService } from './services/stockService';
import { orderService } from './services/orderService';
import { quotationService } from './services/quotationService';
import { userService } from './services/userService';
import { calculateOrderProgress } from './components/orders/orderConstants';
import { isLeavingSoon } from './utils/dateAlerts';
import './App.css';

export function App() {
  const { isAuthenticated, loading: authLoading, isAdmin } = useAuth();

  const [currentPage, setCurrentPage] = useState(() => {
    const hash = window.location.hash;
    if (hash === '#workers') return 'workers';
    if (hash === '#orders') return 'orders';
    if (hash === '#quotations') return isAdmin ? 'quotations' : 'home';
    if (hash === '#stock') return 'stock';
    if (hash === '#users') return 'users';
    return 'home';
  });

  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const [snackbar, setSnackbar] = useState({ message: '', type: 'info' });

  // Navigation history stack for Android hardware back button
  const navStackRef = useRef([currentPage || 'home']);
  const lastBackPressTimeRef = useRef(0);
  const [workerCount, setWorkerCount] = useState(0);
  const [alertCount, setAlertCount] = useState(0);
  const [stockCount, setStockCount] = useState(0);
  const [lowStockCount, setLowStockCount] = useState(0);
  const [orderCount, setOrderCount] = useState(0);
  const [inProgressOrderCount, setInProgressOrderCount] = useState(0);
  const [incomingOrderCount, setIncomingOrderCount] = useState(0);
  const [userCount, setUserCount] = useState(0);

  const handleAlertCountChange = useCallback((cnt) => {
    setAlertCount((prev) => (prev !== cnt ? cnt : prev));
  }, []);

  // Keep track of worker count & 5-day leaving alerts & stock counts & orders & users for nav badges
  useEffect(() => {
    if (!isAuthenticated) return;

    workerService
      .getWorkers()
      .then((res) => {
        if (res && res.data) {
          setWorkerCount(res.data.length);
          const alerts = res.data.filter((w) => isLeavingSoon(w.going_date)).length;
          setAlertCount(alerts);
        }
      })
      .catch(() => {});

    stockService
      .getItems()
      .then((res) => {
        if (res && res.data) {
          setStockCount(res.data.length);
          const low = res.data.filter((i) => Number(i.quantity) <= Number(i.min_alert_quantity)).length;
          setLowStockCount(low);
        }
      })
      .catch(() => {});

    const unsubStock = stockService.subscribeItems((items) => {
      setStockCount(items.length);
      const low = items.filter((i) => Number(i.quantity) <= Number(i.min_alert_quantity)).length;
      setLowStockCount(low);
    });

    const checkOrderCompleted = (order) => {
      const { total, done } = calculateOrderProgress(order);
      return order.status === 'Completed' || (total > 0 && done === total);
    };

    orderService
      .getOrders()
      .then((res) => {
        if (res && res.data) {
          setOrderCount(res.data.length);
          const incoming = res.data.filter((o) => o.status === 'Incoming').length;
          setIncomingOrderCount(incoming);
          const inProg = res.data.filter((o) => !checkOrderCompleted(o) && o.status !== 'Incoming' && o.status !== 'Cancelled').length;
          setInProgressOrderCount(inProg);
        }
      })
      .catch(() => {});

    const unsubOrders = orderService.subscribe((orders) => {
      setOrderCount(orders.length);
      const incoming = orders.filter((o) => o.status === 'Incoming').length;
      setIncomingOrderCount(incoming);
      const inProg = orders.filter((o) => !checkOrderCompleted(o) && o.status !== 'Incoming' && o.status !== 'Cancelled').length;
      setInProgressOrderCount(inProg);
    });

    let unsubUsers = () => {};
    if (isAdmin) {
      userService
        .getUsers()
        .then((res) => {
          if (res && res.data) {
            setUserCount(res.data.length);
          }
        })
        .catch(() => {});

      unsubUsers = userService.subscribeUsers((usersList) => {
        setUserCount(usersList.length);
      });
    }

    return () => {
      unsubStock();
      unsubOrders();
      unsubUsers();
    };
  }, [currentPage, isAuthenticated, isAdmin]);

  // Sync hash with browser history for Android back gesture / back button
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash;
      const targetPage = hash === '#workers' ? 'workers'
        : hash === '#orders' ? 'orders'
        : hash === '#quotations' ? (isAdmin ? 'quotations' : 'home')
        : hash === '#stock' ? 'stock'
        : hash === '#users' ? 'users'
        : 'home';

      setCurrentPage((prev) => {
        if (prev !== targetPage) {
          // Keep navigation stack in sync
          const stack = navStackRef.current;
          if (stack.length >= 2 && stack[stack.length - 2] === targetPage) {
            stack.pop();
          } else if (stack[stack.length - 1] !== targetPage) {
            stack.push(targetPage);
          }
          return targetPage;
        }
        return prev;
      });
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Native Android Capacitor hardware back button & status bar integration
  useEffect(() => {
    let backListener = null;

    import('@capacitor/app')
      .then(({ App: CapApp }) => {
        return CapApp.addListener('backButton', () => {
          // 1. Check if quick add modal is open
          if (isQuickAddOpen) {
            setIsQuickAddOpen(false);
            return;
          }

          // 2. Check if change password modal is open
          if (isChangePasswordOpen) {
            setIsChangePasswordOpen(false);
            return;
          }

          // 3. Priority 1: If any in-page modal / popup / dialog / lightbox is open, close it first
          const openModalCloseBtn = document.querySelector(
            '.order-photo-lightbox .lightbox-close, .order-photos-overlay .photos-close-btn, .order-job-sheet-modal .close-btn, .order-form-modal .cancel-btn, .worker-form-modal .cancel-btn, .android-dialog .btn-secondary, .modal-backdrop .btn-secondary, .modal-backdrop .btn-close, .modal-backdrop .close-btn, .btn-modal-close'
          );
          if (openModalCloseBtn) {
            openModalCloseBtn.click();
            return;
          }

          // 4. Priority 2: Step back in visited page history stack
          const stack = navStackRef.current;
          if (stack.length > 1) {
            stack.pop(); // remove current page
            const prevPage = stack[stack.length - 1] || 'home';
            setCurrentPage(prevPage);
            window.location.hash = prevPage === 'home' ? '#home' : `#${prevPage}`;
            window.scrollTo({ top: 0, behavior: 'smooth' });
            return;
          }

          // If on a page other than home and stack has no previous page, go back to home
          if (currentPage !== 'home') {
            navStackRef.current = ['home'];
            setCurrentPage('home');
            window.location.hash = '#home';
            window.scrollTo({ top: 0, behavior: 'smooth' });
            return;
          }

          // 5. Priority 3: At root Home screen - Double-tap back within 2 seconds to exit app
          const now = Date.now();
          if (now - lastBackPressTimeRef.current < 2000) {
            CapApp.exitApp();
          } else {
            lastBackPressTimeRef.current = now;
            setSnackbar({
              message: 'Press back again to exit (बाहर निकलने के लिए दोबारा Back दबाएं)',
              type: 'info',
            });
          }
        });
      })
      .then((handle) => {
        backListener = handle;
      })
      .catch(() => {});

    import('@capacitor/status-bar')
      .then(({ StatusBar, Style }) => {
        StatusBar.setStyle({ style: Style.Dark }).catch(() => {});
        StatusBar.setBackgroundColor({ color: '#090e1a' }).catch(() => {});
      })
      .catch(() => {});

    return () => {
      if (backListener && backListener.remove) backListener.remove();
    };
  }, [isQuickAddOpen, isChangePasswordOpen, currentPage]);

  const navigateTo = (page) => {
    if (page !== currentPage) {
      navStackRef.current.push(page);
    }
    setCurrentPage(page);
    window.location.hash = page === 'home' ? '#home' : `#${page}`;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleQuickAddSave = async (formData) => {
    try {
      await workerService.createWorker(formData);
      setSnackbar({
        message: `Worker "${formData.name}" added successfully!`,
        type: 'success',
      });
      setIsQuickAddOpen(false);
      // Navigate to workers page to see newly added worker
      navigateTo('workers');
    } catch (err) {
      const msg = err.response?.data?.message || 'Error saving worker';
      setSnackbar({ message: msg, type: 'error' });
      throw err;
    }
  };

  // 1. Splash loading state while verifying existing session
  if (authLoading) {
    return (
      <div className="auth-splash-loading">
        <div className="splash-logo-pulse">
          <svg width="42" height="42" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2.2">
            <path d="M10 17h4V5H2v12h3" />
            <path d="M20 17h2v-3.34a4 4 0 0 0-1.17-2.83L19 9h-5v8h1" />
            <circle cx="7.5" cy="17.5" r="2.5" />
            <circle cx="17.5" cy="17.5" r="2.5" />
          </svg>
        </div>
        <div className="splash-pulse-bar"></div>
        <span className="splash-text">Loading Faizan Body Portal...</span>
      </div>
    );
  }

  // 2. Unauthenticated: Show strictly Login screen (no register)
  if (!isAuthenticated) {
    return (
      <>
        <LoginPage onLoginSuccess={() => navigateTo('home')} />
        <Snackbar
          message={snackbar.message}
          type={snackbar.type}
          onClose={() => setSnackbar({ message: '', type: 'info' })}
        />
      </>
    );
  }

  // 3. Authenticated: Render Main App Shell
  return (
    <div className="app-root">
      {/* 1. Global Persistent Sticky Header */}
      <AppHeader
        onOpenChangePassword={() => setIsChangePasswordOpen(true)}
        onNotify={(msg, type) => setSnackbar({ message: msg, type })}
        onNavigate={navigateTo}
      />

      {/* 2. Main Page Content Shell */}
      <div className="android-app-shell">
        {currentPage === 'home' && (
          <HomePage
            onNavigate={navigateTo}
            onQuickAddWorker={() => {
              if (isAdmin) setIsQuickAddOpen(true);
            }}
          />
        )}

        {currentPage === 'orders' && (
          <OrdersPage
            onBackToHome={() => navigateTo('home')}
          />
        )}

        {currentPage === 'quotations' && isAdmin && (
          <QuotationsPage
            onBackToHome={() => navigateTo('home')}
          />
        )}

        {currentPage === 'stock' && (
          <StockPage
            onBackToHome={() => navigateTo('home')}
          />
        )}

        {currentPage === 'workers' && (
          <WorkersPage
            onBackToHome={() => navigateTo('home')}
            onNavigate={navigateTo}
            onAlertCountChange={handleAlertCountChange}
          />
        )}

        {currentPage === 'users' && isAdmin && (
          <UsersPage
            onBackToHome={() => navigateTo('home')}
          />
        )}

        {/* Global Bottom Navigation Bar */}
        <BottomNav
          activeTab={currentPage}
          onTabChange={navigateTo}
          workerCount={workerCount}
          alertCount={alertCount}
          stockCount={stockCount}
          lowStockCount={lowStockCount}
          orderCount={orderCount}
          inProgressOrderCount={inProgressOrderCount}
          incomingOrderCount={incomingOrderCount}
          userCount={userCount}
        />
      </div>

      {/* Quick Add Modal accessible from Home (Admin only) */}
      {isAdmin && (
        <WorkerFormModal
          isOpen={isQuickAddOpen}
          initialData={null}
          onClose={() => setIsQuickAddOpen(false)}
          onSave={handleQuickAddSave}
        />
      )}

      {/* Change Password Modal (Supports Current Password or Email OTP) */}
      <ChangePasswordModal
        isOpen={isChangePasswordOpen}
        onClose={() => setIsChangePasswordOpen(false)}
        onNotify={(msg, type) => setSnackbar({ message: msg, type })}
      />

      {/* Global Snackbar Toast */}
      <Snackbar
        message={snackbar.message}
        type={snackbar.type}
        onClose={() => setSnackbar({ message: '', type: 'info' })}
      />
    </div>
  );
}

export default App;
