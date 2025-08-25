import React, { useEffect, useState } from 'react';

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

  const persistProfiles = (next: typeof profiles) => {
    setProfiles(next);
    try {
      localStorage.setItem('tempo_profiles', JSON.stringify(next));
    } catch {
      // ignore
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

  const changeBy = (setter: (n: number) => void, current: number, delta: number, min = 0) => {
    const next = Math.max(min, current + delta);
    setter(next);
  };

  const presets = [15 * 60, 20 * 60, 25 * 60];

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
  };

  return (
    <div className="grid grid-cols-2 gap-4 mb-4">
      <div className="col-span-2">
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
        <p className={`mt-2 text-xs ${helpTextClass}`}>{runMode==='workday' ? 'Imposta durata totale della giornata (secondi)' : 'Imposta numero di cicli pomodoro'}</p>
      </div>
      {Object.keys(profiles).length > 0 && (
        <div className="col-span-2">
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
          </div>
        </div>
      )}
      <div className="col-span-2">
        <span className={`block text-sm font-medium mb-2 ${labelTextClass}`}>Schema pause</span>
        <div className="inline-grid grid-cols-3 rounded-md overflow-hidden">
          <button className={`px-3 py-1 text-sm ${schedType==='standard' ? segActive : segInactive}`} onClick={() => setSchedType('standard')}>Standard</button>
          <button className={`px-3 py-1 text-sm ${schedType==='shortOnly' ? segActive : segInactive}`} onClick={() => setSchedType('shortOnly')}>Solo brevi</button>
          <button className={`px-3 py-1 text-sm ${schedType==='longOnly' ? segActive : segInactive}`} onClick={() => setSchedType('longOnly')}>Solo lunghe</button>
        </div>
        <p className={`mt-2 text-xs ${helpTextClass}`}>Scegli come distribuire le pause tra i pomodori</p>
      </div>

      <div className="col-span-2">
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
      <div className="col-span-2">
        <label className={`inline-flex items-center gap-2 ${labelTextClass}`}>
          <input type="checkbox" checked={hapticsEnabled} onChange={(e) => onToggleHaptics && onToggleHaptics(e.target.checked)} />
          <span>Haptics</span>
        </label>
        <p className={`mt-1 text-xs ${helpTextClass}`}>Abilita vibrazione sui pulsanti supportati</p>
      </div>
      <div>
        <label htmlFor="pomodoro" className={`block text-sm font-medium ${labelTextClass}`}>Pomodoro (secondi)</label>
        <div className="mt-1 flex items-center gap-2">
          <button className={`px-2 py-1 rounded ${smallBtn}`} onClick={() => changeBy(setPomodoro, pomodoro, -60, 0)}>-60</button>
          <input
            type="number"
            id="pomodoro"
            value={pomodoro}
            onChange={(e) => setPomodoro(Number(e.target.value))}
            className={`block w-full rounded-md px-3 py-1.5 ${fieldClass}`}
          />
          <button className={`px-2 py-1 rounded ${smallBtn}`} onClick={() => changeBy(setPomodoro, pomodoro, 60, 0)}>+60</button>
        </div>
        <div className="mt-2 flex gap-2">
          {presets.map((p) => (
            <button key={p} className={`px-2 py-1 rounded text-xs ${smallBtn}`} onClick={() => setPomodoro(p)}>
              {Math.round(p/60)}m
            </button>
          ))}
        </div>
      </div>
      <div>
        <label htmlFor="shortBreak" className={`block text-sm font-medium ${labelTextClass}`}>Pausa breve (secondi)</label>
        <div className="mt-1 flex items-center gap-2">
          <button className={`px-2 py-1 rounded ${smallBtn}`} onClick={() => changeBy(setShortBreak, shortBreak, -30, 0)}>-30</button>
          <input
            type="number"
            id="shortBreak"
            value={shortBreak}
            onChange={(e) => setShortBreak(Number(e.target.value))}
            className={`block w-full rounded-md px-3 py-1.5 ${fieldClass}`}
          />
          <button className={`px-2 py-1 rounded ${smallBtn}`} onClick={() => changeBy(setShortBreak, shortBreak, 30, 0)}>+30</button>
        </div>
      </div>
      <div>
        <label htmlFor="longBreak" className={`block text-sm font-medium ${labelTextClass}`}>Pausa lunga (secondi)</label>
        <div className="mt-1 flex items-center gap-2">
          <button className={`px-2 py-1 rounded ${smallBtn}`} onClick={() => changeBy(setLongBreak, longBreak, -60, 0)}>-60</button>
          <input
            type="number"
            id="longBreak"
            value={longBreak}
            onChange={(e) => setLongBreak(Number(e.target.value))}
            className={`block w-full rounded-md px-3 py-1.5 ${fieldClass}`}
          />
          <button className={`px-2 py-1 rounded ${smallBtn}`} onClick={() => changeBy(setLongBreak, longBreak, 60, 0)}>+60</button>
        </div>
      </div>
      {runMode === 'workday' ? (
        <div>
          <label htmlFor="workday" className={`block text-sm font-medium ${labelTextClass}`}>Giornata (secondi)</label>
          <div className="mt-1 flex items-center gap-2">
            <button className={`px-2 py-1 rounded ${smallBtn}`} onClick={() => changeBy(setWorkday, workday, -1800, 0)}>-30m</button>
            <input
              type="number"
              id="workday"
              value={workday}
              onChange={(e) => setWorkday(Number(e.target.value))}
              className={`block w-full rounded-md px-3 py-1.5 ${fieldClass}`}
            />
            <button className={`px-2 py-1 rounded ${smallBtn}`} onClick={() => changeBy(setWorkday, workday, 1800, 0)}>+30m</button>
          </div>
        </div>
      ) : (
        <div>
          <label htmlFor="cycles" className={`block text-sm font-medium ${labelTextClass}`}>Cicli pomodoro</label>
          <div className="mt-1 flex items-center gap-2">
            <button className={`px-2 py-1 rounded ${smallBtn}`} onClick={() => changeBy(setCycles, cycles, -1, 1)}>-1</button>
            <input
              type="number"
              id="cycles"
              min={1}
              value={cycles}
              onChange={(e) => setCycles(Math.max(1, Number(e.target.value)))}
              className={`block w-full rounded-md px-3 py-1.5 ${fieldClass}`}
            />
            <button className={`px-2 py-1 rounded ${smallBtn}`} onClick={() => changeBy(setCycles, cycles, 1, 1)}>+1</button>
          </div>
        </div>
      )}
      <div>
        <label htmlFor="longEvery" className={`block text-sm font-medium ${labelTextClass}`}>Pausa lunga ogni (pomodori)</label>
        <div className="mt-1 flex items-center gap-2">
          <button className={`px-2 py-1 rounded ${smallBtn}`} onClick={() => setLongEvery(Math.max(2, longEvery - 1))}>-1</button>
          <input
            type="number"
            id="longEvery"
            min={2}
            value={longEvery}
            onChange={(e) => setLongEvery(Math.max(2, Number(e.target.value)))}
            className={`block w-full rounded-md px-3 py-1.5 ${fieldClass}`}
          />
          <button className={`px-2 py-1 rounded ${smallBtn}`} onClick={() => setLongEvery(Math.max(2, longEvery + 1))}>+1</button>
        </div>
      </div>
      <div className="flex items-end space-x-2">
        <button
          className={`${isLight ? 'bg-gray-200 text-gray-900 hover:bg-gray-300' : 'bg-gray-700 text-white hover:bg-gray-600'} text-sm font-semibold py-2 px-3 rounded`}
          onClick={() => setWorkday(4 * 3600)}
        >4h</button>
        <button
          className={`${isLight ? 'bg-gray-200 text-gray-900 hover:bg-gray-300' : 'bg-gray-700 text-white hover:bg-gray-600'} text-sm font-semibold py-2 px-3 rounded`}
          onClick={() => setWorkday(6 * 3600)}
        >6h</button>
        <button
          className={`${isLight ? 'bg-gray-200 text-gray-900 hover:bg-gray-300' : 'bg-gray-700 text-white hover:bg-gray-600'} text-sm font-semibold py-2 px-3 rounded`}
          onClick={() => setWorkday(8 * 3600)}
        >8h</button>
      </div>
      <div className="col-span-2 grid grid-cols-2 gap-2">
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
