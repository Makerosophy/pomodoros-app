import React, { useEffect, useState } from 'react';
import { resumeAudioContext, playChimeByName, type SoundName } from '../utils/audio';

interface TimerSettingsProps {
  pomodoroDuration: number;
  shortBreakDuration: number;
  longBreakDuration: number;
  workdayDuration: number;
  longBreakEvery?: number;
  mode?: 'workday' | 'cycles';
  targetCycles?: number;
  theme?: 'blue' | 'gold' | 'neo' | 'cosmic' | 'glass' | 'chrono';
  hapticsEnabled?: boolean;
  onToggleHaptics?: (enabled: boolean) => void;
  scheduleType?: 'standard' | 'shortOnly' | 'longOnly';
  onSettingsChange: (settings: {
    pomodoro: number;
    shortBreak: number;
    longBreak: number;
    workday: number;
    longEvery: number;
    mode: 'workday' | 'cycles';
    targetCycles: number;
    scheduleType: 'standard' | 'shortOnly' | 'longOnly';
  }) => void;
  onProfileApplied?: (name: string) => void;
  onProfileSaved?: (name: string) => void;
  sound?: SoundName;
  onSoundChange?: (s: SoundName) => void;
}

const TimerSettings: React.FC<TimerSettingsProps> = ({
  pomodoroDuration,
  shortBreakDuration,
  longBreakDuration,
  workdayDuration,
  longBreakEvery = 4,
  mode = 'workday',
  targetCycles = 8,
  theme = 'blue',
  hapticsEnabled = true,
  onToggleHaptics,
  scheduleType = 'standard',
  onSettingsChange,
  onProfileApplied,
  onProfileSaved,
  sound = 'chime',
  onSoundChange,
}) => {
  const [pomodoro, setPomodoro] = useState(pomodoroDuration);
  const [shortBreak, setShortBreak] = useState(shortBreakDuration);
  const [longBreak, setLongBreak] = useState(longBreakDuration);
  const [workday, setWorkday] = useState(workdayDuration);
  const [longEvery, setLongEvery] = useState(longBreakEvery);
  const [runMode, setRunMode] = useState<'workday' | 'cycles'>(mode);
  const [cycles, setCycles] = useState<number>(targetCycles);
  const [schedType, setSchedType] = useState<'standard' | 'shortOnly' | 'longOnly'>(scheduleType);
  const [profiles, setProfiles] = useState<Record<string, {
    pomodoro: number;
    shortBreak: number;
    longBreak: number;
    workday: number;
    longEvery: number;
    mode: 'workday' | 'cycles';
    targetCycles: number;
    scheduleType: 'standard' | 'shortOnly' | 'longOnly';
  }>>({});
  const [profileName, setProfileName] = useState<string>('');
  const [selectedProfile, setSelectedProfile] = useState<string>('');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('tempo_profiles');
      if (raw) {
        const obj = JSON.parse(raw) as Record<string, any>;
        setProfiles(obj || {});
      }
    } catch {
      // ignore
    }
  }, []);

  // Traccia le modifiche e salva automaticamente
  useEffect(() => {
    if (selectedProfile && profiles[selectedProfile]) {
      const currentProfile = profiles[selectedProfile];
      const hasChanges = 
        currentProfile.pomodoro !== pomodoro ||
        currentProfile.shortBreak !== shortBreak ||
        currentProfile.longBreak !== longBreak ||
        currentProfile.workday !== workday ||
        currentProfile.longEvery !== longEvery ||
        currentProfile.mode !== runMode ||
        currentProfile.targetCycles !== cycles ||
        currentProfile.scheduleType !== schedType;
      
      setHasUnsavedChanges(hasChanges);
      
      // Salva automaticamente dopo 2 secondi di inattività
      if (hasChanges) {
        const timeoutId = setTimeout(autoSaveProfile, 2000);
        return () => clearTimeout(timeoutId);
      }
    }
  }, [pomodoro, shortBreak, longBreak, workday, longEvery, runMode, cycles, schedType, selectedProfile, profiles]);

  const persistProfiles = (next: typeof profiles) => {
    setProfiles(next);
    try {
      localStorage.setItem('tempo_profiles', JSON.stringify(next));
    } catch {
      // ignore
    }
  };

  // Funzione per salvare automaticamente le modifiche al profilo corrente
  const autoSaveProfile = () => {
    if (selectedProfile && profiles[selectedProfile] && hasUnsavedChanges) {
      const updatedProfile = {
        pomodoro,
        shortBreak,
        longBreak,
        workday,
        longEvery,
        mode: runMode,
        targetCycles: cycles,
        scheduleType: schedType,
      };
      
      const updatedProfiles = { ...profiles, [selectedProfile]: updatedProfile };
      persistProfiles(updatedProfiles);
      setHasUnsavedChanges(false);
      
      // Notifica che il profilo è stato aggiornato
      if (onProfileSaved) onProfileSaved(selectedProfile);
    }
  };

  const saveCurrentAsProfile = () => {
    const name = profileName.trim();
    if (!name) return;
    const data = {
      pomodoro,
      shortBreak,
      longBreak,
      workday,
      longEvery,
      mode: runMode,
      targetCycles: cycles,
      scheduleType: schedType,
    } as const;
    persistProfiles({ ...profiles, [name]: data });
    setProfileName('');
    if (onProfileSaved) onProfileSaved(name);
  };

  const applyProfileToForm = (name: string) => {
    const p = profiles[name];
    if (!p) return;
    setPomodoro(p.pomodoro);
    setShortBreak(p.shortBreak);
    setLongBreak(p.longBreak);
    setWorkday(p.workday);
    setLongEvery(p.longEvery);
    setRunMode(p.mode);
    setCycles(p.targetCycles);
    setSchedType(p.scheduleType);
    setSelectedProfile(name); // Imposta il profilo selezionato
    if (onProfileApplied) onProfileApplied(name);
  };

  const deleteProfile = (name: string) => {
    const next = { ...profiles };
    delete next[name];
    persistProfiles(next);
  };

  const renameProfile = (name: string) => {
    const p = profiles[name];
    if (!p) return;
    const nextName = prompt('Nuovo nome profilo', name)?.trim();
    if (!nextName || nextName === name) return;
    const next = { ...profiles } as Record<string, typeof p>;
    delete next[name];
    next[nextName] = p;
    persistProfiles(next);
  };

  const isLight = theme === 'gold';
  const labelTextClass = isLight ? 'text-gray-800' : 'text-gray-300';
  const helpTextClass = isLight ? 'text-gray-600' : 'text-gray-400';
  const fieldClass = isLight
    ? 'bg-white border border-gray-300 text-gray-900 focus:border-amber-500 focus:ring-amber-500'
    : 'bg-gray-700 border-transparent text-white focus:border-blue-500 focus:ring-blue-500';
  const segActive = isLight ? 'bg-amber-500 text-black' : 'bg-blue-600 text-white';
  const segInactive = isLight ? 'bg-gray-200 text-gray-900' : 'bg-gray-600 text-gray-100';
  const smallBtn = isLight ? 'bg-gray-200 text-gray-900 hover:bg-gray-300' : 'bg-gray-600 text-gray-100 hover:bg-gray-500';
  const cardClass = isLight ? 'bg-white/70 border-gray-300' : 'bg-black/30 border-gray-700';
  const soundOptions: SoundName[] = ['chime','beep','bell','digital'];

  // removed unused changeBy in favor of press-and-hold controls

  const presets = [15 * 60, 20 * 60, 25 * 60];
  const holdRef = React.useRef<number | null>(null);
  const accelRef = React.useRef<number>(1);

  const startHold = (e: React.MouseEvent | React.TouchEvent, stepFn: () => void) => {
    e.preventDefault();
    if (holdRef.current) return;
    accelRef.current = 1;
    const tick = () => {
      stepFn();
      const speed = Math.max(30, 200 - accelRef.current * 20); // accelerate up to ~30ms
      accelRef.current = Math.min(accelRef.current + 1, 8);
      holdRef.current = window.setTimeout(tick, speed);
    };
    tick();
  };

  const stopHold = () => {
    if (holdRef.current) {
      clearTimeout(holdRef.current);
      holdRef.current = null;
    }
    accelRef.current = 1;
  };

  type DurationPickerProps = {
    label: string;
    seconds: number;
    onChange: (sec: number) => void;
    theme: 'blue' | 'gold' | 'neo' | 'cosmic' | 'glass' | 'chrono';
    min: number;
    max: number;
    step: number;
    presets?: number[];
  };

  function formatDurationLabel(totalSeconds: number): string {
    if (totalSeconds >= 3600) {
      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      return `${hours}h ${minutes.toString().padStart(2, '0')}m`;
    }
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}m ${seconds.toString().padStart(2, '0')}s`;
  }

  const DurationPicker: React.FC<DurationPickerProps> = ({ label, seconds, onChange, theme, min, max, step, presets }) => {
    const isLight2 = theme === 'gold';
    const labelTextClass2 = isLight2 ? 'text-gray-800' : 'text-gray-300';
    const helpTextClass2 = isLight2 ? 'text-gray-600' : 'text-gray-400';
    const sliderTrack = isLight2 ? 'bg-gray-200' : 'bg-gray-700';
    const chipBtn = isLight2 ? 'bg-gray-200 text-gray-900 hover:bg-gray-300' : 'bg-gray-600 text-gray-100 hover:bg-gray-500';

    const clamp = (n: number) => Math.max(min, Math.min(max, n));

    const toHms = (total: number) => {
      const h = Math.floor(total / 3600);
      const m = Math.floor((total % 3600) / 60);
      const s = total % 60;
      return { h, m, s };
    };
    const formatHms = (total: number) => {
      const { h, m, s } = toHms(total);
      if (h > 0) return `${h}:${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}`;
      return `${m}:${s.toString().padStart(2,'0')}`;
    };
    const parseHms = (txt: string): number | null => {
      const t = txt.trim();
      if (!t) return null;
      const parts = t.split(':').map(p => p.trim());
      if (parts.some(p => p === '' || /[^0-9]/.test(p))) return null;
      let h = 0, m = 0, s = 0;
      if (parts.length === 1) { s = Number(parts[0]); }
      if (parts.length === 2) { m = Number(parts[0]); s = Number(parts[1]); }
      if (parts.length === 3) { h = Number(parts[0]); m = Number(parts[1]); s = Number(parts[2]); }
      if (parts.length < 1 || parts.length > 3) return null;
      if (m > 59 || s > 59) return null;
      return h * 3600 + m * 60 + s;
    };

    const [text, setText] = React.useState<string>(formatHms(seconds));
    React.useEffect(() => { setText(formatHms(seconds)); }, [seconds]);

    const commitText = () => {
      const v = parseHms(text);
      if (v == null) return;
      onChange(clamp(v));
    };

    return (
      <div>
        <label className={`block text-sm font-medium ${labelTextClass2}`}>{label}</label>
        <div className={`mt-1 text-xs ${helpTextClass2}`}>{formatDurationLabel(seconds)}</div>
        <div className="mt-2">
          <input
            type="range"
            min={min}
            max={max}
            step={step}
            value={seconds}
            onChange={(e) => onChange(clamp(Number(e.target.value)))}
            className={`w-full h-2 ${sliderTrack} rounded-lg appearance-none cursor-pointer`}
          />
        </div>
        <div className="mt-2 grid gap-2">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 w-full">
            <button
              className={`px-2 py-1 rounded ${chipBtn} w-full`}
              onClick={() => onChange(clamp(seconds - step))}
            >-{step >= 3600 ? Math.round(step / 3600) + 'h' : Math.max(1, Math.round(step / 60)) + 'm'}</button>
            <button
              className={`px-2 py-1 rounded ${chipBtn} w-full`}
              onClick={() => onChange(clamp(seconds + step))}
            >+{step >= 3600 ? Math.round(step / 3600) + 'h' : Math.max(1, Math.round(step / 60)) + 'm'}</button>
            <button
              className={`px-2 py-1 rounded ${chipBtn} w-full`}
              onClick={() => onChange(clamp(seconds - 1))}
            >-1s</button>
            <button
              className={`px-2 py-1 rounded ${chipBtn} w-full`}
              onClick={() => onChange(clamp(seconds + 1))}
            >+1s</button>
          </div>
          <div className="grid grid-cols-1 w-full">
            <input
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              onBlur={commitText}
              onKeyDown={(e) => { if (e.key === 'Enter') commitText(); }}
              placeholder="mm:ss o hh:mm:ss"
              className={`px-2 py-1 rounded text-sm ${chipBtn} w-full text-right`}
            />
          </div>
          {presets && presets.length > 0 && (
            <div className="grid grid-cols-3 gap-2 w-full">
              {presets.map((p) => (
                <button
                  key={p}
                  className={`px-2 py-1 rounded text-xs ${chipBtn} w-full text-center`}
                  onClick={() => onChange(clamp(p))}
                >{formatDurationLabel(p)}</button>
              ))}
            </div>
          )}
        </div>
        <style>{`
          input[type=range]::-webkit-slider-thumb { -webkit-appearance: none; appearance: none; height: 14px; width: 14px; border-radius: 9999px; background: ${isLight2 ? '#F59E0B' : '#2563EB'}; }
          input[type=range]::-moz-range-thumb { height: 14px; width: 14px; border-radius: 9999px; background: ${isLight2 ? '#F59E0B' : '#2563EB'}; border: none; }
        `}</style>
      </div>
    );
  };

  const defaults = {
    pomodoro: 25 * 60,
    shortBreak: 5 * 60,
    longBreak: 15 * 60,
    workday: 8 * 3600,
    longEvery: 4,
    mode: 'workday' as 'workday' | 'cycles',
    cycles: 8,
  };

  const handleResetDefaults = () => {
    setPomodoro(defaults.pomodoro);
    setShortBreak(defaults.shortBreak);
    setLongBreak(defaults.longBreak);
    setWorkday(defaults.workday);
    setLongEvery(defaults.longEvery);
    setRunMode(defaults.mode);
    setCycles(defaults.cycles);
  };

  const handleChange = () => {
    // Applica le impostazioni
    onSettingsChange({
      pomodoro: pomodoro,
      shortBreak: shortBreak,
      longBreak: longBreak,
      workday: workday,
      longEvery: longEvery,
      mode: runMode,
      targetCycles: cycles,
      scheduleType: schedType,
    });
    
    // Forza il salvataggio immediato se ci sono modifiche non salvate
    if (hasUnsavedChanges) {
      autoSaveProfile();
    }
  };

  return (
    <div className="grid [grid-template-columns:repeat(auto-fit,minmax(260px,1fr))] gap-3 mb-4">
      <div className="col-span-full">
        <div className={`border rounded p-3 ${cardClass}`}>
          <span className={`block text-sm font-medium mb-2 ${labelTextClass}`}>Modalità</span>
          <div className="inline-grid grid-cols-2 rounded-md overflow-hidden focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-400">
            <button
              className={`px-3 py-1 text-sm ${runMode==='workday' ? segActive : segInactive}`}
              onClick={() => setRunMode('workday')}
            >Giornata</button>
            <button
              className={`px-3 py-1 text-sm ${runMode==='cycles' ? segActive : segInactive}`}
              onClick={() => setRunMode('cycles')}
            >Cicli</button>
          </div>
          <p className={`mt-2 text-xs ${helpTextClass}`}>{runMode==='workday' ? 'Imposta durata totale della giornata' : 'Imposta numero di cicli pomodoro'}</p>
        </div>
      </div>
      {Object.keys(profiles).length > 0 && (
        <div className="col-span-full">
          <div className={`border rounded p-3 ${cardClass}`}>
            <span className={`block text-sm font-medium mb-2 ${labelTextClass}`}>Carica profilo rapido</span>
            <div className="flex gap-2 items-center">
              <select
                value={selectedProfile}
                onChange={(e) => setSelectedProfile(e.target.value)}
                className={`flex-1 rounded-md px-3 py-1.5 ${fieldClass}`}
              >
                <option value="" disabled>Seleziona un profilo…</option>
                {Object.keys(profiles).sort().map((name) => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
              <button
                className={`${isLight ? 'bg-gray-200 text-gray-900 hover:bg-gray-300' : 'bg-gray-600 text-white hover:bg-gray-500'} text-sm font-semibold py-1.5 px-3 rounded`}
                onClick={() => selectedProfile && applyProfileToForm(selectedProfile)}
              >Carica</button>
              {hasUnsavedChanges && selectedProfile && (
                <span className={`text-xs px-2 py-1 rounded ${isLight ? 'bg-amber-100 text-amber-800' : 'bg-amber-900 text-amber-200'}`}>
                  Modifiche non salvate
                </span>
              )}
            </div>
          </div>
        </div>
      )}
      <div className="col-span-full">
        <div className={`border rounded p-3 ${cardClass}`}>
          <span className={`block text-sm font-medium mb-2 ${labelTextClass}`}>Schema pause</span>
          <div className="inline-grid grid-cols-3 rounded-md overflow-hidden">
            <button className={`px-3 py-1 text-sm ${schedType==='standard' ? segActive : segInactive}`} onClick={() => setSchedType('standard')}>Standard</button>
            <button className={`px-3 py-1 text-sm ${schedType==='shortOnly' ? segActive : segInactive}`} onClick={() => setSchedType('shortOnly')}>Solo brevi</button>
            <button className={`px-3 py-1 text-sm ${schedType==='longOnly' ? segActive : segInactive}`} onClick={() => setSchedType('longOnly')}>Solo lunghe</button>
          </div>
          <p className={`mt-2 text-xs ${helpTextClass}`}>Scegli come distribuire le pause tra i pomodori</p>
        </div>
      </div>

      <div className="col-span-full">
        <div className={`border rounded p-3 ${cardClass}`}>
          <span className={`block text-sm font-medium mb-2 ${labelTextClass}`}>Suono timer</span>
          <div className="flex items-center gap-2">
            <select
              value={sound}
              onChange={(e) => onSoundChange && onSoundChange(e.target.value as SoundName)}
              className={`flex-1 rounded-md px-3 py-1.5 ${fieldClass}`}
            >
              {soundOptions.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <button
              className={`${isLight ? 'bg-gray-200 text-gray-900 hover:bg-gray-300' : 'bg-gray-600 text-white hover:bg-gray-500'} text-sm font-semibold py-1.5 px-3 rounded`}
              onClick={async () => { await resumeAudioContext(); if (onSoundChange) { /* preview current */ } await playChimeByName(sound); }}
            >Prova</button>
          </div>
          <p className={`mt-2 text-xs ${helpTextClass}`}>Seleziona un suono. La scelta viene salvata sul dispositivo.</p>
        </div>
      </div>

      <div className="col-span-full">
        <div className={`border rounded p-3 ${cardClass}`}>
          <span className={`block text-sm font-medium mb-2 ${labelTextClass}`}>Profili</span>
          <div className="flex gap-2 items-center">
            <input
              type="text"
              placeholder="Nome profilo (es. Workout)"
              value={profileName}
              onChange={(e) => setProfileName(e.target.value)}
              className={`flex-1 rounded-md px-3 py-1.5 ${fieldClass}`}
            />
            <button
              className={`${isLight ? 'bg-amber-500 hover:bg-amber-600 text-black' : 'bg-blue-600 hover:bg-blue-700 text-white'} text-sm font-semibold py-1.5 px-3 rounded`}
              onClick={saveCurrentAsProfile}
            >Salva</button>
          </div>
          <div className="mt-2 space-y-1 max-h-40 overflow-auto pr-1">
            {Object.keys(profiles).length === 0 && (
              <div className={`text-xs ${helpTextClass}`}>Nessun profilo salvato</div>
            )}
            {Object.keys(profiles).sort().map((name) => (
              <div key={name} className="flex items-center justify-between gap-2">
                <div className={`text-sm ${labelTextClass}`}>{name}</div>
                <div className="flex gap-1">
                  <button className={`${isLight ? 'bg-gray-200 text-gray-900 hover:bg-gray-300' : 'bg-gray-600 text-white hover:bg-gray-500'} text-xs font-semibold py-1 px-2 rounded`} onClick={() => applyProfileToForm(name)}>Carica</button>
                  <button className={`${isLight ? 'bg-gray-200 text-gray-900 hover:bg-gray-300' : 'bg-gray-600 text-white hover:bg-gray-500'} text-xs font-semibold py-1 px-2 rounded`} onClick={() => renameProfile(name)}>Rinomina</button>
                  <button className={`${isLight ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-red-700 hover:bg-red-800 text-white'} text-xs font-semibold py-1 px-2 rounded`} onClick={() => deleteProfile(name)}>Elimina</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="col-span-full">
        <div className={`border rounded p-3 ${cardClass}`}>
          <label className={`inline-flex items-center gap-2 ${labelTextClass}`}>
            <input type="checkbox" checked={hapticsEnabled} onChange={(e) => onToggleHaptics && onToggleHaptics(e.target.checked)} />
            <span>Haptics</span>
          </label>
          <p className={`mt-1 text-xs ${helpTextClass}`}>Abilita vibrazione sui pulsanti supportati</p>
        </div>
      </div>
      <div className={`border rounded p-3 ${cardClass} h-full` }>
        <DurationPicker
          label="Pomodoro"
          seconds={pomodoro}
          onChange={setPomodoro}
          theme={theme}
          min={5}
          max={60 * 60}
          step={5}
          presets={presets}
        />
      </div>
      <div className={`border rounded p-3 ${cardClass} h-full`}>
        <DurationPicker
          label="Pausa breve"
          seconds={shortBreak}
          onChange={setShortBreak}
          theme={theme}
          min={1}
          max={15 * 60}
          step={5}
          presets={[3*60, 5*60, 10*60]}
        />
      </div>
      <div className={`border rounded p-3 ${cardClass} h-full`}>
        <DurationPicker
          label="Pausa lunga"
          seconds={longBreak}
          onChange={setLongBreak}
          theme={theme}
          min={1}
          max={45 * 60}
          step={5}
          presets={[15*60, 20*60, 30*60]}
        />
      </div>
      {runMode === 'workday' ? (
        <div className={`border rounded p-3 ${cardClass}`}>
          <DurationPicker
            label="Giornata"
            seconds={workday}
            onChange={setWorkday}
            theme={theme}
            min={1 * 3600}
            max={12 * 3600}
            step={1800}
            presets={[4*3600, 6*3600, 8*3600]}
          />
        </div>
      ) : (
        <div className={`border rounded p-3 ${cardClass}`}>
          <label htmlFor="cycles" className={`block text-sm font-medium ${labelTextClass}`}>Cicli pomodoro</label>
          <div className="mt-1 flex items-center gap-2">
            <button className={`px-2 py-1 rounded ${smallBtn}`} onMouseDown={(e)=>startHold(e,()=>setCycles((v)=>Math.max(1,v-1)))} onMouseUp={stopHold} onMouseLeave={stopHold} onTouchStart={(e)=>startHold(e,()=>setCycles((v)=>Math.max(1,v-1)))} onTouchEnd={stopHold}>-1</button>
            <input
              type="number"
              id="cycles"
              min={1}
              value={cycles}
              onChange={(e) => setCycles(Math.max(1, Number(e.target.value)))}
              className={`block w-full rounded-md px-3 py-1.5 ${fieldClass}`}
            />
            <button className={`px-2 py-1 rounded ${smallBtn}`} onMouseDown={(e)=>startHold(e,()=>setCycles((v)=>v+1))} onMouseUp={stopHold} onMouseLeave={stopHold} onTouchStart={(e)=>startHold(e,()=>setCycles((v)=>v+1))} onTouchEnd={stopHold}>+1</button>
          </div>
        </div>
      )}
      <div className={`border rounded p-3 ${cardClass}`}>
        <label htmlFor="longEvery" className={`block text-sm font-medium ${labelTextClass}`}>Pausa lunga ogni (pomodori)</label>
        <div className="mt-1 flex items-center gap-2">
          <button className={`px-2 py-1 rounded ${smallBtn}`} onMouseDown={(e)=>startHold(e,()=>setLongEvery((v)=>Math.max(2,v-1)))} onMouseUp={stopHold} onMouseLeave={stopHold} onTouchStart={(e)=>startHold(e,()=>setLongEvery((v)=>Math.max(2,v-1)))} onTouchEnd={stopHold}>-1</button>
          <input
            type="number"
            id="longEvery"
            min={2}
            value={longEvery}
            onChange={(e) => setLongEvery(Math.max(2, Number(e.target.value)))}
            className={`block w-full rounded-md px-3 py-1.5 ${fieldClass}`}
          />
          <button className={`px-2 py-1 rounded ${smallBtn}`} onMouseDown={(e)=>startHold(e,()=>setLongEvery((v)=>Math.max(2,v+1)))} onMouseUp={stopHold} onMouseLeave={stopHold} onTouchStart={(e)=>startHold(e,()=>setLongEvery((v)=>Math.max(2,v+1)))} onTouchEnd={stopHold}>+1</button>
        </div>
      </div>
      
      <div className="col-span-full grid grid-cols-2 gap-2">
        <button
          className={`w-full ${isLight ? 'bg-gray-200 hover:bg-gray-300 text-gray-900' : 'bg-gray-600 hover:bg-gray-500 text-white'} font-bold py-2 px-4 rounded`}
          onClick={handleResetDefaults}
        >
          Ripristina default
        </button>
        <button
          className={`w-full ${isLight ? 'bg-amber-500 hover:bg-amber-600 text-black' : 'bg-green-600 hover:bg-green-700 text-white'} font-bold py-2 px-4 rounded`}
          onClick={handleChange}
        >
          Applica impostazioni
        </button>
      </div>
    </div>
  );
};

export default TimerSettings;

