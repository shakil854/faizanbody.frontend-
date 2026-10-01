/**
 * Date Alert Utilities for FaizanBody Worker Management
 */

/**
 * Calculates remaining days until a given date (YYYY-MM-DD).
 * Returns:
 *   > 0: Future days remaining
 *   0: Due today
 *   < 0: Days overdue (past date)
 *   null: Invalid or empty date
 */
export function getDaysUntil(dateStr) {
  if (!dateStr) return null;
  try {
    const cleanStr = String(dateStr).split('T')[0];
    const parts = cleanStr.split('-');
    if (parts.length !== 3) return null;

    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);

    const targetDate = new Date(year, month, day);
    targetDate.setHours(0, 0, 0, 0);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const diffTime = targetDate.getTime() - today.getTime();
    return Math.round(diffTime / (1000 * 60 * 60 * 24));
  } catch (e) {
    return null;
  }
}

/**
 * Checks if a worker's going date is within the critical alert threshold (5 days).
 */
export function isLeavingSoon(goingDateStr, thresholdDays = 5) {
  const days = getDaysUntil(goingDateStr);
  if (days === null) return false;
  // Trigger red notification from 5 days before going date until today (0 to 5 days)
  return days >= 0 && days <= thresholdDays;
}

/**
 * Human-friendly alert tag label
 */
export function getLeavingSoonLabel(goingDateStr) {
  const days = getDaysUntil(goingDateStr);
  if (days === null) return null;
  if (days === 0) return 'Leaving Today!';
  if (days === 1) return 'Leaving Tomorrow (1 day left)';
  if (days > 1 && days <= 5) return `Leaving in ${days} days`;
  return null;
}

/**
 * Friendly display date formatter
 */
export function formatDisplayDate(dateStr) {
  if (!dateStr) return null;
  try {
    const cleanStr = String(dateStr).split('T')[0];
    const parts = cleanStr.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const d = new Date(year, month, day);
      return d.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    }
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? dateStr : d.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch (e) {
    return dateStr;
  }
}
