/**
 * Helper to compute date ranges and monthly ledger pages for Khata system
 * Matching authentic Gujarati Khata Vahi (કારીગર ખાતાવહી - દેશી નામા પદ્ધતિ)
 */

export const GUJARATI_MONTH_NAMES = [
  'જાન્યુઆરી',
  'ફેબ્રુઆરી',
  'માર્ચ',
  'એપ્રિલ',
  'મે',
  'જૂન',
  'જુલાઈ',
  'ઓગસ્ટ',
  'સપ્ટેમ્બર',
  'ઓક્ટોબર',
  'નવેમ્બર',
  'ડિસેમ્બર',
];

export function getGujaratiMonthName(monthNumber) {
  const m = Number(monthNumber);
  if (m >= 1 && m <= 12) {
    return GUJARATI_MONTH_NAMES[m - 1];
  }
  return '';
}

/**
 * Format standard A/c No. shown in notebook (e.g. 1-9-2026, 1-10-2026)
 */
export function formatKhataAccountNo(year, month) {
  return `1-${Number(month)}-${year}`;
}

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
    const monthName = getGujaratiMonthName(start.getMonth() + 1);
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
    const monthName = getGujaratiMonthName(start.getMonth() + 1);
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

/**
 * Get distinct months with transactions + current month + custom selection
 * Sorted chronologically ascending
 */
export function getAvailableKhataMonths(transactions = [], currentSelection = '') {
  const monthSet = new Set();

  // Always include current month
  const now = new Date();
  const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  monthSet.add(currentMonthKey);

  if (currentSelection && /^\d{4}-\d{2}$/.test(currentSelection)) {
    monthSet.add(currentSelection);
  }

  // Add all months from transactions
  if (Array.isArray(transactions)) {
    transactions.forEach((t) => {
      if (t && t.date) {
        const dStr = String(t.date).slice(0, 7);
        if (/^\d{4}-\d{2}$/.test(dStr)) {
          monthSet.add(dStr);
        }
      }
    });
  }

  // Sort chronologically ascending
  const sortedKeys = Array.from(monthSet).sort((a, b) => a.localeCompare(b));

  return sortedKeys.map((key) => {
    const [yStr, mStr] = key.split('-');
    const year = Number(yStr);
    const month = Number(mStr);
    const monthName = getGujaratiMonthName(month);
    const accountNo = formatKhataAccountNo(year, month);
    const pageNo = month; // Matches notebook photo: Month 9 = Page 9, Month 10 = Page 10

    return {
      monthKey: key,
      year,
      month,
      pageNo,
      accountNo,
      monthName,
      label: `${monthName} ${year} (ખાતા નં: ${accountNo} • પાનું ${pageNo})`,
      shortLabel: `${monthName} ${year}`,
      isCurrent: key === currentMonthKey,
    };
  });
}

/**
 * Compute the authentic 2-column Khata Vahi ledger for a given monthKey (YYYY-MM)
 *
 * Left Column: જમા (Jama / કામ - મજૂરી)
 * Right Column: ઉધાર (Udhar / ઉપાડ - એડવાન્સ - રોકડા)
 *
 * First row of Udhar is automatically "આગળ નો બાકી રહેલ ઉપાડ" (Carried forward from previous month)
 */
export function calculateMonthKhataVahi(transactions = [], monthKey = '') {
  if (!monthKey || !/^\d{4}-\d{2}$/.test(monthKey)) {
    const now = new Date();
    monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }

  const [yStr, mStr] = monthKey.split('-');
  const year = Number(yStr);
  const month = Number(mStr);
  const startDateStr = `${monthKey}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const endDateStr = `${monthKey}-${String(lastDay).padStart(2, '0')}`;

  const allTxs = Array.isArray(transactions) ? transactions : [];

  // 1. Prior Transactions (all records strictly before this month)
  let priorSalary = 0;
  let priorUpad = 0;
  let priorPaid = 0;

  allTxs.forEach((t) => {
    if (!t || !t.date) return;
    const txDate = String(t.date).slice(0, 10);
    if (txDate < startDateStr) {
      const amt = Number(t.amount) || 0;
      if (t.type === 'salary') {
        priorSalary += amt;
      } else if (t.type === 'upad') {
        priorUpad += amt;
      } else if (t.type === 'payment') {
        priorPaid += amt;
      }
    }
  });

  // Prior Advance = (priorUpad + priorPaid) - priorSalary
  // If > 0, worker has net advance taken (આગળ નો બાકી રહેલ ઉપાડ)
  // If < 0, workshop owes worker salary (આગળ ની જમા મજૂરી બાકી)
  const priorAdvance = (priorUpad + priorPaid) - priorSalary;

  // 2. Current Month's Transactions
  const monthTxs = allTxs.filter((t) => {
    if (!t || !t.date) return false;
    const txDate = String(t.date).slice(0, 10);
    return txDate >= startDateStr && txDate <= endDateStr;
  });

  // Sort ascending by date for chronological ledger view
  const jamaRows = monthTxs
    .filter((t) => t.type === 'salary')
    .sort((a, b) => (String(a.date) > String(b.date) ? 1 : -1));

  const udharRows = monthTxs
    .filter((t) => t.type === 'upad' || t.type === 'payment')
    .sort((a, b) => (String(a.date) > String(b.date) ? 1 : -1));

  const monthSalary = jamaRows.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
  const monthUpad = udharRows.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

  // 3. Balance Calculations (Exactly as Desi Nama Khata Vahi)
  let openingUdharRow = null;
  let openingJamaRow = null;
  let totalUdhar = 0;
  let totalJama = 0;

  if (priorAdvance >= 0) {
    // Normal case: Worker has advance carried forward in Udhar column
    openingUdharRow = {
      isOpeningBF: true,
      label: 'આગળ નો બાકી રહેલ ઉપાડ',
      sublabel: 'ગત મહિના માંથી કેરી ફોરવર્ડ (B/F)',
      amount: priorAdvance,
    };
    totalUdhar = priorAdvance + monthUpad;
    totalJama = monthSalary;
  } else {
    // Rare case: Worker has credit (Jama) carried forward in Jama column
    openingJamaRow = {
      isOpeningBF: true,
      label: 'આગળ ની જમા મજૂરી બાકી',
      sublabel: 'ગત મહિના માંથી કેરી ફોરવર્ડ (B/F)',
      amount: Math.abs(priorAdvance),
    };
    totalJama = Math.abs(priorAdvance) + monthSalary;
    totalUdhar = monthUpad;
  }

  // Closing Balance: Net Advance to forward to next month
  // positive = બાકી રહેલ ઉપાડ (Worker owes advance)
  // negative = કારીગરને ચૂકવવાપાત્ર (Workshop owes worker)
  // 0 = હિસાબ સરભર (Settled)
  const closingAdvance = totalUdhar - totalJama;

  return {
    monthKey,
    year,
    month,
    pageNo: month,
    accountNo: formatKhataAccountNo(year, month),
    monthName: getGujaratiMonthName(month),
    startDate: startDateStr,
    endDate: endDateStr,
    priorAdvance,
    openingUdharRow,
    openingJamaRow,
    jamaRows,
    udharRows,
    monthSalary,
    monthUpad,
    totalUdhar,
    totalJama,
    closingAdvance,
    closingStatus:
      closingAdvance > 0 ? 'advance_due' : closingAdvance < 0 ? 'due_to_worker' : 'settled',
  };
}
