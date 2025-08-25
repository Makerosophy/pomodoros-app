import React, { useMemo } from 'react';
import { STORAGE } from '../utils/constants';

type Theme = 'blue' | 'gold' | 'neo' | 'cosmic' | 'glass' | 'chrono';

interface DiaryProps {
  theme: Theme;
  currentActive?: number;
  currentBreak?: number;
  currentElapsed?: number;
  currentPoms?: number;
  currentProfile?: string;
}

type DiaryEntry = {
  active: number;
  brk: number;
  short?: number;
  long?: number;
  poms?: number;
  elapsed?: number;
  ts?: number;
  byProfile?: Record<string, { active: number; brk: number; poms?: number }>;
  _baseActive?: number;
  _baseBreak?: number;
  _baseShort?: number;
  _baseLong?: number;
  _basePoms?: number;
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

function formatMinSec(total: number): string {
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return `${h.toString().padStart(2,'0')}:${m.toString().padStart(2,'0')}:${s.toString().padStart(2, '0')}`;
}

type Entries = Record<string, DiaryEntry>;

const Diary: React.FC<DiaryProps> = ({ theme, currentActive = 0, currentBreak = 0, currentElapsed = 0, currentPoms = 0, currentProfile }) => {
  const entries = useMemo<Entries>(() => {
    try {
      const raw = localStorage.getItem(STORAGE.DIARY);
      if (!raw) return {} as Entries;
      return JSON.parse(raw) as Entries;
    } catch {
      return {} as Entries;
    }
  }, []);

  // Merge today's live counters as a virtual entry
  const now = new Date();
  const todayKey = `${now.getFullYear()}-${(now.getMonth()+1).toString().padStart(2,'0')}-${now.getDate().toString().padStart(2,'0')}`;
  const merged: Entries = { ...entries };
  const todayBase = merged[todayKey] || { active: 0, brk: 0, short: 0, long: 0, poms: 0, elapsed: 0, byProfile: {}, _baseActive: 0, _baseBreak: 0, _baseShort: 0, _baseLong: 0, _basePoms: 0 };
  const resActive = Math.max(0, currentActive - (todayBase._baseActive || 0));
  const resBreak = Math.max(0, currentBreak - (todayBase._baseBreak || 0));
  const resPoms = Math.max(0, currentPoms - (todayBase._basePoms || 0));
  merged[todayKey] = {
    active: (todayBase.active || 0) + resActive,
    brk: (todayBase.brk || 0) + resBreak,
    poms: (todayBase.poms || 0) + resPoms,
    elapsed: Math.max(todayBase.elapsed || 0, currentElapsed || 0),
    ts: Date.now(),
    short: todayBase.short || 0,
    long: todayBase.long || 0,
    byProfile: { ...(todayBase.byProfile || {}) },
    _baseActive: todayBase._baseActive,
    _baseBreak: todayBase._baseBreak,
    _baseShort: todayBase._baseShort,
    _baseLong: todayBase._baseLong,
    _basePoms: todayBase._basePoms,
  };
  if (currentProfile) {
    const bp = merged[todayKey].byProfile || {} as Record<string, { active: number; brk: number; poms?: number }>;
    const entry = bp[currentProfile] || { active: 0, brk: 0, poms: 0 };
    entry.active += resActive;
    entry.brk += resBreak;
    entry.poms = (entry.poms || 0) + resPoms;
    bp[currentProfile] = entry;
    merged[todayKey].byProfile = bp;
  }

  const [range, setRange] = React.useState<'7' | '30' | 'all'>('7');
  const [profileFilter, setProfileFilter] = React.useState<string>('all');
  const headingClass = theme === 'gold' ? 'text-amber-700' : 'text-sky-300';
  const rowText = theme === 'gold' ? 'text-gray-800' : 'text-gray-200';
  const cardClass = theme === 'gold' ? 'bg-white/70 border-gray-300' : 'bg-black/30 border-gray-700';

  // Recupera sessioni e calcola top profile
  const sessions = useMemo<SessionRecord[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE.SESSIONS);
      return raw ? (JSON.parse(raw) as SessionRecord[]) : [];
    } catch { return []; }
  }, []);
  const allProfiles = useMemo<string[]>(() => Array.from(new Set(sessions.map(s => s.profile))).sort(), [sessions]);
  const sessionsInRange = sessions.filter((s) => {
    if (range === 'all') return true;
    const d = new Date(s.dateKey + 'T00:00:00');
    const now2 = new Date();
    const diffDays = Math.floor((now2.getTime() - d.getTime()) / 86400000);
    return diffDays < Number(range);
  }).sort((a,b) => b.endedAt - a.endedAt);
  const sessionsFiltered = sessionsInRange.filter(s => profileFilter === 'all' ? true : s.profile === profileFilter);
  const totals = sessionsFiltered.reduce((acc, s) => {
    acc.active += s.active || 0;
    acc.brk += s.break || 0;
    acc.poms += s.pomodoros || 0;
    return acc;
  }, { active: 0, brk: 0, poms: 0 });
  const totalOverall = totals.active + totals.brk;
  // const avgActive = keys.length ? Math.floor(totals.active / keys.length) : 0;
  // const avgPoms = keys.length ? Math.floor(totals.poms / keys.length) : 0;

  const profileTotals: Record<string, { active: number; brk: number; poms: number }> = {};
  sessionsFiltered.forEach((s) => {
    const pt = profileTotals[s.profile] || { active: 0, brk: 0, poms: 0 };
    pt.active += s.active || 0;
    pt.brk += s.break || 0;
    pt.poms += s.pomodoros || 0;
    profileTotals[s.profile] = pt;
  });
  const topProfile = Object.keys(profileTotals).reduce<{ name: string; active: number } | null>((best, name) => {
    const a = profileTotals[name].active;
    if (!best || a > best.active) return { name, active: a };
    return best;
  }, null);
  // totalOverall computed above

  return (
    <div className="h-full overflow-auto">
      <div className="flex items-center justify-between mb-3">
        <h2 className={`text-lg font-bold ${headingClass}`}>Diario giornaliero</h2>
        <div className="flex items-center gap-2">
          <span className={`text-xs ${rowText}`}>Intervallo</span>
          <select value={range} onChange={(e) => setRange(e.target.value as any)} className={`text-xs rounded px-2 py-1 ${theme==='gold'?'bg-white text-gray-900 border border-gray-300':'bg-gray-800 text-gray-100 border border-gray-700'}`}>
            <option value="7">7 giorni</option>
            <option value="30">30 giorni</option>
            <option value="all">Tutto</option>
          </select>
          <span className={`text-xs ${rowText}`}>Profilo</span>
          <select value={profileFilter} onChange={(e) => setProfileFilter(e.target.value)} className={`text-xs rounded px-2 py-1 ${theme==='gold'?'bg-white text-gray-900 border border-gray-300':'bg-gray-800 text-gray-100 border border-gray-700'}`}>
            <option value="all">Tutti</option>
            {allProfiles.map(p => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Dashboard semplificata */}
      <div className={`grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3`}>
        <div className={`border rounded p-3 ${cardClass}`}>
          <div className={`text-[11px] ${rowText}`}>Pomodori totali</div>
          <div className={`text-sm font-semibold ${rowText}`}>{totals.poms}</div>
        </div>
        <div className={`border rounded p-3 ${cardClass}`}>
          <div className={`text-[11px] ${rowText}`}>Ore totali</div>
          <div className={`text-sm font-semibold ${rowText}`}>{formatMinSec(totalOverall)}</div>
        </div>
        <div className={`border rounded p-3 ${cardClass}`}>
          <div className={`text-[11px] ${rowText}`}>Ore attive totali</div>
          <div className={`text-sm font-semibold ${rowText}`}>{formatMinSec(totals.active)}</div>
        </div>
        <div className={`border rounded p-3 ${cardClass}`}>
          <div className={`text-[11px] ${rowText}`}>Profilo più attivo</div>
          <div className={`text-sm font-semibold ${rowText}`}>{topProfile ? `${topProfile.name} (${formatMinSec(topProfile.active)})` : '—'}</div>
        </div>
      </div>

      {/* Lista sessioni concluse (entry per attività) */}
      <div className={`border rounded p-2 ${cardClass}`}>
        <div className={`text-sm font-semibold ${rowText}`}>Sessioni concluse</div>
        <div className="mt-2">
          <div className={`hidden sm:grid grid-cols-5 gap-2 text-[11px] font-semibold ${rowText} mb-2 text-center`}>
            <div>Attività</div>
            <div>Totale</div>
            <div>Attiva</div>
            <div>Pausa</div>
            <div>Data/stop</div>
          </div>
          {sessionsFiltered.length === 0 && (
            <div className={`text-xs ${rowText}`}>Nessuna sessione</div>
          )}
          {sessionsFiltered.map((s, idx) => {
            const total = s.active + s.break;
            const started = new Date(s.startedAt);
            const ended = new Date(s.endedAt);
            const hhmm = (d: Date) => `${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`;
            const zebra = theme === 'gold'
              ? (idx % 2 === 0 ? 'bg-white/80' : 'bg-white/60')
              : (idx % 2 === 0 ? 'bg-black/40' : 'bg-black/25');
            return (
              <div key={s.id} className={`text-xs ${rowText} border rounded p-2 ${cardClass} ${zebra}`}>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center">
                  <div>
                    <div className="sm:hidden opacity-70">Attività</div>
                    <div className="text-sm font-semibold">{s.profile}</div>
                  </div>
                  <div>
                    <div className="sm:hidden opacity-70">Totale</div>
                    <div className="font-mono text-sm">{formatMinSec(total)}</div>
                  </div>
                  <div>
                    <div className="sm:hidden opacity-70">Attiva</div>
                    <div className="font-mono text-sm">{formatMinSec(s.active)}</div>
                  </div>
                  <div>
                    <div className="sm:hidden opacity-70">Pausa</div>
                    <div className="font-mono text-sm">{formatMinSec(s.break)}</div>
                  </div>
                  <div>
                    <div className="sm:hidden opacity-70">Data/stop</div>
                    <div className="font-mono text-sm">{s.dateKey} {hhmm(ended)}</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      {/* Vista storica per-day rimossa per semplificazione */}
    </div>
  );
};

export default Diary;


