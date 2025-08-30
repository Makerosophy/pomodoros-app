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

export const speak = (text: string, options?: { lang?: string; rate?: number; pitch?: number; volume?: number }) => {
  try {
    if (!('speechSynthesis' in window)) return;
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = options?.lang ?? 'en-US';
    utter.rate = options?.rate ?? 1.0;
    utter.pitch = options?.pitch ?? 1.0;
    utter.volume = options?.volume ?? 1.0;
    // Prefer an English voice if available
    const voices = window.speechSynthesis.getVoices?.() || [];
    const preferred = voices.find(v => /en[-_](US|GB)/i.test(v.lang)) || voices[0];
    if (preferred) utter.voice = preferred;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utter);
  } catch {
    // ignore
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
