/**
 * Helper to compute date ranges and monthly ledger pages for Khata system
 * Matching authentic Desi Nama Khata Vahi (English UI with standard Jama-Udhar ledger terms)
 */

export const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

export function getMonthName(monthNumber) {
  const m = Number(monthNumber);
  if (m >= 1 && m <= 12) {
    return MONTH_NAMES[m - 1];
  }
  return '';
}

/**
 * Format standard A/c No. shown in notebook (e.g. 1-9-2026, 1-10-2026, 1-11-2026)
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
    const monthName = getMonthName(start.getMonth() + 1);
    return {
      startDate: startStr,
      endDate: endStr,
      label: `Running Month (${monthName} ${year}) • 01/${mStr} to ${end.getDate()}/${mStr}`,
      shortLabel: `Running Month (${monthName})`,
    };
  }

  if (period === 'last_month') {
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0);
    const yStr = start.getFullYear();
    const mStr = String(start.getMonth() + 1).padStart(2, '0');
    const startStr = `${yStr}-${mStr}-01`;
    const endStr = `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, '0')}-${String(end.getDate()).padStart(2, '0')}`;
    const monthName = getMonthName(start.getMonth() + 1);
    return {
      startDate: startStr,
      endDate: endStr,
      label: `Last Month (${monthName} ${yStr}) • 01/${mStr} to ${end.getDate()}/${mStr}`,
      shortLabel: `Last Month (${monthName})`,
    };
  }

  if (period === 'custom') {
    return {
      startDate: customFrom || '',
      endDate: customTo || '',
      label: customFrom && customTo ? `Custom Dates: ${customFrom} to ${customTo}` : 'Select Custom Dates',
      shortLabel: 'Custom Dates',
    };
  }

  // all_time
  return {
    startDate: '',
    endDate: '',
    label: 'All Time (Complete Ledger)',
    shortLabel: 'All Time',
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
    const monthName = getMonthName(month);
    const accountNo = formatKhataAccountNo(year, month);
    const pageNo = month; // Matches notebook photo: Month 9 = Page 9, Month 10 = Page 10

    return {
      monthKey: key,
      year,
      month,
      pageNo,
      accountNo,
      monthName,
      label: `${monthName} ${year} (A/c: ${accountNo} • Page ${pageNo})`,
      shortLabel: `${monthName} ${year}`,
      isCurrent: key === currentMonthKey,
    };
  });
}

/**
 * Compute the authentic 2-column Khata Vahi ledger for a given monthKey (YYYY-MM)
 *
 * Left Column: JAMA (Work / Earnings)
 * Right Column: UDHAR (Upad / Advance)
 *
 * First row of Udhar is automatically "Previous Advance (Carried Forward B/F)"
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
  // If > 0, worker has net advance taken
  // If < 0, workshop owes worker salary
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
      label: 'Previous Advance (B/F)',
      sublabel: 'Auto Carried Forward from Last Month',
      amount: priorAdvance,
    };
    totalUdhar = priorAdvance + monthUpad;
    totalJama = monthSalary;
  } else {
    // Rare case: Worker has credit (Jama) carried forward in Jama column
    openingJamaRow = {
      isOpeningBF: true,
      label: 'Previous Credit (B/F)',
      sublabel: 'Auto Carried Forward from Last Month',
      amount: Math.abs(priorAdvance),
    };
    totalJama = Math.abs(priorAdvance) + monthSalary;
    totalUdhar = monthUpad;
  }

  // Closing Balance: Net Advance to forward to next month
  // positive = Advance on Worker
  // negative = Due to Worker
  // 0 = Settled
  const closingAdvance = totalUdhar - totalJama;

  return {
    monthKey,
    year,
    month,
    pageNo: month,
    accountNo: formatKhataAccountNo(year, month),
    monthName: getMonthName(month),
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

/**
 * Compute summary khata numbers for a single worker for any selected period
 * ('running_month', 'last_month', 'all_time', 'custom') from their raw transactions.
 * Accurately forwards prior month's balance as Opening Balance (B/F).
 */
export function calculateWorkerKhataForPeriod(
  transactions = [],
  period = 'running_month',
  customFrom = '',
  customTo = ''
) {
  const range = getPeriodDateRange(period, customFrom, customTo);
  const allTxs = Array.isArray(transactions) ? transactions : [];

  if (period === 'all_time' || (!range.startDate && !range.endDate)) {
    const totalSalary = allTxs
      .filter((t) => t && t.type === 'salary')
      .reduce((s, t) => s + (Number(t.amount) || 0), 0);
    const totalUpad = allTxs
      .filter((t) => t && t.type === 'upad')
      .reduce((s, t) => s + (Number(t.amount) || 0), 0);
    const totalPaid = allTxs
      .filter((t) => t && t.type === 'payment')
      .reduce((s, t) => s + (Number(t.amount) || 0), 0);
    const balance = totalSalary - (totalUpad + totalPaid);
    return {
      total_salary: totalSalary,
      total_upad: totalUpad,
      total_paid: totalPaid,
      opening_balance: 0,
      balance,
      closing_balance: Math.abs(balance),
    };
  }

  // 1. Calculate Opening Balance strictly before range.startDate:
  // priorUpad + priorPaid - priorSalary (> 0 = advance B/F, < 0 = credit B/F)
  let priorSalary = 0;
  let priorUpad = 0;
  let priorPaid = 0;

  allTxs.forEach((t) => {
    if (!t || !t.date) return;
    const txDate = String(t.date).slice(0, 10);
    if (range.startDate && txDate < range.startDate) {
      const amt = Number(t.amount) || 0;
      if (t.type === 'salary') priorSalary += amt;
      else if (t.type === 'upad') priorUpad += amt;
      else if (t.type === 'payment') priorPaid += amt;
    }
  });

  const openingBalance = (priorUpad + priorPaid) - priorSalary;

  // 2. Transactions strictly within range:
  const periodTxs = allTxs.filter((t) => {
    if (!t || !t.date) return false;
    const txDate = String(t.date).slice(0, 10);
    if (range.startDate && txDate < range.startDate) return false;
    if (range.endDate && txDate > range.endDate) return false;
    return true;
  });

  const totalSalary = periodTxs
    .filter((t) => t && t.type === 'salary')
    .reduce((s, t) => s + (Number(t.amount) || 0), 0);
  const totalUpad = periodTxs
    .filter((t) => t && t.type === 'upad')
    .reduce((s, t) => s + (Number(t.amount) || 0), 0);
  const totalPaid = periodTxs
    .filter((t) => t && t.type === 'payment')
    .reduce((s, t) => s + (Number(t.amount) || 0), 0);

  // Closing balance:
  const closingUpad = (openingBalance > 0 ? openingBalance : 0) + totalUpad + totalPaid;
  const closingWork = (openingBalance < 0 ? Math.abs(openingBalance) : 0) + totalSalary;
  const balance = closingWork - closingUpad; // > 0: Payable, < 0: Advance Due

  return {
    total_salary: totalSalary,
    total_upad: totalUpad,
    total_paid: totalPaid,
    opening_balance: openingBalance,
    balance,
    closing_balance: Math.abs(balance),
  };
}
