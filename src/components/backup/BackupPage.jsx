import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { backupService } from '../../services/backupService';

export function BackupPage({ onBackToHome }) {
  const { isAdmin } = useAuth();

  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileDetails, setFileDetails] = useState(null);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast({ show: false, message: '', type: 'success' });
    }, 4500);
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const statsData = await backupService.getStats();
      setStats(statsData);
    } catch (err) {
      console.warn('Backup data load notice:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      loadData();
    }
  }, [isAdmin]);

  // Handle file selection and read summary
  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) {
      setSelectedFile(null);
      setFileDetails(null);
      return;
    }
    setSelectedFile(file);
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      setFileDetails({
        name: file.name,
        sizeFormatted: file.size > 1024 * 1024 ? `${(file.size / (1024 * 1024)).toFixed(2)} MB` : `${(file.size / 1024).toFixed(1)} KB`,
        exportedAt: parsed.exportedAt ? new Date(parsed.exportedAt).toLocaleDateString('gu-IN') : 'Unknown',
        totalRecords: parsed.summary?.totalRecords || 0,
        tablesCount: parsed.data ? Object.keys(parsed.data).length : 0,
      });
    } catch (err) {
      setFileDetails({
        name: file.name,
        sizeFormatted: `${(file.size / 1024).toFixed(1)} KB`,
        exportedAt: '—',
        totalRecords: '—',
        tablesCount: '—',
      });
    }
  };

  // 1. Save / Upload to Google Drive (30-day backup)
  const handleShareToDrive = async () => {
    try {
      setActionLoading(true);
      await backupService.shareToGoogleDrive('json');
      showToast('✓ Google Drive શેર વિન્ડો ખૂલી ગઈ છે! તમારા Drive ફોલ્ડરમાં સેવ કરો.');
    } catch (err) {
      console.error(err);
      showToast('Google Drive અપલોડ કરવામાં નિષ્ફળ', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // 2. Manual Backup Download (.json and .sql)
  const handleDownloadBackup = async (format = 'json') => {
    try {
      setActionLoading(true);
      await backupService.downloadBackup(format);
      showToast(`✓ સિંગલ બેકઅપ ફાઈલ (.${format}) ડાઉનલોડ થઈ ગઈ છે!`);
    } catch (err) {
      console.error(err);
      showToast('મેન્યુઅલ બેકઅપ ડાઉનલોડ કરવામાં નિષ્ફળ', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // 3. Restore from Uploaded File (Only restores rows inside tables; NEVER drops tables)
  const handleExecuteRestore = async () => {
    if (!selectedFile) {
      showToast('કૃપા કરીને બેકઅપ ફાઇલ પસંદ કરો', 'error');
      return;
    }
    try {
      setActionLoading(true);
      const res = await backupService.restoreFromUpload(selectedFile);
      showToast(res.message || '✓ ડેટાબેઝ સફળતાપૂર્વક રીસ્ટોર થઈ ગયો!');
      setIsConfirmOpen(false);
      setSelectedFile(null);
      setFileDetails(null);
      await loadData();
    } catch (err) {
      console.error(err);
      showToast(err.response?.data?.message || err.message || 'રીસ્ટોર કરવામાં નિષ્ફળ', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  if (!isAdmin) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>
        <h3>Access Denied (Admin Only)</h3>
        <button type="button" onClick={onBackToHome} style={{ marginTop: '1rem', padding: '0.5rem 1rem' }}>
          Back to Home
        </button>
      </div>
    );
  }

  return (
    <div className="backup-page-shell">
      {/* 1. Mobile-Responsive Top Bar */}
      <div className="backup-top-bar">
        <button
          type="button"
          className="backup-back-btn"
          onClick={onBackToHome}
          title="Back to Home"
          aria-label="Back to Home"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </button>

        <div className="backup-title-wrap">
          <div className="backup-title-row">
            <h1 className="backup-main-title">ડેટાબેઝ બેકઅપ</h1>
            <span className="backup-admin-pill">👑 ADMIN ONLY</span>
          </div>
          <p className="backup-subtitle">Google Drive & સુરક્ષિત રીસ્ટોર</p>
        </div>

        <button
          type="button"
          className="backup-refresh-btn"
          onClick={loadData}
          disabled={loading}
          title="Refresh stats"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }}>
            <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2" />
          </svg>
        </button>
      </div>

      {/* Toast Notification Banner */}
      {toast.show && (
        <div
          style={{
            marginBottom: '1rem',
            padding: '0.75rem 1rem',
            backgroundColor: toast.type === 'error' ? '#fee2e2' : toast.type === 'info' ? '#eff6ff' : '#dcfce7',
            color: toast.type === 'error' ? '#991b1b' : toast.type === 'info' ? '#1e40af' : '#166534',
            fontWeight: 700,
            fontSize: '0.84rem',
            borderRadius: '10px',
            border: '1px solid rgba(0,0,0,0.06)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
          }}
        >
          <span>{toast.type === 'error' ? '⚠️' : '✓'}</span>
          <span>{toast.message}</span>
        </div>
      )}

      {/* 2. Live Database Summary Strip */}
      <div className="backup-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            📊 વર્તમાન ડેટાબેઝ સારાંશ (Live Summary)
          </span>
          <span style={{ fontSize: '0.72rem', color: '#16a34a', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#16a34a', display: 'inline-block' }}></span>
            લાઈવ સિંક
          </span>
        </div>

        <div className="backup-stats-grid">
          <div className="backup-stat-box">
            <div className="backup-stat-val" style={{ color: '#1e3a8a' }}>{stats?.tableStats?.work_orders || 0}</div>
            <div className="backup-stat-lbl">🚛 ઓર્ડર્સ</div>
          </div>

          <div className="backup-stat-box">
            <div className="backup-stat-val" style={{ color: '#047857' }}>{stats?.tableStats?.workers || 0}</div>
            <div className="backup-stat-lbl">👥 કારીગરો</div>
          </div>

          <div className="backup-stat-box">
            <div className="backup-stat-val" style={{ color: '#6b21a8' }}>{stats?.tableStats?.stock_items || 0}</div>
            <div className="backup-stat-lbl">🔩 સ્ટોક માલ</div>
          </div>

          <div className="backup-stat-box">
            <div className="backup-stat-val" style={{ color: '#b45309' }}>{stats?.tableStats?.quotations || 0}</div>
            <div className="backup-stat-lbl">📑 કોટેશન્સ</div>
          </div>

          <div className="backup-stat-box" style={{ gridColumn: 'span 2' }}>
            <div className="backup-stat-val" style={{ color: '#0f172a' }}>{stats?.totalRecords || 0}</div>
            <div className="backup-stat-lbl">📁 કુલ રેકોર્ડ્સ ({stats?.dbSizeFormatted || '12 Tables'})</div>
          </div>
        </div>
      </div>

      {/* 3. OPTION 1: Google Drive Backup (30-Day Rolling Cloud Backup) */}
      <div className="backup-card backup-card-highlight">
        <div className="backup-card-header">
          <div className="backup-card-icon" style={{ background: '#dcfce7', color: '#16a34a' }}>
            ☁️
          </div>
          <div>
            <h2 className="backup-card-title">૧. Google Drive માં બેકઅપ (Drive Backup)</h2>
            <span style={{ fontSize: '0.7rem', color: '#15803d', fontWeight: 800 }}>
              ★ ૩૦ દિવસનો બેકઅપ તમારા Google Drive માં સાચવશે
            </span>
          </div>
        </div>

        <p className="backup-card-desc">
          આ બટન દબાવવાથી તમારા અંગત <strong>Google Drive</strong> માં તમામ ૧૨ ટેબલની સિંગલ બેકઅપ ફાઈલ અપલોડ થઈ જશે. દરરોજ ૧ ફાઈલ સેવ થશે અને ૩૦ દિવસ જૂની ફાઈલ ઓટોમેટિક સાફ રહેશે.
        </p>

        <button
          type="button"
          className="backup-btn-drive"
          onClick={handleShareToDrive}
          disabled={actionLoading}
        >
          <span style={{ fontSize: '1.2rem' }}>☁️</span>
          <span>{actionLoading ? 'પ્રોસેસિંગ...' : 'Google Drive માં સેવ કરો (Upload to Drive)'}</span>
        </button>
      </div>

      {/* 4. OPTION 2: Manual Backup Download (Single File JSON & SQL) */}
      <div className="backup-card">
        <div className="backup-card-header">
          <div className="backup-card-icon" style={{ background: '#dbeafe', color: '#1e3a8a' }}>
            📥
          </div>
          <div>
            <h2 className="backup-card-title">૨. મેન્યુઅલ બેકઅપ (Manual Download)</h2>
            <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 700 }}>
              પેનડ્રાઈવ, કમ્પ્યુટર કે મોબાઇલમાં સેવ કરવા માટે
            </span>
          </div>
        </div>

        <p className="backup-card-desc">
          તમામ ટેબલ (ઓર્ડર્સ, કારીગરો, ખાતા, સ્ટોક વગેરે) <strong>એક જ સિંગલ ફાઈલમાં</strong> ડાઉનલોડ થશે.
        </p>

        <div className="backup-manual-btn-group">
          <button
            type="button"
            className="backup-btn-download"
            onClick={() => handleDownloadBackup('json')}
            disabled={actionLoading}
          >
            <span>📥</span>
            <span>ડાઉનલોડ સિંગલ ફાઈલ (.json)</span>
          </button>

          <button
            type="button"
            className="backup-btn-sql"
            onClick={() => handleDownloadBackup('sql')}
            disabled={actionLoading}
            title="MySQL Dump સ્ક્રિપ્ટ ડાઉનલોડ કરો"
          >
            <span>💾</span>
            <span>SQL Dump (.sql)</span>
          </button>
        </div>
      </div>

      {/* 5. OPTION 3: Restore via File Upload ONLY (Zero Table Drop Guarantee) */}
      <div className="backup-card">
        <div className="backup-card-header">
          <div className="backup-card-icon" style={{ background: '#fee2e2', color: '#dc2626' }}>
            🔄
          </div>
          <div>
            <h2 className="backup-card-title">૩. બેકઅપ ફાઈલ અપલોડ કરીને રીસ્ટોર (Restore from File)</h2>
            <span style={{ fontSize: '0.7rem', color: '#b91c1c', fontWeight: 800 }}>
              🛡️ ફક્ત ટેબલનો ડેટા રીસ્ટોર થશે (ટેબલ ક્યારેય ઊડશે નહીં)
            </span>
          </div>
        </div>

        <p className="backup-card-desc">
          જો ક્યારેય ડેટા ખોવાઈ જાય, તો Google Drive કે કમ્પ્યુટરમાંથી તમારી સેવ કરેલી <strong>.json</strong> બેકઅપ ફાઈલ પસંદ કરો.
        </p>

        <div className="backup-upload-box">
          <input
            type="file"
            accept=".json"
            onChange={handleFileChange}
            style={{ fontSize: '0.82rem', color: '#334155' }}
          />

          {fileDetails && (
            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0.65rem 0.85rem', fontSize: '0.76rem' }}>
              <div style={{ fontWeight: 800, color: '#0f172a', marginBottom: '0.2rem' }}>
                📄 {fileDetails.name} ({fileDetails.sizeFormatted})
              </div>
              <div style={{ color: '#64748b' }}>
                કુલ રેકોર્ડ્સ: <strong>{fileDetails.totalRecords}</strong> &bull; ટેબલ્સ: <strong>{fileDetails.tablesCount}</strong> &bull; તારીખ: {fileDetails.exportedAt}
              </div>
            </div>
          )}

          {selectedFile && (
            <button
              type="button"
              className="backup-btn-restore"
              onClick={() => setIsConfirmOpen(true)}
              disabled={actionLoading}
            >
              <span>🔄</span>
              <span>{actionLoading ? 'રીસ્ટોર ચાલુ છે...' : 'આ ફાઈલમાંથી ડેટા રીસ્ટોર કરો'}</span>
            </button>
          )}
        </div>

        {/* Safety Guarantee Notice */}
        <div
          style={{
            marginTop: '0.85rem',
            padding: '0.65rem 0.85rem',
            background: '#f0fdf4',
            border: '1px solid #bbf7d0',
            borderRadius: '8px',
            fontSize: '0.72rem',
            color: '#166534',
            display: 'flex',
            alignItems: 'center',
            gap: '0.45rem',
          }}
        >
          <span style={{ fontSize: '1.05rem' }}>🛡️</span>
          <span>
            <strong>Zero Data Loss Guarantee:</strong> રીસ્ટોર કરવાથી માત્ર ટેબલની અંદરનો ડેટા રીસ્ટોર/અપડેટ થાય છે. કોઈપણ ટેબલ કે સ્ટ્રક્ચર ક્યારેય ડ્રોપ કે ડીલીટ થતું નથી.
          </span>
        </div>
      </div>

      {/* Restore Security Confirmation Dialog */}
      {isConfirmOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.75)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1200,
            padding: '1rem',
          }}
          onClick={() => setIsConfirmOpen(false)}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '16px',
              padding: '1.4rem',
              maxWidth: '440px',
              width: '100%',
              boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ textAlign: 'center', marginBottom: '0.85rem' }}>
              <span style={{ fontSize: '2.5rem' }}>⚠️</span>
              <h3 style={{ margin: '0.35rem 0 0', fontSize: '1.15rem', color: '#991b1b', fontWeight: 900 }}>
                ડેટાબેઝ રીસ્ટોર ની પુષ્ટિ (Confirm Restore)
              </h3>
            </div>

            <p style={{ fontSize: '0.82rem', color: '#334155', lineHeight: 1.5, textAlign: 'center', margin: '0 0 1rem' }}>
              શું તમે ખરેખર પસંદ કરેલ બેકઅપ ફાઈલ <strong style={{ color: '#0f172a' }}>"{selectedFile?.name}"</strong> માંથી ડેટા રીસ્ટોર કરવા માંગો છો?
              <br />
              <span style={{ color: '#059669', fontSize: '0.75rem', fontWeight: 700, display: 'block', marginTop: '0.35rem' }}>
                ✓ ફક્ત ટેબલની અંદરનો ડેટા રીસ્ટોર થશે (ટેબલ ક્યારેય ડીલીટ થશે નહીં).
              </span>
            </p>

            <div style={{ display: 'flex', gap: '0.65rem' }}>
              <button
                type="button"
                onClick={() => setIsConfirmOpen(false)}
                disabled={actionLoading}
                style={{
                  flex: 1,
                  background: '#f1f5f9',
                  color: '#334155',
                  border: '1px solid #cbd5e1',
                  padding: '0.65rem',
                  borderRadius: '10px',
                  fontWeight: 700,
                  fontSize: '0.84rem',
                  cursor: 'pointer',
                }}
              >
                રદ કરો (Cancel)
              </button>

              <button
                type="button"
                onClick={handleExecuteRestore}
                disabled={actionLoading}
                style={{
                  flex: 1,
                  background: '#dc2626',
                  color: '#ffffff',
                  border: 'none',
                  padding: '0.65rem',
                  borderRadius: '10px',
                  fontWeight: 800,
                  fontSize: '0.84rem',
                  cursor: 'pointer',
                  boxShadow: '0 2px 8px rgba(220, 38, 38, 0.3)',
                }}
              >
                {actionLoading ? 'રીસ્ટોર ચાલુ છે...' : 'હા, રીસ્ટોર કરો'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default BackupPage;
