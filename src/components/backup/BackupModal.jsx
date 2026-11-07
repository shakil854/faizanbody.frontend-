import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { backupService } from '../../services/backupService';

export function BackupModal({ isOpen, onClose }) {
  const { isAdmin } = useAuth();

  const [stats, setStats] = useState(null);
  const [serverBackups, setServerBackups] = useState([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  // Security confirmation state for Restore
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    type: 'upload', // 'upload' or 'server'
    targetFilename: '',
  });

  // Strict check: Non-admins cannot view
  if (!isOpen || !isAdmin) return null;

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast({ show: false, message: '', type: 'success' });
    }, 4000);
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const [statsData, backupsData] = await Promise.all([
        backupService.getStats(),
        backupService.listServerBackups(),
      ]);
      setStats(statsData);
      setServerBackups(backupsData);
    } catch (err) {
      console.error('Failed to load backup data:', err);
      showToast(err.message || 'માહિતી લોડ કરવામાં નિષ્ફળ', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && isAdmin) {
      loadData();
    }
  }, [isOpen, isAdmin]);

  // 1. Download Single Backup
  const handleDownloadBackup = async (format = 'json') => {
    try {
      setActionLoading(true);
      await backupService.downloadBackup(format);
      showToast(`✓ સિંગલ બેકઅપ ફાઈલ (.${format}) ડાઉનલોડ થઈ ગઈ છે!`);
    } catch (err) {
      console.error(err);
      showToast('બેકઅપ ડાઉનલોડ કરવામાં નિષ્ફળ', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // 2. Share / Save to Google Drive
  const handleShareToDrive = async (format = 'json') => {
    try {
      setActionLoading(true);
      await backupService.shareToGoogleDrive(format);
      showToast('✓ Google Drive શેર વિન્ડો ખૂલી ગઈ છે!');
    } catch (err) {
      console.error(err);
      showToast('Google Drive શેર કરવામાં નિષ્ફળ', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // 3. Trigger manual backup point
  const handleManualBackupNow = async () => {
    try {
      setActionLoading(true);
      await backupService.triggerManualBackup();
      await loadData();
      showToast('✓ નવો ડેઇલી બેકઅપ પોઇન્ટ સફળતાપૂર્વક બની ગયો!');
    } catch (err) {
      console.error(err);
      showToast('મેન્યુઅલ બેકઅપ બનાવવામાં નિષ્ફળ', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // 4. Download specific server backup
  const handleDownloadServerFile = async (filename) => {
    try {
      setActionLoading(true);
      await backupService.downloadServerFile(filename);
      showToast(`✓ ફાઈલ "${filename}" ડાઉનલોડ થઈ ગઈ છે!`);
    } catch (err) {
      console.error(err);
      showToast('ફાઈલ ડાઉનલોડ કરવામાં નિષ્ફળ', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // 5. Execute Restore
  const handleExecuteRestore = async () => {
    try {
      setActionLoading(true);
      if (confirmModal.type === 'upload') {
        if (!selectedFile) {
          showToast('કૃપા કરીને બેકઅપ ફાઇલ પસંદ કરો', 'error');
          return;
        }
        const res = await backupService.restoreFromUpload(selectedFile);
        showToast(res.message || '✓ ડેટાબેઝ સફળતાપૂર્વક રીસ્ટોર થઈ ગયો!');
        setSelectedFile(null);
      } else {
        const res = await backupService.restoreFromServer(confirmModal.targetFilename);
        showToast(res.message || '✓ ડેટાબેઝ સફળતાપૂર્વક રીસ્ટોર થઈ ગયો!');
      }
      setConfirmModal({ isOpen: false, type: 'upload', targetFilename: '' });
      await loadData();
    } catch (err) {
      console.error(err);
      showToast(err.response?.data?.message || err.message || 'રીસ્ટોર કરવામાં નિષ્ફળ', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="quotation-modal-overlay animate-fade-in" onClick={onClose} style={{ zIndex: 1100 }}>
      <div
        className="quotation-form-modal-container"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '850px', maxHeight: '92vh', overflowY: 'auto' }}
      >
        {/* Modal Header */}
        <div className="quotation-modal-header" style={{ background: 'linear-gradient(135deg, #065f46, #047857)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <span style={{ fontSize: '1.65rem' }}>🛡️</span>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <h2 style={{ margin: 0, fontSize: '1.12rem', color: '#ffffff', fontWeight: 900 }}>
                  ડેટાબેઝ બેકઅપ & સુરક્ષા (Database Backup)
                </h2>
                <span style={{ background: '#f59e0b', color: '#78350f', fontSize: '0.65rem', fontWeight: 900, padding: '0.15rem 0.5rem', borderRadius: '999px' }}>
                  👑 ADMIN ONLY
                </span>
              </div>
              <p style={{ margin: '0.15rem 0 0', fontSize: '0.74rem', color: '#a7f3d0' }}>
                સિંગલ ફાઈલ બેકઅપ, 30-દિવસ ઓટો-સેવ અને ગૂગલ ડ્રાઇવ સુરક્ષા
              </p>
            </div>
          </div>
          <button type="button" className="btn-print-close" onClick={onClose}>
            ✕
          </button>
        </div>

        {/* Toast Banner */}
        {toast.show && (
          <div
            style={{
              padding: '0.75rem 1rem',
              backgroundColor: toast.type === 'error' ? '#fee2e2' : '#dcfce7',
              color: toast.type === 'error' ? '#991b1b' : '#166534',
              fontWeight: 700,
              fontSize: '0.84rem',
              borderBottom: '1px solid rgba(0,0,0,0.06)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            <span>{toast.type === 'error' ? '⚠️' : '✓'}</span>
            <span>{toast.message}</span>
          </div>
        )}

        <div style={{ padding: '1.25rem 1.4rem' }}>
          {/* Live System Stats Summary */}
          <div style={{ marginBottom: '1.25rem' }}>
            <span style={{ fontSize: '0.84rem', fontWeight: 800, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              📊 વર્તમાન ડેટાબેઝ સારાંશ (Live Database Summary)
            </span>

            {loading ? (
              <div style={{ padding: '1rem', textAlign: 'center', color: '#64748b' }}>લોડિંગ...</div>
            ) : (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                  gap: '0.75rem',
                  marginTop: '0.6rem',
                }}
              >
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '0.75rem', textAlign: 'center' }}>
                  <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#1e3a8a' }}>{stats?.tableStats?.work_orders || 0}</div>
                  <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b' }}>🚛 ઓર્ડર્સ (Orders)</div>
                </div>

                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '0.75rem', textAlign: 'center' }}>
                  <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#047857' }}>{stats?.tableStats?.workers || 0}</div>
                  <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b' }}>👥 કારીગરો (Workers)</div>
                </div>

                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '0.75rem', textAlign: 'center' }}>
                  <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#b45309' }}>{stats?.tableStats?.worker_transactions || 0}</div>
                  <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b' }}>💰 ખાતા લેવડ-દેવડ</div>
                </div>

                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '0.75rem', textAlign: 'center' }}>
                  <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#6b21a8' }}>{stats?.tableStats?.stock_items || 0}</div>
                  <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b' }}>🔩 સ્ટોક માલ-સામાન</div>
                </div>

                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '0.75rem', textAlign: 'center' }}>
                  <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#0f172a' }}>{stats?.totalRecords || 0}</div>
                  <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b' }}>📁 કુલ રેકોર્ડ્સ ({stats?.dbSizeFormatted || '—'})</div>
                </div>
              </div>
            )}
          </div>

          {/* Action Cards: 1-Click Backup & Google Drive */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '1rem',
              marginBottom: '1.5rem',
            }}
          >
            {/* Card 1: Single File Backup Download */}
            <div
              style={{
                background: '#ffffff',
                border: '1.5px solid #cbd5e1',
                borderRadius: '12px',
                padding: '1.1rem',
                boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
                  <span style={{ fontSize: '1.25rem' }}>📥</span>
                  <span style={{ fontSize: '0.96rem', fontWeight: 800, color: '#0f172a' }}>
                    સિંગલ ફાઈલ બેકઅપ (Single File)
                  </span>
                </div>
                <p style={{ margin: 0, fontSize: '0.76rem', color: '#475569', lineHeight: 1.45 }}>
                  બધા ૧૨ ટેબલ <strong>એક જ સિંગલ ફાઈલમાં</strong> ડાઉનલોડ થશે. ડેટા ક્યારેય ઊડી જાય તો આ એક જ ફાઈલ અપલોડ કરીને બધું પાછું મેળવી શકાશે.
                </p>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                <button
                  type="button"
                  onClick={() => handleDownloadBackup('json')}
                  disabled={actionLoading}
                  style={{
                    flex: 1,
                    background: '#1e3a8a',
                    color: '#ffffff',
                    border: 'none',
                    padding: '0.6rem 0.85rem',
                    borderRadius: '8px',
                    fontWeight: 800,
                    fontSize: '0.8rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.35rem',
                  }}
                >
                  <span>📥</span>
                  <span>ડાઉનલોડ (.json)</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleDownloadBackup('sql')}
                  disabled={actionLoading}
                  style={{
                    background: '#f1f5f9',
                    color: '#1e293b',
                    border: '1px solid #cbd5e1',
                    padding: '0.6rem 0.85rem',
                    borderRadius: '8px',
                    fontWeight: 800,
                    fontSize: '0.8rem',
                    cursor: 'pointer',
                  }}
                  title="MySQL ડમ્પ સ્ક્રિપ્ટ ડાઉનલોડ કરો"
                >
                  SQL Dump
                </button>
              </div>
            </div>

            {/* Card 2: Google Drive Direct Save */}
            <div
              style={{
                background: '#ffffff',
                border: '1.5px solid #86efac',
                borderRadius: '12px',
                padding: '1.1rem',
                boxShadow: '0 2px 8px rgba(34, 197, 94, 0.08)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
                  <span style={{ fontSize: '1.25rem' }}>☁️</span>
                  <span style={{ fontSize: '0.96rem', fontWeight: 800, color: '#166534' }}>
                    Google Drive માં સેવ કરો
                  </span>
                </div>
                <p style={{ margin: 0, fontSize: '0.76rem', color: '#475569', lineHeight: 1.45 }}>
                  આ બટન દબાવવાથી તમારા મોબાઈલ/કમ્પ્યુટરમાંથી સીધું <strong>Google Drive</strong> પસંદ કરીને ૧-ટેપમાં બેકઅપ ફાઈલ ડ્રાઇવમાં સેવ કરી શકાય છે.
                </p>
              </div>

              <div style={{ marginTop: '1rem' }}>
                <button
                  type="button"
                  onClick={() => handleShareToDrive('json')}
                  disabled={actionLoading}
                  style={{
                    width: '100%',
                    background: '#16a34a',
                    color: '#ffffff',
                    border: 'none',
                    padding: '0.65rem 1rem',
                    borderRadius: '8px',
                    fontWeight: 800,
                    fontSize: '0.82rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.45rem',
                    boxShadow: '0 2px 8px rgba(22, 163, 74, 0.25)',
                  }}
                >
                  <span>☁️</span>
                  <span>Google Drive માં અપલોડ કરો</span>
                </button>
              </div>
            </div>
          </div>

          {/* Section: 30-Day Rolling Backups on Server */}
          <div style={{ marginBottom: '1.5rem', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1.1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.85rem' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontSize: '1.1rem' }}>⏱️</span>
                  <span style={{ fontSize: '0.92rem', fontWeight: 800, color: '#0f172a' }}>
                    ૩૦-દિવસ ઓટોમેટિક બેકઅપ્સ (30-Day Auto Backups)
                  </span>
                </div>
                <p style={{ margin: '0.15rem 0 0', fontSize: '0.73rem', color: '#64748b' }}>
                  સિસ્ટમ દરરોજ રાત્રે ઓટો-સેવ કરે છે. ૩૦ દિવસ જૂના બેકઅપ આપોઆપ ડીલીટ થઈ જાય છે.
                </p>
              </div>

              <button
                type="button"
                onClick={handleManualBackupNow}
                disabled={actionLoading}
                style={{
                  background: '#047857',
                  color: '#ffffff',
                  border: 'none',
                  padding: '0.45rem 0.85rem',
                  borderRadius: '6px',
                  fontWeight: 800,
                  fontSize: '0.76rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                }}
              >
                <span>⚡</span>
                <span>નવો બેકઅપ બનાવો (Create Now)</span>
              </button>
            </div>

            {/* Backups List */}
            {serverBackups.length === 0 ? (
              <div style={{ padding: '1rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.82rem' }}>
                હજી સુધી કોઈ ઓટો-બેકઅપ ફાઈલ સેવ થયેલ નથી. "નવો બેકઅપ બનાવો" પર ક્લિક કરો.
              </div>
            ) : (
              <div style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px', background: '#ffffff' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
                  <thead>
                    <tr style={{ background: '#f1f5f9', borderBottom: '1px solid #e2e8f0', textAlign: 'left', color: '#475569' }}>
                      <th style={{ padding: '0.45rem 0.75rem' }}>તારીખ (Date)</th>
                      <th style={{ padding: '0.45rem 0.75rem' }}>ફાઈલ નામ</th>
                      <th style={{ padding: '0.45rem 0.75rem' }}>સાઇઝ</th>
                      <th style={{ padding: '0.45rem 0.75rem', textAlign: 'right' }}>ક્રિયા (Actions)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {serverBackups.map((b, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '0.5rem 0.75rem', fontWeight: 700, color: '#0f172a' }}>{b.date}</td>
                        <td style={{ padding: '0.5rem 0.75rem', fontFamily: 'monospace', color: '#334155' }}>
                          <span style={{ background: b.type === 'JSON' ? '#dbeafe' : '#fef3c7', color: b.type === 'JSON' ? '#1e40af' : '#92400e', fontSize: '0.65rem', padding: '0.1rem 0.35rem', borderRadius: '4px', marginRight: '0.35rem', fontWeight: 800 }}>
                            {b.type}
                          </span>
                          {b.filename}
                        </td>
                        <td style={{ padding: '0.5rem 0.75rem', color: '#64748b' }}>{b.sizeFormatted}</td>
                        <td style={{ padding: '0.5rem 0.75rem', textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', gap: '0.4rem' }}>
                            <button
                              type="button"
                              onClick={() => handleDownloadServerFile(b.filename)}
                              disabled={actionLoading}
                              style={{
                                background: '#f1f5f9',
                                color: '#1e3a8a',
                                border: '1px solid #cbd5e1',
                                padding: '0.25rem 0.55rem',
                                borderRadius: '4px',
                                fontWeight: 700,
                                fontSize: '0.72rem',
                                cursor: 'pointer',
                              }}
                            >
                              📥 ડાઉનલોડ
                            </button>

                            {b.type === 'JSON' && (
                              <button
                                type="button"
                                onClick={() => setConfirmModal({ isOpen: true, type: 'server', targetFilename: b.filename })}
                                disabled={actionLoading}
                                style={{
                                  background: '#fef2f2',
                                  color: '#dc2626',
                                  border: '1px solid #fca5a5',
                                  padding: '0.25rem 0.55rem',
                                  borderRadius: '4px',
                                  fontWeight: 700,
                                  fontSize: '0.72rem',
                                  cursor: 'pointer',
                                }}
                              >
                                🔄 રીસ્ટોર
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Section: Upload & Restore from Backup File */}
          <div style={{ border: '1.5px dashed #cbd5e1', borderRadius: '12px', padding: '1.1rem', background: '#fafafa' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
              <span style={{ fontSize: '1.2rem' }}>🔄</span>
              <span style={{ fontSize: '0.92rem', fontWeight: 800, color: '#0f172a' }}>
                બેકઅપ ફાઈલમાંથી ડેટાબેઝ રીસ્ટોર કરો (Restore from File)
              </span>
            </div>
            <p style={{ margin: '0 0 0.85rem', fontSize: '0.74rem', color: '#64748b' }}>
              જો ડેટા ઊડી ગયો હોય, તો તમારી સેવ કરેલી સિંગલ <strong>.json</strong> બેકઅપ ફાઈલ પસંદ કરીને ૧-ક્લિકમાં આખો ડેટાબેઝ પાછો લાવી શકો છો.
            </p>

            <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
              <input
                type="file"
                accept=".json"
                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                style={{ fontSize: '0.8rem', color: '#334155' }}
              />

              {selectedFile && (
                <button
                  type="button"
                  onClick={() => setConfirmModal({ isOpen: true, type: 'upload', targetFilename: selectedFile.name })}
                  disabled={actionLoading}
                  style={{
                    background: '#dc2626',
                    color: '#ffffff',
                    border: 'none',
                    padding: '0.55rem 1rem',
                    borderRadius: '8px',
                    fontWeight: 800,
                    fontSize: '0.82rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                  }}
                >
                  <span>🔄</span>
                  <span>ડેટાબેઝ રીસ્ટોર કરો (Restore Now)</span>
                </button>
              )}
            </div>
          </div>

          {/* Zero Data Loss Guarantee Note */}
          <div
            style={{
              marginTop: '1.25rem',
              padding: '0.65rem 0.85rem',
              background: '#f0fdf4',
              border: '1px solid #bbf7d0',
              borderRadius: '8px',
              fontSize: '0.72rem',
              color: '#166534',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            <span>🛡️</span>
            <span>
              <strong>Zero Data Loss Guarantee:</strong> બેકઅપ લેવાથી ચાલુ સિસ્ટમ કે લાઇવ ડેટા પર ૦% અસર થાય છે. રીસ્ટોર કરતી વખતે સેફ ટ્રાન્ઝેક્શન (Transaction Safe) નો ઉપયોગ થાય છે.
            </span>
          </div>
        </div>

        {/* Restore Confirmation Dialog */}
        {confirmModal.isOpen && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(15, 23, 42, 0.75)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1200,
              padding: '1rem',
            }}
          >
            <div
              style={{
                background: '#ffffff',
                borderRadius: '14px',
                padding: '1.5rem',
                maxWidth: '460px',
                width: '100%',
                boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
              }}
            >
              <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
                <span style={{ fontSize: '2.5rem' }}>⚠️</span>
                <h3 style={{ margin: '0.35rem 0 0', fontSize: '1.15rem', color: '#991b1b', fontWeight: 900 }}>
                  ડેટાબેઝ રીસ્ટોર ની પુષ્ટિ (Confirm Restore)
                </h3>
              </div>

              <p style={{ fontSize: '0.82rem', color: '#334155', lineHeight: 1.5, textAlign: 'center', margin: '0 0 1.25rem' }}>
                શું તમે ખરેખર ફાઈલ <strong style={{ color: '#0f172a' }}>"{confirmModal.targetFilename}"</strong> માંથી ડેટાબેઝ રીસ્ટોર કરવા માંગો છો?
                <br />
                <span style={{ color: '#64748b', fontSize: '0.74rem' }}>
                  (પસંદ કરેલ બેકઅપ ફાઈલના તમામ રેકોર્ડ્સ ડેટાબેઝમાં ફરીથી સેવ થશે.)
                </span>
              </p>

              <div style={{ display: 'flex', gap: '0.65rem' }}>
                <button
                  type="button"
                  onClick={() => setConfirmModal({ isOpen: false, type: 'upload', targetFilename: '' })}
                  disabled={actionLoading}
                  style={{
                    flex: 1,
                    background: '#f1f5f9',
                    color: '#334155',
                    border: '1px solid #cbd5e1',
                    padding: '0.65rem',
                    borderRadius: '8px',
                    fontWeight: 700,
                    fontSize: '0.85rem',
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
                    borderRadius: '8px',
                    fontWeight: 800,
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                  }}
                >
                  {actionLoading ? 'રીસ્ટોર ચાલુ છે...' : 'હા, રીસ્ટોર કરો'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default BackupModal;

