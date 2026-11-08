/**
 * Helper to compute date ranges for Khata period filtering
 */
export function getPeriodDateRange(period, customFrom = '', customTo = '') {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth(); // 0-indexed

  if (period === 'running_month') {
    const start = new Date(year, month, 1);
    const end = new Date(year, month + 1, 0);
    const yStr = start.getFullYear();
    const mStr = String(start.getMonth() + 1).padStart(2, '0');
    const startStr = `${yStr}-${mStr}-01`;
    const endStr = `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, '0')}-${String(end.getDate()).padStart(2, '0')}`;
    const monthName = now.toLocaleString('gu-IN', { month: 'long' });
    return {
      startDate: startStr,
      endDate: endStr,
      label: `ચાલુ મહિનો (${monthName} ${year}) • 01/${mStr} થી ${end.getDate()}/${mStr}`,
      shortLabel: `ચાલુ મહિનો (${monthName})`,
    };
  }

  if (period === 'last_month') {
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0);
    const yStr = start.getFullYear();
    const mStr = String(start.getMonth() + 1).padStart(2, '0');
    const startStr = `${yStr}-${mStr}-01`;
    const endStr = `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, '0')}-${String(end.getDate()).padStart(2, '0')}`;
    const monthName = start.toLocaleString('gu-IN', { month: 'long' });
    return {
      startDate: startStr,
      endDate: endStr,
      label: `ગયેલ મહિનો (${monthName} ${yStr}) • 01/${mStr} થી ${end.getDate()}/${mStr}`,
      shortLabel: `ગયેલ મહિનો (${monthName})`,
    };
  }

  if (period === 'custom') {
    return {
      startDate: customFrom || '',
      endDate: customTo || '',
      label: customFrom && customTo ? `કસ્ટમ તારીખ: ${customFrom} થી ${customTo}` : 'કસ્ટમ તારીખ પસંદ કરો',
      shortLabel: 'કસ્ટમ તારીખ',
    };
  }

  // all_time
  return {
    startDate: '',
    endDate: '',
    label: 'તમામ હિસાબ (શરૂઆતથી અત્યાર સુધી)',
    shortLabel: 'તમામ હિસાબ',
  };
}

