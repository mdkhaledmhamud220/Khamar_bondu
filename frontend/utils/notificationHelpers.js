// utils/notificationHelpers.js

const BENGALI_DIGITS = {
  '0': '০', '1': '১', '2': '২', '3': '৩', '4': '৪',
  '5': '৫', '6': '৬', '7': '৭', '8': '৮', '9': '৯',
};

export function toBengaliNumber(input) {
  return String(input).replace(/[0-9]/g, (d) => BENGALI_DIGITS[d]);
}

/** "৫ মিনিট আগে" / "গতকাল" style relative time, in Bengali. */
export function formatRelativeTimeBn(timestamp) {
  if (!timestamp) return '';
  const now = Date.now();
  const then = timestamp.toDate ? timestamp.toDate().getTime() : new Date(timestamp).getTime();
  const diffSec = Math.max(0, Math.floor((now - then) / 1000));

  if (diffSec < 60) return 'এইমাত্র';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${toBengaliNumber(diffMin)} মিনিট আগে`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${toBengaliNumber(diffHour)} ঘণ্টা আগে`;
  const diffDay = Math.floor(diffHour / 24);
  if (diffDay === 1) return 'গতকাল';
  if (diffDay < 7) return `${toBengaliNumber(diffDay)} দিন আগে`;
  const diffWeek = Math.floor(diffDay / 7);
  if (diffWeek < 5) return `${toBengaliNumber(diffWeek)} সপ্তাহ আগে`;
  const diffMonth = Math.floor(diffDay / 30);
  if (diffMonth < 12) return `${toBengaliNumber(diffMonth)} মাস আগে`;
  const diffYear = Math.floor(diffDay / 365);
  return `${toBengaliNumber(diffYear)} বছর আগে`;
}

/**
 * Visual identity per notification type.
 * Palette: farm green for growth/health, gold for money, teal for chat, clay for alerts.
 */
export const NOTIFICATION_STYLES = {
  order: { icon: 'cart', color: '#B8860B', bg: '#FBF1DC' },
  payment: { icon: 'cash', color: '#B8860B', bg: '#FBF1DC' },
  chat: { icon: 'chatbubble-ellipses', color: '#1F6F5C', bg: '#DCEFE9' },
  health: { icon: 'medkit', color: '#2D6A4F', bg: '#E1F0E6' },
  vaccine: { icon: 'medkit', color: '#2D6A4F', bg: '#E1F0E6' },
  system: { icon: 'notifications', color: '#7A5230', bg: '#F0E6DC' },
};

export function getNotificationStyle(type) {
  return (
    NOTIFICATION_STYLES[type] ?? {
      icon: 'notifications-outline',
      color: '#5C6B5D',
      bg: '#EDEFEC',
    }
  );
}