import React, { useState } from 'react';
import { Activity, RefreshCw, CheckCircle2, AlertCircle, Database, Clock } from 'lucide-react';
import { healthService } from '../services/healthService';
import { sampleService } from '../services/sampleService';

export const ApiTester = ({ onHealthUpdate }) => {
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState(null);
  const [error, setError] = useState(null);
  const [latency, setLatency] = useState(null);
  const [lastAction, setLastAction] = useState('');

  const testHealthEndpoint = async () => {
    setLoading(true);
    setError(null);
    setLastAction('Health Check (/health)');
    const start = performance.now();

    try {
      const data = await healthService.checkHealth();
      const end = performance.now();
      setLatency(Math.round(end - start));
      setResponse(data);
      if (onHealthUpdate) onHealthUpdate(true);
    } catch (err) {
      const end = performance.now();
      setLatency(Math.round(end - start));
      setError(err.message || 'API request failed');
      setResponse(err.response?.data || null);
      if (onHealthUpdate) onHealthUpdate(false);
    } finally {
      setLoading(false);
    }
  };

  const testItemsEndpoint = async () => {
    setLoading(true);
    setError(null);
    setLastAction('Sample Items (/items)');
    const start = performance.now();

    try {
      const data = await sampleService.getItems();
      const end = performance.now();
      setLatency(Math.round(end - start));
      setResponse(data);
      if (onHealthUpdate) onHealthUpdate(true);
    } catch (err) {
      const end = performance.now();
      setLatency(Math.round(end - start));
      setError(err.message || 'API request failed');
      setResponse(err.response?.data || null);
      if (onHealthUpdate) onHealthUpdate(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="tester-card">
      <div className="card-header">
        <div className="card-header-left">
          <Activity size={20} className="icon-pulse" />
          <h3 className="card-title">Live API Test Console</h3>
        </div>
        {latency !== null && (
          <span className="latency-badge">
            <Clock size={12} /> {latency} ms
          </span>
        )}
      </div>

      <p className="card-desc">
        Click below to test live API calls through the centralized Axios instance:
      </p>

      <div className="button-group">
        <button
          className="btn btn-primary"
          onClick={testHealthEndpoint}
          disabled={loading}
          id="btn-test-health"
        >
          {loading && lastAction.includes('Health') ? (
            <RefreshCw size={16} className="spin-icon" />
          ) : (
            <Activity size={16} />
          )}
          <span>Ping /health Endpoint</span>
        </button>

        <button
          className="btn btn-secondary"
          onClick={testItemsEndpoint}
          disabled={loading}
          id="btn-test-items"
        >
          {loading && lastAction.includes('Items') ? (
            <RefreshCw size={16} className="spin-icon" />
          ) : (
            <Database size={16} />
          )}
          <span>Fetch /items Endpoint</span>
        </button>
      </div>

      {/* Response Box */}
      <div className="response-container">
        <div className="response-header">
          <span>{lastAction ? `Response for: ${lastAction}` : 'Console Output:'}</span>
          {response && !error && (
            <span className="status-pill success">
              <CheckCircle2 size={12} /> 200 OK
            </span>
          )}
          {error && (
            <span className="status-pill error">
              <AlertCircle size={12} /> Failed
            </span>
          )}
        </div>

        <pre className="response-body">
          {loading
            ? 'Fetching live data from backend...'
            : response
            ? JSON.stringify(response, null, 2)
            : error
            ? `Error: ${error}\nTip: Make sure the backend server is running on port 5000.`
            : 'Click one of the buttons above to test live API response.'}
        </pre>
      </div>
    </div>
  );
};
