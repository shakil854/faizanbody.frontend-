import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

function getTodayStr() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function addDaysStr(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export function getReminderStatus(reminderDate) {
  const clean = reminderDate ? String(reminderDate).split('T')[0].trim() : '';
  if (!clean) {
    return {
      isSet: false,
      isDueToday: false,
      isOverdue: false,
      isDueOrOverdue: false,
      label: '',
      bg: '#f1f5f9',
      color: '#475569',
      border: '#cbd5e1',
    };
  }

  const today = getTodayStr();
  const isDueToday = clean === today;
  const isOverdue = clean < today;
  const isDueOrOverdue = isDueToday || isOverdue;

  if (isDueToday) {
    return {
      isSet: true,
      isDueToday: true,
      isOverdue: false,
      isDueOrOverdue: true,
      label: `🔔 Today (${clean})`,
      bg: '#fef3c7',
      color: '#b45309',
      border: '#f59e0b',
    };
  }

  if (isOverdue) {
    return {
      isSet: true,
      isDueToday: false,
      isOverdue: true,
      isDueOrOverdue: true,
      label: `🔔 Overdue (${clean})`,
      bg: '#fee2e2',
      color: '#b91c1c',
      border: '#ef4444',
    };
  }

  return {
    isSet: true,
    isDueToday: false,
    isOverdue: false,
    isDueOrOverdue: false,
    label: `🔔 Reminder: ${clean}`,
    bg: '#eff6ff',
    color: '#1d4ed8',
    border: '#bfdbfe',
  };
}

/**
 * Shared Payment Reminder Modal for Truck Account & Vyapari Account
 */
export function AccountReminderModal({
  isOpen,
  onClose,
  account,
  onSave,
  accentColor = '#0284c7',
}) {
  const [reminderDate, setReminderDate] = useState('');
  const [reminderNote, setReminderNote] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen && account) {
      setReminderDate(account.reminder_date ? String(account.reminder_date).split('T')[0] : getTodayStr());
      setReminderNote(account.reminder_note || '');
      setError('');
      setIsSaving(false);
    }
  }, [isOpen, account]);

  if (!isOpen || !account) return null;

  const handleSave = async (e) => {
    e.preventDefault();
    if (!reminderDate) {
      setError('Please select a reminder date');
      return;
    }
    try {
      setIsSaving(true);
      setError('');
      await onSave(account.id, {
        reminder_date: reminderDate,
        reminder_note: reminderNote.trim(),
      });
      onClose();
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'Error saving reminder');
    } finally {
      setIsSaving(false);
    }
  };

  const handleClear = async () => {
    try {
      setIsSaving(true);
      setError('');
      await onSave(account.id, {
        reminder_date: null,
        reminder_note: '',
      });
      onClose();
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'Error clearing reminder');
    } finally {
      setIsSaving(false);
    }
  };

  return createPortal(
    <div className="modal-backdrop" onClick={() => !isSaving && onClose()} style={{ zIndex: 1300 }}>
      <div
        className="modal-card"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        style={{ maxWidth: '420px', width: '94%', padding: '1.2rem' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.85rem' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>
              🔔 Set Payment Reminder
            </h3>
            <p style={{ margin: '0.2rem 0 0', fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>
              {account.party_name}
              {Number(account.balance) > 0 && ` • બાકી: ₹${Number(account.balance).toLocaleString('en-IN')}`}
            </p>
          </div>
          <button
            type="button"
            onClick={() => !isSaving && onClose()}
            style={{
              background: '#f1f5f9',
              border: 'none',
              borderRadius: '50%',
              width: '30px',
              height: '30px',
              cursor: 'pointer',
              fontWeight: 700,
              color: '#475569',
            }}
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          {/* Quick Date Chips */}
          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
            {[
              { label: 'Today', days: 0 },
              { label: '+3 Days', days: 3 },
              { label: '+7 Days', days: 7 },
              { label: '+15 Days', days: 15 },
            ].map((q) => {
              const target = addDaysStr(q.days);
              const active = reminderDate === target;
              return (
                <button
                  key={q.label}
                  type="button"
                  onClick={() => setReminderDate(target)}
                  style={{
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    padding: '4px 10px',
                    borderRadius: '999px',
                    border: `1px solid ${active ? accentColor : '#cbd5e1'}`,
                    background: active ? accentColor : '#f8fafc',
                    color: active ? '#ffffff' : '#334155',
                    cursor: 'pointer',
                  }}
                >
                  {q.label}
                </button>
              );
            })}
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" style={{ fontWeight: 700, fontSize: '0.82rem' }}>
              Reminder Date *
            </label>
            <input
              type="date"
              className="form-input"
              value={reminderDate}
              onChange={(e) => setReminderDate(e.target.value)}
              disabled={isSaving}
              required
            />
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" style={{ fontWeight: 700, fontSize: '0.82rem' }}>
              Reminder Note (Optional)
            </label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. પેમેન્ટ માટે ફોન કરવો / Bill follow-up"
              value={reminderNote}
              onChange={(e) => setReminderNote(e.target.value)}
              disabled={isSaving}
            />
          </div>

          {error && (
            <p style={{ color: '#dc2626', fontSize: '0.8rem', margin: 0 }}>{error}</p>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem' }}>
            {account.reminder_date ? (
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleClear}
                disabled={isSaving}
                style={{ color: '#dc2626', borderColor: '#fecaca', background: '#fef2f2', fontSize: '0.8rem' }}
              >
                Clear Reminder
              </button>
            ) : (
              <span />
            )}

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={onClose}
                disabled={isSaving}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={isSaving}
                style={{ backgroundColor: accentColor, borderColor: accentColor }}
              >
                {isSaving ? 'Saving...' : '🔔 Save Reminder'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}

export default AccountReminderModal;
