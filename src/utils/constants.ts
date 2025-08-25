export const STORAGE = {
  THEME: 'tempo_theme',
  HAPTICS: 'tempo_haptics',
  SETTINGS: 'tempo_settings',
  CUMULATIVE: 'tempo_cumulative',
  DIARY: 'tempo_diary',
  CURRENT_PROFILE: 'tempo_current_profile',
  PROFILES: 'tempo_profiles',
  SESSIONS: 'tempo_sessions',
} as const;

export type ThemeName = 'blue' | 'gold' | 'neo' | 'cosmic' | 'glass' | 'chrono';

export const THEMES: Record<ThemeName, { accent: string; text: string; glow?: string }> = {
  blue: { accent: '#0a88ff', text: '#e5e7eb' },
  gold: { accent: '#c2a14a', text: '#111827' },
  neo: { accent: '#00F5D4', text: '#F8F9FA' },
  cosmic: { accent: '#7DF9FF', text: '#E6E6FA' },
  glass: { accent: '#38BDF8', text: '#F3F4F6', glow: '#9333EA' },
  chrono: { accent: '#58A6FF', text: '#C9D1D9' },
};



