import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { deleteRequestService } from '../services/deleteRequestService';

const DeleteRequestContext = createContext(null);

export function DeleteRequestProvider({ children, onNotify }) {
  const { isAuthenticated, isAdmin } = useAuth();
  const [pendingKeys, setPendingKeys] = useState([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [modalTarget, setModalTarget] = useState(null);
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const refreshPending = useCallback(async () => {
    if (!isAuthenticated) {
      setPendingKeys([]);
      setPendingCount(0);
      return;
    }
    try {
      const [keys, count] = await Promise.all([
        deleteRequestService.getPendingKeys().catch(() => []),
        deleteRequestService.getPendingCount().catch(() => 0),
      ]);
      setPendingKeys(Array.isArray(keys) ? keys : []);
      setPendingCount(Number(count) || 0);
    } catch {
      // ignore background refresh error
    }
  }, [isAuthenticated]);

  useEffect(() => {
    refreshPending();
  }, [isAuthenticated, refreshPending]);

  const isPendingDelete = useCallback(
    (module, entityId, entityMeta = null) => {
      if (!module || !entityId) return false;
      const numId = Number(entityId);
      return pendingKeys.some((k) => {
        if (k.module !== module || Number(k.entity_id) !== numId) return false;
        if (module === 'work_order_photo') {
          return String(k.entity_meta?.photoId || '') === String(entityMeta?.photoId || '');
        }
        return true;
      });
    },
    [pendingKeys]
  );

  const openDeleteRequest = useCallback((target) => {
    setModalTarget(target);
    setReason('');
  }, []);

  const closeDeleteRequest = useCallback(() => {
    if (submitting) return;
    setModalTarget(null);
    setReason('');
  }, [submitting]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!modalTarget) return;
    const trimmed = reason.trim();
    if (!trimmed) {
      onNotify?.('કૃપા કરીને ડિલીટ કરવાનું કારણ લખો (Please enter a reason)', 'error');
      return;
    }

    try {
      setSubmitting(true);
      await deleteRequestService.createRequest({
        module: modalTarget.module,
        entityId: modalTarget.entityId,
        entityMeta: modalTarget.entityMeta || null,
        entityLabel: modalTarget.entityLabel || `${modalTarget.module} #${modalTarget.entityId}`,
        entitySnapshot: modalTarget.entitySnapshot || null,
        reason: trimmed,
      });
      await refreshPending();
      onNotify?.('✓ ડિલીટ રિક્વેસ્ટ એડમિનને મોકલી દેવાઈ છે (Delete request sent to Admin)', 'success');
      setModalTarget(null);
      setReason('');
    } catch (err) {
      const msg = err?.response?.data?.message || 'Error sending delete request';
      onNotify?.(msg, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <DeleteRequestContext.Provider
      value={{
        pendingKeys,
        pendingCount,
        isAdmin,
        refreshPending,
        isPendingDelete,
        openDeleteRequest,
      }}
    >
      {children}

      {/* Global Delete Request Modal */}
      {modalTarget && (
        <div
          className="modal-backdrop"
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.6)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
          }}
          onClick={closeDeleteRequest}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '14px',
              width: '100%',
              maxWidth: '420px',
              padding: '1.25rem',
              boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#b45309', display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                <span>📩</span>
                <span>Request Delete Approval</span>
              </h3>
              <button
                type="button"
                className="btn-modal-close"
                onClick={closeDeleteRequest}
                disabled={submitting}
                style={{
                  background: '#f1f5f9',
                  border: 'none',
                  borderRadius: '8px',
                  width: '30px',
                  height: '30px',
                  fontSize: '1.1rem',
                  cursor: 'pointer',
                  color: '#475569',
                }}
              >
                ×
              </button>
            </div>

            <div
              style={{
                backgroundColor: '#fffbeb',
                border: '1px solid #fde68a',
                borderRadius: '10px',
                padding: '0.75rem',
                marginBottom: '0.9rem',
                fontSize: '0.82rem',
                color: '#78350f',
              }}
            >
              <div style={{ fontWeight: 700, marginBottom: '0.2rem' }}>
                તમારી પાસે સીધા ડિલીટ કરવાની પરમિશન નથી.
              </div>
              <div style={{ fontSize: '0.78rem', color: '#92400e' }}>
                આ રેકોર્ડ ડિલીટ કરવા માટે એડમિનને રિક્વેસ્ટ મોકલાશે. એડમિન મંજૂર (Accept) કરશે પછી જ રેકોર્ડ ડિલીટ થશે.
              </div>
            </div>

            <div
              style={{
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                padding: '0.6rem 0.75rem',
                marginBottom: '0.9rem',
                fontSize: '0.82rem',
              }}
            >
              <span style={{ color: '#64748b', fontWeight: 600 }}>Record: </span>
              <strong style={{ color: '#0f172a' }}>{modalTarget.entityLabel}</strong>
            </div>

            <form onSubmit={handleSubmit}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                ડિલીટ કરવાનું કારણ (Reason) *
              </label>
              <textarea
                rows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="દા.ત. ભૂલથી ડબલ એન્ટ્રી થઈ ગઈ છે / ખોટો રેકોર્ડ..."
                required
                disabled={submitting}
                style={{
                  width: '100%',
                  padding: '0.65rem 0.75rem',
                  border: '1.5px solid #cbd5e1',
                  borderRadius: '10px',
                  fontSize: '0.86rem',
                  boxSizing: 'border-box',
                  resize: 'vertical',
                  fontFamily: 'inherit',
                }}
              />

              <div style={{ display: 'flex', gap: '0.6rem', marginTop: '1rem' }}>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={closeDeleteRequest}
                  disabled={submitting}
                  style={{
                    flex: 1,
                    padding: '0.65rem',
                    borderRadius: '10px',
                    border: '1px solid #cbd5e1',
                    backgroundColor: '#f1f5f9',
                    color: '#334155',
                    fontWeight: 700,
                    fontSize: '0.84rem',
                    cursor: 'pointer',
                  }}
                >
                  રદ કરો (Cancel)
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    flex: 1.3,
                    padding: '0.65rem',
                    borderRadius: '10px',
                    border: 'none',
                    backgroundColor: '#d97706',
                    color: '#ffffff',
                    fontWeight: 800,
                    fontSize: '0.84rem',
                    cursor: submitting ? 'not-allowed' : 'pointer',
                  }}
                >
                  {submitting ? 'મોકલી રહ્યાં છીએ...' : '📩 રિક્વેસ્ટ મોકલો'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DeleteRequestContext.Provider>
  );
}

export function useDeleteRequest() {
  const ctx = useContext(DeleteRequestContext);
  if (!ctx) {
    throw new Error('useDeleteRequest must be used within DeleteRequestProvider');
  }
  return ctx;
}

