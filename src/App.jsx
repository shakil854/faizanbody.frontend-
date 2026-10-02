import React, { useState, useEffect } from 'react';
import { useAuth } from './context/AuthContext';
import { LoginPage } from './components/auth/LoginPage';
import { ChangePasswordModal } from './components/auth/ChangePasswordModal';
import { AppHeader } from './components/common/AppHeader';
import { HomePage } from './components/home/HomePage';
import { WorkersPage } from './components/workers/WorkersPage';
import { OrdersPage } from './components/orders/OrdersPage';
import { WorkerFormModal } from './components/workers/WorkerFormModal';
import { Snackbar } from './components/workers/Snackbar';
import { BottomNav } from './components/common/BottomNav';
import { workerService } from './services/workerService';
import { isLeavingSoon } from './utils/dateAlerts';
import './App.css';

export function App() {
  const { isAuthenticated, loading: authLoading, isAdmin } = useAuth();

  const [currentPage, setCurrentPage] = useState(() => {
    const hash = window.location.hash;
    if (hash === '#workers') return 'workers';
    if (hash === '#orders') return 'orders';
    return 'home';
  });

  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const [snackbar, setSnackbar] = useState({ message: '', type: 'info' });
  const [workerCount, setWorkerCount] = useState(0);
  const [alertCount, setAlertCount] = useState(0);

  // Keep track of worker count & 5-day leaving alerts for nav badge
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
  }, [currentPage, isAuthenticated]);

  // Sync hash with browser history for Android back gesture / back button
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash;
      if (hash === '#workers') setCurrentPage('workers');
      else if (hash === '#orders') setCurrentPage('orders');
      else setCurrentPage('home');
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const navigateTo = (page) => {
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

        {currentPage === 'workers' && (
          <WorkersPage
            onBackToHome={() => navigateTo('home')}
            onNavigate={navigateTo}
            onAlertCountChange={(cnt) => setAlertCount(cnt)}
          />
        )}

        {/* Global Bottom Navigation Bar */}
        <BottomNav
          activeTab={currentPage}
          onTabChange={navigateTo}
          workerCount={workerCount}
          alertCount={alertCount}
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
