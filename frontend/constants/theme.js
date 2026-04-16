export const Colors = {
  // Primary greens
  primary:        '#1B5E20',  // Deep forest green
  primaryDark:    '#0D3B12',
  primaryLight:   '#2E7D32',
  primaryMid:     '#388E3C',
  accent:         '#66BB6A',  // Soft green
  accentLight:    '#A5D6A7',
  accentPale:     '#a4dca9',

  // Neutrals
  white:          '#FFFFFF',
  background:     '#F5F9F5',  // Very light green-tinted white
  surface:        '#FFFFFF',
  surfaceAlt:     '#EFF6EF',
  border:         '#C8E6C9',
  borderDark:     '#A5D6A7',

  // Text
  textPrimary:    '#1A2E1A',
  textSecondary:  '#4A6741',
  textMuted:      '#7A9E7A',
  textOnPrimary:  '#FFFFFF',

  // Status
  success:        '#2E7D32',
  warning:        '#F57F17',
  error:          '#C62828',
  info:           '#1565C0',

  // Health Score
  healthExcellent: '#1B5E20',
  healthGood:      '#388E3C',
  healthAverage:   '#F9A825',
  healthWeak:      '#E65100',
  healthBad:       '#C62828',

  // Shadows
  shadow:         'rgba(27, 94, 32, 0.12)',
  shadowDark:     'rgba(27, 94, 32, 0.25)',
};

export const FontSize = {
  xs:   11,
  sm:   13,
  md:   15,
  lg:   17,
  xl:   20,
  xxl:  24,
  xxxl: 30,
  hero: 38,
};

export const Spacing = {
  xs:  4,
  sm:  8,
  md:  12,
  lg:  16,
  xl:  24,
  xxl: 32,
  xxxl:48,
};

export const BorderRadius = {
  sm:   8,
  md:   12,
  lg:   16,
  xl:   24,
  full: 999,
};

export const Shadow = {
  sm: {
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: Colors.shadowDark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 5,
  },
  lg: {
    shadowColor: Colors.shadowDark,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 16,
    elevation: 10,
  },
};
