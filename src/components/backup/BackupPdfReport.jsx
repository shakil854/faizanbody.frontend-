import React, { useMemo } from 'react';

/**
 * BackupPdfReport
 * Renders an offscreen, pixel-perfect, multi-page A4 document
 * containing ALL application data (Orders, Truck Accounts, Workers, Rojmed, Stock, Quotations, Users).
 * Each page has `.pdf-page` class for seamless processing by pdfGenerator (jsPDF/html2canvas).
 * Formatted for clean readability during server maintenance or offline viewing.
 */
export function BackupPdfReport({ data, elementId = 'printableFullBackupReport' }) {
  if (!data) return null;

  const orders = Array.isArray(data.orders) ? data.orders : [];
  const truckAccounts = Array.isArray(data.truckAccounts) ? data.truckAccounts : [];
  const workers = Array.isArray(data.workers) ? data.workers : [];
  const rojmedEntries = Array.isArray(data.rojmedEntries) ? data.rojmedEntries : [];
  const stockItems = Array.isArray(data.stockItems) ? data.stockItems : [];
  const quotations = Array.isArray(data.quotations) ? data.quotations : [];
  const users = Array.isArray(data.users) ? data.users : [];

  // Summary statistics
  const totalOrderValue = orders.reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0);
  const totalOrderAdvance = orders.reduce((sum, o) => sum + (Number(o.advance_amount) || 0), 0);
  const totalOrderPending = orders.reduce(
    (sum, o) => sum + (Number(o.pending_balance ?? o.pending_amount) || (Number(o.total_amount || 0) - Number(o.advance_amount || 0))),
    0
  );

  const totalTruckUdhar = truckAccounts.reduce((sum, a) => sum + (Number(a.total_udhar ?? a.total_bill) || 0), 0);
  const totalTruckJama = truckAccounts.reduce((sum, a) => sum + (Number(a.total_jama ?? a.total_paid) || 0), 0);
  const totalTruckDue = truckAccounts.reduce((sum, a) => sum + (Number(a.balance ?? a.pending_balance) || 0), 0);

  const totalDailyWages = workers.reduce((sum, w) => sum + (Number(w.daily_salary) || 0), 0);
  const totalQuoteValue = quotations.reduce((sum, q) => sum + (Number(q.total_amount) || 0), 0);

  // Pagination chunkers
  const chunkArray = (arr, size) => {
    if (!arr || arr.length === 0) return [[]];
    const chunks = [];
    for (let i = 0; i < arr.length; i += size) {
      chunks.push(arr.slice(i, i + size));
    }
    return chunks;
  };

  const ordersPages = useMemo(() => chunkArray(orders, 13), [orders]);
  const truckPages = useMemo(() => chunkArray(truckAccounts, 15), [truckAccounts]);
  const workerPages = useMemo(() => chunkArray(workers, 16), [workers]);
  const rojmedPages = useMemo(() => chunkArray(rojmedEntries, 18), [rojmedEntries]);
  const stockPages = useMemo(() => chunkArray(stockItems, 18), [stockItems]);
  const quotePages = useMemo(() => chunkArray(quotations, 16), [quotations]);
  const userPages = useMemo(() => chunkArray(users, 18), [users]);

  // Total pages calculation: 1 Cover + Orders + Trucks + Workers + Rojmed + Stock + Quotes + Users
  const totalPages =
    1 +
    ordersPages.length +
    truckPages.length +
    workerPages.length +
    rojmedPages.length +
    stockPages.length +
    quotePages.length +
    userPages.length;

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
    padding: '24px 26px',
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
    paddingBottom: '10px',
    marginBottom: '14px',
  };

  const footerStyle = {
    borderTop: '1px solid #cbd5e1',
    paddingTop: '8px',
    marginTop: 'auto',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: '9.5px',
    color: '#64748b',
    fontWeight: 600,
  };

  const tableStyle = {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '10px',
  };

  const thStyle = {
    backgroundColor: '#f1f5f9',
    color: '#1e293b',
    padding: '6px 6px',
    border: '1px solid #cbd5e1',
    fontWeight: 800,
    textAlign: 'left',
  };

  const tdStyle = {
    padding: '5px 6px',
    border: '1px solid #e2e8f0',
    color: '#334155',
  };

  return (
    <div
      id={elementId}
      style={{
        position: 'fixed',
        left: '-9999px',
        top: '-9999px',
        width: '720px',
        zIndex: -9999,
        backgroundColor: '#ffffff',
      }}
    >
      {/* ================================================================= */}
      {/* PAGE 1: COVER & EXECUTIVE DASHBOARD                               */}
      {/* ================================================================= */}
      <div className="pdf-page" style={pageStyle}>
        <div>
          {/* Main Top Header */}
          <div style={{ textAlign: 'center', borderBottom: '2.5px solid #1e3a8a', paddingBottom: '14px', marginBottom: '16px' }}>
            <h1 style={{ margin: '0 0 4px', fontSize: '24px', fontWeight: 900, color: '#1e3a8a', letterSpacing: '0.8px' }}>
              FAIZAN BODY BUILDERS
            </h1>
            <p style={{ margin: '0 0 4px', fontSize: '12px', fontWeight: 700, color: '#475569' }}>
              Commercial Vehicle & Truck Body Fabricators • All Fabrication & Repair Works
            </p>
            <div style={{ display: 'inline-block', backgroundColor: '#eff6ff', color: '#1d4ed8', border: '1.5px solid #93c5fd', borderRadius: '16px', padding: '3px 14px', fontSize: '11px', fontWeight: 800, marginTop: '4px' }}>
              🛡️ COMPLETE SYSTEM DATA BACKUP REPORT (સમગ્ર ડેટા બેકઅપ રિપોર્ટ)
            </div>
          </div>

          {/* Metadata Card */}
          <div style={{ backgroundColor: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '10px 14px', marginBottom: '16px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', fontSize: '10.5px' }}>
            <div>
              <span style={{ color: '#64748b', display: 'block', fontWeight: 600 }}>📅 Export Date & Time:</span>
              <strong style={{ color: '#0f172a' }}>{exportDateStr}</strong>
            </div>
            <div>
              <span style={{ color: '#64748b', display: 'block', fontWeight: 600 }}>📁 System Scope:</span>
              <strong style={{ color: '#16a34a' }}>All 12 Database Tables</strong>
            </div>
            <div>
              <span style={{ color: '#64748b', display: 'block', fontWeight: 600 }}>🔒 Purpose:</span>
              <strong style={{ color: '#0369a1' }}>Offline Maintenance & Read-Only Archive</strong>
            </div>
          </div>

          {/* Section Summary KPI Grid */}
          <h3 style={{ fontSize: '13px', fontWeight: 800, color: '#1e293b', margin: '0 0 10px', borderBottom: '1px solid #e2e8f0', paddingBottom: '4px' }}>
            📊 સમગ્ર એપ્લિકેશન સારાંશ (System Summary KPIs)
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', marginBottom: '16px' }}>
            {/* Box 1: Work Orders */}
            <div style={{ border: '1px solid #bfdbfe', backgroundColor: '#f0f9ff', borderRadius: '8px', padding: '10px 12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <span style={{ fontWeight: 800, fontSize: '11.5px', color: '#0369a1' }}>🚛 Work Orders (ઓર્ડર્સ)</span>
                <span style={{ backgroundColor: '#0284c7', color: '#ffffff', borderRadius: '10px', padding: '1px 7px', fontSize: '10px', fontWeight: 800 }}>
                  {orders.length} Records
                </span>
              </div>
              <div style={{ fontSize: '10px', color: '#334155', lineHeight: 1.5 }}>
                <div>કુલ રકમ: <strong>₹{totalOrderValue.toLocaleString('en-IN')}</strong></div>
                <div>મળેલ એડવાન્સ: <strong style={{ color: '#15803d' }}>₹{totalOrderAdvance.toLocaleString('en-IN')}</strong></div>
                <div>બાકી લેવાના: <strong style={{ color: '#b91c1c' }}>₹{totalOrderPending.toLocaleString('en-IN')}</strong></div>
              </div>
            </div>

            {/* Box 2: Truck Accounts */}
            <div style={{ border: '1px solid #fed7aa', backgroundColor: '#fff7ed', borderRadius: '8px', padding: '10px 12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <span style={{ fontWeight: 800, fontSize: '11.5px', color: '#c2410c' }}>📋 Truck Accounts (ખાતાવહી)</span>
                <span style={{ backgroundColor: '#ea580c', color: '#ffffff', borderRadius: '10px', padding: '1px 7px', fontSize: '10px', fontWeight: 800 }}>
                  {truckAccounts.length} Ledgers
                </span>
              </div>
              <div style={{ fontSize: '10px', color: '#334155', lineHeight: 1.5 }}>
                <div>કુલ ઉધાર/બિલ: <strong>₹{totalTruckUdhar.toLocaleString('en-IN')}</strong></div>
                <div>કુલ જમા: <strong style={{ color: '#15803d' }}>₹{totalTruckJama.toLocaleString('en-IN')}</strong></div>
                <div>ચોખ્ખી બાકી રકમ: <strong style={{ color: '#b91c1c' }}>₹{totalTruckDue.toLocaleString('en-IN')}</strong></div>
              </div>
            </div>

            {/* Box 3: Workers */}
            <div style={{ border: '1px solid #bbf7d0', backgroundColor: '#f0fdf4', borderRadius: '8px', padding: '10px 12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <span style={{ fontWeight: 800, fontSize: '11.5px', color: '#15803d' }}>👥 Workers (કારીગરો)</span>
                <span style={{ backgroundColor: '#16a34a', color: '#ffffff', borderRadius: '10px', padding: '1px 7px', fontSize: '10px', fontWeight: 800 }}>
                  {workers.length} Staff
                </span>
              </div>
              <div style={{ fontSize: '10px', color: '#334155', lineHeight: 1.5 }}>
                <div>સક્રિય કારીગરો: <strong>{workers.filter((w) => w.status !== 'Inactive' && w.status !== 'Left').length}</strong></div>
                <div>દૈનિક પગાર ટોટલ: <strong>₹{totalDailyWages.toLocaleString('en-IN')} / Day</strong></div>
              </div>
            </div>

            {/* Box 4: Rojmed & Stock */}
            <div style={{ border: '1px solid #e9d5ff', backgroundColor: '#faf5ff', borderRadius: '8px', padding: '10px 12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <span style={{ fontWeight: 800, fontSize: '11.5px', color: '#7e22ce' }}>💰 Rojmed & 🔩 Stock</span>
                <span style={{ backgroundColor: '#9333ea', color: '#ffffff', borderRadius: '10px', padding: '1px 7px', fontSize: '10px', fontWeight: 800 }}>
                  {rojmedEntries.length + stockItems.length} Entries
                </span>
              </div>
              <div style={{ fontSize: '10px', color: '#334155', lineHeight: 1.5 }}>
                <div>રોજમેળ એન્ટ્રીઓ: <strong>{rojmedEntries.length} Records</strong></div>
                <div>સ્ટોક માલ સામાન: <strong>{stockItems.length} Items</strong></div>
                <div>કોટેશન્સ: <strong>{quotations.length} (₹{totalQuoteValue.toLocaleString('en-IN')})</strong></div>
              </div>
            </div>
          </div>

          {/* Table of Contents */}
          <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px 14px', backgroundColor: '#ffffff' }}>
            <h4 style={{ margin: '0 0 6px', fontSize: '11.5px', fontWeight: 800, color: '#334155' }}>
              📑 રિપોર્ટ અનુક્રમણિકા (Table of Contents)
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px', fontSize: '10px', color: '#475569' }}>
              <div>• Section 1: Work Orders (ઓર્ડર્સ વિગત)</div>
              <div>• Section 2: Truck Accounts (ગાડી વાળા નું ખાતાવહી)</div>
              <div>• Section 3: Workers & Wage Ledger (કારીગરો અને હિસાબ)</div>
              <div>• Section 4: Rojmed Daily Cashbook (રોજમેળ)</div>
              <div>• Section 5: Stock Inventory (સ્ટોક માલ સામાન)</div>
              <div>• Section 6: Quotations (કોટેશન્સ)</div>
              <div>• Section 7: System Users (સિસ્ટમ યુઝર્સ)</div>
              <div>• Total Document Pages: <strong>{totalPages} Pages</strong></div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={footerStyle}>
          <span>Faizan Body Works • Complete System Backup Archive</span>
          <span>Generated: {exportDateStr}</span>
          <span style={{ fontWeight: 800, color: '#0f172a' }}>Page 1 of {totalPages}</span>
        </div>
      </div>

      {/* ================================================================= */}
      {/* SECTION 1: WORK ORDERS                                            */}
      {/* ================================================================= */}
      {ordersPages.map((pageRows, pIdx) => {
        currentPageNum++;
        const pageNumber = currentPageNum;
        const isFirst = pIdx === 0;
        const isLast = pIdx === ordersPages.length - 1;

        return (
          <div key={`orders-p-${pIdx}`} className="pdf-page" style={pageStyle}>
            <div>
              <div style={headerStyle}>
                <div>
                  <h2 style={{ margin: '0 0 2px', fontSize: '16px', fontWeight: 900, color: '#1e3a8a' }}>
                    FAIZAN BODY BUILDERS
                  </h2>
                  <span style={{ fontSize: '10.5px', fontWeight: 700, color: '#0369a1' }}>
                    🚛 SECTION 1: WORK ORDERS (વાહન અને બોડી ઓર્ડર્સ)
                  </span>
                </div>
                <div style={{ textAlign: 'right', fontSize: '9.5px', color: '#64748b' }}>
                  <span>{exportDateStr}</span>
                  <div style={{ fontWeight: 700, color: '#0f172a' }}>Total Orders: {orders.length}</div>
                </div>
              </div>

              {pageRows.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '30px', color: '#94a3b8', fontStyle: 'italic', fontSize: '11px' }}>
                  કોઈ ઓર્ડર ઉપલબ્ધ નથી (No work orders found)
                </div>
              ) : (
                <table style={tableStyle}>
                  <thead>
                    <tr>
                      <th style={{ ...thStyle, width: '24px', textAlign: 'center' }}>#</th>
                      <th style={thStyle}>Chassis / Order No.</th>
                      <th style={thStyle}>Customer & Mobile</th>
                      <th style={thStyle}>Vehicle Model</th>
                      <th style={{ ...thStyle, width: '65px', textAlign: 'center' }}>Date</th>
                      <th style={{ ...thStyle, textAlign: 'right' }}>Total (₹)</th>
                      <th style={{ ...thStyle, textAlign: 'right' }}>Adv. (₹)</th>
                      <th style={{ ...thStyle, textAlign: 'right' }}>Due (₹)</th>
                      <th style={{ ...thStyle, width: '70px', textAlign: 'center' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageRows.map((o, idx) => {
                      const total = Number(o.total_amount) || 0;
                      const adv = Number(o.advance_amount) || 0;
                      const due = Number(o.pending_balance ?? o.pending_amount) || (total - adv);
                      const isEven = idx % 2 === 1;

                      return (
                        <tr key={o.id || idx} style={{ backgroundColor: isEven ? '#f8fafc' : '#ffffff' }}>
                          <td style={{ ...tdStyle, textAlign: 'center', fontWeight: 700 }}>
                            {pIdx * 13 + idx + 1}
                          </td>
                          <td style={{ ...tdStyle, fontWeight: 700, color: '#0f172a' }}>
                            {o.chassis_no || o.order_no || '—'}
                          </td>
                          <td style={tdStyle}>
                            <div style={{ fontWeight: 700 }}>{o.customer_name || '—'}</div>
                            {o.customer_mobile && <div style={{ fontSize: '9px', color: '#64748b' }}>{o.customer_mobile}</div>}
                          </td>
                          <td style={{ ...tdStyle, color: '#334155' }}>
                            {o.vehicle_model || '—'}
                          </td>
                          <td style={{ ...tdStyle, textAlign: 'center', fontSize: '9px' }}>
                            {o.order_date ? String(o.order_date).slice(0, 10) : '—'}
                          </td>
                          <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 700 }}>
                            ₹{total.toLocaleString('en-IN')}
                          </td>
                          <td style={{ ...tdStyle, textAlign: 'right', color: '#16a34a' }}>
                            ₹{adv.toLocaleString('en-IN')}
                          </td>
                          <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 700, color: due > 0 ? '#b91c1c' : '#15803d' }}>
                            ₹{due.toLocaleString('en-IN')}
                          </td>
                          <td style={{ ...tdStyle, textAlign: 'center', fontSize: '9px', fontWeight: 700 }}>
                            <span
                              style={{
                                display: 'inline-block',
                                padding: '1px 6px',
                                borderRadius: '4px',
                                backgroundColor: o.status === 'Completed' || o.status === 'Delivered' ? '#dcfce7' : '#fef3c7',
                                color: o.status === 'Completed' || o.status === 'Delivered' ? '#15803d' : '#b45309',
                              }}
                            >
                              {o.status || 'Active'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}

                    {isLast && (
                      <tr style={{ backgroundColor: '#f1f5f9', fontWeight: 800 }}>
                        <td colSpan="5" style={{ ...tdStyle, textAlign: 'right', fontWeight: 800, padding: '7px' }}>
                          ઓર્ડર્સ કુલ ટોટલ (Total Orders):
                        </td>
                        <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 800 }}>
                          ₹{totalOrderValue.toLocaleString('en-IN')}
                        </td>
                        <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 800, color: '#16a34a' }}>
                          ₹{totalOrderAdvance.toLocaleString('en-IN')}
                        </td>
                        <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 800, color: '#b91c1c' }}>
                          ₹{totalOrderPending.toLocaleString('en-IN')}
                        </td>
                        <td style={tdStyle}></td>
                      </tr>
                    )}
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
      {/* SECTION 2: TRUCK ACCOUNTS (ગાડી વાળા નું ખાતાવહી)                   */}
      {/* ================================================================= */}
      {truckPages.map((pageRows, pIdx) => {
        currentPageNum++;
        const pageNumber = currentPageNum;
        const isLast = pIdx === truckPages.length - 1;

        return (
          <div key={`trucks-p-${pIdx}`} className="pdf-page" style={pageStyle}>
            <div>
              <div style={headerStyle}>
                <div>
                  <h2 style={{ margin: '0 0 2px', fontSize: '16px', fontWeight: 900, color: '#1e3a8a' }}>
                    FAIZAN BODY BUILDERS
                  </h2>
                  <span style={{ fontSize: '10.5px', fontWeight: 700, color: '#c2410c' }}>
                    📋 SECTION 2: TRUCK ACCOUNTS (ગાડી વાળા નું ખાતાવહી)
                  </span>
                </div>
                <div style={{ textAlign: 'right', fontSize: '9.5px', color: '#64748b' }}>
                  <span>{exportDateStr}</span>
                  <div style={{ fontWeight: 700, color: '#0f172a' }}>Total Ledgers: {truckAccounts.length}</div>
                </div>
              </div>

              {pageRows.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '30px', color: '#94a3b8', fontStyle: 'italic', fontSize: '11px' }}>
                  કોઈ ખાતાવહી રેકોર્ડ ઉપલબ્ધ નથી (No truck account records found)
                </div>
              ) : (
                <table style={tableStyle}>
                  <thead>
                    <tr>
                      <th style={{ ...thStyle, width: '24px', textAlign: 'center' }}>#</th>
                      <th style={thStyle}>Party Name (પાર્ટીનું નામ)</th>
                      <th style={thStyle}>Truck / Vehicle No.</th>
                      <th style={thStyle}>Mobile</th>
                      <th style={{ ...thStyle, textAlign: 'right' }}>ઉધાર / બિલ (₹)</th>
                      <th style={{ ...thStyle, textAlign: 'right' }}>જમા / ચૂકવેલ (₹)</th>
                      <th style={{ ...thStyle, textAlign: 'right' }}>બાકી રકમ (₹)</th>
                      <th style={{ ...thStyle, width: '70px', textAlign: 'center' }}>સ્થિતિ</th>
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
                          <td style={{ ...tdStyle, fontWeight: 700, color: '#0f172a' }}>
                            {a.party_name || '—'}
                          </td>
                          <td style={{ ...tdStyle, fontWeight: 600, color: '#1e3a8a' }}>
                            {a.truck_no || '—'}
                          </td>
                          <td style={{ ...tdStyle, fontSize: '9.5px', color: '#64748b' }}>
                            {a.mobile || '—'}
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
                        <td colSpan="4" style={{ ...tdStyle, textAlign: 'right', fontWeight: 800, padding: '7px' }}>
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
              <span>Faizan Body Works • Truck Accounts Ledger</span>
              <span>Section 2</span>
              <span style={{ fontWeight: 800, color: '#0f172a' }}>Page {pageNumber} of {totalPages}</span>
            </div>
          </div>
        );
      })}

      {/* ================================================================= */}
      {/* SECTION 3: WORKERS & STAFF (કારીગરો અને હિસાબ)                      */}
      {/* ================================================================= */}
      {workerPages.map((pageRows, pIdx) => {
        currentPageNum++;
        const pageNumber = currentPageNum;
        const isLast = pIdx === workerPages.length - 1;

        return (
          <div key={`workers-p-${pIdx}`} className="pdf-page" style={pageStyle}>
            <div>
              <div style={headerStyle}>
                <div>
                  <h2 style={{ margin: '0 0 2px', fontSize: '16px', fontWeight: 900, color: '#1e3a8a' }}>
                    FAIZAN BODY BUILDERS
                  </h2>
                  <span style={{ fontSize: '10.5px', fontWeight: 700, color: '#15803d' }}>
                    👥 SECTION 3: WORKERS & STAFF (કારીગરો અને હિસાબ)
                  </span>
                </div>
                <div style={{ textAlign: 'right', fontSize: '9.5px', color: '#64748b' }}>
                  <span>{exportDateStr}</span>
                  <div style={{ fontWeight: 700, color: '#0f172a' }}>Total Staff: {workers.length}</div>
                </div>
              </div>

              {pageRows.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '30px', color: '#94a3b8', fontStyle: 'italic', fontSize: '11px' }}>
                  કોઈ કારીગર રેકોર્ડ મળેલ નથી (No workers found)
                </div>
              ) : (
                <table style={tableStyle}>
                  <thead>
                    <tr>
                      <th style={{ ...thStyle, width: '24px', textAlign: 'center' }}>#</th>
                      <th style={thStyle}>Worker Name (નામ)</th>
                      <th style={thStyle}>Mobile</th>
                      <th style={{ ...thStyle, textAlign: 'right' }}>દૈનિક પગાર (₹)</th>
                      <th style={{ ...thStyle, textAlign: 'center' }}>જોડાવાની તારીખ</th>
                      <th style={{ ...thStyle, textAlign: 'center' }}>જવાની તારીખ</th>
                      <th style={{ ...thStyle, width: '70px', textAlign: 'center' }}>સ્થિતિ</th>
                      <th style={{ ...thStyle, textAlign: 'right' }}>બાકી હિસાબ (₹)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageRows.map((w, idx) => {
                      const wage = Number(w.daily_salary) || 0;
                      const bal = Number(w.balance ?? w.khata_balance) || 0;
                      const isEven = idx % 2 === 1;

                      return (
                        <tr key={w.id || idx} style={{ backgroundColor: isEven ? '#f8fafc' : '#ffffff' }}>
                          <td style={{ ...tdStyle, textAlign: 'center', fontWeight: 700 }}>
                            {pIdx * 16 + idx + 1}
                          </td>
                          <td style={{ ...tdStyle, fontWeight: 700, color: '#0f172a' }}>
                            {w.name || '—'}
                          </td>
                          <td style={{ ...tdStyle, fontSize: '9.5px', color: '#475569' }}>
                            {w.mobile || '—'}
                          </td>
                          <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 700 }}>
                            ₹{wage.toLocaleString('en-IN')}
                          </td>
                          <td style={{ ...tdStyle, textAlign: 'center', fontSize: '9px' }}>
                            {w.joining_date ? String(w.joining_date).slice(0, 10) : '—'}
                          </td>
                          <td style={{ ...tdStyle, textAlign: 'center', fontSize: '9px', color: w.going_date ? '#b91c1c' : '#64748b' }}>
                            {w.going_date ? String(w.going_date).slice(0, 10) : '—'}
                          </td>
                          <td style={{ ...tdStyle, textAlign: 'center', fontSize: '9px', fontWeight: 700 }}>
                            <span
                              style={{
                                display: 'inline-block',
                                padding: '1px 6px',
                                borderRadius: '4px',
                                backgroundColor: w.status === 'Active' || !w.status ? '#dcfce7' : '#fee2e2',
                                color: w.status === 'Active' || !w.status ? '#15803d' : '#b91c1c',
                              }}
                            >
                              {w.status || 'Active'}
                            </span>
                          </td>
                          <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 700, color: bal !== 0 ? '#b91c1c' : '#15803d' }}>
                            ₹{bal.toLocaleString('en-IN')}
                          </td>
                        </tr>
                      );
                    })}

                    {isLast && (
                      <tr style={{ backgroundColor: '#f1f5f9', fontWeight: 800 }}>
                        <td colSpan="3" style={{ ...tdStyle, textAlign: 'right', fontWeight: 800, padding: '7px' }}>
                          કુલ દૈનિક પગાર ખર્ચ (Daily Wage Total):
                        </td>
                        <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 800, color: '#0f172a' }}>
                          ₹{totalDailyWages.toLocaleString('en-IN')}
                        </td>
                        <td colSpan="4" style={tdStyle}></td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}
            </div>

            <div style={footerStyle}>
              <span>Faizan Body Works • Workers Master Register</span>
              <span>Section 3</span>
              <span style={{ fontWeight: 800, color: '#0f172a' }}>Page {pageNumber} of {totalPages}</span>
            </div>
          </div>
        );
      })}

      {/* ================================================================= */}
      {/* SECTION 4: ROJMED (રોજમેળ - રોકડ આવક / જાવક)                         */}
      {/* ================================================================= */}
      {rojmedPages.map((pageRows, pIdx) => {
        currentPageNum++;
        const pageNumber = currentPageNum;

        return (
          <div key={`rojmed-p-${pIdx}`} className="pdf-page" style={pageStyle}>
            <div>
              <div style={headerStyle}>
                <div>
                  <h2 style={{ margin: '0 0 2px', fontSize: '16px', fontWeight: 900, color: '#1e3a8a' }}>
                    FAIZAN BODY BUILDERS
                  </h2>
                  <span style={{ fontSize: '10.5px', fontWeight: 700, color: '#7e22ce' }}>
                    💰 SECTION 4: ROJMED CASHBOOK (રોજમેળ - રોકડ હિસાબ)
                  </span>
                </div>
                <div style={{ textAlign: 'right', fontSize: '9.5px', color: '#64748b' }}>
                  <span>{exportDateStr}</span>
                  <div style={{ fontWeight: 700, color: '#0f172a' }}>Total Entries: {rojmedEntries.length}</div>
                </div>
              </div>

              {pageRows.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '30px', color: '#94a3b8', fontStyle: 'italic', fontSize: '11px' }}>
                  કોઈ રોજમેળ એન્ટ્રી ઉપલબ્ધ નથી (No rojmed transactions found)
                </div>
              ) : (
                <table style={tableStyle}>
                  <thead>
                    <tr>
                      <th style={{ ...thStyle, width: '24px', textAlign: 'center' }}>#</th>
                      <th style={{ ...thStyle, width: '75px', textAlign: 'center' }}>તારીખ</th>
                      <th style={{ ...thStyle, width: '70px', textAlign: 'center' }}>પ્રકાર</th>
                      <th style={thStyle}>વિગત (Particulars / Description)</th>
                      <th style={{ ...thStyle, width: '65px', textAlign: 'center' }}>મોડ</th>
                      <th style={{ ...thStyle, textAlign: 'right', width: '90px' }}>રકમ (₹)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageRows.map((r, idx) => {
                      const isIncome = r.entry_type === 'income' || r.entry_type === 'jama';
                      const amt = Number(r.amount) || 0;
                      const isEven = idx % 2 === 1;

                      return (
                        <tr key={r.id || idx} style={{ backgroundColor: isEven ? '#f8fafc' : '#ffffff' }}>
                          <td style={{ ...tdStyle, textAlign: 'center', fontWeight: 700 }}>
                            {pIdx * 18 + idx + 1}
                          </td>
                          <td style={{ ...tdStyle, textAlign: 'center', fontSize: '9px' }}>
                            {r.date ? String(r.date).slice(0, 10) : '—'}
                          </td>
                          <td style={{ ...tdStyle, textAlign: 'center', fontSize: '9px', fontWeight: 800 }}>
                            <span
                              style={{
                                display: 'inline-block',
                                padding: '1px 6px',
                                borderRadius: '4px',
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
                          <td style={{ ...tdStyle, textAlign: 'center', fontSize: '9px', color: '#64748b' }}>
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
      {/* SECTION 5: STOCK INVENTORY (સ્ટોક માલ સામાન)                         */}
      {/* ================================================================= */}
      {stockPages.map((pageRows, pIdx) => {
        currentPageNum++;
        const pageNumber = currentPageNum;

        return (
          <div key={`stock-p-${pIdx}`} className="pdf-page" style={pageStyle}>
            <div>
              <div style={headerStyle}>
                <div>
                  <h2 style={{ margin: '0 0 2px', fontSize: '16px', fontWeight: 900, color: '#1e3a8a' }}>
                    FAIZAN BODY BUILDERS
                  </h2>
                  <span style={{ fontSize: '10.5px', fontWeight: 700, color: '#0284c7' }}>
                    🔩 SECTION 5: STOCK INVENTORY (સ્ટોક માલ સામાન)
                  </span>
                </div>
                <div style={{ textAlign: 'right', fontSize: '9.5px', color: '#64748b' }}>
                  <span>{exportDateStr}</span>
                  <div style={{ fontWeight: 700, color: '#0f172a' }}>Total Items: {stockItems.length}</div>
                </div>
              </div>

              {pageRows.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '30px', color: '#94a3b8', fontStyle: 'italic', fontSize: '11px' }}>
                  કોઈ સ્ટોક માલ ઉપલબ્ધ નથી (No stock items found)
                </div>
              ) : (
                <table style={tableStyle}>
                  <thead>
                    <tr>
                      <th style={{ ...thStyle, width: '24px', textAlign: 'center' }}>#</th>
                      <th style={thStyle}>Item Name (માલનું નામ)</th>
                      <th style={thStyle}>Category (કેટેગરી)</th>
                      <th style={{ ...thStyle, textAlign: 'right' }}>Current Qty</th>
                      <th style={{ ...thStyle, width: '50px', textAlign: 'center' }}>Unit</th>
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
                          <td style={{ ...tdStyle, fontWeight: 700, color: '#0f172a' }}>
                            {s.name || '—'}
                          </td>
                          <td style={{ ...tdStyle, color: '#475569' }}>
                            {s.category_name || 'General'}
                          </td>
                          <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 800, color: isLow ? '#b91c1c' : '#0f172a' }}>
                            {qty} {isLow && <span style={{ fontSize: '8.5px', color: '#dc2626' }}>⚠️ Low</span>}
                          </td>
                          <td style={{ ...tdStyle, textAlign: 'center', fontSize: '9px', color: '#64748b' }}>
                            {s.unit || 'નંગ'}
                          </td>
                          <td style={{ ...tdStyle, textAlign: 'right', color: '#64748b' }}>
                            {minAlert}
                          </td>
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
              <span>Section 5</span>
              <span style={{ fontWeight: 800, color: '#0f172a' }}>Page {pageNumber} of {totalPages}</span>
            </div>
          </div>
        );
      })}

      {/* ================================================================= */}
      {/* SECTION 6: QUOTATIONS (કોટેશન્સ)                                    */}
      {/* ================================================================= */}
      {quotePages.map((pageRows, pIdx) => {
        currentPageNum++;
        const pageNumber = currentPageNum;
        const isLast = pIdx === quotePages.length - 1;

        return (
          <div key={`quotes-p-${pIdx}`} className="pdf-page" style={pageStyle}>
            <div>
              <div style={headerStyle}>
                <div>
                  <h2 style={{ margin: '0 0 2px', fontSize: '16px', fontWeight: 900, color: '#1e3a8a' }}>
                    FAIZAN BODY BUILDERS
                  </h2>
                  <span style={{ fontSize: '10.5px', fontWeight: 700, color: '#d97706' }}>
                    📑 SECTION 6: QUOTATIONS (કોટેશન્સ)
                  </span>
                </div>
                <div style={{ textAlign: 'right', fontSize: '9.5px', color: '#64748b' }}>
                  <span>{exportDateStr}</span>
                  <div style={{ fontWeight: 700, color: '#0f172a' }}>Total Quotes: {quotations.length}</div>
                </div>
              </div>

              {pageRows.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '30px', color: '#94a3b8', fontStyle: 'italic', fontSize: '11px' }}>
                  કોઈ કોટેશન રેકોર્ડ મળેલ નથી (No quotations found)
                </div>
              ) : (
                <table style={tableStyle}>
                  <thead>
                    <tr>
                      <th style={{ ...thStyle, width: '24px', textAlign: 'center' }}>#</th>
                      <th style={thStyle}>Quotation No.</th>
                      <th style={{ ...thStyle, width: '70px', textAlign: 'center' }}>તારીખ</th>
                      <th style={thStyle}>Customer Name & Mobile</th>
                      <th style={thStyle}>Vehicle Model</th>
                      <th style={{ ...thStyle, textAlign: 'right' }}>Total Estimated (₹)</th>
                      <th style={{ ...thStyle, width: '70px', textAlign: 'center' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageRows.map((q, idx) => {
                      const total = Number(q.total_amount) || 0;
                      const isEven = idx % 2 === 1;

                      return (
                        <tr key={q.id || idx} style={{ backgroundColor: isEven ? '#f8fafc' : '#ffffff' }}>
                          <td style={{ ...tdStyle, textAlign: 'center', fontWeight: 700 }}>
                            {pIdx * 16 + idx + 1}
                          </td>
                          <td style={{ ...tdStyle, fontWeight: 700, color: '#1e3a8a' }}>
                            {q.quotation_no || `Q-${q.id}`}
                          </td>
                          <td style={{ ...tdStyle, textAlign: 'center', fontSize: '9px' }}>
                            {q.date ? String(q.date).slice(0, 10) : '—'}
                          </td>
                          <td style={tdStyle}>
                            <div style={{ fontWeight: 700 }}>{q.customer_name || '—'}</div>
                            {q.customer_mobile && <div style={{ fontSize: '9px', color: '#64748b' }}>{q.customer_mobile}</div>}
                          </td>
                          <td style={{ ...tdStyle, color: '#334155' }}>
                            {q.vehicle_model || '—'}
                          </td>
                          <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 800, color: '#0f172a' }}>
                            ₹{total.toLocaleString('en-IN')}
                          </td>
                          <td style={{ ...tdStyle, textAlign: 'center', fontSize: '9px', fontWeight: 700 }}>
                            <span style={{ display: 'inline-block', padding: '1px 6px', borderRadius: '4px', backgroundColor: '#eff6ff', color: '#1d4ed8' }}>
                              {q.status || 'Draft'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}

                    {isLast && (
                      <tr style={{ backgroundColor: '#f1f5f9', fontWeight: 800 }}>
                        <td colSpan="5" style={{ ...tdStyle, textAlign: 'right', fontWeight: 800, padding: '7px' }}>
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
      {/* SECTION 7: SYSTEM USERS (સિસ્ટમ યુઝર્સ)                             */}
      {/* ================================================================= */}
      {userPages.map((pageRows, pIdx) => {
        currentPageNum++;
        const pageNumber = currentPageNum;

        return (
          <div key={`users-p-${pIdx}`} className="pdf-page" style={pageStyle}>
            <div>
              <div style={headerStyle}>
                <div>
                  <h2 style={{ margin: '0 0 2px', fontSize: '16px', fontWeight: 900, color: '#1e3a8a' }}>
                    FAIZAN BODY BUILDERS
                  </h2>
                  <span style={{ fontSize: '10.5px', fontWeight: 700, color: '#475569' }}>
                    👤 SECTION 7: SYSTEM USERS & ACCESS (સિસ્ટમ યુઝર્સ)
                  </span>
                </div>
                <div style={{ textAlign: 'right', fontSize: '9.5px', color: '#64748b' }}>
                  <span>{exportDateStr}</span>
                  <div style={{ fontWeight: 700, color: '#0f172a' }}>Total Users: {users.length}</div>
                </div>
              </div>

              {pageRows.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '30px', color: '#94a3b8', fontStyle: 'italic', fontSize: '11px' }}>
                  કોઈ યુઝર રેકોર્ડ મળેલ નથી (No user accounts found)
                </div>
              ) : (
                <table style={tableStyle}>
                  <thead>
                    <tr>
                      <th style={{ ...thStyle, width: '24px', textAlign: 'center' }}>#</th>
                      <th style={thStyle}>Full Name (નામ)</th>
                      <th style={thStyle}>Username</th>
                      <th style={{ ...thStyle, width: '80px', textAlign: 'center' }}>Role (હોદ્દો)</th>
                      <th style={thStyle}>Mobile</th>
                      <th style={{ ...thStyle, width: '70px', textAlign: 'center' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageRows.map((u, idx) => {
                      const isEven = idx % 2 === 1;

                      return (
                        <tr key={u.id || idx} style={{ backgroundColor: isEven ? '#f8fafc' : '#ffffff' }}>
                          <td style={{ ...tdStyle, textAlign: 'center', fontWeight: 700 }}>
                            {pIdx * 18 + idx + 1}
                          </td>
                          <td style={{ ...tdStyle, fontWeight: 700, color: '#0f172a' }}>
                            {u.name || '—'}
                          </td>
                          <td style={{ ...tdStyle, color: '#1e3a8a', fontWeight: 600 }}>
                            {u.username || '—'}
                          </td>
                          <td style={{ ...tdStyle, textAlign: 'center', fontWeight: 700 }}>
                            <span
                              style={{
                                display: 'inline-block',
                                padding: '1px 6px',
                                borderRadius: '4px',
                                backgroundColor: u.role === 'admin' ? '#fee2e2' : '#f1f5f9',
                                color: u.role === 'admin' ? '#991b1b' : '#334155',
                                fontSize: '9px',
                              }}
                            >
                              {String(u.role || 'user').toUpperCase()}
                            </span>
                          </td>
                          <td style={{ ...tdStyle, color: '#64748b' }}>
                            {u.mobile || '—'}
                          </td>
                          <td style={{ ...tdStyle, textAlign: 'center', fontSize: '9px', fontWeight: 700 }}>
                            <span
                              style={{
                                display: 'inline-block',
                                padding: '1px 6px',
                                borderRadius: '4px',
                                backgroundColor: u.status === 'Active' || u.status === 1 || !u.status ? '#dcfce7' : '#fee2e2',
                                color: u.status === 'Active' || u.status === 1 || !u.status ? '#15803d' : '#b91c1c',
                              }}
                            >
                              {u.status === 'Active' || u.status === 1 || !u.status ? 'Active' : 'Inactive'}
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
                  marginTop: '24px',
                  border: '1.5px dashed #0284c7',
                  borderRadius: '8px',
                  backgroundColor: '#f0f9ff',
                  padding: '12px 14px',
                  fontSize: '10px',
                  color: '#0369a1',
                  lineHeight: 1.5,
                }}
              >
                <div style={{ fontWeight: 800, fontSize: '11px', marginBottom: '4px', color: '#075985' }}>
                  🛡️ SYSTEM INTEGRITY & MAINTENANCE VERIFICATION
                </div>
                <div>
                  આ PDF રિપોર્ટ Faizan Body Management System ના તમામ ડેટાબેઝ મોડ્યુલ્સનો સંપૂર્ણ લેખિત રેકોર્ડ છે.
                  સર્વર મેન્ટેનન્સ દરમિયાન કોઈ પણ હિસાબ, ઓર્ડર, કારીગર કે ખાતાવહીની માહિતી માટે આ રિપોર્ટ કાયદેસર અને
                  સંપૂર્ણ અધિકૃત ગણવામાં આવશે.
                </div>
              </div>
            </div>

            <div style={footerStyle}>
              <span>Faizan Body Works • End of System Backup Report</span>
              <span>Section 7 (Final)</span>
              <span style={{ fontWeight: 800, color: '#0f172a' }}>Page {pageNumber} of {totalPages}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default BackupPdfReport;

