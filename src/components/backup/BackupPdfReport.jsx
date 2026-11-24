import React, { useMemo } from 'react';

/**
 * BackupPdfReport
 * Complete, A-to-Z Multi-Page Printable A4 System Ledger Document
 * Prints ALL application data and EVERY SINGLE ENTRY:
 * - Work Orders
 * - Truck Accounts Master & All Truck Account Entries (All Jama & Udhar)
 * - Workers Master & All Worker Transactions (All Work & Upad)
 * - Rojmed Daily Cashbook Entries (All Aavak & Javak)
 * - Stock Items Master & Stock Movement Transactions
 * - Quotations & Detailed Items
 * - System Users & Access
 */
export function BackupPdfReport({ data, elementId = 'printableFullBackupReport' }) {
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

  // Summary statistics
  const totalTruckUdhar = truckAccounts.reduce((sum, a) => sum + (Number(a.total_udhar ?? a.total_bill) || 0), 0);
  const totalTruckJama = truckAccounts.reduce((sum, a) => sum + (Number(a.total_jama ?? a.total_paid) || 0), 0);
  const totalTruckDue = truckAccounts.reduce((sum, a) => sum + (Number(a.balance ?? a.pending_balance) || 0), 0);

  const totalWorkerWork = workers.reduce((sum, w) => sum + (Number(w.total_work) || 0), 0);
  const totalWorkerUpad = workers.reduce((sum, w) => sum + (Number(w.total_upad) || 0), 0);
  const totalWorkerBalance = workers.reduce((sum, w) => sum + (Number(w.balance) || 0), 0);

  const totalRojmedAavak = rojmedEntries.reduce((sum, r) => {
    const isIncome = r.entry_type === 'aavak' || r.entry_type === 'income' || r.entry_type === 'jama';
    return isIncome ? sum + (Number(r.amount) || 0) : sum;
  }, 0);
  const totalRojmedJavak = rojmedEntries.reduce((sum, r) => {
    const isIncome = r.entry_type === 'aavak' || r.entry_type === 'income' || r.entry_type === 'jama';
    return !isIncome ? sum + (Number(r.amount) || 0) : sum;
  }, 0);

  const totalQuoteValue = quotations.reduce(
    (sum, q) => sum + (Number(q.final_price ?? q.total_amount ?? q.subtotal) || 0),
    0
  );

  const grandTotalEntries =
    orders.length +
    truckAccounts.length +
    truckAccountEntries.length +
    workers.length +
    workerTransactions.length +
    rojmedEntries.length +
    stockItems.length +
    stockTransactions.length +
    quotations.length +
    users.length;

  // Pagination chunkers
  const chunkArray = (arr, size) => {
    if (!arr || arr.length === 0) return [];
    const chunks = [];
    for (let i = 0; i < arr.length; i += size) {
      chunks.push(arr.slice(i, i + size));
    }
    return chunks;
  };

  const ordersPages = useMemo(() => chunkArray(orders, 14), [orders]);
  const truckSummaryPages = useMemo(() => chunkArray(truckAccounts, 15), [truckAccounts]);
  const truckEntryPages = useMemo(() => chunkArray(truckAccountEntries, 20), [truckAccountEntries]);
  const workerSummaryPages = useMemo(() => chunkArray(workers, 16), [workers]);
  const workerTxPages = useMemo(() => chunkArray(workerTransactions, 22), [workerTransactions]);
  const rojmedPages = useMemo(() => chunkArray(rojmedEntries, 18), [rojmedEntries]);
  const stockPages = useMemo(() => chunkArray(stockItems, 18), [stockItems]);
  const stockTxPages = useMemo(() => chunkArray(stockTransactions, 20), [stockTransactions]);
  const quotePages = useMemo(() => chunkArray(quotations, 12), [quotations]);
  const userPages = useMemo(() => chunkArray(users, 18), [users]);

  // Total pages calculation: Cover + each non-empty section
  const totalPages =
    1 +
    (ordersPages.length || 1) +
    (truckSummaryPages.length || 1) +
    (truckEntryPages.length || 1) +
    (workerSummaryPages.length || 1) +
    (workerTxPages.length || 1) +
    (rojmedPages.length || 1) +
    (stockPages.length || 1) +
    (stockTxPages.length || 1) +
    (quotePages.length || 1) +
    (userPages.length || 1);

  let currentPageNum = 1;

  const exportDateStr = data.exportedAt
    ? new Date(data.exportedAt).toLocaleString('en-IN', {
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    : new Date().toLocaleString('en-IN');

  // Styles
  const pageStyle = {
    width: '720px',
    minHeight: '1000px',
    boxSizing: 'border-box',
    padding: '22px 24px',
    backgroundColor: '#ffffff',
    color: '#0f172a',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    margin: '0 auto 20px',
  };

  const headerStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottom: '2px solid #0284c7',
    paddingBottom: '8px',
    marginBottom: '12px',
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
    fontSize: '9.5px',
  };

  const thStyle = {
    backgroundColor: '#f1f5f9',
    color: '#1e293b',
    padding: '5px 5px',
    border: '1px solid #cbd5e1',
    fontWeight: 800,
    textAlign: 'left',
    fontSize: '9px',
  };

  const tdStyle = {
    padding: '4.5px 5px',
    border: '1px solid #e2e8f0',
    color: '#334155',
  };

  return (
    <div style={containerStyle} aria-hidden="true">
      <div id={elementId}>
        {/* ================================================================= */}
        {/* PAGE 1: COVER & EXECUTIVE DASHBOARD                               */}
        {/* ================================================================= */}
        <div className="pdf-page" style={pageStyle}>
          <div>
            <div style={{ textAlign: 'center', borderBottom: '2.5px solid #1e3a8a', paddingBottom: '12px', marginBottom: '14px' }}>
              <h1 style={{ margin: '0 0 3px', fontSize: '24px', fontWeight: 900, color: '#1e3a8a', letterSpacing: '0.8px' }}>
                FAIZAN BODY BUILDERS
              </h1>
              <p style={{ margin: '0 0 3px', fontSize: '11.5px', fontWeight: 700, color: '#475569' }}>
                Commercial Vehicle & Truck Body Fabricators • All Fabrication & Repair Works
              </p>
              <div style={{ display: 'inline-block', backgroundColor: '#eff6ff', color: '#1d4ed8', border: '1.5px solid #93c5fd', borderRadius: '16px', padding: '3px 14px', fontSize: '10.5px', fontWeight: 800, marginTop: '3px' }}>
                🛡️ COMPLETE SYSTEM ALL-DATA LEDGER REPORT (સમગ્ર ડેટા - તમામે તમામ એન્ટ્રીઓ)
              </div>
            </div>

            {/* Metadata Card */}
            <div style={{ backgroundColor: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '9px 12px', marginBottom: '14px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', fontSize: '10px' }}>
              <div>
                <span style={{ color: '#64748b', display: 'block', fontWeight: 600 }}>📅 રિપોર્ટ તારીખ:</span>
                <strong style={{ color: '#0f172a' }}>{exportDateStr}</strong>
              </div>
              <div>
                <span style={{ color: '#64748b', display: 'block', fontWeight: 600 }}>📁 કુલ એન્ટ્રીઓ (All Records):</span>
                <strong style={{ color: '#16a34a' }}>{grandTotalEntries.toLocaleString('en-IN')} Entries</strong>
              </div>
              <div>
                <span style={{ color: '#64748b', display: 'block', fontWeight: 600 }}>🔒 સ્કોપ:</span>
                <strong style={{ color: '#0369a1' }}>All 12 Database Tables • A to Z Entry Ledger</strong>
              </div>
            </div>

            {/* Section Summary KPI Grid */}
            <h3 style={{ fontSize: '12px', fontWeight: 800, color: '#1e293b', margin: '0 0 8px', borderBottom: '1px solid #e2e8f0', paddingBottom: '4px' }}>
              📊 સમગ્ર એપ્લિકેશન સારાંશ (System Summary KPIs)
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', marginBottom: '14px' }}>
              {/* Box 1: Work Orders */}
              <div style={{ border: '1px solid #bfdbfe', backgroundColor: '#f0f9ff', borderRadius: '8px', padding: '8px 10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3px' }}>
                  <span style={{ fontWeight: 800, fontSize: '11px', color: '#0369a1' }}>🚛 Work Orders (ઓર્ડર્સ)</span>
                  <span style={{ backgroundColor: '#0284c7', color: '#ffffff', borderRadius: '10px', padding: '1px 6px', fontSize: '9px', fontWeight: 800 }}>
                    {orders.length} Records
                  </span>
                </div>
                <div style={{ fontSize: '9.5px', color: '#334155', lineHeight: 1.4 }}>
                  <div>કુલ ગાડીઓ: <strong>{orders.length}</strong> | ચાલુ: <strong>{orders.filter((o) => o.status === 'In Progress' || !o.status).length}</strong></div>
                  <div>પૂર્ણ/ડિલિવર થયેલ: <strong style={{ color: '#15803d' }}>{orders.filter((o) => o.status === 'Completed' || o.status === 'Delivered').length}</strong></div>
                </div>
              </div>

              {/* Box 2: Truck Accounts */}
              <div style={{ border: '1px solid #fed7aa', backgroundColor: '#fff7ed', borderRadius: '8px', padding: '8px 10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3px' }}>
                  <span style={{ fontWeight: 800, fontSize: '11px', color: '#c2410c' }}>📋 Truck Accounts (ખાતાવહી)</span>
                  <span style={{ backgroundColor: '#ea580c', color: '#ffffff', borderRadius: '10px', padding: '1px 6px', fontSize: '9px', fontWeight: 800 }}>
                    {truckAccounts.length} Ledgers • {truckAccountEntries.length} Entries
                  </span>
                </div>
                <div style={{ fontSize: '9.5px', color: '#334155', lineHeight: 1.4 }}>
                  <div>કુલ ઉધાર/બિલ: <strong style={{ color: '#b45309' }}>₹{totalTruckUdhar.toLocaleString('en-IN')}</strong></div>
                  <div>કુલ જમા: <strong style={{ color: '#15803d' }}>₹{totalTruckJama.toLocaleString('en-IN')}</strong> | બાકી: <strong style={{ color: '#b91c1c' }}>₹{totalTruckDue.toLocaleString('en-IN')}</strong></div>
                </div>
              </div>

              {/* Box 3: Workers */}
              <div style={{ border: '1px solid #bbf7d0', backgroundColor: '#f0fdf4', borderRadius: '8px', padding: '8px 10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3px' }}>
                  <span style={{ fontWeight: 800, fontSize: '11px', color: '#15803d' }}>👥 Workers (કારીગરો)</span>
                  <span style={{ backgroundColor: '#16a34a', color: '#ffffff', borderRadius: '10px', padding: '1px 6px', fontSize: '9px', fontWeight: 800 }}>
                    {workers.length} Staff • {workerTransactions.length} Entries
                  </span>
                </div>
                <div style={{ fontSize: '9.5px', color: '#334155', lineHeight: 1.4 }}>
                  <div>કુલ કામ: <strong style={{ color: '#15803d' }}>₹{totalWorkerWork.toLocaleString('en-IN')}</strong> | ઉપાડ: <strong style={{ color: '#b45309' }}>₹{totalWorkerUpad.toLocaleString('en-IN')}</strong></div>
                  <div>ચોખ્ખો બાકી હિસાબ: <strong style={{ color: '#0f172a' }}>₹{totalWorkerBalance.toLocaleString('en-IN')}</strong></div>
                </div>
              </div>

              {/* Box 4: Rojmed & Stock */}
              <div style={{ border: '1px solid #e9d5ff', backgroundColor: '#faf5ff', borderRadius: '8px', padding: '8px 10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3px' }}>
                  <span style={{ fontWeight: 800, fontSize: '11px', color: '#7e22ce' }}>💰 Rojmed & 🔩 Stock</span>
                  <span style={{ backgroundColor: '#9333ea', color: '#ffffff', borderRadius: '10px', padding: '1px 6px', fontSize: '9px', fontWeight: 800 }}>
                    {rojmedEntries.length + stockItems.length} Entries
                  </span>
                </div>
                <div style={{ fontSize: '9.5px', color: '#334155', lineHeight: 1.4 }}>
                  <div>રોજમેળ આવક: <strong style={{ color: '#15803d' }}>₹{totalRojmedAavak.toLocaleString('en-IN')}</strong> | જાવક: <strong style={{ color: '#b91c1c' }}>₹{totalRojmedJavak.toLocaleString('en-IN')}</strong></div>
                  <div>સ્ટોક: <strong>{stockItems.length} Items ({stockTransactions.length} Movement Entries)</strong></div>
                </div>
              </div>
            </div>

            {/* Table of Contents */}
            <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '9px 12px', backgroundColor: '#ffffff' }}>
              <h4 style={{ margin: '0 0 5px', fontSize: '11px', fontWeight: 800, color: '#334155' }}>
                📑 રિપોર્ટ અનુક્રમણિકા (Detailed Table of Contents)
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '5px', fontSize: '9.5px', color: '#475569' }}>
                <div>• Section 1: Work Orders ({orders.length} ઓર્ડર્સ)</div>
                <div>• Section 2A: Truck Accounts Summary ({truckAccounts.length} ખાતાવહી)</div>
                <div>• Section 2B: Truck Entries Ledger ({truckAccountEntries.length} તમામ એન્ટ્રીઓ)</div>
                <div>• Section 3A: Workers Master Summary ({workers.length} કારીગરો)</div>
                <div>• Section 3B: Worker Transactions Ledger ({workerTransactions.length} તમામ એન્ટ્રીઓ)</div>
                <div>• Section 4: Rojmed Daily Cashbook ({rojmedEntries.length} રોજમેળ એન્ટ્રીઓ)</div>
                <div>• Section 5A: Stock Master Inventory ({stockItems.length} સ્ટોક માલ)</div>
                <div>• Section 5B: Stock Movement Log ({stockTransactions.length} આવક/જાવક)</div>
                <div>• Section 6: Quotations Register ({quotations.length} કોટેશન્સ)</div>
                <div>• Section 7: System Users & Security ({users.length} સિસ્ટમ યુઝર્સ)</div>
                <div style={{ gridColumn: 'span 2', fontWeight: 800, color: '#0f172a', paddingTop: '4px', borderTop: '1px dashed #cbd5e1' }}>
                  • Total Complete Document Pages: <strong>{totalPages} Pages</strong>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div style={footerStyle}>
            <span>Faizan Body Works • Complete System All-Data Archive</span>
            <span>Generated: {exportDateStr}</span>
            <span style={{ fontWeight: 800, color: '#0f172a' }}>Page 1 of {totalPages}</span>
          </div>
        </div>

        {/* ================================================================= */}
        {/* SECTION 1: WORK ORDERS                                            */}
        {/* ================================================================= */}
        {(ordersPages.length > 0 ? ordersPages : [[]]).map((pageRows, pIdx) => {
          currentPageNum++;
          const pageNumber = currentPageNum;

          return (
            <div key={`orders-p-${pIdx}`} className="pdf-page" style={pageStyle}>
              <div>
                <div style={headerStyle}>
                  <div>
                    <h2 style={{ margin: '0 0 2px', fontSize: '15px', fontWeight: 900, color: '#1e3a8a' }}>
                      FAIZAN BODY BUILDERS
                    </h2>
                    <span style={{ fontSize: '10px', fontWeight: 700, color: '#0369a1' }}>
                      🚛 SECTION 1: WORK ORDERS (વાહન અને બોડી ઓર્ડર્સ)
                    </span>
                  </div>
                  <div style={{ textAlign: 'right', fontSize: '9px', color: '#64748b' }}>
                    <span>{exportDateStr}</span>
                    <div style={{ fontWeight: 700, color: '#0f172a' }}>Total Orders: {orders.length}</div>
                  </div>
                </div>

                {pageRows.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '30px', color: '#94a3b8', fontStyle: 'italic', fontSize: '11px' }}>
                    કોઈ ઓર્ડર ઉપલબ્ધ નથી
                  </div>
                ) : (
                  <table style={tableStyle}>
                    <thead>
                      <tr>
                        <th style={{ ...thStyle, width: '22px', textAlign: 'center' }}>#</th>
                        <th style={thStyle}>Truck / Chassis No.</th>
                        <th style={thStyle}>Owner Name (માલિકનું નામ)</th>
                        <th style={{ ...thStyle, width: '85px' }}>Mobile</th>
                        <th style={{ ...thStyle, width: '60px', textAlign: 'center' }}>Shade</th>
                        <th style={{ ...thStyle, width: '70px', textAlign: 'center' }}>Order Date</th>
                        <th style={{ ...thStyle, width: '70px', textAlign: 'center' }}>Delivery</th>
                        <th style={{ ...thStyle, width: '75px', textAlign: 'center' }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pageRows.map((o, idx) => {
                        const isEven = idx % 2 === 1;
                        const chassis = o.truck_chassis_no || o.chassis_no || o.order_no || '—';
                        const owner = o.owner_name || o.customer_name || '—';
                        const mobile = o.mobile_number || o.customer_mobile || o.mobile || '—';
                        const shade = o.shade_no ? `Shade ${o.shade_no}` : (o.condition_text || '—');
                        const orderDate = o.order_date ? String(o.order_date).slice(0, 10) : (o.entry_date ? String(o.entry_date).slice(0, 10) : '—');
                        const deliveryDate = o.delivery_date ? String(o.delivery_date).slice(0, 10) : '—';
                        const isDone = o.status === 'Completed' || o.status === 'Delivered';

                        return (
                          <tr key={o.id || idx} style={{ backgroundColor: isEven ? '#f8fafc' : '#ffffff' }}>
                            <td style={{ ...tdStyle, textAlign: 'center', fontWeight: 700 }}>
                              {pIdx * 14 + idx + 1}
                            </td>
                            <td style={{ ...tdStyle, fontWeight: 700, color: '#1e3a8a' }}>{chassis}</td>
                            <td style={{ ...tdStyle, fontWeight: 700, color: '#0f172a' }}>{owner}</td>
                            <td style={{ ...tdStyle, fontSize: '9px', color: '#475569' }}>{mobile}</td>
                            <td style={{ ...tdStyle, textAlign: 'center', fontSize: '9px', fontWeight: 600 }}>{shade}</td>
                            <td style={{ ...tdStyle, textAlign: 'center', fontSize: '9px' }}>{orderDate}</td>
                            <td style={{ ...tdStyle, textAlign: 'center', fontSize: '9px' }}>{deliveryDate}</td>
                            <td style={{ ...tdStyle, textAlign: 'center', fontSize: '9px', fontWeight: 700 }}>
                              <span
                                style={{
                                  display: 'inline-block',
                                  padding: '1px 6px',
                                  borderRadius: '4px',
                                  backgroundColor: isDone ? '#dcfce7' : '#eff6ff',
                                  color: isDone ? '#15803d' : '#1d4ed8',
                                }}
                              >
                                {o.status || 'In Progress'}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>

              <div style={footerStyle}>
                <span>Faizan Body Works • Work Orders Register</span>
                <span>Section 1</span>
                <span style={{ fontWeight: 800, color: '#0f172a' }}>Page {pageNumber} of {totalPages}</span>
              </div>
            </div>
          );
        })}

        {/* ================================================================= */}
        {/* SECTION 2A: TRUCK ACCOUNTS MASTER SUMMARY                         */}
        {/* ================================================================= */}
        {(truckSummaryPages.length > 0 ? truckSummaryPages : [[]]).map((pageRows, pIdx) => {
          currentPageNum++;
          const pageNumber = currentPageNum;
          const isLast = pIdx === truckSummaryPages.length - 1;

          return (
            <div key={`trucks-summary-p-${pIdx}`} className="pdf-page" style={pageStyle}>
              <div>
                <div style={headerStyle}>
                  <div>
                    <h2 style={{ margin: '0 0 2px', fontSize: '15px', fontWeight: 900, color: '#1e3a8a' }}>
                      FAIZAN BODY BUILDERS
                    </h2>
                    <span style={{ fontSize: '10px', fontWeight: 700, color: '#c2410c' }}>
                      📋 SECTION 2A: TRUCK ACCOUNTS MASTER (ગાડી વાળા નું ખાતાવહી - સમરી)
                    </span>
                  </div>
                  <div style={{ textAlign: 'right', fontSize: '9px', color: '#64748b' }}>
                    <span>{exportDateStr}</span>
                    <div style={{ fontWeight: 700, color: '#0f172a' }}>Total Ledgers: {truckAccounts.length}</div>
                  </div>
                </div>

                {pageRows.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '30px', color: '#94a3b8', fontStyle: 'italic', fontSize: '11px' }}>
                    કોઈ ખાતાવહી રેકોર્ડ ઉપલબ્ધ નથી
                  </div>
                ) : (
                  <table style={tableStyle}>
                    <thead>
                      <tr>
                        <th style={{ ...thStyle, width: '22px', textAlign: 'center' }}>#</th>
                        <th style={thStyle}>Party Name (પાર્ટીનું નામ)</th>
                        <th style={thStyle}>Truck No.</th>
                        <th style={{ ...thStyle, width: '85px' }}>Mobile</th>
                        <th style={{ ...thStyle, width: '45px', textAlign: 'center' }}>Page</th>
                        <th style={{ ...thStyle, textAlign: 'right' }}>ઉધાર / બિલ (₹)</th>
                        <th style={{ ...thStyle, textAlign: 'right' }}>જમા / ચૂકવેલ (₹)</th>
                        <th style={{ ...thStyle, textAlign: 'right' }}>બાકી રકમ (₹)</th>
                        <th style={{ ...thStyle, width: '65px', textAlign: 'center' }}>સ્થિતિ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pageRows.map((a, idx) => {
                        const udhar = Number(a.total_udhar ?? a.total_bill) || 0;
                        const jama = Number(a.total_jama ?? a.total_paid) || 0;
                        const bal = Number(a.balance ?? a.pending_balance) || (udhar - jama);
                        const isEven = idx % 2 === 1;

                        return (
                          <tr key={a.id || idx} style={{ backgroundColor: isEven ? '#f8fafc' : '#ffffff' }}>
                            <td style={{ ...tdStyle, textAlign: 'center', fontWeight: 700 }}>
                              {pIdx * 15 + idx + 1}
                            </td>
                            <td style={{ ...tdStyle, fontWeight: 700, color: '#0f172a' }}>{a.party_name || '—'}</td>
                            <td style={{ ...tdStyle, fontWeight: 600, color: '#1e3a8a' }}>{a.truck_no || '—'}</td>
                            <td style={{ ...tdStyle, fontSize: '9px', color: '#64748b' }}>{a.phone || a.mobile || '—'}</td>
                            <td style={{ ...tdStyle, textAlign: 'center', fontSize: '9px', fontWeight: 600 }}>
                              {a.page_no ? `P-${a.page_no}` : '—'}
                            </td>
                            <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 700, color: '#b45309' }}>
                              ₹{udhar.toLocaleString('en-IN')}
                            </td>
                            <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 700, color: '#15803d' }}>
                              ₹{jama.toLocaleString('en-IN')}
                            </td>
                            <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 800, color: bal > 0 ? '#b91c1c' : '#15803d' }}>
                              ₹{bal.toLocaleString('en-IN')}
                            </td>
                            <td style={{ ...tdStyle, textAlign: 'center', fontSize: '9px', fontWeight: 700 }}>
                              <span
                                style={{
                                  display: 'inline-block',
                                  padding: '1px 6px',
                                  borderRadius: '4px',
                                  backgroundColor: bal === 0 ? '#dcfce7' : '#fee2e2',
                                  color: bal === 0 ? '#15803d' : '#b91c1c',
                                }}
                              >
                                {bal === 0 ? 'સરભર' : 'બાકી'}
                              </span>
                            </td>
                          </tr>
                        );
                      })}

                      {isLast && (
                        <tr style={{ backgroundColor: '#f1f5f9', fontWeight: 800 }}>
                          <td colSpan="5" style={{ ...tdStyle, textAlign: 'right', fontWeight: 800, padding: '6px' }}>
                            ખાતાવહી કુલ સરવાળો (Total Ledgers):
                          </td>
                          <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 800, color: '#b45309' }}>
                            ₹{totalTruckUdhar.toLocaleString('en-IN')}
                          </td>
                          <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 800, color: '#15803d' }}>
                            ₹{totalTruckJama.toLocaleString('en-IN')}
                          </td>
                          <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 800, color: '#b91c1c' }}>
                            ₹{totalTruckDue.toLocaleString('en-IN')}
                          </td>
                          <td style={tdStyle}></td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                )}
              </div>

              <div style={footerStyle}>
                <span>Faizan Body Works • Truck Accounts Master</span>
                <span>Section 2A</span>
                <span style={{ fontWeight: 800, color: '#0f172a' }}>Page {pageNumber} of {totalPages}</span>
              </div>
            </div>
          );
        })}

        {/* ================================================================= */}
        {/* SECTION 2B: TRUCK ACCOUNT DETAILED ENTRIES (તમામ એન્ટ્રીઓ)           */}
        {/* ================================================================= */}
        {(truckEntryPages.length > 0 ? truckEntryPages : [[]]).map((pageRows, pIdx) => {
          currentPageNum++;
          const pageNumber = currentPageNum;

          return (
            <div key={`trucks-entries-p-${pIdx}`} className="pdf-page" style={pageStyle}>
              <div>
                <div style={headerStyle}>
                  <div>
                    <h2 style={{ margin: '0 0 2px', fontSize: '15px', fontWeight: 900, color: '#1e3a8a' }}>
                      FAIZAN BODY BUILDERS
                    </h2>
                    <span style={{ fontSize: '10px', fontWeight: 700, color: '#c2410c' }}>
                      📋 SECTION 2B: TRUCK ACCOUNT DETAILED ENTRIES (ગાડી વાળા ની તમામ એન્ટ્રીઓ - સંપૂર્ણ લેજર)
                    </span>
                  </div>
                  <div style={{ textAlign: 'right', fontSize: '9px', color: '#64748b' }}>
                    <span>{exportDateStr}</span>
                    <div style={{ fontWeight: 700, color: '#0f172a' }}>Total Entries: {truckAccountEntries.length}</div>
                  </div>
                </div>

                {pageRows.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '30px', color: '#94a3b8', fontStyle: 'italic', fontSize: '11px' }}>
                    કોઈ એન્ટ્રી ઉપલબ્ધ નથી
                  </div>
                ) : (
                  <table style={tableStyle}>
                    <thead>
                      <tr>
                        <th style={{ ...thStyle, width: '22px', textAlign: 'center' }}>#</th>
                        <th style={{ ...thStyle, width: '68px', textAlign: 'center' }}>તારીખ</th>
                        <th style={thStyle}>Party Name (પાર્ટીનું નામ)</th>
                        <th style={{ ...thStyle, width: '75px' }}>Truck No.</th>
                        <th style={{ ...thStyle, width: '38px', textAlign: 'center' }}>Page</th>
                        <th style={{ ...thStyle, width: '55px', textAlign: 'center' }}>પ્રકાર</th>
                        <th style={thStyle}>વિગત (Particulars)</th>
                        <th style={{ ...thStyle, width: '50px', textAlign: 'center' }}>મોડ</th>
                        <th style={{ ...thStyle, textAlign: 'right', width: '75px' }}>રકમ (₹)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pageRows.map((e, idx) => {
                        const isJama = e.type === 'jama';
                        const amt = Number(e.amount) || 0;
                        const isEven = idx % 2 === 1;

                        return (
                          <tr key={e.id || idx} style={{ backgroundColor: isEven ? '#f8fafc' : '#ffffff' }}>
                            <td style={{ ...tdStyle, textAlign: 'center', fontWeight: 700 }}>
                              {pIdx * 20 + idx + 1}
                            </td>
                            <td style={{ ...tdStyle, textAlign: 'center', fontSize: '8.5px' }}>
                              {e.date ? String(e.date).slice(0, 10) : '—'}
                            </td>
                            <td style={{ ...tdStyle, fontWeight: 700, color: '#0f172a' }}>
                              {e.party_name || '—'}
                            </td>
                            <td style={{ ...tdStyle, color: '#1e3a8a', fontSize: '8.5px' }}>
                              {e.truck_no || '—'}
                            </td>
                            <td style={{ ...tdStyle, textAlign: 'center', fontSize: '8.5px' }}>
                              {e.page_no ? `P-${e.page_no}` : '—'}
                            </td>
                            <td style={{ ...tdStyle, textAlign: 'center', fontSize: '8.5px', fontWeight: 800 }}>
                              <span
                                style={{
                                  display: 'inline-block',
                                  padding: '1px 5px',
                                  borderRadius: '3px',
                                  backgroundColor: isJama ? '#dcfce7' : '#fee2e2',
                                  color: isJama ? '#15803d' : '#b91c1c',
                                }}
                              >
                                {isJama ? 'જમા' : 'ઉધાર'}
                              </span>
                            </td>
                            <td style={{ ...tdStyle, color: '#1e293b' }}>
                              {e.particulars || '—'}
                            </td>
                            <td style={{ ...tdStyle, textAlign: 'center', fontSize: '8.5px', color: '#64748b' }}>
                              {e.payment_mode || 'Cash'}
                            </td>
                            <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 800, color: isJama ? '#15803d' : '#b45309' }}>
                              {isJama ? '+' : '-'}₹{amt.toLocaleString('en-IN')}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>

              <div style={footerStyle}>
                <span>Faizan Body Works • Truck Accounts Detailed Ledger Entries</span>
                <span>Section 2B</span>
                <span style={{ fontWeight: 800, color: '#0f172a' }}>Page {pageNumber} of {totalPages}</span>
              </div>
            </div>
          );
        })}

        {/* ================================================================= */}
        {/* SECTION 3A: WORKERS MASTER SUMMARY                                */}
        {/* ================================================================= */}
        {(workerSummaryPages.length > 0 ? workerSummaryPages : [[]]).map((pageRows, pIdx) => {
          currentPageNum++;
          const pageNumber = currentPageNum;
          const isLast = pIdx === workerSummaryPages.length - 1;

          return (
            <div key={`workers-summary-p-${pIdx}`} className="pdf-page" style={pageStyle}>
              <div>
                <div style={headerStyle}>
                  <div>
                    <h2 style={{ margin: '0 0 2px', fontSize: '15px', fontWeight: 900, color: '#1e3a8a' }}>
                      FAIZAN BODY BUILDERS
                    </h2>
                    <span style={{ fontSize: '10px', fontWeight: 700, color: '#15803d' }}>
                      👥 SECTION 3A: WORKERS MASTER (કારીગરો અને હિસાબ સમરી)
                    </span>
                  </div>
                  <div style={{ textAlign: 'right', fontSize: '9px', color: '#64748b' }}>
                    <span>{exportDateStr}</span>
                    <div style={{ fontWeight: 700, color: '#0f172a' }}>Total Staff: {workers.length}</div>
                  </div>
                </div>

                {pageRows.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '30px', color: '#94a3b8', fontStyle: 'italic', fontSize: '11px' }}>
                    કોઈ કારીગર રેકોર્ડ મળેલ નથી
                  </div>
                ) : (
                  <table style={tableStyle}>
                    <thead>
                      <tr>
                        <th style={{ ...thStyle, width: '22px', textAlign: 'center' }}>#</th>
                        <th style={thStyle}>Worker Name (નામ)</th>
                        <th style={{ ...thStyle, width: '85px' }}>Mobile</th>
                        <th style={{ ...thStyle, width: '70px', textAlign: 'center' }}>જોડાવાની તારીખ</th>
                        <th style={{ ...thStyle, width: '70px', textAlign: 'center' }}>જવાની તારીખ</th>
                        <th style={{ ...thStyle, textAlign: 'right' }}>કુલ કામ (₹)</th>
                        <th style={{ ...thStyle, textAlign: 'right' }}>ઉપાડ (₹)</th>
                        <th style={{ ...thStyle, textAlign: 'right' }}>બાકી હિસાબ (₹)</th>
                        <th style={{ ...thStyle, width: '60px', textAlign: 'center' }}>સ્થિતિ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pageRows.map((w, idx) => {
                        const work = Number(w.total_work) || 0;
                        const upad = Number(w.total_upad) || 0;
                        const bal = Number(w.balance) || (work - upad);
                        const isEven = idx % 2 === 1;
                        const isPresent = !w.going_date;

                        return (
                          <tr key={w.id || idx} style={{ backgroundColor: isEven ? '#f8fafc' : '#ffffff' }}>
                            <td style={{ ...tdStyle, textAlign: 'center', fontWeight: 700 }}>
                              {pIdx * 16 + idx + 1}
                            </td>
                            <td style={{ ...tdStyle, fontWeight: 700, color: '#0f172a' }}>{w.name || '—'}</td>
                            <td style={{ ...tdStyle, fontSize: '9px', color: '#475569' }}>{w.mobile || '—'}</td>
                            <td style={{ ...tdStyle, textAlign: 'center', fontSize: '8.5px' }}>
                              {w.coming_date ? String(w.coming_date).slice(0, 10) : (w.joining_date ? String(w.joining_date).slice(0, 10) : '—')}
                            </td>
                            <td style={{ ...tdStyle, textAlign: 'center', fontSize: '8.5px', color: isPresent ? '#15803d' : '#b91c1c' }}>
                              {w.going_date ? String(w.going_date).slice(0, 10) : 'હાજર'}
                            </td>
                            <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 700, color: '#15803d' }}>
                              ₹{work.toLocaleString('en-IN')}
                            </td>
                            <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 700, color: '#b45309' }}>
                              ₹{upad.toLocaleString('en-IN')}
                            </td>
                            <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 800, color: bal !== 0 ? '#b91c1c' : '#15803d' }}>
                              ₹{bal.toLocaleString('en-IN')}
                            </td>
                            <td style={{ ...tdStyle, textAlign: 'center', fontSize: '8.5px', fontWeight: 700 }}>
                              <span
                                style={{
                                  display: 'inline-block',
                                  padding: '1px 5px',
                                  borderRadius: '3px',
                                  backgroundColor: isPresent ? '#dcfce7' : '#fee2e2',
                                  color: isPresent ? '#15803d' : '#b91c1c',
                                }}
                              >
                                {isPresent ? 'હાજર' : 'છૂટા'}
                              </span>
                            </td>
                          </tr>
                        );
                      })}

                      {isLast && (
                        <tr style={{ backgroundColor: '#f1f5f9', fontWeight: 800 }}>
                          <td colSpan="5" style={{ ...tdStyle, textAlign: 'right', fontWeight: 800, padding: '6px' }}>
                            કારીગરો કુલ હિસાબ (Workers Total):
                          </td>
                          <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 800, color: '#15803d' }}>
                            ₹{totalWorkerWork.toLocaleString('en-IN')}
                          </td>
                          <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 800, color: '#b45309' }}>
                            ₹{totalWorkerUpad.toLocaleString('en-IN')}
                          </td>
                          <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 800, color: '#b91c1c' }}>
                            ₹{totalWorkerBalance.toLocaleString('en-IN')}
                          </td>
                          <td style={tdStyle}></td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                )}
              </div>

              <div style={footerStyle}>
                <span>Faizan Body Works • Workers Master Summary</span>
                <span>Section 3A</span>
                <span style={{ fontWeight: 800, color: '#0f172a' }}>Page {pageNumber} of {totalPages}</span>
              </div>
            </div>
          );
        })}

        {/* ================================================================= */}
        {/* SECTION 3B: WORKER TRANSACTIONS DETAILED LEDGER (૬૯૫ એન્ટ્રીઓ)        */}
        {/* ================================================================= */}
        {(workerTxPages.length > 0 ? workerTxPages : [[]]).map((pageRows, pIdx) => {
          currentPageNum++;
          const pageNumber = currentPageNum;

          return (
            <div key={`workers-tx-p-${pIdx}`} className="pdf-page" style={pageStyle}>
              <div>
                <div style={headerStyle}>
                  <div>
                    <h2 style={{ margin: '0 0 2px', fontSize: '15px', fontWeight: 900, color: '#1e3a8a' }}>
                      FAIZAN BODY BUILDERS
                    </h2>
                    <span style={{ fontSize: '10px', fontWeight: 700, color: '#15803d' }}>
                      👥 SECTION 3B: WORKER TRANSACTIONS (કારીગરોની તમામ એન્ટ્રીઓ - ઉપાડ અને પગાર હિસાબ)
                    </span>
                  </div>
                  <div style={{ textAlign: 'right', fontSize: '9px', color: '#64748b' }}>
                    <span>{exportDateStr}</span>
                    <div style={{ fontWeight: 700, color: '#0f172a' }}>Total Entries: {workerTransactions.length}</div>
                  </div>
                </div>

                {pageRows.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '30px', color: '#94a3b8', fontStyle: 'italic', fontSize: '11px' }}>
                    કોઈ એન્ટ્રી ઉપલબ્ધ નથી
                  </div>
                ) : (
                  <table style={tableStyle}>
                    <thead>
                      <tr>
                        <th style={{ ...thStyle, width: '22px', textAlign: 'center' }}>#</th>
                        <th style={{ ...thStyle, width: '70px', textAlign: 'center' }}>તારીખ</th>
                        <th style={{ ...thStyle, width: '130px' }}>Worker Name (કારીગર)</th>
                        <th style={{ ...thStyle, width: '65px', textAlign: 'center' }}>પ્રકાર</th>
                        <th style={thStyle}>વિગત / નોંધ (Notes)</th>
                        <th style={{ ...thStyle, width: '50px', textAlign: 'center' }}>મોડ</th>
                        <th style={{ ...thStyle, textAlign: 'right', width: '80px' }}>રકમ (₹)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pageRows.map((t, idx) => {
                        const isCredit = t.type === 'salary' || t.type === 'work' || t.type === 'credit';
                        const amt = Number(t.amount) || 0;
                        const isEven = idx % 2 === 1;

                        return (
                          <tr key={t.id || idx} style={{ backgroundColor: isEven ? '#f8fafc' : '#ffffff' }}>
                            <td style={{ ...tdStyle, textAlign: 'center', fontWeight: 700 }}>
                              {pIdx * 22 + idx + 1}
                            </td>
                            <td style={{ ...tdStyle, textAlign: 'center', fontSize: '8.5px' }}>
                              {t.date ? String(t.date).slice(0, 10) : '—'}
                            </td>
                            <td style={{ ...tdStyle, fontWeight: 700, color: '#0f172a' }}>
                              {t.worker_name || '—'}
                            </td>
                            <td style={{ ...tdStyle, textAlign: 'center', fontSize: '8.5px', fontWeight: 800 }}>
                              <span
                                style={{
                                  display: 'inline-block',
                                  padding: '1px 5px',
                                  borderRadius: '3px',
                                  backgroundColor: isCredit ? '#dcfce7' : '#fee2e2',
                                  color: isCredit ? '#15803d' : '#b91c1c',
                                }}
                              >
                                {isCredit ? 'મજૂરી/કામ' : 'ઉપાડ'}
                              </span>
                            </td>
                            <td style={{ ...tdStyle, color: '#1e293b' }}>
                              {t.notes || '—'}
                            </td>
                            <td style={{ ...tdStyle, textAlign: 'center', fontSize: '8.5px', color: '#64748b' }}>
                              {t.payment_mode || 'Cash'}
                            </td>
                            <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 800, color: isCredit ? '#15803d' : '#b45309' }}>
                              {isCredit ? '+' : '-'}₹{amt.toLocaleString('en-IN')}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>

              <div style={footerStyle}>
                <span>Faizan Body Works • Worker Transactions Detailed Ledger</span>
                <span>Section 3B</span>
                <span style={{ fontWeight: 800, color: '#0f172a' }}>Page {pageNumber} of {totalPages}</span>
              </div>
            </div>
          );
        })}

        {/* ================================================================= */}
        {/* SECTION 4: ROJMED (રોજમેળ - તમામે તમામ રોકડ એન્ટ્રીઓ)                  */}
        {/* ================================================================= */}
        {(rojmedPages.length > 0 ? rojmedPages : [[]]).map((pageRows, pIdx) => {
          currentPageNum++;
          const pageNumber = currentPageNum;

          return (
            <div key={`rojmed-p-${pIdx}`} className="pdf-page" style={pageStyle}>
              <div>
                <div style={headerStyle}>
                  <div>
                    <h2 style={{ margin: '0 0 2px', fontSize: '15px', fontWeight: 900, color: '#1e3a8a' }}>
                      FAIZAN BODY BUILDERS
                    </h2>
                    <span style={{ fontSize: '10px', fontWeight: 700, color: '#7e22ce' }}>
                      💰 SECTION 4: ROJMED CASHBOOK (રોજમેળ - રોકડ હિસાબ તમામ એન્ટ્રીઓ)
                    </span>
                  </div>
                  <div style={{ textAlign: 'right', fontSize: '9px', color: '#64748b' }}>
                    <span>{exportDateStr}</span>
                    <div style={{ fontWeight: 700, color: '#0f172a' }}>Total Entries: {rojmedEntries.length}</div>
                  </div>
                </div>

                {pageRows.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '30px', color: '#94a3b8', fontStyle: 'italic', fontSize: '11px' }}>
                    કોઈ રોજમેળ એન્ટ્રી ઉપલબ્ધ નથી
                  </div>
                ) : (
                  <table style={tableStyle}>
                    <thead>
                      <tr>
                        <th style={{ ...thStyle, width: '22px', textAlign: 'center' }}>#</th>
                        <th style={{ ...thStyle, width: '70px', textAlign: 'center' }}>તારીખ</th>
                        <th style={{ ...thStyle, width: '75px', textAlign: 'center' }}>પ્રકાર</th>
                        <th style={thStyle}>વિગત (Particulars / Description)</th>
                        <th style={{ ...thStyle, width: '60px', textAlign: 'center' }}>મોડ</th>
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
                              {pIdx * 18 + idx + 1}
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
                )}
              </div>

              <div style={footerStyle}>
                <span>Faizan Body Works • Daily Cashbook Register</span>
                <span>Section 4</span>
                <span style={{ fontWeight: 800, color: '#0f172a' }}>Page {pageNumber} of {totalPages}</span>
              </div>
            </div>
          );
        })}

        {/* ================================================================= */}
        {/* SECTION 5A: STOCK ITEMS MASTER (સ્ટોક માલ સામાન)                    */}
        {/* ================================================================= */}
        {(stockPages.length > 0 ? stockPages : [[]]).map((pageRows, pIdx) => {
          currentPageNum++;
          const pageNumber = currentPageNum;

          return (
            <div key={`stock-items-p-${pIdx}`} className="pdf-page" style={pageStyle}>
              <div>
                <div style={headerStyle}>
                  <div>
                    <h2 style={{ margin: '0 0 2px', fontSize: '15px', fontWeight: 900, color: '#1e3a8a' }}>
                      FAIZAN BODY BUILDERS
                    </h2>
                    <span style={{ fontSize: '10px', fontWeight: 700, color: '#0284c7' }}>
                      🔩 SECTION 5A: STOCK MASTER (સ્ટોક માલ સામાન યાદી)
                    </span>
                  </div>
                  <div style={{ textAlign: 'right', fontSize: '9px', color: '#64748b' }}>
                    <span>{exportDateStr}</span>
                    <div style={{ fontWeight: 700, color: '#0f172a' }}>Total Items: {stockItems.length}</div>
                  </div>
                </div>

                {pageRows.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '30px', color: '#94a3b8', fontStyle: 'italic', fontSize: '11px' }}>
                    કોઈ સ્ટોક માલ ઉપલબ્ધ નથી
                  </div>
                ) : (
                  <table style={tableStyle}>
                    <thead>
                      <tr>
                        <th style={{ ...thStyle, width: '22px', textAlign: 'center' }}>#</th>
                        <th style={thStyle}>Item Name (માલનું નામ)</th>
                        <th style={thStyle}>Category (કેટેગરી)</th>
                        <th style={{ ...thStyle, textAlign: 'right' }}>Current Qty</th>
                        <th style={{ ...thStyle, width: '45px', textAlign: 'center' }}>Unit</th>
                        <th style={{ ...thStyle, textAlign: 'right' }}>Min Alert</th>
                        <th style={{ ...thStyle, textAlign: 'right' }}>Unit Price (₹)</th>
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
                              {pIdx * 18 + idx + 1}
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
                )}
              </div>

              <div style={footerStyle}>
                <span>Faizan Body Works • Stock Inventory Register</span>
                <span>Section 5A</span>
                <span style={{ fontWeight: 800, color: '#0f172a' }}>Page {pageNumber} of {totalPages}</span>
              </div>
            </div>
          );
        })}

        {/* ================================================================= */}
        {/* SECTION 5B: STOCK TRANSACTIONS MOVEMENT LOG                        */}
        {/* ================================================================= */}
        {(stockTxPages.length > 0 ? stockTxPages : [[]]).map((pageRows, pIdx) => {
          currentPageNum++;
          const pageNumber = currentPageNum;

          return (
            <div key={`stock-tx-p-${pIdx}`} className="pdf-page" style={pageStyle}>
              <div>
                <div style={headerStyle}>
                  <div>
                    <h2 style={{ margin: '0 0 2px', fontSize: '15px', fontWeight: 900, color: '#1e3a8a' }}>
                      FAIZAN BODY BUILDERS
                    </h2>
                    <span style={{ fontSize: '10px', fontWeight: 700, color: '#0284c7' }}>
                      🔩 SECTION 5B: STOCK MOVEMENT LOG (સ્ટોક આવક-જાવક એન્ટ્રીઓ)
                    </span>
                  </div>
                  <div style={{ textAlign: 'right', fontSize: '9px', color: '#64748b' }}>
                    <span>{exportDateStr}</span>
                    <div style={{ fontWeight: 700, color: '#0f172a' }}>Total Movements: {stockTransactions.length}</div>
                  </div>
                </div>

                {pageRows.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '30px', color: '#94a3b8', fontStyle: 'italic', fontSize: '11px' }}>
                    કોઈ સ્ટોક મુવમેન્ટ ઉપલબ્ધ નથી
                  </div>
                ) : (
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
                              {pIdx * 20 + idx + 1}
                            </td>
                            <td style={{ ...tdStyle, textAlign: 'center', fontSize: '8.5px' }}>
                              {tx.date ? String(tx.date).slice(0, 10) : '—'}
                            </td>
                            <td style={{ ...tdStyle, fontWeight: 700, color: '#0f172a' }}>
                              {tx.item_name || '—'}
                            </td>
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
                            <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 700 }}>
                              {tx.quantity}
                            </td>
                            <td style={{ ...tdStyle, textAlign: 'center', fontSize: '8.5px', color: '#64748b' }}>
                              {tx.unit || 'Pcs'}
                            </td>
                            <td style={{ ...tdStyle, color: '#475569' }}>
                              {tx.reference_note || '—'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>

              <div style={footerStyle}>
                <span>Faizan Body Works • Stock Movement Audit Register</span>
                <span>Section 5B</span>
                <span style={{ fontWeight: 800, color: '#0f172a' }}>Page {pageNumber} of {totalPages}</span>
              </div>
            </div>
          );
        })}

        {/* ================================================================= */}
        {/* SECTION 6: QUOTATIONS REGISTER                                    */}
        {/* ================================================================= */}
        {(quotePages.length > 0 ? quotePages : [[]]).map((pageRows, pIdx) => {
          currentPageNum++;
          const pageNumber = currentPageNum;
          const isLast = pIdx === quotePages.length - 1;

          return (
            <div key={`quotes-p-${pIdx}`} className="pdf-page" style={pageStyle}>
              <div>
                <div style={headerStyle}>
                  <div>
                    <h2 style={{ margin: '0 0 2px', fontSize: '15px', fontWeight: 900, color: '#1e3a8a' }}>
                      FAIZAN BODY BUILDERS
                    </h2>
                    <span style={{ fontSize: '10px', fontWeight: 700, color: '#d97706' }}>
                      📑 SECTION 6: QUOTATIONS (કોટેશન્સ અને વિગતવાર આઇટમ્સ)
                    </span>
                  </div>
                  <div style={{ textAlign: 'right', fontSize: '9px', color: '#64748b' }}>
                    <span>{exportDateStr}</span>
                    <div style={{ fontWeight: 700, color: '#0f172a' }}>Total Quotes: {quotations.length}</div>
                  </div>
                </div>

                {pageRows.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '30px', color: '#94a3b8', fontStyle: 'italic', fontSize: '11px' }}>
                    કોઈ કોટેશન રેકોર્ડ મળેલ નથી
                  </div>
                ) : (
                  <table style={tableStyle}>
                    <thead>
                      <tr>
                        <th style={{ ...thStyle, width: '22px', textAlign: 'center' }}>#</th>
                        <th style={thStyle}>Quotation No.</th>
                        <th style={{ ...thStyle, width: '70px', textAlign: 'center' }}>તારીખ</th>
                        <th style={thStyle}>Customer Name & Mobile</th>
                        <th style={thStyle}>Vehicle Model</th>
                        <th style={{ ...thStyle, textAlign: 'right' }}>Total Estimated (₹)</th>
                        <th style={{ ...thStyle, width: '65px', textAlign: 'center' }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pageRows.map((q, idx) => {
                        const total = Number(q.final_price ?? q.total_amount ?? q.subtotal) || 0;
                        const isEven = idx % 2 === 1;
                        const dateStr = q.quotation_date ? String(q.quotation_date).slice(0, 10) : (q.date ? String(q.date).slice(0, 10) : '—');
                        const mobile = q.mobile_number || q.customer_mobile || '';

                        return (
                          <tr key={q.id || idx} style={{ backgroundColor: isEven ? '#f8fafc' : '#ffffff' }}>
                            <td style={{ ...tdStyle, textAlign: 'center', fontWeight: 700 }}>
                              {pIdx * 12 + idx + 1}
                            </td>
                            <td style={{ ...tdStyle, fontWeight: 700, color: '#1e3a8a' }}>{q.quotation_no || `Q-${q.id}`}</td>
                            <td style={{ ...tdStyle, textAlign: 'center', fontSize: '8.5px' }}>{dateStr}</td>
                            <td style={tdStyle}>
                              <div style={{ fontWeight: 700 }}>{q.customer_name || '—'}</div>
                              {mobile && <div style={{ fontSize: '8.5px', color: '#64748b' }}>{mobile}</div>}
                            </td>
                            <td style={{ ...tdStyle, color: '#334155' }}>{q.truck_chassis_no || q.vehicle_model || '—'}</td>
                            <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 800, color: '#0f172a' }}>
                              ₹{total.toLocaleString('en-IN')}
                            </td>
                            <td style={{ ...tdStyle, textAlign: 'center', fontSize: '8.5px', fontWeight: 700 }}>
                              <span style={{ display: 'inline-block', padding: '1px 5px', borderRadius: '3px', backgroundColor: '#eff6ff', color: '#1d4ed8' }}>
                                {q.status || 'Draft'}
                              </span>
                            </td>
                          </tr>
                        );
                      })}

                      {isLast && (
                        <tr style={{ backgroundColor: '#f1f5f9', fontWeight: 800 }}>
                          <td colSpan="5" style={{ ...tdStyle, textAlign: 'right', fontWeight: 800, padding: '6px' }}>
                            કુલ કોટેશન રકમ (Total Quotations Value):
                          </td>
                          <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 800, color: '#0f172a' }}>
                            ₹{totalQuoteValue.toLocaleString('en-IN')}
                          </td>
                          <td style={tdStyle}></td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                )}
              </div>

              <div style={footerStyle}>
                <span>Faizan Body Works • Quotations Register</span>
                <span>Section 6</span>
                <span style={{ fontWeight: 800, color: '#0f172a' }}>Page {pageNumber} of {totalPages}</span>
              </div>
            </div>
          );
        })}

        {/* ================================================================= */}
        {/* SECTION 7: SYSTEM USERS                                           */}
        {/* ================================================================= */}
        {(userPages.length > 0 ? userPages : [[]]).map((pageRows, pIdx) => {
          currentPageNum++;
          const pageNumber = currentPageNum;

          return (
            <div key={`users-p-${pIdx}`} className="pdf-page" style={pageStyle}>
              <div>
                <div style={headerStyle}>
                  <div>
                    <h2 style={{ margin: '0 0 2px', fontSize: '15px', fontWeight: 900, color: '#1e3a8a' }}>
                      FAIZAN BODY BUILDERS
                    </h2>
                    <span style={{ fontSize: '10px', fontWeight: 700, color: '#475569' }}>
                      👤 SECTION 7: SYSTEM USERS & ACCESS (સિસ્ટમ યુઝર્સ)
                    </span>
                  </div>
                  <div style={{ textAlign: 'right', fontSize: '9px', color: '#64748b' }}>
                    <span>{exportDateStr}</span>
                    <div style={{ fontWeight: 700, color: '#0f172a' }}>Total Users: {users.length}</div>
                  </div>
                </div>

                {pageRows.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '30px', color: '#94a3b8', fontStyle: 'italic', fontSize: '11px' }}>
                    કોઈ યુઝર રેકોર્ડ મળેલ નથી
                  </div>
                ) : (
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
                )}

                {/* Maintenance Verification Box */}
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
                    આ PDF રિપોર્ટ Faizan Body Management System ના તમામ ૧૨ ડેટાબેઝ મોડ્યુલ્સનો અને તમામે તમામ એન્ટ્રીઓનો
                    સંપૂર્ણ લેખિત રેકોર્ડ છે. સર્વર મેન્ટેનન્સ કે ઈન્ટરનેટ બંધ દરમિયાન કોઈ પણ હિસાબ, ઓર્ડર, કારીગર હિસાબ
                    કે ગાડી વાળા ની ખાતાવહીની તપાસ માટે આ દસ્તાવેજ સંપૂર્ણ અધિકૃત ગણવામાં આવશે.
                  </div>
                </div>
              </div>

              <div style={footerStyle}>
                <span>Faizan Body Works • End of System All-Data Ledger Report</span>
                <span>Section 7 (Final)</span>
                <span style={{ fontWeight: 800, color: '#0f172a' }}>Page {pageNumber} of {totalPages}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default BackupPdfReport;
