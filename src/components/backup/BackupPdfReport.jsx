import React, { useMemo } from 'react';

/**
 * Safe JSON Object Parser
 */
const safeObj = (v) => {
  if (!v) return {};
  if (typeof v === 'object') return v;
  try {
    const p = JSON.parse(v);
    return typeof p === 'object' && p !== null ? p : {};
  } catch {
    return {};
  }
};

/**
 * Safe Array Parser
 */
const safeArr = (v) => {
  if (!v) return [];
  if (Array.isArray(v)) return v;
  try {
    const p = JSON.parse(v);
    return Array.isArray(p) ? p : [];
  } catch {
    return [];
  }
};

/**
 * Chunk Array Helper
 */
const chunkArray = (arr, size) => {
  if (!arr || arr.length === 0) return [];
  const chunks = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
};

/**
 * BackupPdfReport
 * Complete, A-to-Z Multi-Page Printable A4 System Ledger Document
 * Prints ALL application data in authentic, module-specific FORM-WISE FORMAT:
 * - Orders: Complete Job Card Form (Cabin, Inside, Body, Finishing, Accessories, Machro)
 * - Truck Accounts: Authentic Five Star Notebook 2-Column Ledger (Jama & Udhar)
 * - Workers: Authentic Worker Khata 2-Column Ledger (Work Credit vs Upad Debit)
 * - Quotations: Complete Estimate Sheet with Body specs & line items
 * - Rojmed: Daily Cashbook Register
 * - Stock: Category Inventory & Movement Audit Log
 * - Users: Security Access Master
 */
export function BackupPdfReport({
  data,
  activeModule = 'all',
  elementId = 'printableFullBackupReport',
}) {
  const containerStyle = {
    position: 'fixed',
    top: '0px',
    left: '-9999px',
    width: '720px',
    zIndex: -1,
    pointerEvents: 'none',
    visibility: 'visible',
    opacity: 1,
    backgroundColor: '#ffffff',
  };

  if (!data) {
    return (
      <div style={containerStyle} aria-hidden="true">
        <div id={elementId} />
      </div>
    );
  }

  const orders = Array.isArray(data.orders) ? data.orders : [];
  const truckAccounts = Array.isArray(data.truckAccounts) ? data.truckAccounts : [];
  const truckAccountEntries = Array.isArray(data.truckAccountEntries) ? data.truckAccountEntries : [];
  const workers = Array.isArray(data.workers) ? data.workers : [];
  const workerTransactions = Array.isArray(data.workerTransactions) ? data.workerTransactions : [];
  const rojmedEntries = Array.isArray(data.rojmedEntries) ? data.rojmedEntries : [];
  const stockItems = Array.isArray(data.stockItems) ? data.stockItems : [];
  const stockTransactions = Array.isArray(data.stockTransactions) ? data.stockTransactions : [];
  const quotations = Array.isArray(data.quotations) ? data.quotations : [];
  const users = Array.isArray(data.users) ? data.users : [];

  // Group truck entries by account_id
  const truckEntriesByAccount = useMemo(() => {
    const map = {};
    truckAccounts.forEach((acc) => {
      map[acc.id] = { jama: [], udhar: [] };
    });
    truckAccountEntries.forEach((entry) => {
      if (!map[entry.account_id]) {
        map[entry.account_id] = { jama: [], udhar: [] };
      }
      if (entry.type === 'jama') {
        map[entry.account_id].jama.push(entry);
      } else {
        map[entry.account_id].udhar.push(entry);
      }
    });
    return map;
  }, [truckAccounts, truckAccountEntries]);

  // Group worker transactions by worker_id
  const workerTxByWorker = useMemo(() => {
    const map = {};
    workers.forEach((w) => {
      map[w.id] = { credit: [], debit: [] };
    });
    workerTransactions.forEach((tx) => {
      if (!map[tx.worker_id]) {
        map[tx.worker_id] = { credit: [], debit: [] };
      }
      const isCredit = tx.type === 'salary' || tx.type === 'work' || tx.type === 'credit';
      if (isCredit) {
        map[tx.worker_id].credit.push(tx);
      } else {
        map[tx.worker_id].debit.push(tx);
      }
    });
    return map;
  }, [workers, workerTransactions]);

  // Chunk helpers for multi-row modules
  const rojmedPages = useMemo(() => chunkArray(rojmedEntries, 20), [rojmedEntries]);
  const stockPages = useMemo(() => chunkArray(stockItems, 20), [stockItems]);
  const stockTxPages = useMemo(() => chunkArray(stockTransactions, 22), [stockTransactions]);
  const userPages = useMemo(() => chunkArray(users, 18), [users]);

  // Determine which sections to render based on activeModule
  const showOrders = activeModule === 'all' || activeModule === 'orders';
  const showTrucks = activeModule === 'all' || activeModule === 'truck_accounts';
  const showWorkers = activeModule === 'all' || activeModule === 'workers';
  const showRojmed = activeModule === 'all' || activeModule === 'rojmed';
  const showStock = activeModule === 'all' || activeModule === 'stock';
  const showQuotes = activeModule === 'all' || activeModule === 'quotations';
  const showUsers = activeModule === 'all' || activeModule === 'users';

  // Calculate total pages
  let totalPages = 1; // Cover Page
  if (showOrders) totalPages += orders.length;
  if (showTrucks) {
    truckAccounts.forEach((acc) => {
      const entries = truckEntriesByAccount[acc.id] || { jama: [], udhar: [] };
      const m = Math.max((entries.jama || []).length, (entries.udhar || []).length);
      totalPages += m === 0 ? 1 : Math.ceil(m / 18);
    });
  }
  if (showWorkers) {
    workers.forEach((w) => {
      const txs = workerTxByWorker[w.id] || { credit: [], debit: [] };
      const m = Math.max((txs.credit || []).length, (txs.debit || []).length);
      totalPages += m === 0 ? 1 : Math.ceil(m / 18);
    });
  }
  if (showQuotes) totalPages += quotations.length;
  if (showRojmed) totalPages += rojmedPages.length;
  if (showStock) totalPages += stockPages.length + (stockTxPages.length > 0 ? stockTxPages.length : 0);
  if (showUsers) totalPages += userPages.length;

  let pageCounter = 0;
  const getNextPageNum = () => {
    pageCounter++;
    return pageCounter;
  };

  const exportDateStr = data.exportedAt
    ? new Date(data.exportedAt).toLocaleString('en-IN', {
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    : new Date().toLocaleString('en-IN');

  // Shared styles
  const pageStyle = {
    width: '720px',
    minHeight: '1000px',
    boxSizing: 'border-box',
    padding: '20px 22px',
    backgroundColor: '#ffffff',
    color: '#0f172a',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif',
    WebkitFontSmoothing: 'antialiased',
    MozOsxFontSmoothing: 'grayscale',
    textRendering: 'optimizeLegibility',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    margin: '0 auto 20px',
  };

  const headerStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: '2px solid #1e3a8a',
    paddingBottom: '8px',
    marginBottom: '10px',
  };

  const footerStyle = {
    borderTop: '1px solid #cbd5e1',
    paddingTop: '6px',
    marginTop: 'auto',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: '9px',
    color: '#64748b',
    fontWeight: 600,
  };

  const tableStyle = {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '9px',
  };

  const thStyle = {
    backgroundColor: '#f1f5f9',
    color: '#1e293b',
    padding: '5px 6px',
    border: '1px solid #cbd5e1',
    fontWeight: 800,
    textAlign: 'left',
  };

  const tdStyle = {
    padding: '4px 5px',
    border: '1px solid #e2e8f0',
    color: '#334155',
  };

  return (
    <div style={containerStyle} aria-hidden="true">
      <div id={elementId}>
        {/* ================================================================= */}
        {/* PAGE 1: COVER & SYSTEM DASHBOARD                                  */}
        {/* ================================================================= */}
        <div className="pdf-page" style={pageStyle}>
          <div>
            <div style={{ textAlign: 'center', borderBottom: '2.5px solid #1e3a8a', paddingBottom: '12px', marginBottom: '14px' }}>
              <h1 style={{ margin: '0 0 3px', fontSize: '24px', fontWeight: 900, color: '#1e3a8a', letterSpacing: '0.8px' }}>
                FAIZAN BODY BUILDERS
              </h1>
              <p style={{ margin: '0 0 3px', fontSize: '11px', fontWeight: 700, color: '#475569' }}>
                Commercial Vehicle & Truck Body Fabricators • All Fabrication & Repair Works
              </p>
              <div style={{ display: 'inline-block', backgroundColor: '#eff6ff', color: '#1d4ed8', border: '1.5px solid #93c5fd', borderRadius: '16px', padding: '3px 14px', fontSize: '10.5px', fontWeight: 800, marginTop: '3px' }}>
                {activeModule === 'orders'
                  ? `🚛 WORK ORDERS REPORT (${orders.length} જોબ કાર્ડ ફોર્મ્સ)`
                  : activeModule === 'truck_accounts'
                  ? `📋 TRUCK ACCOUNTS KHATA REPORT (${truckAccounts.length} ખાતાવહી શીટ્સ)`
                  : activeModule === 'workers'
                  ? `👥 WORKERS KHATA REPORT (${workers.length} કારીગરો લેજર્સ)`
                  : activeModule === 'quotations'
                  ? `📑 QUOTATIONS ESTIMATES REPORT (${quotations.length} ઓફિશિયલ એસ્ટીમેટ્સ)`
                  : activeModule === 'rojmed'
                  ? `💰 ROJMED CASHBOOK REGISTER (${rojmedEntries.length} રોજમેળ)`
                  : activeModule === 'stock'
                  ? `🔩 STOCK INVENTORY & MOVEMENTS (${stockItems.length} સ્ટોક)`
                  : '🛡️ COMPLETE SYSTEM ALL-DATA LEDGER REPORT (સમગ્ર ડેટા - ફોર્મ વાઇસ વિગત)'}
              </div>
            </div>

            {/* Metadata Card */}
            <div style={{ backgroundColor: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '10px 12px', marginBottom: '14px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', fontSize: '10px' }}>
              <div>
                <span style={{ color: '#64748b', display: 'block', fontWeight: 600 }}>📅 રિપોર્ટ તારીખ:</span>
                <strong style={{ color: '#0f172a' }}>{exportDateStr}</strong>
              </div>
              <div>
                <span style={{ color: '#64748b', display: 'block', fontWeight: 600 }}>📁 ફોર્મેટ:</span>
                <strong style={{ color: '#16a34a' }}>Form-Wise Individual Sheets</strong>
              </div>
              <div>
                <span style={{ color: '#64748b', display: 'block', fontWeight: 600 }}>🔒 સ્કોપ:</span>
                <strong style={{ color: '#0369a1' }}>All 12 Database Tables</strong>
              </div>
            </div>

            {/* Module Overview Cards */}
            <h3 style={{ fontSize: '12px', fontWeight: 800, color: '#1e293b', margin: '0 0 8px', borderBottom: '1px solid #e2e8f0', paddingBottom: '4px' }}>
              📊 એપ્લિકેશન મોડ્યુલ ઓવરવ્યૂ (Module-Wise Overview)
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', marginBottom: '14px' }}>
              {/* Box 1 */}
              <div style={{ border: '1px solid #bfdbfe', backgroundColor: '#f0f9ff', borderRadius: '8px', padding: '8px 10px' }}>
                <span style={{ fontWeight: 800, fontSize: '11px', color: '#0369a1', display: 'block', marginBottom: '3px' }}>
                  🚛 Work Orders (ઓર્ડર્સ ફોર્મ્સ)
                </span>
                <div style={{ fontSize: '9.5px', color: '#334155' }}>
                  કુલ <strong>{orders.length}</strong> ઓર્ડર્સ (કેબિન, બોડી, અંદરનું કામ, ફિનિશિંગ, એક્સેસરીઝ સહિત તમામ ફોર્મ વિગત)
                </div>
              </div>

              {/* Box 2 */}
              <div style={{ border: '1px solid #fed7aa', backgroundColor: '#fff7ed', borderRadius: '8px', padding: '8px 10px' }}>
                <span style={{ fontWeight: 800, fontSize: '11px', color: '#c2410c', display: 'block', marginBottom: '3px' }}>
                  📋 Truck Accounts (ગાડી વાળા નું ખાતાવહી)
                </span>
                <div style={{ fontSize: '9.5px', color: '#334155' }}>
                  કુલ <strong>{truckAccounts.length}</strong> પાર્ટી ખાતાવહી • <strong>{truckAccountEntries.length}</strong> તમામ જમા-ઉધાર એન્ટ્રીઓ
                </div>
              </div>

              {/* Box 3 */}
              <div style={{ border: '1px solid #bbf7d0', backgroundColor: '#f0fdf4', borderRadius: '8px', padding: '8px 10px' }}>
                <span style={{ fontWeight: 800, fontSize: '11px', color: '#15803d', display: 'block', marginBottom: '3px' }}>
                  👥 Workers (કારીગરો હિસાબ ખાતાવહી)
                </span>
                <div style={{ fontSize: '9.5px', color: '#334155' }}>
                  કુલ <strong>{workers.length}</strong> કારીગરો • <strong>{workerTransactions.length}</strong> મજૂરી-કામ અને ઉપાડ લેજર એન્ટ્રીઓ
                </div>
              </div>

              {/* Box 4 */}
              <div style={{ border: '1px solid #e9d5ff', backgroundColor: '#faf5ff', borderRadius: '8px', padding: '8px 10px' }}>
                <span style={{ fontWeight: 800, fontSize: '11px', color: '#7e22ce', display: 'block', marginBottom: '3px' }}>
                  💰 Rojmed, 🔩 Stock & 📑 Quotations
                </span>
                <div style={{ fontSize: '9.5px', color: '#334155' }}>
                  રોજમેળ <strong>{rojmedEntries.length}</strong> એન્ટ્રી • સ્ટોક <strong>{stockItems.length}</strong> આઇટમ્સ • <strong>{quotations.length}</strong> કોટેશન્સ
                </div>
              </div>
            </div>

            {/* Table of Contents */}
            <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px 12px', backgroundColor: '#ffffff' }}>
              <h4 style={{ margin: '0 0 6px', fontSize: '11px', fontWeight: 800, color: '#334155' }}>
                📑 અનુક્રમણિકા (Table of Contents)
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '5px', fontSize: '9.5px', color: '#475569' }}>
                <div>• Section 1: Work Orders ({orders.length} જોબ કાર્ડ ફોર્મ્સ)</div>
                <div>• Section 2: Truck Accounts ({truckAccounts.length} ખાતાવહી શીટ્સ)</div>
                <div>• Section 3: Workers Khata ({workers.length} કારીગરો લેજર્સ)</div>
                <div>• Section 4: Quotations ({quotations.length} ઓફિશિયલ એસ્ટીમેટ્સ)</div>
                <div>• Section 5: Rojmed Daily Cashbook ({rojmedEntries.length} રોજમેળ)</div>
                <div>• Section 6: Stock Master & Movements ({stockItems.length} સ્ટોક)</div>
                <div>• Section 7: Users & Security ({users.length} સિસ્ટમ યુઝર્સ)</div>
                <div style={{ gridColumn: 'span 2', fontWeight: 800, color: '#0f172a', paddingTop: '4px', borderTop: '1px dashed #cbd5e1' }}>
                  • Total Complete Document Pages: <strong>{totalPages} Pages</strong>
                </div>
              </div>
            </div>
          </div>

          <div style={footerStyle}>
            <span>Faizan Body Works • Form-Wise System Ledger Document</span>
            <span>Generated: {exportDateStr}</span>
            <span style={{ fontWeight: 800, color: '#0f172a' }}>Page {getNextPageNum()} of {totalPages}</span>
          </div>
        </div>

        {/* ================================================================= */}
        {/* SECTION 1: WORK ORDERS (જોબ કાર્ડ ફોર્મ વાઇસ)                       */}
        {/* ================================================================= */}
        {showOrders &&
          orders.map((order, oIdx) => {
            const pageNum = getNextPageNum();
            const cabin = safeObj(order.cabin_work);
            const inside = safeObj(order.inside_work);
            const body = safeObj(order.body_work);
            const access = safeObj(order.accessories);
            const finish = safeObj(order.finishing_work);
            const machro = safeObj(order.machro);

            const cabinItems = cabin.items || {};
            const insideItems = inside.items || {};
            const bodyItems = body.items || {};
            const accessItems = access.items || {};
            const machroItems = machro.items || {};

            const isDone = order.status === 'Completed' || order.status === 'Delivered';

            return (
              <div key={`order-form-${order.id || oIdx}`} className="pdf-page" style={pageStyle}>
                <div>
                  {/* Top Order Job Card Header */}
                  <div style={headerStyle}>
                    <div>
                      <h2 style={{ margin: '0 0 2px', fontSize: '15px', fontWeight: 900, color: '#1e3a8a' }}>
                        FAIZAN BODY BUILDERS • WORK ORDER #{order.order_no || order.id}
                      </h2>
                      <span style={{ fontSize: '9.5px', fontWeight: 700, color: '#0369a1' }}>
                        🚛 SECTION 1: વાહન અને બોડી જોબ કાર્ડ (Order {oIdx + 1} of {orders.length})
                      </span>
                    </div>
                    <div>
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '2px 8px',
                          borderRadius: '4px',
                          backgroundColor: isDone ? '#dcfce7' : '#eff6ff',
                          color: isDone ? '#15803d' : '#1d4ed8',
                          fontSize: '10px',
                          fontWeight: 800,
                        }}
                      >
                        {order.status || 'In Progress'}
                      </span>
                    </div>
                  </div>

                  {/* Order Details Master Grid */}
                  <div
                    style={{
                      border: '1.5px solid #0284c7',
                      borderRadius: '6px',
                      padding: '8px 10px',
                      backgroundColor: '#f8fafc',
                      marginBottom: '10px',
                      display: 'grid',
                      gridTemplateColumns: 'repeat(4, 1fr)',
                      gap: '6px',
                      fontSize: '9.5px',
                    }}
                  >
                    <div>
                      <span style={{ color: '#64748b', display: 'block', fontSize: '8.5px', fontWeight: 600 }}>Order Date:</span>
                      <strong style={{ color: '#0f172a' }}>{order.order_date ? String(order.order_date).slice(0, 10) : '—'}</strong>
                    </div>
                    <div>
                      <span style={{ color: '#64748b', display: 'block', fontSize: '8.5px', fontWeight: 600 }}>Condition:</span>
                      <strong style={{ color: '#0f172a' }}>{order.condition_text || 'Regular'}</strong>
                    </div>
                    <div style={{ gridColumn: 'span 2' }}>
                      <span style={{ color: '#64748b', display: 'block', fontSize: '8.5px', fontWeight: 600 }}>Owner Name:</span>
                      <strong style={{ color: '#1e3a8a', fontSize: '11px' }}>{order.owner_name || '—'}</strong>
                      {order.mobile_number && <span style={{ color: '#475569', marginLeft: '6px' }}>({order.mobile_number})</span>}
                    </div>
                    <div>
                      <span style={{ color: '#64748b', display: 'block', fontSize: '8.5px', fontWeight: 600 }}>Entry Date:</span>
                      <strong style={{ color: '#0f172a' }}>{order.entry_date ? String(order.entry_date).slice(0, 10) : '—'}</strong>
                    </div>
                    <div>
                      <span style={{ color: '#64748b', display: 'block', fontSize: '8.5px', fontWeight: 600 }}>Delivery Date:</span>
                      <strong style={{ color: '#15803d' }}>{order.delivery_date ? String(order.delivery_date).slice(0, 10) : '—'}</strong>
                    </div>
                    <div>
                      <span style={{ color: '#64748b', display: 'block', fontSize: '8.5px', fontWeight: 600 }}>Truck / Chassis No:</span>
                      <strong style={{ color: '#0f172a', fontSize: '10.5px' }}>{order.truck_chassis_no || '—'}</strong>
                    </div>
                    <div>
                      <span style={{ color: '#64748b', display: 'block', fontSize: '8.5px', fontWeight: 600 }}>Shade No:</span>
                      <strong style={{ color: '#b45309', fontSize: '10.5px', backgroundColor: '#fef3c7', padding: '1px 5px', borderRadius: '3px' }}>
                        {order.shade_no ? `Shade ${order.shade_no}` : '—'}
                      </strong>
                    </div>
                  </div>

                  {/* 6 Work Specification Sections Form Layout */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', marginBottom: '8px' }}>
                    {/* LEFT COLUMN: Cabin Work, Inside Work, Accessories */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {/* 1. કેબિન વર્ક */}
                      <div style={{ border: '1px solid #cbd5e1', borderRadius: '6px', padding: '6px 8px', backgroundColor: '#ffffff' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '3px', marginBottom: '4px' }}>
                          <span style={{ fontWeight: 800, fontSize: '10px', color: '#1e3a8a' }}>કેબિન વર્ક (CABIN WORK)</span>
                          <span style={{ fontSize: '8.5px', color: '#64748b' }}>
                            {safeArr(cabin.boxes).filter(Boolean).join(' • ') || '—'}
                          </span>
                        </div>
                        <div style={{ fontSize: '8.5px', lineHeight: 1.45, color: '#334155' }}>
                          <div>• મોરો: <strong>{cabinItems.moro?.value || '—'}</strong> {cabinItems.moro?.done ? '✓' : ''}</div>
                          <div>• પીઠ: <strong>{cabinItems.peeth?.value || '—'}</strong> {cabinItems.peeth?.done ? '✓' : ''}</div>
                          <div>• પાનલ/દરવાજા ની છાપણી: <strong>{cabinItems.panal_chhapni?.value || '—'}</strong> {cabinItems.panal_chhapni?.done ? '✓' : ''}</div>
                          <div>• પગા ની ખિડકી: <strong>{cabinItems.paga_khidki?.value || '—'}</strong> {cabinItems.paga_khidki?.done ? '✓' : ''}</div>
                          <div>• ડેશબોર્ડ પ્રકાર: <strong>{cabinItems.dashboard_prakar?.value || '—'}</strong> {cabinItems.dashboard_prakar?.done ? '✓' : ''}</div>
                          <div>• અન્ય કામ: <strong>{cabinItems.anya_kaam?.value || '—'}</strong> {cabinItems.anya_kaam?.done ? '✓' : ''}</div>
                        </div>
                      </div>

                      {/* 2. અંદરનું કામ */}
                      <div style={{ border: '1px solid #cbd5e1', borderRadius: '6px', padding: '6px 8px', backgroundColor: '#ffffff' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '3px', marginBottom: '4px' }}>
                          <span style={{ fontWeight: 800, fontSize: '10px', color: '#0369a1' }}>અંદરનું કામ (INSIDE WORK)</span>
                          <span style={{ fontSize: '8.5px', color: '#64748b' }}>
                            {safeArr(inside.boxes).filter(Boolean).join(' • ') || '—'}
                          </span>
                        </div>
                        <div style={{ fontSize: '8.5px', lineHeight: 1.45, color: '#334155' }}>
                          <div>• ફર્નિચર / ફોર ટી: <strong>{insideItems.niyamit_furniture_four_t?.value || '—'}</strong> {insideItems.niyamit_furniture_four_t?.done ? '✓' : ''}</div>
                          <div>• સ્પીકર સાઈઝ: <strong>{insideItems.speaker_size?.value || '—'}</strong> {insideItems.speaker_size?.done ? '✓' : ''}</div>
                          <div>• સોફા સીટ: <strong>{insideItems.sofa_seat?.value || '—'}</strong> {insideItems.sofa_seat?.done ? '✓' : ''}</div>
                          <div>• કેરિયલ / કેરિયર: <strong>{insideItems.carrier?.value || '—'}</strong> {insideItems.carrier?.done ? '✓' : ''}</div>
                          <div>• અન્ય કામ: <strong>{insideItems.anya_kaam?.value || '—'}</strong> {insideItems.anya_kaam?.done ? '✓' : ''}</div>
                        </div>
                      </div>

                      {/* 3. એક્સેસરીઝ */}
                      <div style={{ border: '1px solid #cbd5e1', borderRadius: '6px', padding: '6px 8px', backgroundColor: '#ffffff' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '3px', marginBottom: '4px' }}>
                          <span style={{ fontWeight: 800, fontSize: '10px', color: '#c2410c' }}>એક્સેસરીઝ (ACCESSORIES)</span>
                          <span style={{ fontSize: '8.5px', color: '#64748b' }}>
                            {safeArr(access.boxes).filter(Boolean).join(' • ') || '—'}
                          </span>
                        </div>
                        <div style={{ fontSize: '8.5px', lineHeight: 1.45, color: '#334155' }}>
                          <div>• નિયમિત: <strong>{accessItems.niyamit?.value || '—'}</strong> {accessItems.niyamit?.done ? '✓' : ''}</div>
                          <div>• બારી પ્રકાર: <strong>{accessItems.bari_prakar?.value || '—'}</strong> {accessItems.bari_prakar?.done ? '✓' : ''}</div>
                          <div>• અન્ય કામ: <strong>{accessItems.anya_kaam?.value || '—'}</strong> {accessItems.anya_kaam?.done ? '✓' : ''}</div>
                        </div>
                      </div>
                    </div>

                    {/* RIGHT COLUMN: Body Work, Finishing, Machro */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {/* 4. બોડી વર્ક */}
                      <div style={{ border: '1px solid #cbd5e1', borderRadius: '6px', padding: '6px 8px', backgroundColor: '#ffffff' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '3px', marginBottom: '4px' }}>
                          <span style={{ fontWeight: 800, fontSize: '10px', color: '#15803d' }}>બોડી વર્ક (BODY WORK)</span>
                          <span style={{ fontSize: '8.5px', color: '#64748b' }}>
                            {safeArr(body.boxes).filter(Boolean).join(' • ') || '—'}
                          </span>
                        </div>
                        <div style={{ fontSize: '8.5px', lineHeight: 1.45, color: '#334155' }}>
                          <div>• રનર: <strong>{bodyItems.runner?.value || '—'}</strong> {bodyItems.runner?.done ? '✓' : ''}</div>
                          <div>• પાછળની વેલ: <strong>{bodyItems.peeche_vel?.value || '—'}</strong> {bodyItems.peeche_vel?.done ? '✓' : ''}</div>
                          <div>• સાઈડ ખિડકી: <strong>{bodyItems.side_khidki?.value || '—'}</strong> {bodyItems.side_khidki?.done ? '✓' : ''}</div>
                          <div>• સાઈડ પ્રકાર: <strong>{bodyItems.side_prakar?.value || '—'}</strong> {bodyItems.side_prakar?.done ? '✓' : ''}</div>
                          <div>• ફાલકા પ્રકાર: <strong>{bodyItems.falka_prakar?.value || '—'}</strong> {bodyItems.falka_prakar?.done ? '✓' : ''}</div>
                          <div>• સાઈડ ઊંચાઈ: <strong>{bodyItems.side_oonchai?.value || '—'}</strong> {bodyItems.side_oonchai?.done ? '✓' : ''}</div>
                          <div>• પ્લેટ મોટાઈ: <strong>{bodyItems.plate_motai_mm?.value || '—'}</strong> {bodyItems.plate_motai_mm?.done ? '✓' : ''}</div>
                          <div>• ધોકા લંબાઈ / માત્રા: <strong>{bodyItems.dhokha_lambai_matra?.value || '—'}</strong> {bodyItems.dhokha_lambai_matra?.done ? '✓' : ''}</div>
                          <div>• પાછળની જાળી પ્રકાર: <strong>{bodyItems.peeche_jaali_prakar?.value || '—'}</strong> {bodyItems.peeche_jaali_prakar?.done ? '✓' : ''}</div>
                          <div>• અન્ય કામ: <strong>{bodyItems.anya_kaam?.value || '—'}</strong> {bodyItems.anya_kaam?.done ? '✓' : ''}</div>
                        </div>
                      </div>

                      {/* 5. ફિનિશિંગ વર્ક */}
                      <div style={{ border: '1px solid #cbd5e1', borderRadius: '6px', padding: '6px 8px', backgroundColor: '#ffffff' }}>
                        <div style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '3px', marginBottom: '4px' }}>
                          <span style={{ fontWeight: 800, fontSize: '10px', color: '#7e22ce' }}>ફિનિશિંગ વર્ક (FINISHING)</span>
                        </div>
                        <div style={{ fontSize: '8.5px', lineHeight: 1.45, color: '#334155' }}>
                          <div>• કલર: <strong>{finish.color?.value || '—'}</strong> {finish.color?.done ? '✓' : ''}</div>
                          <div>• રેડિયમ: <strong>{finish.redium?.value || '—'}</strong> {finish.redium?.done ? '✓' : ''}</div>
                          <div>• વાયરીંગ: <strong>{finish.vayring?.value || '—'}</strong> {finish.vayring?.done ? '✓' : ''}</div>
                          <div>• પેઇન્ટિંગ: <strong>{finish.painting?.value || '—'}</strong> {finish.painting?.done ? '✓' : ''}</div>
                        </div>
                      </div>

                      {/* 6. માછરો */}
                      <div style={{ border: '1px solid #cbd5e1', borderRadius: '6px', padding: '6px 8px', backgroundColor: '#ffffff' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '3px', marginBottom: '4px' }}>
                          <span style={{ fontWeight: 800, fontSize: '10px', color: '#0f766e' }}>માછરો (MACHRO)</span>
                          <span style={{ fontSize: '8.5px', color: '#64748b' }}>
                            {safeArr(machro.boxes).filter(Boolean).join(' • ') || '—'}
                          </span>
                        </div>
                        <div style={{ fontSize: '8.5px', lineHeight: 1.45, color: '#334155' }}>
                          <div>• ધાર: <strong>{machroItems.dhar?.value || '—'}</strong> {machroItems.dhar?.done ? '✓' : ''}</div>
                          <div>• ભાયા માત્રા / પ્રકાર: <strong>{machroItems.bhaya_matra_prakar?.value || '—'}</strong> {machroItems.bhaya_matra_prakar?.done ? '✓' : ''}</div>
                          <div>• ટોપ પાઇપ / એંગલ: <strong>{machroItems.top_pipe_angle_prakar?.value || '—'}</strong> {machroItems.top_pipe_angle_prakar?.done ? '✓' : ''}</div>
                          <div>• પ્લેટ ઊંચાઈ થાંભલા: <strong>{machroItems.plate_oonchai_thambhla?.value || '—'}</strong> {machroItems.plate_oonchai_thambhla?.done ? '✓' : ''}</div>
                          <div>• સાઈડ પાઇપ: <strong>{machroItems.side_pipe_matra_prakar?.value || '—'}</strong> {machroItems.side_pipe_matra_prakar?.done ? '✓' : ''}</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Order Notes & Signature Box */}
                  <div style={{ border: '1px solid #cbd5e1', borderRadius: '6px', padding: '6px 8px', backgroundColor: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '9px' }}>
                    <div style={{ flex: 1, paddingRight: '12px' }}>
                      <span style={{ fontWeight: 700, color: '#475569', display: 'block' }}>વિશેષ નોંધ (Special Notes):</span>
                      <span style={{ color: '#0f172a' }}>{order.notes || 'કોઈ વિશેષ નોંધ નથી.'}</span>
                    </div>
                    <div style={{ display: 'flex', gap: '20px' }}>
                      <div style={{ textAlign: 'center', minWidth: '90px', borderTop: '1px dashed #64748b', paddingTop: '3px', marginTop: '14px', fontSize: '8px', color: '#64748b' }}>
                        MD Signature (સહી)
                      </div>
                      <div style={{ textAlign: 'center', minWidth: '90px', borderTop: '1px dashed #64748b', paddingTop: '3px', marginTop: '14px', fontSize: '8px', color: '#64748b' }}>
                        Party Signature (ગ્રાહક સહી)
                      </div>
                    </div>
                  </div>
                </div>

                <div style={footerStyle}>
                  <span>Faizan Body Works • Work Order Job Card #{order.order_no}</span>
                  <span>Section 1 • Order {oIdx + 1}</span>
                  <span style={{ fontWeight: 800, color: '#0f172a' }}>Page {pageNum} of {totalPages}</span>
                </div>
              </div>
            );
          })}

        {/* ================================================================= */}
        {/* SECTION 2: TRUCK ACCOUNTS (ગાડી વાળા નું ખાતાવહી - FIVE STAR FORM)  */}
        {/* ================================================================= */}
        {showTrucks &&
          truckAccounts.map((account, aIdx) => {
            const entries = truckEntriesByAccount[account.id] || { jama: [], udhar: [] };
            const jamaRows = entries.jama || [];
            const udharRows = entries.udhar || [];

            const totalUdhar = udharRows.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
            const totalJama = jamaRows.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
            const balanceDue = totalUdhar - totalJama;
            const isSettled = balanceDue === 0;

            const maxRows = Math.max(jamaRows.length, udharRows.length);
            const rowsPerPage = 18;
            const totalAccountPages = maxRows === 0 ? 1 : Math.ceil(maxRows / rowsPerPage);
            const pageIndices = Array.from({ length: totalAccountPages }, (_, i) => i);

            return pageIndices.map((pIdx) => {
              const pageNum = getNextPageNum();
              const pageJama = jamaRows.slice(pIdx * rowsPerPage, (pIdx + 1) * rowsPerPage);
              const pageUdhar = udharRows.slice(pIdx * rowsPerPage, (pIdx + 1) * rowsPerPage);
              const isLastPage = pIdx === totalAccountPages - 1;

              return (
                <div key={`truck-form-${account.id || aIdx}-p-${pIdx}`} className="pdf-page" style={pageStyle}>
                  <div>
                    {/* Brand & Notebook Top Header Banner */}
                    <div style={headerStyle}>
                      <div>
                        <h2 style={{ margin: '0 0 2px', fontSize: '15px', fontWeight: 900, color: '#1e3a8a' }}>
                          FAIZAN BODY WORKS • TRUCK KHATA VAHI
                        </h2>
                        <span style={{ fontSize: '9.5px', fontWeight: 700, color: '#c2410c' }}>
                          📋 SECTION 2: ગાડી વાળા નું ખાતાવહી (Ledger {aIdx + 1} of {truckAccounts.length}{totalAccountPages > 1 ? ` • Part ${pIdx + 1}/${totalAccountPages}` : ''})
                        </span>
                      </div>
                      <div style={{ border: '1.5px solid #0f172a', padding: '2px 8px', borderRadius: '4px', textAlign: 'center', backgroundColor: '#f8fafc' }}>
                        <div style={{ fontSize: '7.5px', fontWeight: 800, color: '#64748b' }}>PAGE</div>
                        <div style={{ fontSize: '13px', fontWeight: 900, color: '#0f172a' }}>{account.page_no || '—'}</div>
                      </div>
                    </div>

                    {/* Customer Notebook Header Info */}
                    <div
                      style={{
                        border: '1.5px solid #cbd5e1',
                        borderRadius: '6px',
                        padding: '8px 10px',
                        backgroundColor: '#fff7ed',
                        marginBottom: '10px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        fontSize: '9.5px',
                      }}
                    >
                      <div>
                        <div style={{ fontSize: '12px', fontWeight: 900, color: '#9a3412', marginBottom: '2px' }}>
                          Name / નામ: {account.party_name}
                        </div>
                        <div style={{ color: '#475569', fontSize: '9px' }}>
                          {account.truck_no ? `Truck: ${account.truck_no} • ` : ''}
                          {account.phone ? `Phone: ${account.phone} • ` : ''}
                          {account.address ? `City: ${account.address} • ` : ''}
                          Round: {account.current_cycle || 1}
                        </div>
                      </div>
                      <div>
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '2px 8px',
                            borderRadius: '4px',
                            backgroundColor: isSettled ? '#dcfce7' : '#fee2e2',
                            color: isSettled ? '#15803d' : '#b91c1c',
                            fontWeight: 800,
                            fontSize: '10px',
                          }}
                        >
                          {isSettled ? 'સરભર (Settled)' : `બાકી: ₹${balanceDue.toLocaleString('en-IN')}`}
                        </span>
                      </div>
                    </div>

                    {/* Authentic 2-Column Five Star Ledger Grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', marginBottom: '10px' }}>
                      {/* Left Column: જ. JAMA (રોકડા જમા / રકમ જમા) */}
                      <div style={{ border: '1px solid #86efac', borderRadius: '6px', overflow: 'hidden' }}>
                        <div style={{ backgroundColor: '#f0fdf4', borderBottom: '1px solid #86efac', padding: '4px 6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontWeight: 800, fontSize: '9.5px', color: '#166534' }}>જ. JAMA (રકમ જમા)</span>
                          <span style={{ fontSize: '8.5px', color: '#15803d', fontWeight: 700 }}>
                            {jamaRows.length} Entries {totalAccountPages > 1 ? `(${pIdx * rowsPerPage + 1}-${Math.min((pIdx + 1) * rowsPerPage, jamaRows.length)})` : ''}
                          </span>
                        </div>
                        <table style={tableStyle}>
                          <thead>
                            <tr>
                              <th style={{ ...thStyle, width: '20px', textAlign: 'center' }}>#</th>
                              <th style={{ ...thStyle, width: '50px' }}>તારીખ</th>
                              <th style={thStyle}>PARTICULARS (વિગત)</th>
                              <th style={{ ...thStyle, textAlign: 'right', width: '65px' }}>રૂપિયા ₹</th>
                            </tr>
                          </thead>
                          <tbody>
                            {pageJama.length === 0 ? (
                              <tr>
                                <td colSpan="4" style={{ textAlign: 'center', padding: '16px', color: '#94a3b8', fontStyle: 'italic', fontSize: '9px' }}>
                                  {pIdx === 0 ? 'કોઈ જમા એન્ટ્રી નથી' : 'આ પેજ પર જમા એન્ટ્રી નથી'}
                                </td>
                              </tr>
                            ) : (
                              pageJama.map((r, i) => (
                                <tr key={r.id || i}>
                                  <td style={{ ...tdStyle, textAlign: 'center', fontWeight: 600 }}>{pIdx * rowsPerPage + i + 1}</td>
                                  <td style={{ ...tdStyle, fontSize: '8.5px' }}>{r.date ? String(r.date).slice(5).replace('-', '/') : '—'}</td>
                                  <td style={{ ...tdStyle, fontWeight: 600 }}>{r.particulars || 'રોકડા જમા'}</td>
                                  <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 700, color: '#16a34a' }}>
                                    ₹{Number(r.amount).toLocaleString('en-IN')}
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                        {isLastPage && (
                          <div style={{ backgroundColor: '#f0fdf4', borderTop: '1px solid #86efac', padding: '4px 6px', display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: '9px', color: '#15803d' }}>
                            <span>ટોટલ જમા (Received):</span>
                            <span>₹{totalJama.toLocaleString('en-IN')}/-</span>
                          </div>
                        )}
                      </div>

                      {/* Right Column: ઉ. UDHAR (ગાડી ની કિંમત / ખર્ચ / બિલ) */}
                      <div style={{ border: '1px solid #fca5a5', borderRadius: '6px', overflow: 'hidden' }}>
                        <div style={{ backgroundColor: '#fef2f2', borderBottom: '1px solid #fca5a5', padding: '4px 6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontWeight: 800, fontSize: '9.5px', color: '#991b1b' }}>ઉ. UDHAR (બિલ / ખર્ચ)</span>
                          <span style={{ fontSize: '8.5px', color: '#b91c1c', fontWeight: 700 }}>
                            {udharRows.length} Entries {totalAccountPages > 1 ? `(${pIdx * rowsPerPage + 1}-${Math.min((pIdx + 1) * rowsPerPage, udharRows.length)})` : ''}
                          </span>
                        </div>
                        <table style={tableStyle}>
                          <thead>
                            <tr>
                              <th style={{ ...thStyle, width: '20px', textAlign: 'center' }}>#</th>
                              <th style={thStyle}>PARTICULARS (વિગત)</th>
                              <th style={{ ...thStyle, textAlign: 'right', width: '65px' }}>રૂપિયા ₹</th>
                              <th style={{ ...thStyle, width: '50px' }}>તારીખ</th>
                            </tr>
                          </thead>
                          <tbody>
                            {pageUdhar.length === 0 ? (
                              <tr>
                                <td colSpan="4" style={{ textAlign: 'center', padding: '16px', color: '#94a3b8', fontStyle: 'italic', fontSize: '9px' }}>
                                  {pIdx === 0 ? 'કોઈ ઉધાર એન્ટ્રી નથી' : 'આ પેજ પર ઉધાર એન્ટ્રી નથી'}
                                </td>
                              </tr>
                            ) : (
                              pageUdhar.map((r, i) => (
                                <tr key={r.id || i}>
                                  <td style={{ ...tdStyle, textAlign: 'center', fontWeight: 600 }}>{pIdx * rowsPerPage + i + 1}</td>
                                  <td style={{ ...tdStyle, fontWeight: 600 }}>{r.particulars || 'ગાડી ની કિંમત / ખર્ચ'}</td>
                                  <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 700, color: '#b45309' }}>
                                    ₹{Number(r.amount).toLocaleString('en-IN')}
                                  </td>
                                  <td style={{ ...tdStyle, fontSize: '8.5px' }}>{r.date ? String(r.date).slice(5).replace('-', '/') : '—'}</td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                        {isLastPage && (
                          <div style={{ backgroundColor: '#fef2f2', borderTop: '1px solid #fca5a5', padding: '4px 6px', display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: '9px', color: '#b45309' }}>
                            <span>ટોટલ ઉધાર / બિલ:</span>
                            <span>₹{totalUdhar.toLocaleString('en-IN')}/-</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Bottom Notebook Calculation Box (Matches Five Star Notebook) */}
                    {isLastPage ? (
                      <div
                        style={{
                          border: '1.5px solid #0f172a',
                          borderRadius: '8px',
                          padding: '8px 12px',
                          backgroundColor: '#ffffff',
                          maxWidth: '380px',
                          marginLeft: 'auto',
                          fontSize: '10px',
                          boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                          <span style={{ fontWeight: 700, color: '#334155' }}>ટોટલ બિલ / ઉધાર:</span>
                          <strong style={{ color: '#b45309' }}>₹{totalUdhar.toLocaleString('en-IN')}/-</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px', borderBottom: '1.5px solid #0f172a', paddingBottom: '3px' }}>
                          <span style={{ fontWeight: 700, color: '#334155' }}>- ટોટલ જમા (મળેલ):</span>
                          <strong style={{ color: '#15803d' }}>- ₹{totalJama.toLocaleString('en-IN')}/-</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '3px', fontSize: '11px', fontWeight: 900 }}>
                          <span style={{ color: isSettled ? '#15803d' : '#b91c1c' }}>
                            {isSettled ? 'સરભર (Settled):' : 'બાકી રકમ (Balance Due):'}
                          </span>
                          <span style={{ color: isSettled ? '#15803d' : '#b91c1c' }}>
                            ₹{Math.abs(balanceDue).toLocaleString('en-IN')}/-
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div style={{ textAlign: 'right', fontSize: '9px', color: '#64748b', fontStyle: 'italic', padding: '4px' }}>
                        બાકી હિસાબ આગળના પેજ પર ચાલુ... (Continued on next page)
                      </div>
                    )}
                  </div>

                  <div style={footerStyle}>
                    <span>Faizan Body Works • Five Star Truck Khata Ledger</span>
                    <span>Section 2 • {account.party_name}{totalAccountPages > 1 ? ` (Part ${pIdx + 1}/${totalAccountPages})` : ''}</span>
                    <span style={{ fontWeight: 800, color: '#0f172a' }}>Page {pageNum} of {totalPages}</span>
                  </div>
                </div>
              );
            });
          })}

        {/* ================================================================= */}
        {/* SECTION 3: WORKERS KHATA (કારીગરો હિસાબ - KHATA VAHI FORM)           */}
        {/* ================================================================= */}
        {showWorkers &&
          workers.map((worker, wIdx) => {
            const txs = workerTxByWorker[worker.id] || { credit: [], debit: [] };
            const creditRows = txs.credit || [];
            const debitRows = txs.debit || [];

            const totalWork = creditRows.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
            const totalUpad = debitRows.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
            const netBalance = totalWork - totalUpad;
            const isPresent = !worker.going_date;

            const maxRows = Math.max(creditRows.length, debitRows.length);
            const rowsPerPage = 18;
            const totalWorkerPages = maxRows === 0 ? 1 : Math.ceil(maxRows / rowsPerPage);
            const pageIndices = Array.from({ length: totalWorkerPages }, (_, i) => i);

            return pageIndices.map((wpIdx) => {
              const pageNum = getNextPageNum();
              const pageCredit = creditRows.slice(wpIdx * rowsPerPage, (wpIdx + 1) * rowsPerPage);
              const pageDebit = debitRows.slice(wpIdx * rowsPerPage, (wpIdx + 1) * rowsPerPage);
              const isLastPage = wpIdx === totalWorkerPages - 1;

              return (
                <div key={`worker-form-${worker.id || wIdx}-p-${wpIdx}`} className="pdf-page" style={pageStyle}>
                  <div>
                    {/* Top Worker Khata Header */}
                    <div style={headerStyle}>
                      <div>
                        <h2 style={{ margin: '0 0 2px', fontSize: '15px', fontWeight: 900, color: '#1e3a8a' }}>
                          FAIZAN BODY BUILDERS • WORKER KHATA VAHI
                        </h2>
                        <span style={{ fontSize: '9.5px', fontWeight: 700, color: '#15803d' }}>
                          👥 SECTION 3: કારીગરો હિસાબ ખાતાવહી (Worker {wIdx + 1} of {workers.length}{totalWorkerPages > 1 ? ` • Part ${wpIdx + 1}/${totalWorkerPages}` : ''})
                        </span>
                      </div>
                      <div>
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '2px 8px',
                            borderRadius: '4px',
                            backgroundColor: isPresent ? '#dcfce7' : '#fee2e2',
                            color: isPresent ? '#15803d' : '#b91c1c',
                            fontWeight: 800,
                            fontSize: '9.5px',
                          }}
                        >
                          {isPresent ? 'Active On Duty (હાજર)' : 'Inactive / Left'}
                        </span>
                      </div>
                    </div>

                    {/* Worker Profile Card */}
                    <div
                      style={{
                        border: '1.5px solid #bbf7d0',
                        borderRadius: '6px',
                        padding: '8px 10px',
                        backgroundColor: '#f0fdf4',
                        marginBottom: '10px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        fontSize: '9.5px',
                      }}
                    >
                      <div>
                        <div style={{ fontSize: '12px', fontWeight: 900, color: '#14532d', marginBottom: '2px' }}>
                          Worker Name: {worker.name}
                        </div>
                        <div style={{ color: '#475569', fontSize: '9px' }}>
                          {worker.mobile ? `Mobile: ${worker.mobile} • ` : ''}
                          Coming: {worker.coming_date ? String(worker.coming_date).slice(0, 10) : '—'} •{' '}
                          Going: {worker.going_date ? String(worker.going_date).slice(0, 10) : 'હાજર'}
                        </div>
                      </div>
                      <div>
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '2px 8px',
                            borderRadius: '4px',
                            backgroundColor: netBalance >= 0 ? '#dcfce7' : '#fee2e2',
                            color: netBalance >= 0 ? '#15803d' : '#b91c1c',
                            fontWeight: 800,
                            fontSize: '10px',
                          }}
                        >
                          {netBalance >= 0 ? `બાકી પાવતી: ₹${netBalance.toLocaleString('en-IN')}` : `ઉપાડ બાકી: ₹${Math.abs(netBalance).toLocaleString('en-IN')}`}
                        </span>
                      </div>
                    </div>

                    {/* 2-Column Worker Ledger Grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', marginBottom: '10px' }}>
                      {/* Left: કામ / મજૂરી / પગાર (Credit) */}
                      <div style={{ border: '1px solid #86efac', borderRadius: '6px', overflow: 'hidden' }}>
                        <div style={{ backgroundColor: '#f0fdf4', borderBottom: '1px solid #86efac', padding: '4px 6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontWeight: 800, fontSize: '9.5px', color: '#166534' }}>કામ / મજૂરી / પગાર (Credit)</span>
                          <span style={{ fontSize: '8.5px', color: '#15803d', fontWeight: 700 }}>
                            {creditRows.length} Entries {totalWorkerPages > 1 ? `(${wpIdx * rowsPerPage + 1}-${Math.min((wpIdx + 1) * rowsPerPage, creditRows.length)})` : ''}
                          </span>
                        </div>
                        <table style={tableStyle}>
                          <thead>
                            <tr>
                              <th style={{ ...thStyle, width: '20px', textAlign: 'center' }}>#</th>
                              <th style={{ ...thStyle, width: '55px' }}>તારીખ</th>
                              <th style={thStyle}>વિગત / નોંધ (Work Done)</th>
                              <th style={{ ...thStyle, textAlign: 'right', width: '65px' }}>રૂપિયા ₹</th>
                            </tr>
                          </thead>
                          <tbody>
                            {pageCredit.length === 0 ? (
                              <tr>
                                <td colSpan="4" style={{ textAlign: 'center', padding: '16px', color: '#94a3b8', fontStyle: 'italic', fontSize: '9px' }}>
                                  {wpIdx === 0 ? 'કોઈ કામ / પગાર એન્ટ્રી નથી' : 'આ પેજ પર કામ એન્ટ્રી નથી'}
                                </td>
                              </tr>
                            ) : (
                              pageCredit.map((r, i) => (
                                <tr key={r.id || i}>
                                  <td style={{ ...tdStyle, textAlign: 'center', fontWeight: 600 }}>{wpIdx * rowsPerPage + i + 1}</td>
                                  <td style={{ ...tdStyle, fontSize: '8.5px' }}>{r.date ? String(r.date).slice(0, 10) : '—'}</td>
                                  <td style={{ ...tdStyle, fontWeight: 600 }}>{r.notes || 'કામ / પગાર જમા'}</td>
                                  <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 700, color: '#16a34a' }}>
                                    ₹{Number(r.amount).toLocaleString('en-IN')}
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                        {isLastPage && (
                          <div style={{ backgroundColor: '#f0fdf4', borderTop: '1px solid #86efac', padding: '4px 6px', display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: '9px', color: '#15803d' }}>
                            <span>કુલ કામ (Total Work):</span>
                            <span>₹{totalWork.toLocaleString('en-IN')}/-</span>
                          </div>
                        )}
                      </div>

                      {/* Right: ઉપાડ / એડવાન્સ (Debit) */}
                      <div style={{ border: '1px solid #fed7aa', borderRadius: '6px', overflow: 'hidden' }}>
                        <div style={{ backgroundColor: '#fff7ed', borderBottom: '1px solid #fed7aa', padding: '4px 6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontWeight: 800, fontSize: '9.5px', color: '#c2410c' }}>ઉપાડ / એડવાન્સ (Debit)</span>
                          <span style={{ fontSize: '8.5px', color: '#ea580c', fontWeight: 700 }}>
                            {debitRows.length} Entries {totalWorkerPages > 1 ? `(${wpIdx * rowsPerPage + 1}-${Math.min((wpIdx + 1) * rowsPerPage, debitRows.length)})` : ''}
                          </span>
                        </div>
                        <table style={tableStyle}>
                          <thead>
                            <tr>
                              <th style={{ ...thStyle, width: '20px', textAlign: 'center' }}>#</th>
                              <th style={{ ...thStyle, width: '55px' }}>તારીખ</th>
                              <th style={thStyle}>વિગત / નોંધ (Advance)</th>
                              <th style={{ ...thStyle, textAlign: 'right', width: '65px' }}>રૂપિયા ₹</th>
                            </tr>
                          </thead>
                          <tbody>
                            {pageDebit.length === 0 ? (
                              <tr>
                                <td colSpan="4" style={{ textAlign: 'center', padding: '16px', color: '#94a3b8', fontStyle: 'italic', fontSize: '9px' }}>
                                  {wpIdx === 0 ? 'કોઈ ઉપાડ એન્ટ્રી નથી' : 'આ પેજ પર ઉપાડ એન્ટ્રી નથી'}
                                </td>
                              </tr>
                            ) : (
                              pageDebit.map((r, i) => (
                                <tr key={r.id || i}>
                                  <td style={{ ...tdStyle, textAlign: 'center', fontWeight: 600 }}>{wpIdx * rowsPerPage + i + 1}</td>
                                  <td style={{ ...tdStyle, fontSize: '8.5px' }}>{r.date ? String(r.date).slice(0, 10) : '—'}</td>
                                  <td style={{ ...tdStyle, fontWeight: 600 }}>{r.notes || 'રોકડા ઉપાડ'}</td>
                                  <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 700, color: '#b45309' }}>
                                    ₹{Number(r.amount).toLocaleString('en-IN')}
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                        {isLastPage && (
                          <div style={{ backgroundColor: '#fff7ed', borderTop: '1px solid #fed7aa', padding: '4px 6px', display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: '9px', color: '#b45309' }}>
                            <span>કુલ ઉપાડ (Total Upad):</span>
                            <span>₹{totalUpad.toLocaleString('en-IN')}/-</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Bottom Worker Khata Calculation Box */}
                    {isLastPage ? (
                      <div
                        style={{
                          border: '1.5px solid #0f172a',
                          borderRadius: '8px',
                          padding: '8px 12px',
                          backgroundColor: '#ffffff',
                          maxWidth: '380px',
                          marginLeft: 'auto',
                          fontSize: '10px',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                          <span style={{ fontWeight: 700, color: '#334155' }}>કુલ કામ (Total Work):</span>
                          <strong style={{ color: '#15803d' }}>₹{totalWork.toLocaleString('en-IN')}/-</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px', borderBottom: '1.5px solid #0f172a', paddingBottom: '3px' }}>
                          <span style={{ fontWeight: 700, color: '#334155' }}>- કુલ ઉપાડ (Total Advance):</span>
                          <strong style={{ color: '#b45309' }}>- ₹{totalUpad.toLocaleString('en-IN')}/-</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '3px', fontSize: '11px', fontWeight: 900 }}>
                          <span style={{ color: netBalance >= 0 ? '#15803d' : '#b91c1c' }}>
                            {netBalance >= 0 ? 'ચોખ્ખો બાકી હિસાબ (Payable):' : 'ઉપાડ બાકી (Advance Due):'}
                          </span>
                          <span style={{ color: netBalance >= 0 ? '#15803d' : '#b91c1c' }}>
                            ₹{Math.abs(netBalance).toLocaleString('en-IN')}/-
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div style={{ textAlign: 'right', fontSize: '9px', color: '#64748b', fontStyle: 'italic', padding: '4px' }}>
                        બાકી હિસાબ આગળના પેજ પર ચાલુ... (Continued on next page)
                      </div>
                    )}
                  </div>

                  <div style={footerStyle}>
                    <span>Faizan Body Works • Worker Khata Statement</span>
                    <span>Section 3 • {worker.name}{totalWorkerPages > 1 ? ` (Part ${wpIdx + 1}/${totalWorkerPages})` : ''}</span>
                    <span style={{ fontWeight: 800, color: '#0f172a' }}>Page {pageNum} of {totalPages}</span>
                  </div>
                </div>
              );
            });
          })}

        {/* ================================================================= */}
        {/* SECTION 4: QUOTATIONS (કોટેશન્સ - ઓફિશિયલ એસ્ટીમેટ ફોર્મ)           */}
        {/* ================================================================= */}
        {showQuotes &&
          quotations.map((quote, qIdx) => {
            const pageNum = getNextPageNum();
            const items = safeArr(quote.items);
            const bodyCalc = safeObj(quote.body_calc);
            const total = Number(quote.final_price ?? quote.total_amount ?? quote.subtotal) || 0;

            return (
              <div key={`quote-form-${quote.id || qIdx}`} className="pdf-page" style={pageStyle}>
                <div>
                  {/* Brand Header */}
                  <div style={headerStyle}>
                    <div>
                      <h2 style={{ margin: '0 0 2px', fontSize: '15px', fontWeight: 900, color: '#1e3a8a' }}>
                        FAIZAN BODY BUILDERS • QUOTATION #{quote.quotation_no || quote.id}
                      </h2>
                      <span style={{ fontSize: '9.5px', fontWeight: 700, color: '#d97706' }}>
                        📑 SECTION 4: ઓફિશિયલ એસ્ટીમેટ શીટ (Quotation {qIdx + 1} of {quotations.length})
                      </span>
                    </div>
                    <div>
                      <span style={{ fontSize: '10px', fontWeight: 800, color: '#1e3a8a', backgroundColor: '#eff6ff', padding: '2px 8px', borderRadius: '4px' }}>
                        {quote.status || 'Draft'}
                      </span>
                    </div>
                  </div>

                  {/* Customer Meta */}
                  <div
                    style={{
                      border: '1.5px solid #cbd5e1',
                      borderRadius: '6px',
                      padding: '8px 10px',
                      backgroundColor: '#f8fafc',
                      marginBottom: '10px',
                      display: 'grid',
                      gridTemplateColumns: 'repeat(4, 1fr)',
                      gap: '8px',
                      fontSize: '9.5px',
                    }}
                  >
                    <div style={{ gridColumn: 'span 2' }}>
                      <span style={{ color: '#64748b', display: 'block', fontSize: '8.5px', fontWeight: 600 }}>Customer Name:</span>
                      <strong style={{ color: '#0f172a', fontSize: '11px' }}>{quote.customer_name}</strong>
                    </div>
                    <div>
                      <span style={{ color: '#64748b', display: 'block', fontSize: '8.5px', fontWeight: 600 }}>Quotation Date:</span>
                      <strong style={{ color: '#0f172a' }}>{quote.quotation_date ? String(quote.quotation_date).slice(0, 10) : '—'}</strong>
                    </div>
                    <div>
                      <span style={{ color: '#64748b', display: 'block', fontSize: '8.5px', fontWeight: 600 }}>Contact:</span>
                      <strong style={{ color: '#0f172a' }}>{quote.mobile_number || '—'}</strong>
                    </div>
                    <div style={{ gridColumn: 'span 2' }}>
                      <span style={{ color: '#64748b', display: 'block', fontSize: '8.5px', fontWeight: 600 }}>Truck / Chassis No:</span>
                      <strong style={{ color: '#1e3a8a', fontSize: '10.5px' }}>{quote.truck_chassis_no || '—'}</strong>
                    </div>
                    <div style={{ gridColumn: 'span 2' }}>
                      <span style={{ color: '#64748b', display: 'block', fontSize: '8.5px', fontWeight: 600 }}>Total Weight:</span>
                      <strong style={{ color: '#0f172a' }}>{quote.total_weight ? `${quote.total_weight} KG` : '—'}</strong>
                    </div>
                  </div>

                  {/* Body Fabrication Specifications Table */}
                  {bodyCalc.has_data && (
                    <div style={{ marginBottom: '10px' }}>
                      <span style={{ fontWeight: 800, fontSize: '9.5px', color: '#1e3a8a', display: 'block', marginBottom: '4px' }}>
                        🚛 બોડી વર્ક વિગત (Body Fabrication Specifications)
                      </span>
                      <table style={tableStyle}>
                        <thead>
                          <tr>
                            <th style={{ ...thStyle, width: '24px', textAlign: 'center' }}>#</th>
                            <th style={thStyle}>Part Description</th>
                            <th style={{ ...thStyle, width: '130px', textAlign: 'center' }}>Dimensions / Label</th>
                            <th style={{ ...thStyle, textAlign: 'right', width: '80px' }}>Amount ₹</th>
                          </tr>
                        </thead>
                        <tbody>
                          {bodyCalc.taliyu?.amount > 0 && (
                            <tr>
                              <td style={{ ...tdStyle, textAlign: 'center' }}>1</td>
                              <td style={tdStyle}>પ્લેટફોર્મ / તળિયું ({bodyCalc.taliyu.selected_label || 'પ્લેટ'})</td>
                              <td style={{ ...tdStyle, textAlign: 'center', fontSize: '8.5px' }}>{bodyCalc.taliyu.length}ft × {bodyCalc.taliyu.width}ft</td>
                              <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 700 }}>₹{Number(bodyCalc.taliyu.amount).toLocaleString('en-IN')}</td>
                            </tr>
                          )}
                          {bodyCalc.side?.amount > 0 && (
                            <tr>
                              <td style={{ ...tdStyle, textAlign: 'center' }}>2</td>
                              <td style={tdStyle}>સાઈડ ફાલકા ({bodyCalc.side.selected_label || 'ગેજ'})</td>
                              <td style={{ ...tdStyle, textAlign: 'center', fontSize: '8.5px' }}>{bodyCalc.side.length}ft × {bodyCalc.side.height}ft</td>
                              <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 700 }}>₹{Number(bodyCalc.side.amount).toLocaleString('en-IN')}</td>
                            </tr>
                          )}
                          {bodyCalc.dhoka?.amount > 0 && (
                            <tr>
                              <td style={{ ...tdStyle, textAlign: 'center' }}>3</td>
                              <td style={tdStyle}>ધોકા ({bodyCalc.dhoka.qty} નંગ)</td>
                              <td style={{ ...tdStyle, textAlign: 'center', fontSize: '8.5px' }}>{bodyCalc.dhoka.weight_per_piece} KG/નંગ</td>
                              <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 700 }}>₹{Number(bodyCalc.dhoka.amount).toLocaleString('en-IN')}</td>
                            </tr>
                          )}
                          {bodyCalc.monofo?.amount > 0 && (
                            <tr>
                              <td style={{ ...tdStyle, textAlign: 'center' }}>4</td>
                              <td style={tdStyle}>મોનોફો / કેબિન વર્ક</td>
                              <td style={{ ...tdStyle, textAlign: 'center', fontSize: '8.5px' }}>સામેલ</td>
                              <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 700 }}>₹{Number(bodyCalc.monofo.amount).toLocaleString('en-IN')}</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Selected Line Items Table */}
                  <div style={{ marginBottom: '10px' }}>
                    <span style={{ fontWeight: 800, fontSize: '9.5px', color: '#1e3a8a', display: 'block', marginBottom: '4px' }}>
                      📋 સાધન સામગ્રી અને પાર્ટ્સ (Line Items)
                    </span>
                    <table style={tableStyle}>
                      <thead>
                        <tr>
                          <th style={{ ...thStyle, width: '24px', textAlign: 'center' }}>#</th>
                          <th style={thStyle}>Item Name</th>
                          <th style={{ ...thStyle, textAlign: 'right', width: '60px' }}>Rate (₹)</th>
                          <th style={{ ...thStyle, textAlign: 'center', width: '45px' }}>Qty</th>
                          <th style={{ ...thStyle, textAlign: 'right', width: '80px' }}>Amount (₹)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {items.length === 0 ? (
                          <tr>
                            <td colSpan="5" style={{ textAlign: 'center', padding: '10px', color: '#94a3b8', fontStyle: 'italic' }}>
                              કોઈ આઇટમ સામેલ નથી
                            </td>
                          </tr>
                        ) : (
                          items.map((it, idx) => (
                            <tr key={it.id || idx}>
                              <td style={{ ...tdStyle, textAlign: 'center', fontWeight: 600 }}>{idx + 1}</td>
                              <td style={{ ...tdStyle, fontWeight: 700, color: '#0f172a' }}>{it.name}</td>
                              <td style={{ ...tdStyle, textAlign: 'right' }}>₹{Number(it.rate || 0).toLocaleString('en-IN')}</td>
                              <td style={{ ...tdStyle, textAlign: 'center' }}>{it.qty}</td>
                              <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 700 }}>₹{Number(it.amount || 0).toLocaleString('en-IN')}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Calculations Summary */}
                  <div
                    style={{
                      border: '1.5px solid #0f172a',
                      borderRadius: '8px',
                      padding: '8px 12px',
                      backgroundColor: '#ffffff',
                      maxWidth: '350px',
                      marginLeft: 'auto',
                      fontSize: '10px',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                      <span style={{ fontWeight: 700, color: '#475569' }}>સબટોટલ (Subtotal):</span>
                      <strong>₹{Number(quote.subtotal || total).toLocaleString('en-IN')}</strong>
                    </div>
                    {Number(quote.extra_amount) > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px', color: '#b45309' }}>
                        <span>એક્સ્ટ્રા ચાર્જ ({quote.extra_percent}%):</span>
                        <strong>+ ₹{Number(quote.extra_amount).toLocaleString('en-IN')}</strong>
                      </div>
                    )}
                    {Number(quote.discount_amount) > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px', color: '#15803d' }}>
                        <span>ડિસ્કાઉન્ટ ({quote.discount_percent}%):</span>
                        <strong>- ₹{Number(quote.discount_amount).toLocaleString('en-IN')}</strong>
                      </div>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '4px', borderTop: '1.5px solid #0f172a', fontSize: '12px', fontWeight: 900, color: '#1e3a8a' }}>
                      <span>કુલ ફાઈનલ કિંમત (Final Price):</span>
                      <span>₹{total.toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                </div>

                <div style={footerStyle}>
                  <span>Faizan Body Works • Quotation Estimate</span>
                  <span>Section 4 • {quote.customer_name}</span>
                  <span style={{ fontWeight: 800, color: '#0f172a' }}>Page {pageNum} of {totalPages}</span>
                </div>
              </div>
            );
          })}

        {/* ================================================================= */}
        {/* SECTION 5: ROJMED (રોજમેળ - દૈનિક રોકડમેળ ફોર્મ)                     */}
        {/* ================================================================= */}
        {showRojmed &&
          rojmedPages.map((pageRows, pIdx) => {
            const pageNum = getNextPageNum();

            return (
              <div key={`rojmed-p-${pIdx}`} className="pdf-page" style={pageStyle}>
                <div>
                  <div style={headerStyle}>
                    <div>
                      <h2 style={{ margin: '0 0 2px', fontSize: '15px', fontWeight: 900, color: '#1e3a8a' }}>
                        FAIZAN BODY BUILDERS • ROJMED CASHBOOK
                      </h2>
                      <span style={{ fontSize: '9.5px', fontWeight: 700, color: '#7e22ce' }}>
                        💰 SECTION 5: રોજમેળ રોકડ હિસાબ (Page {pIdx + 1} of {rojmedPages.length})
                      </span>
                    </div>
                    <div style={{ textAlign: 'right', fontSize: '9px', color: '#64748b' }}>
                      <span>{exportDateStr}</span>
                      <div style={{ fontWeight: 700, color: '#0f172a' }}>Total Entries: {rojmedEntries.length}</div>
                    </div>
                  </div>

                  <table style={tableStyle}>
                    <thead>
                      <tr>
                        <th style={{ ...thStyle, width: '22px', textAlign: 'center' }}>#</th>
                        <th style={{ ...thStyle, width: '70px', textAlign: 'center' }}>તારીખ</th>
                        <th style={{ ...thStyle, width: '75px', textAlign: 'center' }}>પ્રકાર</th>
                        <th style={thStyle}>વિગત (Particulars / Description)</th>
                        <th style={{ ...thStyle, width: '55px', textAlign: 'center' }}>મોડ</th>
                        <th style={{ ...thStyle, textAlign: 'right', width: '85px' }}>રકમ (₹)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pageRows.map((r, idx) => {
                        const isIncome = r.entry_type === 'aavak' || r.entry_type === 'income' || r.entry_type === 'jama';
                        const amt = Number(r.amount) || 0;
                        const isEven = idx % 2 === 1;

                        return (
                          <tr key={r.id || idx} style={{ backgroundColor: isEven ? '#f8fafc' : '#ffffff' }}>
                            <td style={{ ...tdStyle, textAlign: 'center', fontWeight: 700 }}>
                              {pIdx * 20 + idx + 1}
                            </td>
                            <td style={{ ...tdStyle, textAlign: 'center', fontSize: '8.5px' }}>
                              {r.date ? String(r.date).slice(0, 10) : '—'}
                            </td>
                            <td style={{ ...tdStyle, textAlign: 'center', fontSize: '8.5px', fontWeight: 800 }}>
                              <span
                                style={{
                                  display: 'inline-block',
                                  padding: '1px 5px',
                                  borderRadius: '3px',
                                  backgroundColor: isIncome ? '#dcfce7' : '#fee2e2',
                                  color: isIncome ? '#15803d' : '#b91c1c',
                                }}
                              >
                                {isIncome ? 'આવક (જમા)' : 'જાવક (ઉધાર)'}
                              </span>
                            </td>
                            <td style={{ ...tdStyle, color: '#1e293b' }}>
                              {r.particulars || r.notes || r.description || '—'}
                            </td>
                            <td style={{ ...tdStyle, textAlign: 'center', fontSize: '8.5px', color: '#64748b' }}>
                              {r.payment_mode || 'Cash'}
                            </td>
                            <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 800, color: isIncome ? '#15803d' : '#b91c1c' }}>
                              {isIncome ? '+' : '-'}₹{amt.toLocaleString('en-IN')}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div style={footerStyle}>
                  <span>Faizan Body Works • Daily Cashbook Register</span>
                  <span>Section 5</span>
                  <span style={{ fontWeight: 800, color: '#0f172a' }}>Page {pageNum} of {totalPages}</span>
                </div>
              </div>
            );
          })}

        {/* ================================================================= */}
        {/* SECTION 6A: STOCK INVENTORY (સ્ટોક માલ સામાન)                       */}
        {/* ================================================================= */}
        {showStock &&
          stockPages.map((pageRows, pIdx) => {
            const pageNum = getNextPageNum();

            return (
              <div key={`stock-items-p-${pIdx}`} className="pdf-page" style={pageStyle}>
                <div>
                  <div style={headerStyle}>
                    <div>
                      <h2 style={{ margin: '0 0 2px', fontSize: '15px', fontWeight: 900, color: '#1e3a8a' }}>
                        FAIZAN BODY BUILDERS • STOCK INVENTORY
                      </h2>
                      <span style={{ fontSize: '9.5px', fontWeight: 700, color: '#0284c7' }}>
                        🔩 SECTION 6A: સ્ટોક માલ સામાન યાદી (Page {pIdx + 1} of {stockPages.length})
                      </span>
                    </div>
                    <div style={{ textAlign: 'right', fontSize: '9px', color: '#64748b' }}>
                      <span>{exportDateStr}</span>
                      <div style={{ fontWeight: 700, color: '#0f172a' }}>Total Items: {stockItems.length}</div>
                    </div>
                  </div>

                  <table style={tableStyle}>
                    <thead>
                      <tr>
                        <th style={{ ...thStyle, width: '22px', textAlign: 'center' }}>#</th>
                        <th style={thStyle}>Item Name (માલનું નામ)</th>
                        <th style={thStyle}>Category (કેટેગરી)</th>
                        <th style={{ ...thStyle, textAlign: 'right', width: '75px' }}>Current Qty</th>
                        <th style={{ ...thStyle, width: '45px', textAlign: 'center' }}>Unit</th>
                        <th style={{ ...thStyle, textAlign: 'right', width: '65px' }}>Min Alert</th>
                        <th style={{ ...thStyle, textAlign: 'right', width: '80px' }}>Unit Price (₹)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pageRows.map((s, idx) => {
                        const qty = Number(s.quantity) || 0;
                        const minAlert = Number(s.min_alert_quantity) || 0;
                        const price = Number(s.unit_price) || 0;
                        const isLow = qty <= minAlert;
                        const isEven = idx % 2 === 1;

                        return (
                          <tr key={s.id || idx} style={{ backgroundColor: isEven ? '#f8fafc' : '#ffffff' }}>
                            <td style={{ ...tdStyle, textAlign: 'center', fontWeight: 700 }}>
                              {pIdx * 20 + idx + 1}
                            </td>
                            <td style={{ ...tdStyle, fontWeight: 700, color: '#0f172a' }}>{s.name || '—'}</td>
                            <td style={{ ...tdStyle, color: '#475569' }}>{s.category_name || 'General'}</td>
                            <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 800, color: isLow ? '#b91c1c' : '#0f172a' }}>
                              {qty} {isLow && <span style={{ fontSize: '8px', color: '#dc2626' }}>⚠️ Low</span>}
                            </td>
                            <td style={{ ...tdStyle, textAlign: 'center', fontSize: '8.5px', color: '#64748b' }}>{s.unit || 'નંગ'}</td>
                            <td style={{ ...tdStyle, textAlign: 'right', color: '#64748b' }}>{minAlert}</td>
                            <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 600 }}>
                              {price > 0 ? `₹${price.toLocaleString('en-IN')}` : '—'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div style={footerStyle}>
                  <span>Faizan Body Works • Stock Inventory Register</span>
                  <span>Section 6A</span>
                  <span style={{ fontWeight: 800, color: '#0f172a' }}>Page {pageNum} of {totalPages}</span>
                </div>
              </div>
            );
          })}

        {/* ================================================================= */}
        {/* SECTION 6B: STOCK MOVEMENT LOG (સ્ટોક આવક-જાવક હિસ્ટ્રી)            */}
        {/* ================================================================= */}
        {showStock &&
          stockTxPages.map((pageRows, pIdx) => {
            const pageNum = getNextPageNum();

            return (
              <div key={`stock-tx-p-${pIdx}`} className="pdf-page" style={pageStyle}>
                <div>
                  <div style={headerStyle}>
                    <div>
                      <h2 style={{ margin: '0 0 2px', fontSize: '15px', fontWeight: 900, color: '#1e3a8a' }}>
                        FAIZAN BODY BUILDERS • STOCK MOVEMENT LOG
                      </h2>
                      <span style={{ fontSize: '9.5px', fontWeight: 700, color: '#0284c7' }}>
                        🔩 SECTION 6B: સ્ટોક મુવમેન્ટ અને ઓડિટ લોગ (Page {pIdx + 1} of {stockTxPages.length})
                      </span>
                    </div>
                    <div style={{ textAlign: 'right', fontSize: '9px', color: '#64748b' }}>
                      <span>{exportDateStr}</span>
                      <div style={{ fontWeight: 700, color: '#0f172a' }}>Total Movements: {stockTransactions.length}</div>
                    </div>
                  </div>

                  <table style={tableStyle}>
                    <thead>
                      <tr>
                        <th style={{ ...thStyle, width: '22px', textAlign: 'center' }}>#</th>
                        <th style={{ ...thStyle, width: '70px', textAlign: 'center' }}>તારીખ</th>
                        <th style={thStyle}>Item Name (માલનું નામ)</th>
                        <th style={{ ...thStyle, width: '65px', textAlign: 'center' }}>પ્રકાર</th>
                        <th style={{ ...thStyle, textAlign: 'right', width: '65px' }}>જથ્થો</th>
                        <th style={{ ...thStyle, width: '45px', textAlign: 'center' }}>Unit</th>
                        <th style={thStyle}>સંદર્ભ / નોંધ (Reference Note)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pageRows.map((tx, idx) => {
                        const isIn = tx.type === 'IN';
                        const isEven = idx % 2 === 1;

                        return (
                          <tr key={tx.id || idx} style={{ backgroundColor: isEven ? '#f8fafc' : '#ffffff' }}>
                            <td style={{ ...tdStyle, textAlign: 'center', fontWeight: 700 }}>
                              {pIdx * 22 + idx + 1}
                            </td>
                            <td style={{ ...tdStyle, textAlign: 'center', fontSize: '8.5px' }}>
                              {tx.date ? String(tx.date).slice(0, 10) : '—'}
                            </td>
                            <td style={{ ...tdStyle, fontWeight: 700, color: '#0f172a' }}>{tx.item_name || '—'}</td>
                            <td style={{ ...tdStyle, textAlign: 'center', fontSize: '8.5px', fontWeight: 800 }}>
                              <span
                                style={{
                                  display: 'inline-block',
                                  padding: '1px 5px',
                                  borderRadius: '3px',
                                  backgroundColor: isIn ? '#dcfce7' : '#fee2e2',
                                  color: isIn ? '#15803d' : '#b91c1c',
                                }}
                              >
                                {tx.type || 'IN'}
                              </span>
                            </td>
                            <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 700 }}>{tx.quantity}</td>
                            <td style={{ ...tdStyle, textAlign: 'center', fontSize: '8.5px', color: '#64748b' }}>{tx.unit || 'Pcs'}</td>
                            <td style={{ ...tdStyle, color: '#475569' }}>{tx.reference_note || '—'}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div style={footerStyle}>
                  <span>Faizan Body Works • Stock Movement Audit Register</span>
                  <span>Section 6B</span>
                  <span style={{ fontWeight: 800, color: '#0f172a' }}>Page {pageNum} of {totalPages}</span>
                </div>
              </div>
            );
          })}

        {/* ================================================================= */}
        {/* SECTION 7: USERS & SECURITY ACCESS                                */}
        {/* ================================================================= */}
        {showUsers &&
          userPages.map((pageRows, pIdx) => {
            const pageNum = getNextPageNum();

            return (
              <div key={`users-p-${pIdx}`} className="pdf-page" style={pageStyle}>
                <div>
                  <div style={headerStyle}>
                    <div>
                      <h2 style={{ margin: '0 0 2px', fontSize: '15px', fontWeight: 900, color: '#1e3a8a' }}>
                        FAIZAN BODY BUILDERS • SYSTEM USERS & ACCESS
                      </h2>
                      <span style={{ fontSize: '9.5px', fontWeight: 700, color: '#475569' }}>
                        👤 SECTION 7: સિસ્ટમ યુઝર્સ અને સુરક્ષા પરમિશન
                      </span>
                    </div>
                    <div style={{ textAlign: 'right', fontSize: '9px', color: '#64748b' }}>
                      <span>{exportDateStr}</span>
                      <div style={{ fontWeight: 700, color: '#0f172a' }}>Total Users: {users.length}</div>
                    </div>
                  </div>

                  <table style={tableStyle}>
                    <thead>
                      <tr>
                        <th style={{ ...thStyle, width: '22px', textAlign: 'center' }}>#</th>
                        <th style={thStyle}>Full Name (નામ)</th>
                        <th style={thStyle}>Username</th>
                        <th style={{ ...thStyle, width: '75px', textAlign: 'center' }}>Role (હોદ્દો)</th>
                        <th style={thStyle}>Mobile</th>
                        <th style={{ ...thStyle, width: '65px', textAlign: 'center' }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pageRows.map((u, idx) => {
                        const isEven = idx % 2 === 1;
                        const isActive = u.is_active === 1 || u.is_active === true || u.status === 'Active';

                        return (
                          <tr key={u.id || idx} style={{ backgroundColor: isEven ? '#f8fafc' : '#ffffff' }}>
                            <td style={{ ...tdStyle, textAlign: 'center', fontWeight: 700 }}>
                              {pIdx * 18 + idx + 1}
                            </td>
                            <td style={{ ...tdStyle, fontWeight: 700, color: '#0f172a' }}>{u.name || '—'}</td>
                            <td style={{ ...tdStyle, color: '#1e3a8a', fontWeight: 600 }}>{u.username || '—'}</td>
                            <td style={{ ...tdStyle, textAlign: 'center', fontWeight: 700 }}>
                              <span
                                style={{
                                  display: 'inline-block',
                                  padding: '1px 5px',
                                  borderRadius: '3px',
                                  backgroundColor: u.role === 'admin' ? '#fee2e2' : '#f1f5f9',
                                  color: u.role === 'admin' ? '#991b1b' : '#334155',
                                  fontSize: '8.5px',
                                }}
                              >
                                {String(u.role || 'user').toUpperCase()}
                              </span>
                            </td>
                            <td style={{ ...tdStyle, color: '#64748b' }}>{u.mobile || '—'}</td>
                            <td style={{ ...tdStyle, textAlign: 'center', fontSize: '8.5px', fontWeight: 700 }}>
                              <span
                                style={{
                                  display: 'inline-block',
                                  padding: '1px 5px',
                                  borderRadius: '3px',
                                  backgroundColor: isActive ? '#dcfce7' : '#fee2e2',
                                  color: isActive ? '#15803d' : '#b91c1c',
                                }}
                              >
                                {isActive ? 'Active' : 'Inactive'}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>

                  {/* Verification Box */}
                  <div
                    style={{
                      marginTop: '20px',
                      border: '1.5px dashed #0284c7',
                      borderRadius: '8px',
                      backgroundColor: '#f0f9ff',
                      padding: '10px 12px',
                      fontSize: '9.5px',
                      color: '#0369a1',
                      lineHeight: 1.5,
                    }}
                  >
                    <div style={{ fontWeight: 800, fontSize: '10.5px', marginBottom: '3px', color: '#075985' }}>
                      🛡️ SYSTEM INTEGRITY & MAINTENANCE VERIFICATION
                    </div>
                    <div>
                      આ PDF રિપોર્ટ Faizan Body Management System ના તમામ મોડ્યુલ્સનો ફોર્મ-વાઇસ સંપૂર્ણ લેખિત
                      દસ્તાવેજ છે. ઓર્ડર્સના જોબ કાર્ડ્સ, ગાડી વાળા નું ખાતાવહી, કારીગરોના હિસાબો અને રોજમેળ સહિત
                      તમામ વિગતવાર એન્ટ્રીઓ આ દસ્તાવેજમાં સુરક્ષિત રીતે સંગ્રહિત છે.
                    </div>
                  </div>
                </div>

                <div style={footerStyle}>
                  <span>Faizan Body Works • End of Complete System Ledger Report</span>
                  <span>Section 7 (Final)</span>
                  <span style={{ fontWeight: 800, color: '#0f172a' }}>Page {pageNum} of {totalPages}</span>
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );
}

export default BackupPdfReport;
