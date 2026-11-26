import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { stockService } from '../../services/stockService';

/**
 * Stock Usage & Worker Rating Tab (inside StockPage)
 * Unified Worker-first view:
 * Each Worker card shows Rating (auto + 1-5 stars), overall stats,
 * and underneath, all Work Orders / Trucks they worked on with exact items & quantities taken,
 * plus a Return button to add unused material back into stock and deduct from worker tracking.
 */
export function StockUsageTab({ canRate = true, searchQuery = '', onNotify }) {
  const [data, setData] = useState({ transactions: [], byOrder: [], byWorker: [] });
  const [loading, setLoading] = useState(true);
  const [expandedKey, setExpandedKey] = useState(null);
  const [savingWorkerId, setSavingWorkerId] = useState(null);

  // Return modal state
  const [returningTx, setReturningTx] = useState(null); // { worker, ord, item, maxReturnable }
  const [returnQty, setReturnQty] = useState('');
  const [returnDate, setReturnDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [returnNote, setReturnNote] = useState('');
  const [isReturning, setIsReturning] = useState(false);

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

  const openReturnModal = (worker, ord, item, maxReturnable) => {
    setReturningTx({ worker, ord, item, maxReturnable });
    setReturnQty(String(maxReturnable));
    setReturnDate(new Date().toISOString().split('T')[0]);
    setReturnNote('');
  };

  const handleConfirmReturn = async (e) => {
    e.preventDefault();
    if (!returningTx || isReturning) return;

    const qty = parseFloat(returnQty);
    if (!qty || qty <= 0) {
      if (onNotify) onNotify('Valid return quantity enter karo', 'error');
      return;
    }
    if (qty > returningTx.maxReturnable) {
      if (onNotify) onNotify(`Max returnable quantity is ${returningTx.maxReturnable}`, 'error');
      return;
    }

    try {
      setIsReturning(true);
      const { worker, item } = returningTx;
      await stockService.adjustStock(item.item_id, {
        type: 'RETURN',
        quantity: qty,
        date: returnDate,
        reference_note: returnNote.trim() || `Returned by ${worker.worker_name}`,
        worker_id: worker.worker_id || item.worker_id || null,
        worker_name: worker.worker_name || item.worker_name || null,
        order_id: item.order_id || null,
        order_no: item.order_no || null,
        truck_chassis_no: item.truck_chassis_no || null,
      });

      if (onNotify) {
        onNotify(`✓ +${qty} ${item.unit} ${item.item_name} stock ma vapas add thai gayu!`, 'success');
      }
      setReturningTx(null);
      await loadUsage();
    } catch (err) {
      if (onNotify) onNotify(err.response?.data?.message || 'Error returning stock', 'error');
    } finally {
      setIsReturning(false);
    }
  };

  const filteredWorkers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const list = data.byWorker || [];
    const matched = !q
      ? list
      : list.filter(
          (w) =>
            w.worker_name?.toLowerCase().includes(q) ||
            (w.items || []).some(
              (it) =>
                it.item_name?.toLowerCase().includes(q) ||
                it.truck_chassis_no?.toLowerCase().includes(q) ||
                it.order_no?.toLowerCase().includes(q)
            )
        );

    // Group each worker's items by Work Order / Truck, netting OUT - RETURN
    return matched.map((w) => {
      const orderGroupsMap = new Map();
      (w.items || []).forEach((it) => {
        const hasOrder = it.order_id || it.order_no || it.truck_chassis_no;
        const oKey = hasOrder
          ? it.order_id
            ? `id:${it.order_id}`
            : `no:${it.order_no || it.truck_chassis_no}`
          : '__general__';

        if (!orderGroupsMap.has(oKey)) {
          orderGroupsMap.set(oKey, {
            key: oKey,
            order_no: it.order_no || '',
            truck_chassis_no: it.truck_chassis_no || '',
            total_quantity: 0,
            items: [],
            netByItemId: new Map(),
          });
        }
        const og = orderGroupsMap.get(oKey);
        const sign = it.type === 'RETURN' ? -1 : 1;
        const qty = Number(it.quantity) || 0;
        og.total_quantity = Math.max(0, og.total_quantity + sign * qty);
        og.netByItemId.set(it.item_id, (og.netByItemId.get(it.item_id) || 0) + sign * qty);
        og.items.push(it);
      });

      const ordersBreakdown = Array.from(orderGroupsMap.values()).map((og) => ({
        ...og,
        total_quantity: Number(og.total_quantity.toFixed(2)),
      }));

      return {
        ...w,
        ordersBreakdown,
      };
    });
  }, [data.byWorker, searchQuery]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
      {/* Header row with count & refresh */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '0.5rem',
        }}
      >
        <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#1e293b' }}>
          👷 Workers Material Usage & Rating ({filteredWorkers.length})
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
          <p className="loading-text">Loading worker usage & ratings...</p>
        </div>
      ) : filteredWorkers.length === 0 ? (
        <div className="empty-workers-state">
          <h3>No Worker Stock Usage Yet</h3>
          <p>
            જ્યારે તમે <strong>- Stock OUT</strong> કરો ત્યારે <strong>Worker</strong> અને <strong>Work Order / ગાડી</strong> પસંદ કરશો એટલે અહીં દરેક કારીગર મુજબ ઓર્ડર અને વસ્તુઓનો પૂરો હિસાબ દેખાશે.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          {filteredWorkers.map((w) => {
            const key = `w-${w.worker_id || w.worker_name}`;
            const isOpen = expandedKey === key || filteredWorkers.length === 1;
            const activeRating = w.manual_rating || Math.round(w.efficiency_score || 5);

            return (
              <div
                key={key}
                style={{
                  background: '#ffffff',
                  borderRadius: '14px',
                  border: w.is_top_saver ? '1.5px solid #22c55e' : '1px solid #e2e8f0',
                  padding: '0.95rem 1rem',
                  boxShadow: '0 2px 6px rgba(15, 23, 42, 0.04)',
                }}
              >
                {/* Worker Top Header + Star Rating */}
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
                      <strong style={{ fontSize: '1.02rem', color: '#0f172a' }}>👷 {w.worker_name}</strong>
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

                    <div
                      style={{
                        fontSize: '0.8rem',
                        color: '#475569',
                        marginTop: '0.35rem',
                        display: 'flex',
                        gap: '0.9rem',
                        flexWrap: 'wrap',
                      }}
                    >
                      <span>Orders: <strong>{w.orders_count}</strong></span>
                      <span>Net Qty: <strong>{w.total_quantity}</strong></span>
                      <span>Avg / Order: <strong>{w.avg_qty_per_order}</strong></span>
                      <span>Pickups: <strong>{w.tx_count}</strong></span>
                    </div>
                  </div>

                  {/* Interactive 1-5 Star Rating */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '3px' }}>
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

                {/* Toggle button when multiple workers */}
                {filteredWorkers.length > 1 && (
                  <div style={{ marginTop: '0.6rem', display: 'flex', justifyContent: 'flex-end' }}>
                    <button
                      type="button"
                      className="btn btn-secondary stock-action-btn-compact"
                      onClick={() => setExpandedKey(isOpen ? null : key)}
                    >
                      {isOpen
                        ? 'Hide Orders ▲'
                        : `Orders & Items (${w.ordersBreakdown.length}) ▼`}
                    </button>
                  </div>
                )}

                {/* Orders & Items Breakdown right inside the Worker card */}
                {isOpen && (
                  <div
                    style={{
                      marginTop: '0.75rem',
                      borderTop: '1px dashed #e2e8f0',
                      paddingTop: '0.7rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.65rem',
                    }}
                  >
                    {w.ordersBreakdown.map((ord) => (
                      <div
                        key={ord.key}
                        style={{
                          background: '#f8fafc',
                          border: '1px solid #e2e8f0',
                          borderRadius: '10px',
                          padding: '0.65rem 0.75rem',
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            flexWrap: 'wrap',
                            gap: '0.4rem',
                            marginBottom: '0.45rem',
                          }}
                        >
                          <div style={{ fontSize: '0.84rem', fontWeight: 700, color: '#0f172a' }}>
                            {ord.key === '__general__' ? (
                              '📦 General / No Order'
                            ) : (
                              <>
                                🚛 {ord.truck_chassis_no || ord.order_no}
                                {ord.truck_chassis_no && ord.order_no && (
                                  <span style={{ fontWeight: 500, color: '#64748b', marginLeft: '6px', fontSize: '0.76rem' }}>
                                    ({ord.order_no})
                                  </span>
                                )}
                              </>
                            )}
                          </div>
                          <span
                            style={{
                              fontSize: '0.74rem',
                              fontWeight: 700,
                              padding: '2px 8px',
                              borderRadius: '999px',
                              background: '#fee2e2',
                              color: '#b91c1c',
                            }}
                          >
                            Net Used: {ord.total_quantity} Qty
                          </span>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                          {ord.items.map((it) => {
                            const isRet = it.type === 'RETURN';
                            const netForThisItem = Math.max(0, Number((ord.netByItemId.get(it.item_id) || 0).toFixed(2)));
                            const maxRet = Math.min(Number(it.quantity) || 0, netForThisItem);

                            return (
                              <div
                                key={it.id}
                                style={{
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  alignItems: 'center',
                                  gap: '0.5rem',
                                  fontSize: '0.81rem',
                                  background: isRet ? '#f0fdf4' : '#ffffff',
                                  padding: '0.45rem 0.65rem',
                                  borderRadius: '7px',
                                  border: `1px solid ${isRet ? '#bbf7d0' : '#f1f5f9'}`,
                                }}
                              >
                                <div>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                                    <strong style={{ color: '#1e293b' }}>{it.item_name}</strong>
                                    {isRet && (
                                      <span
                                        style={{
                                          fontSize: '0.68rem',
                                          fontWeight: 700,
                                          padding: '1px 6px',
                                          borderRadius: '4px',
                                          background: '#dcfce7',
                                          color: '#15803d',
                                        }}
                                      >
                                        ↩ Returned
                                      </span>
                                    )}
                                  </div>
                                  <div style={{ fontSize: '0.73rem', color: '#64748b' }}>
                                    {it.date}
                                    {it.reference_note && ` • ${it.reference_note}`}
                                  </div>
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                  <strong style={{ color: isRet ? '#15803d' : '#dc2626' }}>
                                    {isRet ? '+' : '-'}{it.quantity} {it.unit}
                                  </strong>

                                  {!isRet && canRate && maxRet > 0 && (
                                    <button
                                      type="button"
                                      onClick={() => openReturnModal(w, ord, it, maxRet)}
                                      title="Return unused quantity back to stock"
                                      style={{
                                        fontSize: '0.72rem',
                                        fontWeight: 700,
                                        padding: '3px 8px',
                                        borderRadius: '6px',
                                        border: '1px solid #86efac',
                                        background: '#f0fdf4',
                                        color: '#15803d',
                                        cursor: 'pointer',
                                      }}
                                    >
                                      ↩ Return
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Return Unused Stock Modal */}
      {returningTx && (
        <div className="stock-modal-overlay" onClick={() => !isReturning && setReturningTx(null)}>
          <div
            className="stock-modal-card modal-sm"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="stock-modal-header">
              <div className="stock-header-title-box">
                <span
                  className="stock-header-badge"
                  style={{ background: '#dcfce7', color: '#166534', borderColor: '#bbf7d0' }}
                >
                  ↩ Return to Stock
                </span>
                <h2 className="stock-header-title">{returningTx.item.item_name}</h2>
                <p className="stock-header-subtitle">
                  👷 {returningTx.worker.worker_name} • Max Returnable: <strong>{returningTx.maxReturnable} {returningTx.item.unit}</strong>
                </p>
              </div>
              <button
                type="button"
                className="stock-close-circle-btn"
                onClick={() => !isReturning && setReturningTx(null)}
                aria-label="Close modal"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleConfirmReturn} className="stock-modal-form-shell">
              <div className="stock-modal-body">
                <div className="form-group" style={{ marginBottom: '1rem' }}>
                  <label className="form-label" style={{ fontWeight: 600 }}>
                    Return Quantity ({returningTx.item.unit}) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    max={returningTx.maxReturnable}
                    className="form-input"
                    value={returnQty}
                    onChange={(e) => setReturnQty(e.target.value)}
                    disabled={isReturning}
                    autoFocus
                    required
                  />
                </div>

                <div className="form-group" style={{ marginBottom: '1rem' }}>
                  <label className="form-label" style={{ fontWeight: 600 }}>
                    Return Date
                  </label>
                  <input
                    type="date"
                    className="form-input"
                    value={returnDate}
                    onChange={(e) => setReturnDate(e.target.value)}
                    disabled={isReturning}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 600 }}>
                    Note (Optional)
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Unused material returned"
                    value={returnNote}
                    onChange={(e) => setReturnNote(e.target.value)}
                    disabled={isReturning}
                  />
                </div>
              </div>

              <div className="stock-modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setReturningTx(null)}
                  disabled={isReturning}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={isReturning}
                  style={{ background: '#16a34a', borderColor: '#16a34a' }}
                >
                  {isReturning ? 'Saving...' : '✓ Add Back to Stock'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default StockUsageTab;
