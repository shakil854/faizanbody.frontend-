import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { stockService } from '../../services/stockService';

/**
 * Stock Usage & Worker Rating Analytics Tab (inside StockPage)
 * Tracks which worker took which material for which Work Order / Truck,
 * and ranks/rates workers who use less material per order.
 */
export function StockUsageTab({ canRate = true, searchQuery = '', onNotify }) {
  const [subTab, setSubTab] = useState('workers'); // 'workers' | 'orders'
  const [data, setData] = useState({ transactions: [], byOrder: [], byWorker: [] });
  const [loading, setLoading] = useState(true);
  const [expandedKey, setExpandedKey] = useState(null);
  const [savingWorkerId, setSavingWorkerId] = useState(null);

  const loadUsage = useCallback(async () => {
    try {
      setLoading(true);
      const res = await stockService.getUsageAnalytics();
      if (res?.data) {
        setData(res.data);
      }
    } catch (err) {
      console.error('Failed to load stock usage analytics:', err);
      if (onNotify) onNotify('Failed to load usage report', 'error');
    } finally {
      setLoading(false);
    }
  }, [onNotify]);

  useEffect(() => {
    loadUsage();
  }, [loadUsage]);

  const handleRateWorker = async (workerId, rating) => {
    if (!workerId || savingWorkerId) return;
    try {
      setSavingWorkerId(workerId);
      await stockService.saveWorkerRating(workerId, rating);
      setData((prev) => ({
        ...prev,
        byWorker: prev.byWorker.map((w) =>
          w.worker_id === workerId ? { ...w, manual_rating: rating } : w
        ),
      }));
      if (onNotify) onNotify(`★ ${rating}/5 rating saved!`, 'success');
    } catch (err) {
      if (onNotify) onNotify(err.response?.data?.message || 'Error saving rating', 'error');
    } finally {
      setSavingWorkerId(null);
    }
  };

  const filteredWorkers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return data.byWorker || [];
    return (data.byWorker || []).filter(
      (w) =>
        w.worker_name?.toLowerCase().includes(q) ||
        (w.items || []).some(
          (it) =>
            it.item_name?.toLowerCase().includes(q) ||
            it.truck_chassis_no?.toLowerCase().includes(q) ||
            it.order_no?.toLowerCase().includes(q)
        )
    );
  }, [data.byWorker, searchQuery]);

  const filteredOrders = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return data.byOrder || [];
    return (data.byOrder || []).filter(
      (o) =>
        o.truck_chassis_no?.toLowerCase().includes(q) ||
        o.order_no?.toLowerCase().includes(q) ||
        (o.workers || []).some((wn) => wn.toLowerCase().includes(q)) ||
        (o.items || []).some((it) => it.item_name?.toLowerCase().includes(q))
    );
  }, [data.byOrder, searchQuery]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
      {/* Sub-tabs: Workers Rating vs Work Orders */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '0.5rem',
        }}
      >
        <div
          style={{
            display: 'inline-flex',
            background: '#f1f5f9',
            padding: '4px',
            borderRadius: '10px',
            gap: '4px',
          }}
        >
          <button
            type="button"
            className={`view-mode-btn ${subTab === 'workers' ? 'active' : ''}`}
            onClick={() => {
              setSubTab('workers');
              setExpandedKey(null);
            }}
          >
            👷 Workers & Rating ({filteredWorkers.length})
          </button>
          <button
            type="button"
            className={`view-mode-btn ${subTab === 'orders' ? 'active' : ''}`}
            onClick={() => {
              setSubTab('orders');
              setExpandedKey(null);
            }}
          >
            🚛 Work Orders / ગાડી ({filteredOrders.length})
          </button>
        </div>

        <button
          type="button"
          className="btn btn-secondary stock-action-btn-compact"
          onClick={loadUsage}
          disabled={loading}
          title="Refresh Usage Report"
        >
          ↻ Refresh
        </button>
      </div>

      {loading ? (
        <div className="loading-state-container">
          <div className="splash-pulse-bar"></div>
          <p className="loading-text">Loading material usage & ratings...</p>
        </div>
      ) : subTab === 'workers' ? (
        filteredWorkers.length === 0 ? (
          <div className="empty-workers-state">
            <h3>No Worker Stock Usage Yet</h3>
            <p>
              જ્યારે તમે <strong>- Stock OUT</strong> કરો ત્યારે <strong>Worker</strong> પસંદ કરશો એટલે અહીં દરેક Worker નો વપરાશ અને Rating દેખાશે.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {filteredWorkers.map((w) => {
              const key = `w-${w.worker_id || w.worker_name}`;
              const isOpen = expandedKey === key;
              const activeRating = w.manual_rating || Math.round(w.efficiency_score || 5);

              return (
                <div
                  key={key}
                  style={{
                    background: '#ffffff',
                    borderRadius: '14px',
                    border: w.is_top_saver ? '1.5px solid #22c55e' : '1px solid #e2e8f0',
                    padding: '0.9rem 1rem',
                    boxShadow: '0 2px 6px rgba(15, 23, 42, 0.04)',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      gap: '0.75rem',
                      flexWrap: 'wrap',
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <strong style={{ fontSize: '1rem', color: '#0f172a' }}>👷 {w.worker_name}</strong>
                        {w.is_top_saver && (
                          <span
                            style={{
                              fontSize: '0.7rem',
                              fontWeight: 700,
                              padding: '2px 8px',
                              borderRadius: '999px',
                              background: '#dcfce7',
                              color: '#15803d',
                              border: '1px solid #86efac',
                            }}
                          >
                            🏆 Top Saver (કમ વપરાશ)
                          </span>
                        )}
                        <span
                          style={{
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            padding: '2px 8px',
                            borderRadius: '999px',
                            background: '#eff6ff',
                            color: '#1d4ed8',
                          }}
                        >
                          Auto Score: {w.efficiency_score} ★
                        </span>
                      </div>

                      <div style={{ fontSize: '0.8rem', color: '#475569', marginTop: '0.35rem', display: 'flex', gap: '0.9rem', flexWrap: 'wrap' }}>
                        <span>Orders: <strong>{w.orders_count}</strong></span>
                        <span>Total Qty: <strong>{w.total_quantity}</strong></span>
                        <span>Avg / Order: <strong>{w.avg_qty_per_order}</strong></span>
                        <span>Pickups: <strong>{w.tx_count}</strong></span>
                      </div>
                    </div>

                    {/* Interactive 1-5 Star Rating */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                        {[1, 2, 3, 4, 5].map((star) => {
                          const filled = star <= activeRating;
                          return (
                            <button
                              key={star}
                              type="button"
                              disabled={!canRate || !w.worker_id || savingWorkerId === w.worker_id}
                              onClick={() => handleRateWorker(w.worker_id, star)}
                              title={`Give ${star} Star Rating`}
                              style={{
                                background: 'transparent',
                                border: 'none',
                                cursor: canRate && w.worker_id ? 'pointer' : 'default',
                                fontSize: '1.25rem',
                                lineHeight: 1,
                                padding: '2px',
                                color: filled ? '#f59e0b' : '#cbd5e1',
                              }}
                            >
                              ★
                            </button>
                          );
                        })}
                      </div>
                      <span style={{ fontSize: '0.7rem', color: '#64748b' }}>
                        {w.manual_rating ? `Admin Rating: ${w.manual_rating}/5` : 'Tap ★ to rate'}
                      </span>
                    </div>
                  </div>

                  <div style={{ marginTop: '0.6rem', display: 'flex', justifyContent: 'flex-end' }}>
                    <button
                      type="button"
                      className="btn btn-secondary stock-action-btn-compact"
                      onClick={() => setExpandedKey(isOpen ? null : key)}
                    >
                      {isOpen ? 'Hide Items ▲' : `View Items (${w.items.length}) ▼`}
                    </button>
                  </div>

                  {isOpen && (
                    <div style={{ marginTop: '0.65rem', borderTop: '1px dashed #e2e8f0', paddingTop: '0.6rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                      {w.items.map((it) => (
                        <div
                          key={it.id}
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            fontSize: '0.82rem',
                            background: '#f8fafc',
                            padding: '0.45rem 0.65rem',
                            borderRadius: '8px',
                          }}
                        >
                          <div>
                            <strong style={{ color: '#0f172a' }}>{it.item_name}</strong>
                            <div style={{ fontSize: '0.74rem', color: '#64748b' }}>
                              {it.date}
                              {(it.truck_chassis_no || it.order_no) && ` • 🚛 ${it.truck_chassis_no || it.order_no}`}
                              {it.reference_note && ` • ${it.reference_note}`}
                            </div>
                          </div>
                          <strong style={{ color: '#dc2626' }}>
                            -{it.quantity} {it.unit}
                          </strong>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )
      ) : filteredOrders.length === 0 ? (
        <div className="empty-workers-state">
          <h3>No Order Material Usage Yet</h3>
          <p>
            જ્યારે <strong>- Stock OUT</strong> કરતી વખતે <strong>Work Order / ગાડી</strong> પસંદ કરશો ત્યારે અહીં દરેક ગાડીનો સામાન હિસાબ દેખાશે.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {filteredOrders.map((o) => {
            const key = `o-${o.order_id || o.order_no}`;
            const isOpen = expandedKey === key;

            return (
              <div
                key={key}
                style={{
                  background: '#ffffff',
                  borderRadius: '14px',
                  border: '1px solid #e2e8f0',
                  padding: '0.9rem 1rem',
                  boxShadow: '0 2px 6px rgba(15, 23, 42, 0.04)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div>
                    <strong style={{ fontSize: '1rem', color: '#0f172a' }}>
                      🚛 {o.truck_chassis_no !== '-' ? o.truck_chassis_no : o.order_no}
                    </strong>
                    <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '2px' }}>
                      Order: <strong>{o.order_no}</strong> • Total Qty: <strong>{o.total_quantity}</strong> • Entries: <strong>{o.tx_count}</strong>
                      {o.workers?.length > 0 && ` • Workers: ${o.workers.join(', ')}`}
                    </div>
                  </div>
                  <button
                    type="button"
                    className="btn btn-secondary stock-action-btn-compact"
                    onClick={() => setExpandedKey(isOpen ? null : key)}
                  >
                    {isOpen ? 'Hide ▲' : `Items (${o.items.length}) ▼`}
                  </button>
                </div>

                {isOpen && (
                  <div style={{ marginTop: '0.65rem', borderTop: '1px dashed #e2e8f0', paddingTop: '0.6rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    {o.items.map((it) => (
                      <div
                        key={it.id}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          fontSize: '0.82rem',
                          background: '#f8fafc',
                          padding: '0.45rem 0.65rem',
                          borderRadius: '8px',
                        }}
                      >
                        <div>
                          <strong style={{ color: '#0f172a' }}>{it.item_name}</strong>
                          <div style={{ fontSize: '0.74rem', color: '#64748b' }}>
                            {it.date}
                            {it.worker_name && ` • 👷 ${it.worker_name}`}
                            {it.reference_note && ` • ${it.reference_note}`}
                          </div>
                        </div>
                        <strong style={{ color: '#dc2626' }}>
                          -{it.quantity} {it.unit}
                        </strong>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default StockUsageTab;
