import { useState, useCallback, useEffect, useRef } from 'react';
import { signInWithGoogle, onAuth, logout, saveSession, fetchLastSessions } from './services/firebase';
import Timer from './components/Timer';
import TimerSettings from './components/TimerSettings';
import WorkdayProgress from './components/WorkdayProgress';
import WatchFace from './components/WatchFace';
import Diary from './components/Diary';
import SchedulePreview from './components/SchedulePreview';
import { resumeAudioContext, announcePhase, announceEnd, playChimeByName, playFinalChimeByName, type SoundName } from './utils/audio';
import { vibrateShort, vibrateSuccess, vibrateWarning } from './utils/haptics';
import { STORAGE, THEMES, type ThemeName } from './utils/constants';
import { nextMidnightDelayMs } from './utils/dates';

type TimerType = 'pomodoro' | 'shortBreak' | 'longBreak';

function App() {
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [currentTimerType, setCurrentTimerType] = useState<TimerType>('pomodoro');
  const [pomodoroDuration, setPomodoroDuration] = useState(25 * 60); // Default 25 minutes
  const [shortBreakDuration, setShortBreakDuration] = useState(5 * 60); // Default 5 minutes
  const [longBreakDuration, setLongBreakDuration] = useState(15 * 60); // Default 15 minutes
  const [workdayDuration, setWorkdayDuration] = useState(8 * 3600); // Default 8 hours in seconds
  const [elapsedWorkdayTime, setElapsedWorkdayTime] = useState(0);
  const [cumulativeActiveSec, setCumulativeActiveSec] = useState(0);
  const [cumulativeBreakSec, setCumulativeBreakSec] = useState(0);
  const [cumulativeShortBreakSec, setCumulativeShortBreakSec] = useState(0);
  const [cumulativeLongBreakSec, setCumulativeLongBreakSec] = useState(0);
  const [pomodorosCompleted, setPomodorosCompleted] = useState(0);
  const [cumulativePomodoros, setCumulativePomodoros] = useState(0);
  const [longEvery, setLongEvery] = useState(4);
  const [showSettings, setShowSettings] = useState(false);
  const [runMode, setRunMode] = useState<'workday' | 'cycles'>('workday');
  const [targetCycles, setTargetCycles] = useState<number>(8);
  const [pendingAutoStart, setPendingAutoStart] = useState<boolean>(false);
  const [theme, setTheme] = useState<ThemeName>('blue');
  const ALLOWED_THEMES: Array<ThemeName> = ['blue', 'gold', 'neo', 'cosmic', 'glass', 'chrono'];
  const [hasEverStarted, setHasEverStarted] = useState<boolean>(false);
  const [sessionId, setSessionId] = useState<number>(0);
  const [hapticsEnabled, setHapticsEnabled] = useState<boolean>(true);
  const [scheduleType, setScheduleType] = useState<'standard' | 'shortOnly' | 'longOnly'>('standard');
  const [showDiary, setShowDiary] = useState<boolean>(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [sound, setSound] = useState<SoundName>(() => {
    try {
      const s = localStorage.getItem(STORAGE.SOUND) as SoundName | null;
      if (s === 'beep' || s === 'bell' || s === 'digital' || s === 'chime') return s;
    } catch {}
    return 'chime';
  });
  const [currentProfile, setCurrentProfile] = useState<string>(() => {
    try {
      return localStorage.getItem(STORAGE.CURRENT_PROFILE) || 'Default';
    } catch {
      return 'Default';
    }
  });

  // Ensure robust time accumulation even when the tab is throttled or backgrounded
  const lastTickRef = useRef<number | null>(null);
  const processDelta = useCallback(() => {
    if (!isTimerRunning) return;
    const now = Date.now();
    if (lastTickRef.current == null) {
      lastTickRef.current = now;
      return;
    }
    const deltaMs = Math.max(0, now - lastTickRef.current);
    const deltaSec = Math.floor(deltaMs / 1000);
    if (deltaSec <= 0) return;
    lastTickRef.current += deltaSec * 1000;

    // Update elapsed workday time with clamping when in workday mode
    setElapsedWorkdayTime((prev) => {
      const next = prev + deltaSec;
      if (runMode === 'workday' && next >= workdayDuration) {
        setIsTimerRunning(false);
        try { alert('Workday completed!'); } catch {}
      }
      return next;
    });

    // Update cumulative counters based on current phase
    if (currentTimerType === 'pomodoro') {
      setCumulativeActiveSec((a) => a + deltaSec);
    } else {
      setCumulativeBreakSec((b) => b + deltaSec);
      if (currentTimerType === 'shortBreak') {
        setCumulativeShortBreakSec((s) => s + deltaSec);
      } else if (currentTimerType === 'longBreak') {
        setCumulativeLongBreakSec((l) => l + deltaSec);
      }
    }
  }, [isTimerRunning, currentTimerType, runMode, workdayDuration]);

  const handleSettingsChange = useCallback((settings: {
    pomodoro: number;
    shortBreak: number;
    longBreak: number;
    workday: number;
    longEvery: number;
    mode: 'workday' | 'cycles';
    targetCycles: number;
    scheduleType: 'standard' | 'shortOnly' | 'longOnly';
  }) => {
    setPomodoroDuration(settings.pomodoro);
    setShortBreakDuration(settings.shortBreak);
    setLongBreakDuration(settings.longBreak);
    setWorkdayDuration(settings.workday);
    setLongEvery(settings.longEvery);
    setRunMode(settings.mode);
    setTargetCycles(settings.targetCycles);
    setScheduleType(settings.scheduleType);
    setShowSettings(false);
  }, []);

  // Subscribe to Firebase Auth state (if configured)
  useEffect(() => {
    try {
      const unsub = onAuth((user) => {
        setUserId(user?.uid ?? null);
      });
      return () => { try { unsub(); } catch {} };
    } catch {
      // Firebase not configured yet; ignore
    }
  }, []);

  // On login: fetch last 30 days of sessions from Firestore and merge into local cache
  useEffect(() => {
    if (!userId) return;
    (async () => {
      try {
        const cloud = await fetchLastSessions(userId, 30);
        const raw = localStorage.getItem(STORAGE.SESSIONS);
        const local = raw ? (JSON.parse(raw) as Array<{ id: string; endedAt: number }>) : [];
        const existing = new Set(local.map((s) => s.endedAt));
        const merged = [...local];
        for (const c of cloud) {
          if (!existing.has(c.ended_at)) {
            merged.push({
              id: (c as any).id || String(c.ended_at),
              dateKey: c.date_key,
              profile: c.profile,
              active: c.active,
              break: c.break,
              short: c.short,
              long: c.long,
              pomodoros: c.pomodoros,
              startedAt: c.started_at,
              endedAt: c.ended_at,
              mode: c.mode,
            } as any);
          }
        }
        localStorage.setItem(STORAGE.SESSIONS, JSON.stringify(merged));
      } catch {}
    })();
  }, [userId]);

  const writeDiarySnapshot = () => {
    try {
      const now = new Date();
      const key = `${now.getFullYear()}-${(now.getMonth()+1).toString().padStart(2,'0')}-${now.getDate().toString().padStart(2,'0')}`;
      const raw = localStorage.getItem(STORAGE.DIARY);
      const store = raw ? JSON.parse(raw) : {};
      const prev = store[key] || { active: 0, brk: 0, short: 0, long: 0, poms: 0, elapsed: 0, byProfile: {} };
      const profileName = localStorage.getItem(STORAGE.CURRENT_PROFILE) || 'Default';
      // Compute deltas since last snapshot baseline (persisted baselines not used; rely on prev in store)
      const dActive = Math.max(0, cumulativeActiveSec - (prev._baseActive || 0));
      const dBreak = Math.max(0, cumulativeBreakSec - (prev._baseBreak || 0));
      const dShort = Math.max(0, cumulativeShortBreakSec - (prev._baseShort || 0));
      const dLong = Math.max(0, cumulativeLongBreakSec - (prev._baseLong || 0));
      const dPoms = Math.max(0, pomodorosCompleted - (prev._basePoms || 0));
      const nextByProfile = { ...(prev.byProfile || {}) } as Record<string, { active: number; brk: number; poms?: number }>;
      const pp = nextByProfile[profileName] || { active: 0, brk: 0, poms: 0 };
      pp.active += dActive;
      pp.brk += dBreak;
      pp.poms = (pp.poms || 0) + dPoms;
      nextByProfile[profileName] = pp;
      store[key] = {
        active: (prev.active || 0) + dActive,
        brk: (prev.brk || 0) + dBreak,
        short: (prev.short || 0) + dShort,
        long: (prev.long || 0) + dLong,
        poms: (prev.poms || 0) + dPoms,
        elapsed: Math.max(prev.elapsed || 0, elapsedWorkdayTime),
        ts: Date.now(),
        byProfile: nextByProfile,
        _baseActive: cumulativeActiveSec,
        _baseBreak: cumulativeBreakSec,
        _baseShort: cumulativeShortBreakSec,
        _baseLong: cumulativeLongBreakSec,
        _basePoms: pomodorosCompleted,
      };
      localStorage.setItem(STORAGE.DIARY, JSON.stringify(store));
    } catch {}
  };

  // Aggiorna solo i pomodori completati senza toccare i contatori di tempo
  const updatePomodorosOnly = () => {
    try {
      const now = new Date();
      const key = `${now.getFullYear()}-${(now.getMonth()+1).toString().padStart(2,'0')}-${now.getDate().toString().padStart(2,'0')}`;
      const raw = localStorage.getItem(STORAGE.DIARY);
      const store = raw ? JSON.parse(raw) : {};
      const prev = store[key] || { active: 0, brk: 0, short: 0, long: 0, poms: 0, elapsed: 0, byProfile: {} };
      const profileName = localStorage.getItem(STORAGE.CURRENT_PROFILE) || 'Default';
      
      // Aggiorna solo i pomodori, non i contatori di tempo
      const dPoms = Math.max(0, pomodorosCompleted - (prev._basePoms || 0));
      const nextByProfile = { ...(prev.byProfile || {}) } as Record<string, { active: 0, brk: 0, poms?: number }>;
      const pp = nextByProfile[profileName] || { active: 0, brk: 0, poms: 0 };
      pp.poms = (pp.poms || 0) + dPoms;
      nextByProfile[profileName] = pp;
      
      store[key] = {
        ...prev,
        poms: (prev.poms || 0) + dPoms,
        byProfile: nextByProfile,
        _basePoms: pomodorosCompleted,
        ts: Date.now(),
      };
      localStorage.setItem(STORAGE.DIARY, JSON.stringify(store));
      
      // Forza il refresh del componente Diary per mostrare i pomodori aggiornati
      window.dispatchEvent(new CustomEvent('diary-updated'));
    } catch {}
  };

  type SessionRecord = {
    id: string;
    dateKey: string;
    profile: string;
    active: number;
    break: number;
    short: number;
    long: number;
    pomodoros: number;
    startedAt: number;
    endedAt: number;
    mode: 'workday' | 'cycles';
  };

  const writeSessionRecord = useCallback((opts?: { includeLastPomodoro?: boolean }) => {
    let totalActive = cumulativeActiveSec;
    let totalBreak = cumulativeBreakSec;
    if (totalActive + totalBreak <= 0) return; // ignore empty sessions
    try {
      const now = Date.now();
      const day = new Date();
      const dateKey = `${day.getFullYear()}-${(day.getMonth()+1).toString().padStart(2,'0')}-${day.getDate().toString().padStart(2,'0')}`;
      const profile = currentProfile;
      const effectivePomodoros = (pomodorosCompleted || 0) + (opts?.includeLastPomodoro ? 1 : 0);

      // Snap totals for Cycles sessions to exact configured durations to avoid off-by-one
      if (runMode === 'cycles' && effectivePomodoros > 0) {
        // Active time is pomodoros * pomodoroDuration
        totalActive = effectivePomodoros * pomodoroDuration;
        // Breaks count is pomodoros - 1 (no trailing break after last pomodoro)
        const breaksCount = Math.max(0, effectivePomodoros - 1);
        let longCount = 0;
        let shortCount = 0;
        if (scheduleType === 'shortOnly') {
          shortCount = breaksCount;
        } else if (scheduleType === 'longOnly') {
          longCount = breaksCount;
        } else {
          for (let n = 1; n <= breaksCount; n++) {
            if (longEvery > 0 && n % longEvery === 0) longCount++; else shortCount++;
          }
        }
        totalBreak = (shortCount * shortBreakDuration) + (longCount * longBreakDuration);
      }
      const rec: SessionRecord = {
        id: `${now}`,
        dateKey,
        profile,
        active: totalActive,
        break: totalBreak,
        short: runMode === 'cycles' ? Math.max(0, Math.min(totalBreak, Math.floor(totalBreak / Math.max(1, shortBreakDuration)) * shortBreakDuration)) : cumulativeShortBreakSec,
        long: runMode === 'cycles' ? (totalBreak - (runMode === 'cycles' ? Math.max(0, Math.min(totalBreak, Math.floor(totalBreak / Math.max(1, shortBreakDuration)) * shortBreakDuration)) : 0)) : cumulativeLongBreakSec,
        pomodoros: Math.max(0, effectivePomodoros),
        startedAt: now - (elapsedWorkdayTime * 1000),
        endedAt: now,
        mode: runMode,
      };
      const raw = localStorage.getItem(STORAGE.SESSIONS);
      const arr = raw ? (JSON.parse(raw) as SessionRecord[]) : [];
      arr.push(rec);
      localStorage.setItem(STORAGE.SESSIONS, JSON.stringify(arr));

      // If logged in, also persist to Firestore (best-effort)
      try {
        if (userId) {
          const cloud = {
            user_id: userId,
            date_key: dateKey,
            profile: profile,
            active: rec.active,
            break: rec.break,
            short: rec.short,
            long: rec.long,
            pomodoros: rec.pomodoros,
            started_at: rec.startedAt,
            ended_at: rec.endedAt,
            mode: rec.mode,
          } as const;
          // Fire-and-forget; do not block UI
          void saveSession(cloud);
        }
      } catch {}
    } catch {}
  }, [cumulativeActiveSec, cumulativeBreakSec, cumulativeShortBreakSec, cumulativeLongBreakSec, pomodorosCompleted, elapsedWorkdayTime, currentProfile, runMode, pomodoroDuration, shortBreakDuration, longBreakDuration, scheduleType, longEvery, userId]);

  // Switch current profile: take a snapshot first to attribute deltas to the previous profile,
  // then update the current profile in storage and state.
  const switchCurrentProfile = useCallback((name: string) => {
    try {
      // Ensure pending deltas are recorded under the previous profile
      writeDiarySnapshot();
    } catch {}
    try {
      localStorage.setItem(STORAGE.CURRENT_PROFILE, name);
    } catch {}
    setCurrentProfile(name);
  }, [writeDiarySnapshot]);

  const getCurrentDuration = () => {
    switch (currentTimerType) {
      case 'pomodoro':
        return pomodoroDuration;
      case 'shortBreak':
        return shortBreakDuration;
      case 'longBreak':
        return longBreakDuration;
      default:
        return pomodoroDuration;
    }
  };

  // Manual sync control
  const handleSyncNow = useCallback(async () => {
    if (!userId) return;
    try {
      const cloud = await fetchLastSessions(userId, 30);
      const raw = localStorage.getItem(STORAGE.SESSIONS);
      const local = raw ? (JSON.parse(raw) as Array<{ id: string; endedAt: number }>) : [];
      const existing = new Set(local.map((s) => s.endedAt));
      const merged = [...local];
      for (const c of cloud) {
        if (!existing.has(c.ended_at)) {
          merged.push({
            id: (c as any).id || String(c.ended_at),
            dateKey: c.date_key,
            profile: c.profile,
            active: c.active,
            break: c.break,
            short: c.short,
            long: c.long,
            pomodoros: c.pomodoros,
            startedAt: c.started_at,
            endedAt: c.ended_at,
            mode: c.mode,
          } as any);
        }
      }
      localStorage.setItem(STORAGE.SESSIONS, JSON.stringify(merged));
      try { window.dispatchEvent(new CustomEvent('diary-updated')); } catch {}
    } catch {}
  }, [userId]);

  const startWorkday = () => {
    // bump session to force fresh timer from settings
    setSessionId((s) => s + 1);
    setIsTimerRunning(true);
    if (hapticsEnabled) vibrateSuccess();
    setHasEverStarted(true);
    setCurrentTimerType('pomodoro');
    setElapsedWorkdayTime(0);
    setCumulativeActiveSec(0);
    setCumulativeBreakSec(0);
    setCumulativeShortBreakSec(0);
    setCumulativeLongBreakSec(0);
    setCumulativePomodoros(0);
    setPomodorosCompleted(0);
    announcePhase('pomodoro');

    // Persist runtime info for catch-up if the app closes
    try {
      const runtime = {
        isRunning: true,
        currentType: 'pomodoro' as const,
        startedAt: Date.now(),
        plannedEndAt: Date.now() + pomodoroDuration * 1000,
        pomodorosCompleted,
        scheduleType,
        longEvery,
        durations: { pomodoroDuration, shortBreakDuration, longBreakDuration },
        runMode,
        targetCycles,
      };
      localStorage.setItem(STORAGE.RUNTIME, JSON.stringify(runtime));
    } catch {}
  };

  const resumeTimer = async () => {
    await resumeAudioContext();
    setIsTimerRunning(true);
    if (hapticsEnabled) vibrateShort();

    // Update runtime persistence
    try {
      const now = Date.now();
      const dur = getCurrentDuration();
      const runtime = {
        isRunning: true,
        currentType: currentTimerType,
        startedAt: now,
        plannedEndAt: now + dur * 1000,
        pomodorosCompleted,
        scheduleType,
        longEvery,
        durations: { pomodoroDuration, shortBreakDuration, longBreakDuration },
        runMode,
        targetCycles,
      };
      localStorage.setItem(STORAGE.RUNTIME, JSON.stringify(runtime));
    } catch {}
  };


  

  // Auto-snapshot diary every 5 minutes to avoid data loss on refresh/close
  useEffect(() => {
    const intervalMs = 5 * 60 * 1000;
    const id = window.setInterval(() => {
      writeDiarySnapshot();
    }, intervalMs);
    return () => clearInterval(id);
  }, [
    cumulativeActiveSec,
    cumulativeBreakSec,
    cumulativeShortBreakSec,
    cumulativeLongBreakSec,
    cumulativePomodoros,
    elapsedWorkdayTime,
  ]);

  // Forza l'aggiornamento del componente Diary ogni secondo quando il timer è in esecuzione
  useEffect(() => {
    let interval: number | null = null;
    if (isTimerRunning) {
      interval = window.setInterval(() => {
        // Forza il refresh del componente Diary per aggiornare i contatori in tempo reale
        window.dispatchEvent(new CustomEvent('diary-updated'));
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isTimerRunning]);

  const handleTimerEnd = useCallback(() => {
    playChimeByName(sound);
    setIsTimerRunning(false);

    // Determine stop condition
    const workdayDone = runMode === 'workday' && elapsedWorkdayTime >= workdayDuration;
    const cyclesDone = runMode === 'cycles' && currentTimerType === 'pomodoro' && (pomodorosCompleted + 1) >= targetCycles;
    if (workdayDone || cyclesDone) {
      // Finalize session: play distinct final chime and reset to defaults
      playFinalChimeByName(sound);
      announceEnd();
      writeDiarySnapshot();
      // Include the last pomodoro that just finished if applicable
      writeSessionRecord({ includeLastPomodoro: currentTimerType === 'pomodoro' });
      // Reset state after short delay to let chime ring without immediate UI changes
      setTimeout(() => {
        setIsTimerRunning(false);
        setCurrentTimerType('pomodoro');
        setElapsedWorkdayTime(0);
        setCumulativeActiveSec(0);
        setCumulativeBreakSec(0);
        setCumulativeShortBreakSec(0);
        setCumulativeLongBreakSec(0);
        setCumulativePomodoros(0);
        setPomodorosCompleted(0);
        setHasEverStarted(false);
        // prepare for a clean new start based on current settings
        setSessionId((s) => s + 1);
      }, 100);
      return;
    }

    // Logic to move to the next phase
    if (currentTimerType === 'pomodoro') {
      const nextCompleted = pomodorosCompleted + 1;
      setPomodorosCompleted(nextCompleted);
      setCumulativePomodoros((c) => c + 1);
      
      // Update only pomodoros in the Diary immediately when a pomodoro ends
      updatePomodorosOnly();
      
      if (scheduleType === 'shortOnly') {
        setCurrentTimerType('shortBreak');
        announcePhase('shortBreak');
      } else if (scheduleType === 'longOnly') {
        setCurrentTimerType('longBreak');
        announcePhase('longBreak');
      } else {
        if (nextCompleted % longEvery === 0) {
          setCurrentTimerType('longBreak');
          announcePhase('longBreak');
        } else {
          setCurrentTimerType('shortBreak');
          announcePhase('shortBreak');
        }
      }
    } else {
      // After a break, always go back to pomodoro
      setCurrentTimerType('pomodoro');
      announcePhase('pomodoro');
    }
    // Defer auto-start to a dedicated effect to avoid race conditions
    setPendingAutoStart(true);

    // Update runtime persistence for the upcoming segment will be done in the auto-start effect.
    try { localStorage.removeItem(STORAGE.RUNTIME); } catch {}
  }, [currentTimerType, elapsedWorkdayTime, workdayDuration, pomodorosCompleted, longEvery, runMode, targetCycles, sound]);

  const handleReset = () => {
    writeDiarySnapshot();
    writeSessionRecord();
    setIsTimerRunning(false);
    setCurrentTimerType('pomodoro');
    setElapsedWorkdayTime(0);
    setCumulativeActiveSec(0);
    setCumulativeBreakSec(0);
    setCumulativeShortBreakSec(0);
    setCumulativeLongBreakSec(0);
    setCumulativePomodoros(0);
    setPomodorosCompleted(0);
    setHasEverStarted(false);
    setSessionId((s) => s + 1);
    try { localStorage.removeItem(STORAGE.RUNTIME); } catch {}
  };

  useEffect(() => {
    let interval: number | null = null;
    const tick = () => processDelta();
    if (isTimerRunning) {
      lastTickRef.current = Date.now();
      interval = window.setInterval(tick, 1000);
    } else {
      lastTickRef.current = null;
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isTimerRunning, currentTimerType, processDelta]);

  // Catch up immediately when the tab becomes visible or window gains focus
  useEffect(() => {
    const handleVisibilityOrFocus = () => processDelta();
    document.addEventListener('visibilitychange', handleVisibilityOrFocus);
    window.addEventListener('focus', handleVisibilityOrFocus);
    window.addEventListener('pageshow', handleVisibilityOrFocus);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
      window.removeEventListener('focus', handleVisibilityOrFocus);
      window.removeEventListener('pageshow', handleVisibilityOrFocus);
    };
  }, [processDelta]);

  // Load saved theme at startup
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE.THEME);
      if (saved && ALLOWED_THEMES.includes(saved as any)) {
        setTheme(saved as any);
      }
    } catch {
      // ignore storage errors (e.g., privacy mode)
    }
  }, []);

  // Persist theme on change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE.THEME, theme);
    } catch {
      // ignore storage errors
    }
  }, [theme]);
  // Persist sound selection
  useEffect(() => {
    try { localStorage.setItem(STORAGE.SOUND, sound); } catch {}
  }, [sound]);

  // Load haptics preference
  useEffect(() => {
    try {
      const v = localStorage.getItem(STORAGE.HAPTICS);
      if (v === '0' || v === 'false') setHapticsEnabled(false);
      if (v === '1' || v === 'true') setHapticsEnabled(true);
    } catch {}
  }, []);

  // Persist haptics preference
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE.HAPTICS, hapticsEnabled ? '1' : '0');
    } catch {}
  }, [hapticsEnabled]);

  // Load saved timer settings at startup
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE.SETTINGS);
      if (!raw) return;
      const s = JSON.parse(raw) as Partial<{
        pomodoro: number;
        shortBreak: number;
        longBreak: number;
        workday: number;
        longEvery: number;
        mode: 'workday' | 'cycles';
        targetCycles: number;
        scheduleType: 'standard' | 'shortOnly' | 'longOnly';
      }>;
      if (typeof s.pomodoro === 'number' && s.pomodoro >= 0) setPomodoroDuration(s.pomodoro);
      if (typeof s.shortBreak === 'number' && s.shortBreak >= 0) setShortBreakDuration(s.shortBreak);
      if (typeof s.longBreak === 'number' && s.longBreak >= 0) setLongBreakDuration(s.longBreak);
      if (typeof s.workday === 'number' && s.workday >= 0) setWorkdayDuration(s.workday);
      if (typeof s.longEvery === 'number' && s.longEvery >= 2) setLongEvery(s.longEvery);
      if (s.mode === 'workday' || s.mode === 'cycles') setRunMode(s.mode);
      if (s.scheduleType === 'standard' || s.scheduleType === 'shortOnly' || s.scheduleType === 'longOnly') setScheduleType(s.scheduleType);
      if (typeof s.targetCycles === 'number' && s.targetCycles >= 1) setTargetCycles(s.targetCycles);
    } catch {
      // ignore parse/storage errors
    }
  }, []);

  // Persist timer settings whenever they change
  useEffect(() => {
    try {
      const data = {
        pomodoro: pomodoroDuration,
        shortBreak: shortBreakDuration,
        longBreak: longBreakDuration,
        workday: workdayDuration,
        longEvery: longEvery,
        mode: runMode,
        scheduleType: scheduleType,
        targetCycles: targetCycles,
      };
      localStorage.setItem(STORAGE.SETTINGS, JSON.stringify(data));
    } catch {
      // ignore storage errors
    }
  }, [pomodoroDuration, shortBreakDuration, longBreakDuration, workdayDuration, longEvery, runMode, scheduleType, targetCycles]);

  // Load cumulative counters at startup
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE.CUMULATIVE);
      if (!raw) return;
      const v = JSON.parse(raw) as Partial<{ active: number; brk: number; short: number; long: number; poms: number; elapsed: number }>;
      if (typeof v.active === 'number' && v.active >= 0) setCumulativeActiveSec(v.active);
      if (typeof v.brk === 'number' && v.brk >= 0) setCumulativeBreakSec(v.brk);
      if (typeof v.short === 'number' && v.short >= 0) setCumulativeShortBreakSec(v.short);
      if (typeof v.long === 'number' && v.long >= 0) setCumulativeLongBreakSec(v.long);
      if (typeof v.poms === 'number' && v.poms >= 0) setCumulativePomodoros(v.poms);
      if (typeof v.elapsed === 'number' && v.elapsed >= 0) setElapsedWorkdayTime(v.elapsed);
    } catch {
      // ignore
    }
  }, []);

  // On mount, attempt to catch up a possibly running segment from persisted runtime info
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE.RUNTIME);
      if (!raw) return;
      const rt = JSON.parse(raw) as {
        isRunning: boolean;
        currentType: 'pomodoro' | 'shortBreak' | 'longBreak';
        startedAt: number;
        plannedEndAt: number;
        pomodorosCompleted: number;
      };
      if (!rt.isRunning) return;

      const now = Date.now();
      // Fast-forward counters if needed
      const elapsedSinceStart = Math.max(0, Math.floor((now - rt.startedAt) / 1000));
      if (elapsedSinceStart > 0) {
        if (rt.currentType === 'pomodoro') {
          setCumulativeActiveSec((a) => a + elapsedSinceStart);
        } else {
          setCumulativeBreakSec((b) => b + elapsedSinceStart);
          if (rt.currentType === 'shortBreak') setCumulativeShortBreakSec((s) => s + elapsedSinceStart);
          if (rt.currentType === 'longBreak') setCumulativeLongBreakSec((l) => l + elapsedSinceStart);
        }
        setElapsedWorkdayTime((e) => e + elapsedSinceStart);
      }

      if (now >= rt.plannedEndAt) {
        // The segment should have finished while closed; trigger the normal completion logic
        setCurrentTimerType(rt.currentType);
        setIsTimerRunning(true);
        setTimeout(() => {
          setIsTimerRunning(false);
          handleTimerEnd();
        }, 0);
      } else {
        // Resume the current segment with remaining time
        setCurrentTimerType(rt.currentType);
        setIsTimerRunning(true);
      }
    } catch {}
  }, []);

  // Persist cumulative counters on change
  useEffect(() => {
    try {
      const data = { active: cumulativeActiveSec, brk: cumulativeBreakSec, short: cumulativeShortBreakSec, long: cumulativeLongBreakSec, poms: cumulativePomodoros, elapsed: elapsedWorkdayTime };
      localStorage.setItem(STORAGE.CUMULATIVE, JSON.stringify(data));
    } catch {
      // ignore
    }
  }, [cumulativeActiveSec, cumulativeBreakSec, cumulativeShortBreakSec, cumulativeLongBreakSec, cumulativePomodoros, elapsedWorkdayTime]);

  // Rollover to diary at midnight
  useEffect(() => {
    const writeDiary = () => {
      try {
        // Commit deltas up to midnight
        writeDiarySnapshot();
      } catch {}
    };
    // schedule next midnight
    const ms = nextMidnightDelayMs();
    const t = window.setTimeout(() => {
      writeDiary();
      // reset counters for new day
      setCumulativeActiveSec(0);
      setCumulativeBreakSec(0);
      setElapsedWorkdayTime(0);
    }, ms);
    return () => clearTimeout(t);
  }, [cumulativeActiveSec, cumulativeBreakSec, elapsedWorkdayTime]);

  // Auto-start the next segment after type changes and ensure session reset
  useEffect(() => {
    if (pendingAutoStart) {
      // bump session to ensure Timer resets target timestamp for new segment
      setSessionId((s) => s + 1);
      setIsTimerRunning(true);
      setPendingAutoStart(false);

      // Refresh runtime persistence for the new segment
      try {
        const now = Date.now();
        const dur = getCurrentDuration();
        const runtime = {
          isRunning: true,
          currentType: currentTimerType,
          startedAt: now,
          plannedEndAt: now + dur * 1000,
          pomodorosCompleted,
          scheduleType,
          longEvery,
          durations: { pomodoroDuration, shortBreakDuration, longBreakDuration },
          runMode,
          targetCycles,
        };
        localStorage.setItem(STORAGE.RUNTIME, JSON.stringify(runtime));
      } catch {}
    }
  }, [pendingAutoStart, currentTimerType]);

  const isLight = theme === 'gold';
  const sectionTextClass = isLight ? 'text-gray-700' : 'text-gray-300';
  const accentTextClass = isLight ? 'text-amber-600' : 'text-blue-400';
  const palette = THEMES[theme];

  return (
    <WatchFace theme={theme} onThemeChange={setTheme}>
      {/* Settings view */}
      <div className={`${showSettings ? '' : 'hidden'} h-full overflow-auto pr-1`}>
        <TimerSettings
          pomodoroDuration={pomodoroDuration}
          shortBreakDuration={shortBreakDuration}
          longBreakDuration={longBreakDuration}
          workdayDuration={workdayDuration}
          longBreakEvery={longEvery}
          mode={runMode}
          targetCycles={targetCycles}
          theme={theme}
          hapticsEnabled={hapticsEnabled}
          onToggleHaptics={setHapticsEnabled}
          scheduleType={scheduleType}
          onSettingsChange={handleSettingsChange}
          onProfileApplied={(name) => switchCurrentProfile(name)}
          onProfileSaved={(name) => switchCurrentProfile(name)}
          sound={sound}
          onSoundChange={(s)=> setSound && setSound(s)}
        />
        <div className="mt-3 text-right">
          <button
            className={`${theme==='gold' ? 'bg-amber-500 hover:bg-amber-600 text-black' : 'bg-gray-700 hover:bg-gray-600 text-white'} text-xs font-semibold py-1.5 px-3 rounded`}
            onClick={() => setShowSettings(false)}
          >Close</button>
        </div>
      </div>

      {/* Diary view */}
      <div className={`${showDiary ? '' : 'hidden'} flex flex-col h-full`}>
        <div className="mb-2 text-right">
          <button
            className={`${theme==='gold' ? 'bg-amber-400 hover:bg-amber-500 text-black' : 'bg-purple-600 hover:bg-purple-700 text-white'} text-xs font-semibold py-1.5 px-3 rounded`}
            onClick={() => { try { writeDiarySnapshot(); } catch {} setShowDiary(false); }}
          >Close Diary</button>
        </div>
        <div className="flex-1 min-h-0">
          <Diary theme={theme} currentActive={cumulativeActiveSec} currentBreak={cumulativeBreakSec} currentElapsed={elapsedWorkdayTime} currentPoms={cumulativePomodoros} currentProfile={currentProfile} />
        </div>
      </div>

      {/* Main view with Timer (kept mounted; hidden when settings/diary open) */}
      <div className={`${showSettings || showDiary ? 'hidden' : ''} flex flex-col h-full`}>
        <div className="text-center mb-2">
          <p className={`text-xl font-bold ${accentTextClass}`}>Activity in Progress</p>
          <p className={`text-xs mt-1 ${sectionTextClass}`}><span className="font-semibold">{currentProfile}</span></p>
        </div>

        <div className="flex-1 flex items-center justify-center">
          <Timer
            duration={getCurrentDuration()}
            isRunning={isTimerRunning}
            onTimerEnd={handleTimerEnd}
            theme={theme}
            accentHex={palette.accent}
            glowHex={palette.glow ?? palette.accent}
            sessionId={sessionId}
          />
        </div>
        <div className="mt-auto">
          <div className="grid grid-flow-col auto-cols-fr gap-2">
            {!isTimerRunning && !hasEverStarted && (
              <button
                className={`${theme==='gold' ? 'bg-amber-500 hover:bg-amber-600 text-black' : 'bg-blue-600 hover:bg-blue-700 text-white'} font-bold py-2 rounded focus:outline-none focus:ring-2 focus:ring-offset-2 ${theme==='gold' ? 'focus:ring-amber-400 focus:ring-offset-gray-200' : 'focus:ring-blue-400 focus:ring-offset-gray-900'}`}
                onClick={async () => { await resumeAudioContext(); startWorkday(); }}
              >Start</button>
            )}
            {isTimerRunning && (
              <button
                className={`${theme==='gold' ? 'bg-amber-700 hover:bg-amber-800 text-black' : 'bg-red-600 hover:bg-red-700 text-white'} font-bold py-2 rounded focus:outline-none focus:ring-2 focus:ring-offset-2 ${theme==='gold' ? 'focus:ring-amber-400 focus:ring-offset-gray-200' : 'focus:ring-blue-400 focus:ring-offset-gray-900'}`}
                onClick={() => { if (hapticsEnabled) vibrateWarning(); setIsTimerRunning(false); }}
              >Pause</button>
            )}
            {!isTimerRunning && hasEverStarted && (
              <button
                className={`${theme==='gold' ? 'bg-amber-500 hover:bg-amber-600 text-black' : 'bg-blue-600 hover:bg-blue-700 text-white'} font-bold py-2 rounded focus:outline-none focus:ring-2 focus:ring-offset-2 ${theme==='gold' ? 'focus:ring-amber-400 focus:ring-offset-gray-200' : 'focus:ring-blue-400 focus:ring-offset-gray-900'}`}
                onClick={() => { if (hapticsEnabled) vibrateShort(); resumeTimer(); }}
              >Resume</button>
            )}
            <button
              className={`${theme==='gold' ? 'bg-yellow-700 hover:bg-yellow-800 text-black' : 'bg-gray-600 hover:bg-gray-700 text-white'} font-bold py-2 rounded focus:outline-none focus:ring-2 focus:ring-offset-2 ${theme==='gold' ? 'focus:ring-amber-400 focus:ring-offset-gray-200' : 'focus:ring-blue-400 focus:ring-offset-gray-900'}`}
              onClick={() => { if (hapticsEnabled) vibrateWarning(); handleReset(); }}
            >Reset</button>
            <button
              className={`${theme==='gold' ? 'bg-amber-400 hover:bg-amber-500 text-black' : 'bg-purple-600 hover:bg-purple-700 text-white'} font-bold py-2 rounded focus:outline-none focus:ring-2 focus:ring-offset-2 ${theme==='gold' ? 'focus:ring-amber-400 focus:ring-offset-gray-200' : 'focus:ring-blue-400 focus:ring-offset-gray-900'}`}
              onClick={() => { if (hapticsEnabled) vibrateShort(); setShowSettings(true); }}
            >Set</button>
            <button
              className={`${theme==='gold' ? 'bg-amber-300 hover:bg-amber-400 text-black' : 'bg-teal-600 hover:bg-teal-700 text-white'} font-bold py-2 rounded focus:outline-none focus:ring-2 focus:ring-offset-2 ${theme==='gold' ? 'focus:ring-amber-400 focus:ring-offset-gray-200' : 'focus:ring-blue-400 focus:ring-offset-gray-900'}`}
              onClick={() => { try { writeDiarySnapshot(); } catch {} setShowDiary(true); }}
            >Diary</button>
            {userId && (
              <button
                className={`${theme==='gold' ? 'bg-emerald-500 hover:bg-emerald-600 text-black' : 'bg-emerald-600 hover:bg-emerald-700 text-white'} font-bold py-2 rounded focus:outline-none focus:ring-2 focus:ring-offset-2 ${theme==='gold' ? 'focus:ring-amber-400 focus:ring-offset-gray-200' : 'focus:ring-blue-400 focus:ring-offset-gray-900'}`}
                onClick={handleSyncNow}
              >Sync now</button>
            )}
            {!userId ? (
              <button
                className={`${theme==='gold' ? 'bg-gray-900 hover:bg-black text-white' : 'bg-gray-800 hover:bg-gray-700 text-white'} font-bold py-2 rounded focus:outline-none focus:ring-2 focus:ring-offset-2 ${theme==='gold' ? 'focus:ring-amber-400 focus:ring-offset-gray-200' : 'focus:ring-blue-400 focus:ring-offset-gray-900'}`}
                onClick={async () => { try { await signInWithGoogle(); } catch {} }}
              >Sign in with Google</button>
            ) : (
              <button
                className={`${theme==='gold' ? 'bg-gray-200 hover:bg-gray-300 text-black' : 'bg-gray-700 hover:bg-gray-600 text-white'} font-bold py-2 rounded focus:outline-none focus:ring-2 focus:ring-offset-2 ${theme==='gold' ? 'focus:ring-amber-400 focus:ring-offset-gray-200' : 'focus:ring-blue-400 focus:ring-offset-gray-900'}`}
                onClick={async () => { try { await logout(); setUserId(null); } catch {} }}
              >Logout</button>
            )}
          </div>
          <div className="mt-3 grid grid-cols-1 gap-3 text-xs">
            <WorkdayProgress
              totalWorkdayDuration={workdayDuration}
              elapsedWorkdayTime={elapsedWorkdayTime}
              mode={runMode}
              targetCycles={targetCycles}
              pomodorosCompleted={pomodorosCompleted}
              theme={theme}
              cumulativeActiveSec={cumulativeActiveSec}
              cumulativeBreakSec={cumulativeBreakSec}
            />
            <SchedulePreview
              currentType={currentTimerType}
              pomodoroSeconds={pomodoroDuration}
              shortBreakSeconds={shortBreakDuration}
              longBreakSeconds={longBreakDuration}
              longEvery={longEvery}
              remainingPomodoros={runMode==='cycles' ? (targetCycles - pomodorosCompleted) : null}
              totalSecondsLeft={runMode==='workday' ? (workdayDuration - elapsedWorkdayTime) : null}
              theme={theme}
              scheduleType={scheduleType}
              pomodorosCompleted={pomodorosCompleted}
            />
          </div>
        </div>
      </div>
    </WatchFace>
  );
}

export default App;
