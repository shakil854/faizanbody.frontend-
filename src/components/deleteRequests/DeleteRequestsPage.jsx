import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useDeleteRequest } from '../../context/DeleteRequestContext';
import { deleteRequestService } from '../../services/deleteRequestService';

const MODULE_LABELS = {
  work_order: '🚛 Work Order',
  work_order_photo: '📷 Order Photo',
  work_order_all_photos: '🖼️ All Order Photos',
  worker: '👷 Worker',
  worker_transaction: '💰 Worker Khata Entry',
  truck_account: '🚚 Truck Account',
  truck_account_entry: '📒 Truck Khata Entry',
  vyapari_account: '🏪 Vyapari Account',
  vyapari_entry: '🧾 Vyapari Entry',
  rojmed_entry: '📖 Rojmed Entry',
  upi_account: '📱 UPI Account',
  upi_entry: '💳 UPI Rojmed Entry',
  stock_item: '🔩 Stock Item',
  stock_category: '📂 Stock Category',
  quotation: '📑 Quotation',
};

export function DeleteRequestsPage({ onBackToHome, onNotify }) {
  const { isAdmin } = useAuth();
  const { refreshPending } = useDeleteRequest();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('pending'); // 'pending' | 'approved' | 'rejected' | 'all'
  const [processingId, setProcessingId] = useState(null);
  const [rejectModalItem, setRejectModalItem] = useState(null);
  const [rejectNote, setRejectNote] = useState('');

  const loadRequests = useCallback(async () => {
    try {
      setLoading(true);
      const data = await deleteRequestService.listRequests();
      setRequests(Array.isArray(data) ? data : []);
      refreshPending();
    } catch (err) {
      onNotify?.('Failed to load delete requests', 'error');
    } finally {
      setLoading(false);
    }
  }, [onNotify, refreshPending]);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  const handleApprove = async (item) => {
    if (!window.confirm(`શું તમે "${item.entity_label}" ડિલીટ કરવાની રિક્વેસ્ટ મંજૂર (Accept) કરવા માંગો છો? આનાથી રેકોર્ડ કાયમી ડિલીટ થઈ જશે.`)) {
      return;
    }
    try {
      setProcessingId(item.id);
      await deleteRequestService.approveRequest(item.id);
      onNotify?.(`✓ મંજૂર થયું! "${item.entity_label}" ડિલીટ કરી દેવાયું છે.`, 'success');
      await loadRequests();
    } catch (err) {
      const msg = err?.response?.data?.message || 'Error approving delete request';
      onNotify?.(msg, 'error');
    } finally {
      setProcessingId(null);
    }
  };

  const handleRejectSubmit = async (e) => {
    e.preventDefault();
    if (!rejectModalItem) return;
    try {
      setProcessingId(rejectModalItem.id);
      await deleteRequestService.rejectRequest(rejectModalItem.id, rejectNote);
      onNotify?.('રિક્વેસ્ટ નામંજૂર (Reject) કરવામાં આવી. રેકોર્ડ સુરક્ષિત છે.', 'info');
      setRejectModalItem(null);
      setRejectNote('');
      await loadRequests();
    } catch (err) {
      const msg = err?.response?.data?.message || 'Error rejecting delete request';
      onNotify?.(msg, 'error');
    } finally {
      setProcessingId(null);
    }
  };

  const filteredRequests = requests.filter((r) => (activeTab === 'all' ? true : r.status === activeTab));
  const pendingCount = requests.filter((r) => r.status === 'pending').length;
  const approvedCount = requests.filter((r) => r.status === 'approved').length;
  const rejectedCount = requests.filter((r) => r.status === 'rejected').length;

  return (
    <div style={{ padding: '0.85rem', maxWidth: '900px', margin: '0 auto', paddingBottom: '5rem' }}>
      {/* Header Strip */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '0.75rem',
          marginBottom: '1rem',
          backgroundColor: '#ffffff',
          padding: '0.85rem 1rem',
          borderRadius: '14px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 2px 8px rgba(15,23,42,0.04)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <button
            type="button"
            onClick={onBackToHome}
            style={{
              background: '#f1f5f9',
              border: '1px solid #cbd5e1',
              borderRadius: '10px',
              padding: '0.45rem 0.75rem',
              fontWeight: 700,
              fontSize: '0.82rem',
              cursor: 'pointer',
              color: '#334155',
            }}
          >
            ← Back
          </button>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.08rem', fontWeight: 800, color: '#0f172a' }}>
              {isAdmin ? '🛡️ Delete Approval Requests' : '📩 My Delete Requests'}
            </h2>
            <span style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 600 }}>
              {isAdmin
                ? 'સ્ટાફ દ્વારા મોકલેલ ડિલીટ રિક્વેસ્ટ અહીંથી Accept કે Reject કરો'
                : 'તમે મોકલેલ ડિલીટ રિક્વેસ્ટનું સ્ટેટસ અહીં જોઈ શકો છો'}
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={loadRequests}
          disabled={loading}
          style={{
            background: '#eff6ff',
            border: '1px solid #bfdbfe',
            color: '#1d4ed8',
            borderRadius: '10px',
            padding: '0.45rem 0.75rem',
            fontWeight: 700,
            fontSize: '0.8rem',
            cursor: 'pointer',
          }}
        >
          🔄 Refresh
        </button>
      </div>

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: '0.45rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        {[
          { id: 'pending', label: `Pending (${pendingCount})`, color: '#d97706', bg: '#fef3c7' },
          { id: 'approved', label: `Accepted (${approvedCount})`, color: '#15803d', bg: '#dcfce7' },
          { id: 'rejected', label: `Rejected (${rejectedCount})`, color: '#b91c1c', bg: '#fee2e2' },
          { id: 'all', label: `All (${requests.length})`, color: '#334155', bg: '#f1f5f9' },
        ].map((t) => {
          const isActive = activeTab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveTab(t.id)}
              style={{
                padding: '0.45rem 0.85rem',
                borderRadius: '20px',
                border: isActive ? `1.5px solid ${t.color}` : '1px solid #e2e8f0',
                backgroundColor: isActive ? t.bg : '#ffffff',
                color: isActive ? t.color : '#64748b',
                fontWeight: 800,
                fontSize: '0.8rem',
                cursor: 'pointer',
              }}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {/* List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '2.5rem', color: '#64748b', fontWeight: 700 }}>
          લોડ થઈ રહ્યું છે...
        </div>
      ) : filteredRequests.length === 0 ? (
        <div
          style={{
            textAlign: 'center',
            padding: '2.5rem 1rem',
            backgroundColor: '#ffffff',
            borderRadius: '14px',
            border: '1px dashed #cbd5e1',
            color: '#64748b',
            fontWeight: 700,
            fontSize: '0.9rem',
          }}
        >
          કોઈ ડિલીટ રિક્વેસ્ટ નથી ({activeTab}).
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {filteredRequests.map((req) => {
            const modLabel = MODULE_LABELS[req.module] || req.module;
            const statusColor =
              req.status === 'approved' ? '#15803d' : req.status === 'rejected' ? '#b91c1c' : '#b45309';
            const statusBg =
              req.status === 'approved' ? '#dcfce7' : req.status === 'rejected' ? '#fee2e2' : '#fef3c7';
            const isBusy = processingId === req.id;

            return (
              <div
                key={req.id}
                style={{
                  backgroundColor: '#ffffff',
                  borderRadius: '12px',
                  border: '1px solid #e2e8f0',
                  padding: '0.9rem 1rem',
                  boxShadow: '0 1px 4px rgba(15,23,42,0.04)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <div>
                    <span
                      style={{
                        display: 'inline-block',
                        fontSize: '0.72rem',
                        fontWeight: 800,
                        backgroundColor: '#eff6ff',
                        color: '#1e40af',
                        padding: '0.15rem 0.55rem',
                        borderRadius: '6px',
                        marginBottom: '0.35rem',
                      }}
                    >
                      {modLabel}
                    </span>
                    <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a' }}>
                      {req.entity_label}
                    </div>
                  </div>

                  <span
                    style={{
                      fontSize: '0.74rem',
                      fontWeight: 800,
                      padding: '0.2rem 0.65rem',
                      borderRadius: '20px',
                      backgroundColor: statusBg,
                      color: statusColor,
                      textTransform: 'uppercase',
                    }}
                  >
                    {req.status === 'approved' ? '✓ Accepted & Deleted' : req.status === 'rejected' ? '✕ Rejected' : '⏳ Pending'}
                  </span>
                </div>

                <div
                  style={{
                    marginTop: '0.6rem',
                    padding: '0.55rem 0.75rem',
                    backgroundColor: '#f8fafc',
                    borderRadius: '8px',
                    fontSize: '0.82rem',
                    color: '#334155',
                  }}
                >
                  <strong style={{ color: '#0f172a' }}>Reason: </strong>
                  <span>{req.reason}</span>
                </div>

                <div
                  style={{
                    marginTop: '0.55rem',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '0.4rem',
                    fontSize: '0.75rem',
                    color: '#64748b',
                  }}
                >
                  <span>
                    Requested by: <strong style={{ color: '#334155' }}>{req.requested_by_name}</strong>
                  </span>
                  <span>{req.created_at ? new Date(req.created_at).toLocaleString('en-IN') : ''}</span>
                </div>

                {req.review_note && (
                  <div style={{ marginTop: '0.45rem', fontSize: '0.78rem', color: '#475569' }}>
                    <strong>Admin Note ({req.reviewed_by_name}):</strong> {req.review_note}
                  </div>
                )}

                {isAdmin && req.status === 'pending' && (
                  <div style={{ display: 'flex', gap: '0.6rem', marginTop: '0.8rem' }}>
                    <button
                      type="button"
                      onClick={() => handleApprove(req)}
                      disabled={isBusy}
                      style={{
                        flex: 1,
                        padding: '0.55rem 0.85rem',
                        borderRadius: '9px',
                        border: 'none',
                        backgroundColor: '#16a34a',
                        color: '#ffffff',
                        fontWeight: 800,
                        fontSize: '0.82rem',
                        cursor: isBusy ? 'not-allowed' : 'pointer',
                      }}
                    >
                      {isBusy ? 'Processing...' : '✓ Accept & Delete'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setRejectModalItem(req);
                        setRejectNote('');
                      }}
                      disabled={isBusy}
                      style={{
                        flex: 1,
                        padding: '0.55rem 0.85rem',
                        borderRadius: '9px',
                        border: '1px solid #fecaca',
                        backgroundColor: '#fef2f2',
                        color: '#dc2626',
                        fontWeight: 800,
                        fontSize: '0.82rem',
                        cursor: isBusy ? 'not-allowed' : 'pointer',
                      }}
                    >
                      ✕ Reject
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Reject Reason Modal */}
      {rejectModalItem && (
        <div
          className="modal-backdrop"
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15,23,42,0.6)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
          }}
          onClick={() => setRejectModalItem(null)}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '14px',
              width: '100%',
              maxWidth: '400px',
              padding: '1.2rem',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: '0 0 0.5rem', fontSize: '1rem', fontWeight: 800, color: '#dc2626' }}>
              ✕ Reject Delete Request
            </h3>
            <p style={{ fontSize: '0.8rem', color: '#475569', margin: '0 0 0.75rem' }}>
              Record: <strong>{rejectModalItem.entity_label}</strong>
            </p>
            <form onSubmit={handleRejectSubmit}>
              <textarea
                rows={3}
                value={rejectNote}
                onChange={(e) => setRejectNote(e.target.value)}
                placeholder="Reject કરવાનું કારણ (ઓપ્શનલ)..."
                style={{
                  width: '100%',
                  padding: '0.6rem',
                  border: '1.5px solid #cbd5e1',
                  borderRadius: '8px',
                  fontSize: '0.84rem',
                  boxSizing: 'border-box',
                }}
              />
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.85rem' }}>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setRejectModalItem(null)}
                  style={{
                    flex: 1,
                    padding: '0.55rem',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    backgroundColor: '#f1f5f9',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    flex: 1,
                    padding: '0.55rem',
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor: '#dc2626',
                    color: '#ffffff',
                    fontWeight: 800,
                    cursor: 'pointer',
                  }}
                >
                  Confirm Reject
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default DeleteRequestsPage;

