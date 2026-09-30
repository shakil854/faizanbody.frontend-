import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { ApiConfigBanner } from './components/ApiConfigBanner';
import { ApiTester } from './components/ApiTester';
import { SampleItemsList } from './components/SampleItemsList';
import { StructureViewer } from './components/StructureViewer';
import { healthService } from './services/healthService';
import './App.css';

export function App() {
  const [isBackendOnline, setIsBackendOnline] = useState(false);

  useEffect(() => {
    // Initial health check on page load
    healthService
      .checkHealth()
      .then(() => setIsBackendOnline(true))
      .catch(() => setIsBackendOnline(false));
  }, []);

  return (
    <div className="app-layout">
      {/* 1. Header */}
      <Navbar isBackendOnline={isBackendOnline} />

      {/* 2. Main Content Container */}
      <main className="main-content">
        {/* Banner with Live API guide */}
        <ApiConfigBanner />

        {/* Live Interaction & Test Console */}
        <div className="dashboard-grid">
          <ApiTester onHealthUpdate={setIsBackendOnline} />
          <SampleItemsList />
        </div>

        {/* Project Architecture Structure Overview */}
        <section className="section-block">
          <div className="section-header">
            <h3>Project Architecture (Senior Software Engineer Directory Setup)</h3>
            <p>Both repositories are set up with production-grade modular separation.</p>
          </div>
          <StructureViewer />
        </section>
      </main>

      {/* 3. Footer */}
      <footer className="footer">
        <p>FaizanBody Full-Stack Architecture • Node.js (Express) + Vite (React) + Centralized Axios</p>
      </footer>
    </div>
  );
}

export default App;
