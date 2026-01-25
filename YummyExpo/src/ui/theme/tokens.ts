import { Platform } from 'react-native';

export const COLORS = {
  background: '#0d0b0a',
  surface: '#161311',
  surfaceAlt: '#1e1916',
  accent: '#c9a86a',
  accentSoft: '#e2c288',
  textPrimary: '#f4efe9',
  textSecondary: '#b8a89a',
  border: '#2a2320',
  danger: '#d94c4c',
} as const;

export const FONTS = {
  display: Platform.select({
    ios: 'Times New Roman',
    android: 'serif',
    default: 'serif',
  }),
  body: Platform.select({
    ios: 'Avenir Next',
    android: 'sans-serif',
    default: 'System',
  }),
} as const;

export const SIZES = {
  padding: 20,
  radius: 18,
  radiusSmall: 12,
  title: 32,
  subtitle: 16,
  body: 14,
  caption: 12,
  buttonHeight: 48,
} as const;

export const SHADOW = {
  shadowColor: '#000',
  shadowOpacity: 0.25,
  shadowRadius: 20,
  shadowOffset: { width: 0, height: 12 },
  elevation: 8,
};
