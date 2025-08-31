export const STORAGE = {
  THEME: 'tempo_theme',
  HAPTICS: 'tempo_haptics',
  SETTINGS: 'tempo_settings',
  CUMULATIVE: 'tempo_cumulative',
  DIARY: 'tempo_diary',
  CURRENT_PROFILE: 'tempo_current_profile',
  PROFILES: 'tempo_profiles',
  SESSIONS: 'tempo_sessions',
  SOUND: 'tempo_sound',
  VOICE: 'tempo_voice',
  VOICE_VOLUME: 'tempo_voice_volume',
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

// Voice settings
export type VoiceType = 'male' | 'female' | 'system';

export const VOICE_OPTIONS = {
  male: { label: 'Male Voice', lang: 'en-US' },
  female: { label: 'Female Voice', lang: 'en-US' },
  system: { label: 'System Default', lang: 'en-US' },
} as const;

// Voice announcements
export const VOICE_ANNOUNCEMENTS = {
  start: { male: 'Start', female: 'Start' },
  shortBreak: { male: 'Short break', female: 'Short break' },
  longBreak: { male: 'Long break', female: 'Long break' },
  paused: { male: 'Paused', female: 'Paused' },
  end: { male: 'End', female: 'End' },
} as const;



