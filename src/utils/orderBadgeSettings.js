/**
 * Configuration and helpers for Order Nav Badge color thresholds
 * Allows user to define when the Orders badge turns Red, Green, or Blue.
 */

const STORAGE_KEY = 'fb_order_badge_settings';

export const DEFAULT_ORDER_BADGE_SETTINGS = {
  redThreshold: 2,       // <= this value turns RED
  greenThreshold: 5,     // <= this value turns GREEN
  blueThreshold: 6,      // >= this value turns BLUE
  countType: 'in_progress', // 'in_progress' | 'total'
};

export function getOrderBadgeSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_ORDER_BADGE_SETTINGS };
    const parsed = JSON.parse(raw);
    const red = Number.isFinite(Number(parsed.redThreshold)) ? Number(parsed.redThreshold) : 2;
    const green = Number.isFinite(Number(parsed.greenThreshold)) ? Number(parsed.greenThreshold) : 5;
    const blue = Number.isFinite(Number(parsed.blueThreshold)) ? Number(parsed.blueThreshold) : (green + 1);
    return {
      redThreshold: red,
      greenThreshold: green,
      blueThreshold: blue,
      countType: parsed.countType === 'total' ? 'total' : 'in_progress',
    };
  } catch (err) {
    console.error('Error reading badge settings:', err);
    return { ...DEFAULT_ORDER_BADGE_SETTINGS };
  }
}

export function saveOrderBadgeSettings(newSettings) {
  try {
    const settings = {
      redThreshold: Math.max(0, parseInt(newSettings.redThreshold, 10) || 0),
      greenThreshold: Math.max(0, parseInt(newSettings.greenThreshold, 10) || 0),
      blueThreshold: Math.max(0, parseInt(newSettings.blueThreshold, 10) || 0),
      countType: newSettings.countType === 'total' ? 'total' : 'in_progress',
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    window.dispatchEvent(new CustomEvent('orderBadgeSettingsChanged', { detail: settings }));
    return settings;
  } catch (err) {
    console.error('Error saving badge settings:', err);
    return DEFAULT_ORDER_BADGE_SETTINGS;
  }
}

export function getOrderBadgeColor(count, settings = null) {
  const cfg = settings || getOrderBadgeSettings();
  const num = Number(count) || 0;
  const red = Number(cfg.redThreshold ?? 2);
  const green = Number(cfg.greenThreshold ?? 5);
  const blue = Number(cfg.blueThreshold ?? (green + 1));

  if (num <= red) {
    return 'red';
  } else if (num >= blue) {
    return 'blue';
  } else {
    return 'green';
  }
}
