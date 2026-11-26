import React, { useState } from 'react';
import { VyapariModal } from './VyapariModal';
import { getReminderStatus } from '../common/AccountReminderModal';

/**
 * Vyapari Account Card for the main directory list
 * Shows party name, page no., firm details, total bill, total received, remaining due,
 * and quick View Khata button.
 */
export const VyapariCard = React.memo(function VyapariCard({
  account,
  onEdit,
  onDelete,
  onReminder,
  onAccountChanged,
  canEdit = true,
  canDelete = true,
  canManageKhata = true,
  canPrint = true,
}) {
  const [showModal, setShowModal] = useState(false);

  const getAvatarInitials = (name) => {
    if (!name) return '🏪';
    const words = name.trim().split(/\s+/);
    if (words.length >= 2) {
      return (words[0][0] + words[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const totalJama = Number(account?.total_jama) || 0;
  const totalUdhar = Number(account?.total_udhar) || 0;
  const balance = Number(account?.balance) || 0;

  const cleanPhone = (account?.phone || '').replace(/[^0-9]/g, '');
  const waPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;

  const handleCall = (e) => {
    e.stopPropagation();
    if (!cleanPhone) return;
    window.location.href = `tel:${cleanPhone}`;
  };

  const handleWhatsApp = (e) => {
    e.stopPropagation();
    if (!cleanPhone) return;
    const url = `https://wa.me/${waPhone}`;
    window.open(url, '_blank');
  };

  const canOpenKhata = canManageKhata || canPrint;
  const reminderInfo = getReminderStatus(account?.reminder_date);

  return (
    <>
      <div
        className="worker-card luxury-worker-card"
        style={{ cursor: canOpenKhata ? 'pointer' : 'default' }}
        onClick={() => canOpenKhata && setShowModal(true)}
      >
        <div className="worker-card-header">
          <div className="worker-profile">
            <div className="worker-avatar luxury-avatar" style={{ background: 'linear-gradient(135deg, #0d9488, #0f766e)' }}>
              <span className="avatar-initials">{getAvatarInitials(account.party_name)}</span>
            </div>
            <div className="worker-meta">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                <h4 className="worker-name" style={{ margin: 0 }}>
                  {account.party_name}
                </h4>
                {account.page_no && (
                  <span
                    style={{
                      fontSize: '0.68rem',
                      fontWeight: 800,
                      background: '#fee2e2',
                      color: '#991b1b',
                      padding: '0.12rem 0.5rem',
                      borderRadius: '10px',
                      border: '1px solid #fecaca',
                    }}
                  >
                    PAGE {account.page_no}
                  </span>
                )}
                {Number(account?.current_cycle) > 1 && (
                  <span
                    style={{
                      fontSize: '0.68rem',
                      fontWeight: 800,
                      background: '#dcfce7',
                      color: '#166534',
                      padding: '0.12rem 0.5rem',
                      borderRadius: '10px',
                      border: '1px solid #bbf7d0',
                    }}
                  >
                    ROUND {account.current_cycle}
                  </span>
                )}
              </div>
              <span className="worker-status-indicator">
                {account.firm_name ? (
                  <span className="active-dot-pill" style={{ color: '#0f766e', background: '#ccfbf1' }}>
                    🏪 {account.firm_name}
                  </span>
                ) : (
                  <span className="active-dot-pill">Vyapari Account</span>
                )}
              </span>
            </div>
          </div>

          {(canEdit || canDelete || (onReminder && canManageKhata)) && (
            <div className="card-actions" onClick={(e) => e.stopPropagation()}>
              {onReminder && (canManageKhata || canEdit) && (
                <button
                  type="button"
                  className="action-btn"
                  onClick={() => onReminder(account)}
                  title={reminderInfo.isSet ? `Edit Reminder (${account.reminder_date})` : 'Set Payment Reminder'}
                  style={{
                    background: reminderInfo.isSet ? reminderInfo.bg : '#f8fafc',
                    color: reminderInfo.isSet ? reminderInfo.color : '#475569',
                    border: `1px solid ${reminderInfo.isSet ? reminderInfo.border : '#cbd5e1'}`,
                    fontSize: '0.85rem',
                  }}
                >
                  🔔
                </button>
              )}
              {canEdit && (
                <button
                  type="button"
                  className="action-btn edit-btn"
                  onClick={() => onEdit(account)}
                  title="Edit Vyapari Account"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                </button>
              )}
              {canDelete && (
                <button
                  type="button"
                  className="action-btn delete-btn"
                  onClick={() => onDelete(account)}
                  title="Delete Vyapari Account"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    <line x1="10" y1="11" x2="10" y2="17" />
                    <line x1="14" y1="11" x2="14" y2="17" />
                  </svg>
                </button>
              )}
            </div>
          )}
        </div>

        {(account.phone || account.address) && (
          <div className="worker-contact-row" onClick={(e) => e.stopPropagation()}>
            {account.phone && (
              <div className="contact-mobile-link">
                <span className="phone-icon-pill">📞</span>
                <span className="mobile-number-text">{account.phone}</span>
              </div>
            )}
            {account.address && (
              <div style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 600 }}>
                📍 {account.address}
              </div>
            )}

            {account.phone && (
              <div className="contact-quick-actions" style={{ marginLeft: 'auto' }}>
                <button
                  type="button"
                  className="quick-contact-btn quick-call-btn"
                  title={`Call ${account.party_name}`}
                  onClick={handleCall}
                >
                  Call
                </button>
                <button
                  type="button"
                  className="quick-contact-btn quick-whatsapp-btn"
                  title={`WhatsApp ${account.party_name}`}
                  onClick={handleWhatsApp}
                >
                  WhatsApp
                </button>
              </div>
            )}
          </div>
        )}

        {reminderInfo.isSet && (
          <div
            onClick={(e) => {
              e.stopPropagation();
              if (onReminder && (canManageKhata || canEdit)) onReminder(account);
            }}
            style={{
              marginTop: '0.5rem',
              padding: '0.35rem 0.65rem',
              borderRadius: '8px',
              background: reminderInfo.bg,
              color: reminderInfo.color,
              border: `1px solid ${reminderInfo.border}`,
              fontSize: '0.76rem',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '0.5rem',
              cursor: onReminder && (canManageKhata || canEdit) ? 'pointer' : 'default',
            }}
          >
            <span>{reminderInfo.label}</span>
            {account.reminder_note && (
              <span style={{ fontWeight: 600, opacity: 0.9, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                • {account.reminder_note}
              </span>
            )}
          </div>
        )}

        {canOpenKhata && (
          <div className="worker-khata-card" style={{ marginTop: '0.65rem' }}>
            <div className="khata-card-header-row">
              <div className="khata-card-title-group">
                <span className="khata-card-icon-squircle" style={{ background: '#ccfbf1' }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#0d9488" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                    <line x1="9" y1="7" x2="15" y2="7" />
                    <line x1="9" y1="11" x2="13" y2="11" />
                  </svg>
                </span>
                <div className="khata-card-title-text">
                  <span className="khata-card-heading">Vyapari Account</span>
                  <span className="khata-card-subheading">Five Star Physical Ledger</span>
                </div>
              </div>

              <button
                type="button"
                className="btn-khata-open-pill"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowModal(true);
                }}
              >
                <span>View Khata</span>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
            </div>

            {canManageKhata && (
              <>
                <div className="khata-micro-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
                  <div className="khata-micro-item item-upad">
                    <span className="micro-label">TOTAL BILL (ઉધાર)</span>
                    <span className="micro-val">₹{totalUdhar.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="khata-micro-item item-total">
                    <span className="micro-label">TOTAL RECEIVED (જમા)</span>
                    <span className="micro-val" style={{ color: '#16a34a' }}>₹{totalJama.toLocaleString('en-IN')}</span>
                  </div>
                </div>

                <div
                  className={`khata-balance-strip ${
                    balance > 0 ? 'strip-upad' : balance < 0 ? 'strip-due' : 'strip-settled'
                  }`}
                >
                  <div className="balance-strip-left">
                    <span className="balance-strip-label">
                      {balance > 0 ? 'બાકી (Due):' : balance < 0 ? 'એડવાન્સ જમા (Advance):' : 'હિસાબ (Net):'}
                    </span>
                    <span className="balance-strip-amount">
                      ₹{Math.abs(balance).toLocaleString('en-IN')}
                    </span>
                  </div>
                  <span className="balance-strip-badge">
                    {balance > 0 ? 'બાકી (Due)' : balance < 0 ? 'Advance' : 'સરભર (Settled)'}
                  </span>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {showModal && (
        <VyapariModal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          accountId={account.id}
          initialAccount={account}
          onAccountChanged={onAccountChanged}
          canManage={canManageKhata}
          canPrint={canPrint}
        />
      )}
    </>
  );
});

export default VyapariCard;
