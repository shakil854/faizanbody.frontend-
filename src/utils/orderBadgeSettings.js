/**
 * Configuration and helpers for Order Nav Badge color thresholds
 * Allows user to define when the Orders badge turns Red, Green, or Blue.
 */

const STORAGE_KEY = 'fb_order_badge_settings';

export const DEFAULT_ORDER_BADGE_SETTINGS = {
  redThreshold: 2,       // <= this value turns RED
  greenThreshold: 5,     // <= this value turns GREEN
  blueThreshold: 6,      // >= this value turns BLUE
  countType: 'in_progress', // 'in_progress' | 'incoming' | 'total'
};

const VALID_COUNT_TYPES = ['in_progress', 'incoming', 'total'];

export function getOrderBadgeSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_ORDER_BADGE_SETTINGS };
    const parsed = JSON.parse(raw);
    const red = Number.isFinite(Number(parsed.redThreshold)) ? Number(parsed.redThreshold) : 2;
    const green = Number.isFinite(Number(parsed.greenThreshold)) ? Number(parsed.greenThreshold) : 5;
    const blue = Number.isFinite(Number(parsed.blueThreshold)) ? Number(parsed.blueThreshold) : (green + 1);
    const countType = VALID_COUNT_TYPES.includes(parsed.countType) ? parsed.countType : 'in_progress';
    return {
      redThreshold: red,
      greenThreshold: green,
      blueThreshold: blue,
      countType,
    };
  } catch (err) {
    console.error('Error reading badge settings:', err);
    return { ...DEFAULT_ORDER_BADGE_SETTINGS };
  }
}

export function saveOrderBadgeSettings(newSettings, { emitEvent = true } = {}) {
  try {
    const countType = VALID_COUNT_TYPES.includes(newSettings.countType)
      ? newSettings.countType
      : 'in_progress';
    const settings = {
      redThreshold: Math.max(0, parseInt(newSettings.redThreshold, 10) || 0),
      greenThreshold: Math.max(0, parseInt(newSettings.greenThreshold, 10) || 0),
      blueThreshold: Math.max(0, parseInt(newSettings.blueThreshold, 10) || 0),
      countType,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    if (emitEvent) {
      window.dispatchEvent(new CustomEvent('orderBadgeSettingsChanged', { detail: settings }));
    }
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
