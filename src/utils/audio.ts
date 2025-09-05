let sharedContext: AudioContext | null = null;

const getAudioContext = (): AudioContext => {
  if (!sharedContext) {
    // @ts-ignore - webkitAudioContext for Safari
    sharedContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  return sharedContext;
};

export const resumeAudioContext = async (): Promise<void> => {
  try {
    const ctx = getAudioContext();
    if (ctx.state === 'suspended') {
      await ctx.resume();
    }
  } catch (_) {
    // no-op
  }
};

export const playBeep = async (
  frequency: number = 880,
  durationSeconds: number = 0.22,
  volume: number = 0.3
): Promise<void> => {
  const ctx = getAudioContext();
  if (ctx.state === 'suspended') {
    // Try to resume; if it fails, the first user interaction should call resumeAudioContext()
    try { await ctx.resume(); } catch {}
  }

  const oscillator = ctx.createOscillator();
  const gainNode = ctx.createGain();

  oscillator.type = 'square';
  oscillator.frequency.value = frequency;
  gainNode.gain.setValueAtTime(0, ctx.currentTime);
  gainNode.gain.linearRampToValueAtTime(volume, ctx.currentTime + 0.005);
  // Quick decay envelope to avoid clicks
  gainNode.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + durationSeconds);

  oscillator.connect(gainNode);
  gainNode.connect(ctx.destination);

  oscillator.start();
  oscillator.stop(ctx.currentTime + durationSeconds + 0.01);
};

// Pleasant two-tone chime with gentle envelope
export const playChime = async (): Promise<void> => {
  const ctx = getAudioContext();
  if (ctx.state === 'suspended') {
    try { await ctx.resume(); } catch {}
  }

  const createVoice = (freq: number, startTime: number, length: number, peak: number) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(4000, startTime);
    filter.Q.value = 0.0001;

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, startTime);
    gain.gain.setValueAtTime(0.0001, startTime);
    gain.gain.exponentialRampToValueAtTime(peak, startTime + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + length);

    osc.connect(gain);
    gain.connect(filter);
    filter.connect(ctx.destination);

    osc.start(startTime);
    osc.stop(startTime + length + 0.02);
  };

  const now = ctx.currentTime;
  // Simple pleasant interval: G5 -> C6 arpeggio with slight overlap
  createVoice(784, now, 0.18, 0.25);          // G5
  createVoice(1047, now + 0.12, 0.22, 0.22);  // C6
  // Soft bell overtone
  createVoice(1568, now + 0.12, 0.16, 0.12);  // G6
};

// Final session chime: richer, slightly longer, layered tones
export const playFinalChime = async (): Promise<void> => {
  const ctx = getAudioContext();
  if (ctx.state === 'suspended') {
    try { await ctx.resume(); } catch {}
  }

  const createBell = (freq: number, startTime: number, length: number, peak: number) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(3500, startTime);

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, startTime);
    gain.gain.setValueAtTime(0.0001, startTime);
    gain.gain.exponentialRampToValueAtTime(peak, startTime + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + length);

    osc.connect(gain);
    gain.connect(filter);
    filter.connect(ctx.destination);

    osc.start(startTime);
    osc.stop(startTime + length + 0.05);
  };

  const now = ctx.currentTime;
  // C-major arpeggio with gentle overlap: C6 - E6 - G6 - C7
  createBell(1047, now, 0.30, 0.28);
  createBell(1319, now + 0.12, 0.30, 0.24);
  createBell(1568, now + 0.24, 0.30, 0.20);
  createBell(2093, now + 0.36, 0.40, 0.18);
};

export type SoundName = 'chime' | 'beep' | 'bell' | 'digital';

// A short, synthetic digital blip sequence
const playDigital = async (): Promise<void> => {
  const ctx = getAudioContext();
  if (ctx.state === 'suspended') {
    try { await ctx.resume(); } catch {}
  }
  const now = ctx.currentTime;
  const mk = (f: number, t: number, d = 0.12, v = 0.25) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(f, now + t);
    gain.gain.setValueAtTime(0.0001, now + t);
    gain.gain.exponentialRampToValueAtTime(v, now + t + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + t + d);
    osc.connect(gain); gain.connect(ctx.destination);
    osc.start(now + t); osc.stop(now + t + d + 0.02);
  };
  mk(880, 0.00); // A5
  mk(1320, 0.10); // E6
};

export const playChimeByName = async (name: SoundName): Promise<void> => {
  switch (name) {
    case 'beep':
      return playBeep(880, 0.18, 0.3);
    case 'bell':
      return playFinalChime();
    case 'digital':
      return playDigital();
    case 'chime':
    default:
      return playChime();
  }
};

export const playFinalChimeByName = async (name: SoundName): Promise<void> => {
  // Final chime variants can reuse main selection but slightly richer for non-beep
  switch (name) {
    case 'beep':
      return playBeep(660, 0.2, 0.35);
    case 'digital':
      return playDigital();
    case 'bell':
    case 'chime':
    default:
      return playFinalChime();
  }
};
// -------- Speech synthesis helpers --------
type PhaseType = 'pomodoro' | 'shortBreak' | 'longBreak';
type VoiceType = 'male' | 'female' | 'system';

// Get voice settings from localStorage
const getVoiceSettings = () => {
  try {
    const voiceType = localStorage.getItem('tempo_voice') as VoiceType || 'system';
    const voiceVolume = parseFloat(localStorage.getItem('tempo_voice_volume') || '0.8');
    return { voiceType, voiceVolume: Math.max(0.1, Math.min(1.0, voiceVolume)) };
  } catch {
    return { voiceType: 'system' as VoiceType, voiceVolume: 0.8 };
  }
};

// Find appropriate voice based on preferences
const findAppropriateVoice = (preferredType: VoiceType): SpeechSynthesisVoice | null => {
  try {
    if (!('speechSynthesis' in window)) return null;
    const voices = window.speechSynthesis.getVoices?.() || [];
    if (voices.length === 0) return null;
    return findVoiceFromList(voices, preferredType);
  } catch {
    return null;
  }
};

// Helper function to find voice from a list
const findVoiceFromList = (voices: SpeechSynthesisVoice[], preferredType: VoiceType): SpeechSynthesisVoice | null => {
  if (voices.length === 0) return null;

  if (preferredType === 'system') {
    // Prefer a warm, natural female variant for the system default
    const englishVoices = voices.filter(v => v.lang.startsWith('en'));
    const pool = englishVoices.length > 0 ? englishVoices : voices;

    const femalePreferenceOrder = [
      'siri female', 'siri (female)', 'siri voice 3',
      'samantha', 'victoria', 'karen', 'emma', 'lisa', 'helena', 'sarah', 'zoe', 'ava', 'sophie',
      'microsoft aria', 'microsoft zira', 'microsoft jenny',
      'google us english female', 'google uk english female', 'uk english female'
    ];

    const prioritized = pool.find(v => {
      const name = v.name.toLowerCase();
      return femalePreferenceOrder.some(p => name.includes(p));
    });
    if (prioritized) return prioritized;

    const genericFemale = pool.find(v => {
      const name = v.name.toLowerCase();
      return name.includes('female') || name.includes('samantha') || name.includes('victoria') ||
             name.includes('sarah') || name.includes('emma') || name.includes('lisa') ||
             name.includes('karen') || name.includes('helena') || name.includes('ava') ||
             name.includes('zoe') || name.includes('sophie') || name.includes('aria') ||
             name.includes('zira') || name.includes('jenny');
    });
    if (genericFemale) return genericFemale;

    const fallbackDefault = voices.find(v => v.default) || voices[0];
    return fallbackDefault;
  }

  // Look for English voices of the preferred gender
  const englishVoices = voices.filter(v => v.lang.startsWith('en'));
  if (englishVoices.length === 0) {
    // No English voices, use any available
    return voices[0];
  }

  // Try to find voices with gender indicators in the name
  let genderVoices = englishVoices.filter(v => {
    const name = v.name.toLowerCase();
    if (preferredType === 'male') {
      // First, prefer known warm/human male voices common on macOS/Windows/Chrome
      const warmMalePreference = [
        'alex',                 // macOS natural voice
        'tom',                  // macOS male
        'daniel',               // common warm male
        'matthew',              // US male
        'siri male',            // Siri male variants
        'siri (male)',
        'siri voice 2',
        'google us english',    // Chrome Google voices
        'google english (united states)',
        'uk english male',
        'google uk english male',
        'microsoft guy',        // Edge/Windows voices
        'microsoft mark',
        'microsoft david',
      ];
      if (warmMalePreference.some(p => name.includes(p))) {
        return true;
      }

      // Prefer deep, relaxed male voices
      // Priority 1: Deep male voices (lower pitch indicators)
      if (name.includes('david') || name.includes('james') || name.includes('john') || 
          name.includes('mike') || name.includes('thomas') || name.includes('robert')) {
        return true;
      }
      // Priority 2: Generic male indicators
      if (name.includes('male') || name.includes('guy') || name.includes('man')) {
        return true;
      }
      // Priority 3: Other common male names
      if (name.includes('alex') || name.includes('chris') || name.includes('daniel') ||
          name.includes('michael') || name.includes('william') || name.includes('richard')) {
        return true;
      }
      
      // Priority 4: Try to detect male voices by other means
      // Some browsers use different naming conventions
      if (name.includes('en-us') && !name.includes('female') && !name.includes('samantha') && 
          !name.includes('victoria') && !name.includes('sarah') && !name.includes('emma') && 
          !name.includes('lisa') && !name.includes('karen') && !name.includes('helena')) {
        return true;
      }
      
      // Priority 5: If no specific male voice found, try to use any voice that's not clearly female
      // This is a fallback for browsers with limited voice options
      if (!name.includes('female') && !name.includes('samantha') && !name.includes('victoria') &&
          !name.includes('sarah') && !name.includes('emma') && !name.includes('lisa') &&
          !name.includes('karen') && !name.includes('helena') && !name.includes('zoe') &&
          !name.includes('ava') && !name.includes('sophie')) {
        return true;
      }
      return false;
    } else {
      return name.includes('female') || name.includes('samantha') || name.includes('victoria') ||
             name.includes('sarah') || name.includes('emma') || name.includes('lisa') ||
             name.includes('karen') || name.includes('helena');
    }
  });

  if (genderVoices.length > 0) {
    // For male voices, try to find the deepest/relaxed one
    if (preferredType === 'male') {
      // Sort by preference: deep voices first
      genderVoices.sort((a, b) => {
        const aName = a.name.toLowerCase();
        const bName = b.name.toLowerCase();
        
        // Strong warm preference ordering
        const warmOrder = ['alex', 'tom', 'daniel', 'matthew', 'siri male', 'siri (male)', 'microsoft mark', 'microsoft david'];
        const aWarmIdx = warmOrder.findIndex(w => aName.includes(w));
        const bWarmIdx = warmOrder.findIndex(w => bName.includes(w));
        if (aWarmIdx !== -1 || bWarmIdx !== -1) {
          if (aWarmIdx === -1) return 1;
          if (bWarmIdx === -1) return -1;
          if (aWarmIdx < bWarmIdx) return -1;
          if (aWarmIdx > bWarmIdx) return 1;
        }

        // David, James, John are typically deeper voices
        const aDeep = aName.includes('david') || aName.includes('james') || aName.includes('john');
        const bDeep = bName.includes('david') || bName.includes('james') || bName.includes('john');
        
        if (aDeep && !bDeep) return -1;
        if (!aDeep && bDeep) return 1;
        return 0;
      });
      
    }
    
    const finalVoice = genderVoices[0];
    return finalVoice;
  }

  // If no gender-specific voices found, use first English voice
  return englishVoices[0];
};

export const speak = async (text: string, options?: { lang?: string; rate?: number; pitch?: number; volume?: number }) => {
  try {
    if (!('speechSynthesis' in window)) return;
    
    const { voiceType, voiceVolume } = getVoiceSettings();
    const voice = findAppropriateVoice(voiceType);
    
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = options?.lang ?? 'en-US';
    
    // Voice tuning per type for a warmer, more human sound
    if (voiceType === 'male') {
      // Slightly slower and slightly lower than default, avoiding overly deep/robotic tone
      utter.rate = options?.rate ?? 0.95;
      utter.pitch = options?.pitch ?? 0.9;
    } else if (voiceType === 'system') {
      // Tune for a warm, natural female variant
      utter.rate = options?.rate ?? 1.0;
      utter.pitch = options?.pitch ?? 1.05;
    } else {
      utter.rate = options?.rate ?? 1.0;
      utter.pitch = options?.pitch ?? 1.0;
    }
    
    utter.volume = options?.volume ?? voiceVolume;
    if (voice) utter.voice = voice;
    
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utter);
  } catch (error) {
    console.error('Error in speak function:', error);
  }
};

export const announcePhase = (phase: PhaseType) => {
  const map: Record<PhaseType, string> = {
    pomodoro: 'Start',
    shortBreak: 'Short break',
    longBreak: 'Long break',
  };
  speak(map[phase]);
};

export const announcePaused = () => speak('Paused');
export const announceEnd = () => speak('End');
