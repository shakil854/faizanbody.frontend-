import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { quotationService } from '../../services/quotationService';
import { QuotationCard } from './QuotationCard';
import { QuotationFormModal } from './QuotationFormModal';
import { QuotationPrintContent } from './QuotationPrintContent';
import { sharePdfFile } from '../../utils/pdfGenerator';
import { Snackbar } from '../workers/Snackbar';

export function QuotationsPage({ onBackToHome }) {
  const { isAdmin, canAccessModule, hasPermission } = useAuth();
  const canAccessQuotations = isAdmin || canAccessModule('quotations') || hasPermission('quotations:view');

  // Snackbar Toast Notification State
  const [snackbar, setSnackbar] = useState({ message: '', type: 'info' });
  const showSnackbar = useCallback((message, type = 'info') => {
    setSnackbar({ message, type });
  }, []);

  // If user cannot access quotations, redirect back to home immediately
  useEffect(() => {
    if (!canAccessQuotations && onBackToHome) {
      onBackToHome();
    }
  }, [canAccessQuotations, onBackToHome]);

  // SWR State
  const [quotations, setQuotations] = useState(() => quotationService.getCachedQuotations());
  const [loading, setLoading] = useState(() => quotationService.getCachedQuotations().length === 0);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Modals
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingQuotation, setEditingQuotation] = useState(null);
  const [deletingQuotation, setDeletingQuotation] = useState(null);

  // Direct WhatsApp Share (1-tap, NO modal dialog)
  const [sharingQuote, setSharingQuote] = useState(null);
  const [sharingQuoteId, setSharingQuoteId] = useState(null);

  // Build clean Gujarati + English formatted text matching Add Quotation slip
  const buildQuotationShareText = useCallback((quote) => {
    const cleanPhone = quote.mobile_number ? quote.mobile_number.replace(/[^0-9]/g, '') : '';
    const waPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;

    let msg = `*📋 QUOTATION - FAIZAN BODY WORKSHOP*\n`;
    msg += `━━━━━━━━━━━━━━━━━━━━━\n`;
    msg += `*કોટેશન નં:* ${quote.quotation_no || ''}\n`;
    msg += `*તારીખ:* ${quote.quotation_date || ''}\n`;
    msg += `*ગ્રાહકનું નામ:* ${quote.customer_name || ''}\n`;
    if (quote.mobile_number) msg += `*મોબાઈલ:* ${quote.mobile_number}\n`;
    if (quote.truck_chassis_no) msg += `*ટ્રક / ચેસીસ:* ${quote.truck_chassis_no}\n`;
    msg += `━━━━━━━━━━━━━━━━━━━━━\n`;

    // 1. Body Fabrication Specifications
    if (quote.body_calc?.has_data) {
      msg += `*🚛 બોડી માપ અને વિગત:*\n`;
      if (quote.body_calc.taliyu?.length && quote.body_calc.taliyu?.width) {
        msg += `• તળીયું (Floor): ${quote.body_calc.taliyu.length}' × ${quote.body_calc.taliyu.width}' (${quote.body_calc.taliyu.total_sqft || 0} Sq.Ft.)\n`;
      }
      if (quote.body_calc.side?.length && quote.body_calc.side?.height) {
        msg += `• સાઇડ (Side): ${quote.body_calc.side.length}' × ${quote.body_calc.side.height}' × 2 બાજુ (${quote.body_calc.side.total_sqft || 0} Sq.Ft.)\n`;
      }
      if (Number(quote.body_calc.dhoka?.qty) > 0) {
        msg += `• ધોકા (Cross Members): ${quote.body_calc.dhoka.qty} નંગ\n`;
      }
      if (Number(quote.body_calc.thambhla?.qty) > 0) {
        msg += `• થાંભલા (Pillars): ${quote.body_calc.thambhla.qty} નંગ × ${quote.body_calc.thambhla.height || 0}' (${quote.body_calc.thambhla.total_feet || 0} ft)\n`;
      }
      if (quote.body_calc.purchuran?.enabled) {
        msg += `• પરચુરણ (Purchuran): ✓ સામેલ (Included)\n`;
      }
      if (quote.body_calc.machado?.enabled) {
        msg += `• માચડો (Machado / Carrier): ✓ સામેલ (Included)\n`;
      }
      msg += `━━━━━━━━━━━━━━━━━━━━━\n`;
    }

    // 2. Extra Items Included
    const selectedItems = Array.isArray(quote.items)
      ? quote.items.filter((it) => it.selected !== false && (it.selected === true || parseFloat(it.qty) > 0 || parseFloat(it.amount) > 0 || !('selected' in it)))
      : [];
    if (selectedItems.length > 0) {
      msg += `*📦 વધારાની વસ્તુઓ (Items Included):*\n`;
      selectedItems.forEach((it, idx) => {
        const variant = it.variant_name ? ` (${it.variant_name})` : '';
        msg += `${idx + 1}. ${it.name}${variant}: ✓ સામેલ\n`;
      });
      msg += `━━━━━━━━━━━━━━━━━━━━━\n`;
    }

    // 3. Final Total Price
    msg += `*💰 TOTAL AMOUNT (કુલ રકમ): ₹${Number(quote.final_price).toLocaleString('en-IN', { minimumFractionDigits: 2 })}*\n`;
    msg += `━━━━━━━━━━━━━━━━━━━━━\n`;
    msg += `*Faizan Body Workshop*\n`;
    msg += `મોબાઈલ: 7984882103`;

    return { msg, waPhone };
  }, []);

  const handleDirectWhatsAppShare = useCallback(async (quote) => {
    if (!quote || sharingQuoteId) return;

    const openWhatsAppDirect = () => {
      const { msg, waPhone } = buildQuotationShareText(quote);
      const encoded = encodeURIComponent(msg);
      const waUrl = waPhone ? `https://wa.me/${waPhone}?text=${encoded}` : `https://wa.me/?text=${encoded}`;
      const waNative = waPhone ? `whatsapp://send?phone=${waPhone}&text=${encoded}` : `whatsapp://send?text=${encoded}`;

      try {
        window.location.href = waNative;
        setTimeout(() => {
          if (!document.hidden) window.open(waUrl, '_blank');
        }, 500);
      } catch {
        window.open(waUrl, '_blank');
      }
    };

    try {
      setSharingQuoteId(quote.id);
      setSharingQuote(quote);
      showSnackbar('⏳ Preparing Quotation for WhatsApp...', 'info');

      // Wait briefly for offscreen element to render
      await new Promise((r) => setTimeout(r, 120));

      const cleanCustomer = (quote.customer_name || 'Customer').replace(/[^a-zA-Z0-9_-]/g, '_');
      const cleanNo = (quote.quotation_no || 'Quote').replace(/[^a-zA-Z0-9_-]/g, '_');
      const fileName = `FaizanBody_Quotation_${cleanNo}_${cleanCustomer}.pdf`;

      // Safe 4.5s race timeout
      const sharePromise = sharePdfFile({
        elementId: 'quotation-direct-share-element',
        fileName,
      });
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('PDF share timeout')), 4500)
      );

      const res = await Promise.race([sharePromise, timeoutPromise]);
      if (res?.success) {
        showSnackbar('✓ Quotation PDF shared!', 'success');
      } else {
        openWhatsAppDirect();
      }
    } catch (err) {
      console.warn('PDF share fallback to direct WhatsApp:', err);
      openWhatsAppDirect();
    } finally {
      setSharingQuoteId(null);
      setSharingQuote(null);
    }
  }, [sharingQuoteId, showSnackbar, buildQuotationShareText]);

  // Fetch quotations
  const fetchQuotations = useCallback(
    async ({ force = false } = {}) => {
      if (!canAccessQuotations) return;
      if (quotationService.getCachedQuotations().length === 0) {
        setLoading(true);
      }
      try {
        const res = await quotationService.getQuotations({}, { forceRefresh: force });
        if (res?.data) {
          setQuotations(res.data);
        }
      } catch (err) {
        console.error('Error fetching quotations:', err);
        showSnackbar('Failed to load quotations from server', 'error');
      } finally {
        setLoading(false);
      }
    },
    [canAccessQuotations, showSnackbar]
  );

  useEffect(() => {
    if (!canAccessQuotations) return;
    const unsubscribe = quotationService.subscribe((updatedList) => {
      setQuotations(updatedList);
      setLoading(false);
    });
    fetchQuotations();
    return () => unsubscribe();
  }, [canAccessQuotations, fetchQuotations]);

  // Save Quotation (Create or Update)
  const handleSaveQuotation = async (formData, id) => {
    try {
      if (id) {
        await quotationService.updateQuotation(id, formData);
        showSnackbar(`Quotation #${formData.quotation_no} updated successfully!`, 'success');
      } else {
        await quotationService.createQuotation(formData);
        showSnackbar(`New quotation #${formData.quotation_no} created successfully!`, 'success');
      }
      setIsFormOpen(false);
      setEditingQuotation(null);
      fetchQuotations({ force: true });
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Error saving quotation';
      showSnackbar(msg, 'error');
      throw err;
    }
  };

  // Delete Quotation
  const handleConfirmDelete = async () => {
    if (!deletingQuotation) return;
    try {
      await quotationService.deleteQuotation(deletingQuotation.id);
      showSnackbar(`Quotation #${deletingQuotation.quotation_no} deleted`, 'info');
      setDeletingQuotation(null);
      fetchQuotations({ force: true });
    } catch (err) {
      showSnackbar(err.response?.data?.message || 'Error deleting quotation', 'error');
    }
  };

  // Filtered & Searched List
  const filteredQuotations = useMemo(() => {
    let result = [...quotations];

    if (statusFilter !== 'all') {
      result = result.filter((q) => (q.status || 'Draft').toLowerCase() === statusFilter.toLowerCase());
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (it) =>
          it.quotation_no?.toLowerCase().includes(q) ||
          it.customer_name?.toLowerCase().includes(q) ||
          it.mobile_number?.includes(q) ||
          it.truck_chassis_no?.toLowerCase().includes(q) ||
          it.notes?.toLowerCase().includes(q) ||
          (Array.isArray(it.items) && it.items.some((row) => row.name?.toLowerCase().includes(q)))
      );
    }

    return result;
  }, [quotations, statusFilter, searchQuery]);

  // Stats calculation
  const totalCount = quotations.length;
  const draftCount = quotations.filter((q) => (q.status || 'Draft') === 'Draft').length;
  const approvedCount = quotations.filter((q) => q.status === 'Approved').length;

  if (!canAccessQuotations) {
    return (
      <div className="workers-page-shell">
        <main className="android-body" style={{ textAlign: 'center', padding: '3rem 1rem' }}>
          <h3>Access Denied (अनुमति नहीं है)</h3>
          <p style={{ color: '#64748b' }}>You do not have permission to view Quotations. Please ask Admin.</p>
          <button type="button" className="btn btn-primary btn-empty-cta" onClick={onBackToHome}>
            Back to Home
          </button>
        </main>
      </div>
    );
  }

  return (
    <div className="workers-page-shell">
      <main className="android-body">
        {/* Top Search Bar */}
        <div className="search-pill-container luxury-search-wrap">
          <div className="search-pill-box">
            <span className="search-pill-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </span>
            <input
              type="text"
              className="search-pill-input"
              placeholder="Search by customer, quote #, chassis, item..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Search quotations"
            />
            {searchQuery && (
              <button
                type="button"
                className="search-pill-clear"
                onClick={() => setSearchQuery('')}
                title="Clear search"
                aria-label="Clear search"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Compact Status Counter & Filter Strip (3 clean filter chips) */}
        <div className="orders-top-counter-strip">
          <button
            type="button"
            className={`orders-counter-chip ${statusFilter === 'all' ? 'active' : ''}`}
            onClick={() => setStatusFilter('all')}
            title="All quotations"
          >
            <span className="counter-chip-dot dot-all"></span>
            <span className="counter-chip-label">Total</span>
            <span className="counter-chip-badge">{totalCount}</span>
          </button>

          <button
            type="button"
            className={`orders-counter-chip chip-incoming ${statusFilter === 'draft' ? 'active' : ''}`}
            onClick={() => setStatusFilter(statusFilter === 'draft' ? 'all' : 'draft')}
            title="Draft quotations"
          >
            <span className="counter-chip-dot dot-incoming"></span>
            <span className="counter-chip-label">Draft</span>
            <span className="counter-chip-badge badge-incoming">{draftCount}</span>
          </button>

          <button
            type="button"
            className={`orders-counter-chip chip-process ${statusFilter === 'approved' ? 'active' : ''}`}
            onClick={() => setStatusFilter(statusFilter === 'approved' ? 'all' : 'approved')}
            title="Approved quotations"
          >
            <span className="counter-chip-dot dot-completed"></span>
            <span className="counter-chip-label">Approved</span>
            <span className="counter-chip-badge badge-process">{approvedCount}</span>
          </button>
        </div>

        {/* Quotations List Content */}
        <div className="workers-list-wrapper">
          {loading && quotations.length === 0 ? (
            <div className="loading-state-container">
              <div className="splash-pulse-bar"></div>
              <p className="loading-text">Loading quotations...</p>
            </div>
          ) : filteredQuotations.length === 0 ? (
            <div className="empty-workers-state">
              <div className="empty-luxury-illustration">
                <svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="32" cy="32" r="30" fill="#fffbeb" stroke="#fde68a" strokeWidth="1.5" />
                  <path d="M22 16h20a4 4 0 0 1 4 4v24a4 4 0 0 1-4 4H22a4 4 0 0 1-4-4V20a4 4 0 0 1 4-4z" fill="#fef3c7" stroke="#d97706" strokeWidth="2" />
                  <line x1="24" y1="24" x2="36" y2="24" stroke="#d97706" strokeWidth="2" strokeLinecap="round" />
                  <line x1="24" y1="30" x2="36" y2="30" stroke="#d97706" strokeWidth="2" strokeLinecap="round" />
                  <line x1="24" y1="36" x2="32" y2="36" stroke="#d97706" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </div>
              <h3>{searchQuery ? 'No matching quotations' : 'No Quotations Yet'}</h3>
              <p>
                {searchQuery
                  ? `No quotes found matching "${searchQuery}". Try clearing search.`
                  : 'Create your first Quotation / Estimate with items, 2-option rates (4mm/5mm), and instant discounts!'}
              </p>
              {(isAdmin || hasPermission('quotations:create')) && (
                <button
                  type="button"
                  className="btn btn-primary btn-empty-cta"
                  onClick={() => {
                    setEditingQuotation(null);
                    setIsFormOpen(true);
                  }}
                >
                  + Create Quotation (નવો કોટેશન)
                </button>
              )}
            </div>
          ) : (
            <div className="workers-grid">
              {filteredQuotations.map((quote) => (
                <QuotationCard
                  key={quote.id}
                  quotation={quote}
                  onOpenEdit={(q) => {
                    setEditingQuotation(q);
                    setIsFormOpen(true);
                  }}
                  onDirectWhatsAppShare={handleDirectWhatsAppShare}
                  isSharing={sharingQuoteId === quote.id}
                  onDelete={(q) => setDeletingQuotation(q)}
                />
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Floating Action Button (FAB) matching Faizan Body Luxury Standard */}
      {(isAdmin || hasPermission('quotations:create')) && (
        <button
          type="button"
          className="android-fab luxury-fab quotation-fab"
          onClick={() => {
            setEditingQuotation(null);
            setIsFormOpen(true);
          }}
          title="Create New Quotation"
          aria-label="Create New Quotation"
        >
          <span className="fab-plus-icon">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </span>
          <span className="fab-label">New Quote</span>
        </button>
      )}

      {/* 1. Quotation Form Modal */}
      <QuotationFormModal
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setEditingQuotation(null);
        }}
        initialData={editingQuotation}
        onSave={handleSaveQuotation}
      />

      {/* 3. Delete Confirmation Dialog */}
      {deletingQuotation && (
        <div className="modal-backdrop-luxury luxury-glass-backdrop" onClick={() => setDeletingQuotation(null)}>
          <div className="modern-order-modal-card" style={{ maxWidth: '440px', padding: '1.5rem', textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>⚠️</div>
            <h4 style={{ margin: '0 0 0.5rem', fontSize: '1.2rem', fontWeight: 800 }}>Delete Quotation?</h4>
            <p style={{ color: '#64748b', fontSize: '0.9rem', margin: '0 0 1.5rem' }}>
              Are you sure you want to delete quotation <strong>#{deletingQuotation.quotation_no}</strong> for <strong>{deletingQuotation.customer_name}</strong>?
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
              <button
                type="button"
                className="btn btn-secondary-luxury"
                onClick={() => setDeletingQuotation(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-danger-luxury"
                onClick={handleConfirmDelete}
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hidden off-screen render container for 1-tap direct WhatsApp PDF sharing */}
      <div
        style={{
          position: 'fixed',
          top: '-99999px',
          left: '-99999px',
          width: '720px',
          visibility: 'hidden',
          pointerEvents: 'none',
          zIndex: -9999,
        }}
      >
        {sharingQuote && (
          <div id="quotation-direct-share-element" className="quotation-print-paper printable-slip">
            <QuotationPrintContent quotation={sharingQuote} isCustomerView={true} />
          </div>
        )}
      </div>

      {/* Snackbar Toast */}
      <Snackbar
        message={snackbar.message}
        type={snackbar.type}
        onClose={() => setSnackbar({ message: '', type: 'info' })}
      />
    </div>
  );
}

export default QuotationsPage;
