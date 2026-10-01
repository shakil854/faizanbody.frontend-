import React, { useState, useEffect } from 'react';
import { HomePage } from './components/home/HomePage';
import { WorkersPage } from './components/workers/WorkersPage';
import { WorkerFormModal } from './components/workers/WorkerFormModal';
import { Snackbar } from './components/workers/Snackbar';
import { BottomNav } from './components/common/BottomNav';
import { workerService } from './services/workerService';
import './App.css';

export function App() {
  const [currentPage, setCurrentPage] = useState(() => {
    return window.location.hash === '#workers' ? 'workers' : 'home';
  });

  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [snackbar, setSnackbar] = useState({ message: '', type: 'info' });

  // Sync hash with browser history for Android back gesture / back button
  useEffect(() => {
    const handleHashChange = () => {
      const page = window.location.hash === '#workers' ? 'workers' : 'home';
      setCurrentPage(page);
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const navigateTo = (page) => {
    setCurrentPage(page);
    window.location.hash = page === 'workers' ? '#workers' : '#home';
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

  return (
    <div className="app-root">
      {/* Page Routing */}
      {currentPage === 'home' ? (
        <div className="android-app-shell">
          <HomePage
            onNavigate={navigateTo}
            onQuickAddWorker={() => setIsQuickAddOpen(true)}
          />

          {/* Android Mobile Bottom Navigation Bar (2 Tabs: Home and Workers) */}
          <BottomNav activeTab="home" onTabChange={navigateTo} />
        </div>
      ) : (
        <WorkersPage
          onBackToHome={() => navigateTo('home')}
          onNavigate={navigateTo}
        />
      )}

      {/* Quick Add Modal accessible from Home */}
      <WorkerFormModal
        isOpen={isQuickAddOpen}
        initialData={null}
        onClose={() => setIsQuickAddOpen(false)}
        onSave={handleQuickAddSave}
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
