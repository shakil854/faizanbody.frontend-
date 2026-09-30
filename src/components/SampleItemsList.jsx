import React, { useEffect, useState } from 'react';
import { Truck, CheckCircle, Clock, AlertTriangle, RefreshCw } from 'lucide-react';
import { sampleService } from '../services/sampleService';

export const SampleItemsList = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchItems = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await sampleService.getItems();
      setItems(response.data || []);
    } catch (err) {
      setError('Could not load sample data. Is the backend running?');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  return (
    <div className="items-card">
      <div className="items-card-header">
        <div className="card-header-left">
          <Truck size={20} className="header-icon" />
          <div>
            <h3 className="card-title">Live Backend Data (Vehicle / Body Models)</h3>
            <p className="card-subtitle">Data fetched via centralized <code>sampleService.getItems()</code></p>
          </div>
        </div>
        <button className="btn btn-sm" onClick={fetchItems} disabled={loading}>
          <RefreshCw size={14} className={loading ? 'spin-icon' : ''} />
          <span>Refresh</span>
        </button>
      </div>

      {loading && (
        <div className="loading-state">
          <RefreshCw size={24} className="spin-icon" />
          <p>Connecting to backend API...</p>
        </div>
      )}

      {error && !loading && (
        <div className="error-state">
          <AlertTriangle size={24} />
          <p>{error}</p>
          <button className="btn btn-secondary btn-sm" onClick={fetchItems}>Retry</button>
        </div>
      )}

      {!loading && !error && items.length > 0 && (
        <div className="items-grid">
          {items.map((item) => (
            <div key={item.id} className="item-box">
              <div className="item-header">
                <span className="item-id">#{item.id}</span>
                <span className={`item-badge ${item.status.toLowerCase().replace(' ', '-')}`}>
                  {item.status === 'Active' ? <CheckCircle size={12} /> : <Clock size={12} />}
                  {item.status}
                </span>
              </div>
              <h4 className="item-name">{item.name}</h4>
              <span className="item-category">Category: <strong>{item.category}</strong></span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
