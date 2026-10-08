import React, { useState } from 'react';
import { isLeavingSoon, getLeavingSoonLabel, getDaysUntil, formatDisplayDate } from '../../utils/dateAlerts';
import { getAadharFullUrl } from '../../services/workerService';
import { AadharPreviewModal } from './AadharPreviewModal';

export const WorkerCard = React.memo(function WorkerCard({ worker, onEdit, onDelete, canManage = true }) {
  const [showAadharModal, setShowAadharModal] = useState(false);

  const getAvatarInitials = (name) => {
    if (!name) return 'W';
    const words = name.trim().split(/\s+/);
    if (words.length >= 2) {
      return (words[0][0] + words[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const formattedComing = formatDisplayDate(worker.coming_date) || '—';
  const formattedGoing = formatDisplayDate(worker.going_date);

  const leavingSoon = isLeavingSoon(worker.going_date);
  const leavingLabel = leavingSoon ? getLeavingSoonLabel(worker.going_date) : null;
  const daysLeft = leavingSoon ? getDaysUntil(worker.going_date) : null;

  const cleanPhone = worker.mobile ? worker.mobile.replace(/[^0-9]/g, '') : '';
  const waPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;

  const handleCall = (e) => {
    e.stopPropagation();
    if (!cleanPhone) return;
    window.location.href = `tel:${cleanPhone}`;
  };

  const handleWhatsApp = (e) => {
    e.stopPropagation();
    if (!cleanPhone) return;
    const waNativeUrl = `whatsapp://send?phone=${waPhone}`;
    const waWebUrl = `https://wa.me/${waPhone}`;

    try {
      window.location.href = waNativeUrl;
      setTimeout(() => {
        if (!document.hidden) {
          window.open(waWebUrl, '_blank');
        }
      }, 500);
    } catch {
      window.open(waWebUrl, '_blank');
    }
  };

  return (
    <>
      <div className={`worker-card luxury-worker-card ${leavingSoon ? 'card-alert-urgent' : ''}`}>
        <div className="worker-card-header">
          <div className="worker-profile">
            <div className={`worker-avatar luxury-avatar ${leavingSoon ? 'avatar-urgent' : ''}`}>
              <span className="avatar-initials">{getAvatarInitials(worker.name)}</span>
            </div>
            <div className="worker-meta">
              <h4 className="worker-name">{worker.name}</h4>
              <span className="worker-status-indicator">
                {leavingSoon ? (
                  <span className="alert-status-pill">
                    <span className="pulse-alert-dot"></span>
                    {daysLeft === 0 ? 'Leaving Today!' : `Leaving in ${daysLeft} Days`}
                  </span>
                ) : !worker.going_date ? (
                  <span className="active-dot-pill">
                    <span className="pulse-indicator"></span>
                    Active On Duty
                  </span>
                ) : (
                  <span className="relieved-dot-pill">
                    Relieved
                  </span>
                )}
              </span>
            </div>
          </div>

          {/* Card Actions (Visible only to Admin) */}
          {canManage && (
            <div className="card-actions">
              <button
                type="button"
                className="action-btn edit-btn"
                onClick={() => onEdit(worker)}
                title="Edit worker"
                aria-label={`Edit ${worker.name}`}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
              </button>
              <button
                type="button"
                className="action-btn delete-btn"
                onClick={() => onDelete(worker)}
                title="Delete worker"
                aria-label={`Delete ${worker.name}`}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  <line x1="10" y1="11" x2="10" y2="17" />
                  <line x1="14" y1="11" x2="14" y2="17" />
                </svg>
              </button>
            </div>
          )}
        </div>

        {/* Worker Details Row: Mobile & Quick Actions */}
        {worker.mobile && (
          <div className="worker-contact-row">
            <div className="contact-mobile-link">
              <span className="phone-icon-pill">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                </svg>
              </span>
              <span className="mobile-number-text">{worker.mobile}</span>
            </div>

            <div className="contact-quick-actions">
              <button
                type="button"
                className="quick-contact-btn quick-call-btn"
                title={`Call ${worker.name}`}
                onClick={handleCall}
              >
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                </svg>
                Call
              </button>
              {cleanPhone && (
                <button
                  type="button"
                  className="quick-contact-btn quick-whatsapp-btn"
                  title={`WhatsApp ${worker.name}`}
                  onClick={handleWhatsApp}
                >
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
                  </svg>
                  WhatsApp
                </button>
              )}
            </div>
          </div>
        )}

        {/* Worker Aadhar Card Badge */}
        {worker.aadhar_card && (
          <div
            className="worker-aadhar-badge-clickable"
            onClick={() => setShowAadharModal(true)}
            role="button"
            tabIndex={0}
            title="Click to view Aadhar card photo"
          >
            <div className="aadhar-mini-thumbnail">
              <img
                src={getAadharFullUrl(worker.aadhar_card)}
                alt="Aadhar Card"
                className="mini-thumb-img"
                loading="lazy"
              />
            </div>
            <div className="aadhar-badge-info">
              <span className="aadhar-badge-title">Aadhar Card Attached</span>
              <span className="aadhar-badge-action">Tap to view document</span>
            </div>
            <div className="aadhar-view-icon-box">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
                <line x1="11" y1="8" x2="11" y2="14" />
                <line x1="8" y1="11" x2="14" y2="11" />
              </svg>
            </div>
          </div>
        )}

        {/* Worker Dates Grid (Compact Luxury) */}
        <div className="worker-dates-grid luxury-dates-grid">
          {/* Coming Date */}
          <div className="date-item coming-date-box">
            <div className="date-icon-circle coming-icon-bg">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
            </div>
            <div className="date-content">
              <span className="date-label">COMING DATE</span>
              <span className="date-value">{formattedComing}</span>
            </div>
          </div>

          {/* Going Date */}
          <div className={`date-item going-date-box ${leavingSoon ? 'alert-going-date' : ''}`}>
            <div className={`date-icon-circle ${leavingSoon ? 'alert-going-icon' : 'going-icon-bg'}`}>
              {leavingSoon ? (
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
              ) : (
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
              )}
            </div>
            <div className="date-content">
              <span className={`date-label ${leavingSoon ? 'text-alert-label' : ''}`}>
                GOING DATE
              </span>
              <span className={`date-value ${leavingSoon ? 'text-alert-value' : !formattedGoing ? 'date-empty-val' : ''}`}>
                {formattedGoing || 'Present'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Aadhar Fullscreen View Modal */}
      <AadharPreviewModal
        isOpen={showAadharModal}
        onClose={() => setShowAadharModal(false)}
        workerName={worker.name}
        aadharUrl={worker.aadhar_card}
      />
    </>
  );
});

export default WorkerCard;
