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
  const [refreshKey, setRefreshKey] = React.useState(0);
  
  // Listen for Diary updates
  React.useEffect(() => {
    const handleDiaryUpdate = () => {
      setRefreshKey(prev => prev + 1);
    };
    
    window.addEventListener('diary-updated', handleDiaryUpdate);
    return () => window.removeEventListener('diary-updated', handleDiaryUpdate);
  }, []);
  
  const entries = useMemo<Entries>(() => {
    try {
      const raw = localStorage.getItem(STORAGE.DIARY);
      if (!raw) return {} as Entries;
      return JSON.parse(raw) as Entries;
    } catch {
      return {} as Entries;
    }
  }, [refreshKey]);

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

  const [range, setRange] = React.useState<'today' | '7' | '30' | 'all'>('7');
  const [profileFilter, setProfileFilter] = React.useState<string>('all');

  // Forza il re-render quando cambiano i contatori live
  React.useEffect(() => {
    setRefreshKey(prev => prev + 1);
  }, [currentActive, currentBreak, currentElapsed, currentPoms]);

  // Aggiornamento forzato ogni 500ms quando il timer è in esecuzione
  React.useEffect(() => {
    let interval: number | null = null;
    if (currentActive > 0 || currentBreak > 0) {
      interval = window.setInterval(() => {
        setRefreshKey(prev => prev + 1);
      }, 500); // Aggiorna ogni 500ms per assicurarsi che i contatori si aggiornino ogni secondo
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [currentActive, currentBreak]);

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

  // Compute per-day totals from sessions and merge today's live counters
  const byDay: Record<string, { active: number; brk: number; poms: number }> = {};
  sessions.forEach((s) => {
    const d = byDay[s.dateKey] || { active: 0, brk: 0, poms: 0 };
    d.active += s.active || 0;
    d.brk += s.break || 0;
    d.poms += s.pomodoros || 0;
    byDay[s.dateKey] = d;
  });
  
  // For today, combine saved values with live counters for display
  const todayTotals = byDay[todayKey] || { active: 0, brk: 0, poms: 0 };
  const diaryEntry = entries[todayKey];
  
  if (diaryEntry && diaryEntry._baseActive !== undefined) {
    // Calcola i delta dai contatori live (solo per la visualizzazione)
    const deltaActive = Math.max(0, currentActive - (diaryEntry._baseActive || 0));
    const deltaBreak = Math.max(0, currentBreak - (diaryEntry._baseBreak || 0));
    const deltaPoms = Math.max(0, currentPoms - (diaryEntry._basePoms || 0));
    
    byDay[todayKey] = {
      active: todayTotals.active + (diaryEntry.active || 0) + deltaActive,
      brk: todayTotals.brk + (diaryEntry.brk || 0) + deltaBreak,
      poms: todayTotals.poms + (diaryEntry.poms || 0) + deltaPoms,
    };
      } else {
      // If there's no entry in the Diary yet, use live counters
      byDay[todayKey] = {
      active: todayTotals.active + Math.max(0, currentActive),
      brk: todayTotals.brk + Math.max(0, currentBreak),
      poms: todayTotals.poms + Math.max(0, currentPoms || 0),
    };
  }
  const allProfiles = useMemo<string[]>(() => Array.from(new Set(sessions.map(s => s.profile))).sort(), [sessions]);
  const sessionsInRange = sessions.filter((s) => {
    if (range === 'all') return true;
    if (range === 'today') return s.dateKey === todayKey;
    const d = new Date(s.dateKey + 'T00:00:00');
    const now2 = new Date();
    const diffDays = Math.floor((now2.getTime() - d.getTime()) / 86400000);
    return diffDays < Number(range);
  }).sort((a,b) => b.endedAt - a.endedAt);
  const sessionsFiltered = sessionsInRange.filter(s => profileFilter === 'all' ? true : s.profile === profileFilter);
  // Pagination for Completed Sessions
  const PAGE_SIZE = 20;
  const [page, setPage] = React.useState(1);
  React.useEffect(() => { setPage(1); }, [range, profileFilter]);
  const totalPages = Math.max(1, Math.ceil(sessionsFiltered.length / PAGE_SIZE));
  const startIdx = (page - 1) * PAGE_SIZE;
  const endIdx = Math.min(sessionsFiltered.length, startIdx + PAGE_SIZE);
  const pagedSessions = sessionsFiltered.slice(startIdx, endIdx);
  const totals = sessionsFiltered.reduce((acc, s) => {
    const active = Math.max(0, (s as any).active ?? 0);
    const brk = Math.max(0, (s as any).break ?? (s as any).brk ?? 0);
    acc.active += active;
    acc.brk += brk;
    // Total Pomodoros: sum exact pomodoros per session record
    acc.poms += Math.max(0, (s as any).pomodoros ?? 0);
    return acc;
  }, { active: 0, brk: 0, poms: 0 });
  // Add today's live counters to totals view, respecting profile filter
  const shouldAddLive = profileFilter === 'all' || (currentProfile && profileFilter === currentProfile);
  if (shouldAddLive) {
    const diaryEntry = entries[todayKey];
    if (diaryEntry && diaryEntry._baseActive !== undefined) {
      // Add only live deltas for active/break; Total Pomodoros must reflect completed sessions only
      const deltaActive = Math.max(0, currentActive - (diaryEntry._baseActive || 0));
      const deltaBreak = Math.max(0, currentBreak - (diaryEntry._baseBreak || 0));
      totals.active += deltaActive;
      totals.brk += deltaBreak;
    } else {
      // If there's no diary baseline yet, add current live counters as deltas (exclude pomodoros)
      totals.active += Math.max(0, currentActive || 0);
      totals.brk += Math.max(0, currentBreak || 0);
    }
  }
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
  
  // Add live deltas for today's current profile (avoid double counting saved values)
  if (shouldAddLive && currentProfile) {
    const diaryEntry = entries[todayKey];
    const pt = profileTotals[currentProfile] || { active: 0, brk: 0, poms: 0 };
    if (diaryEntry && diaryEntry._baseActive !== undefined) {
      const deltaActive = Math.max(0, currentActive - (diaryEntry._baseActive || 0));
      const deltaBreak = Math.max(0, currentBreak - (diaryEntry._baseBreak || 0));
      const deltaPoms = Math.max(0, currentPoms - (diaryEntry._basePoms || 0));
      pt.active += deltaActive;
      pt.brk += deltaBreak;
      pt.poms += deltaPoms;
    } else {
      pt.active += Math.max(0, currentActive || 0);
      pt.brk += Math.max(0, currentBreak || 0);
      pt.poms += Math.max(0, currentPoms || 0);
    }
    profileTotals[currentProfile] = pt;
  }
  const topProfile = Object.keys(profileTotals).reduce<{ name: string; active: number } | null>((best, name) => {
    const a = profileTotals[name].active;
    if (!best || a > best.active) return { name, active: a };
    return best;
  }, null);
  // totalOverall computed above

  return (
    <div className="h-full overflow-auto">
      <div className="flex items-center justify-between mb-3">
        <h2 className={`text-lg font-bold ${headingClass}`}>Daily Diary</h2>
        <div className="flex items-center gap-2">
          <span className={`text-xs ${rowText}`}>Interval</span>
          <select value={range} onChange={(e) => setRange(e.target.value as any)} className={`text-xs rounded px-2 py-1 ${theme==='gold'?'bg-white text-gray-900 border border-gray-300':'bg-gray-800 text-gray-100 border border-gray-700'}`}>
            <option value="today">Today</option>
            <option value="7">7 days</option>
            <option value="30">30 days</option>
            <option value="all">All</option>
          </select>
          <span className={`text-xs ${rowText}`}>Profile</span>
          <select value={profileFilter} onChange={(e) => setProfileFilter(e.target.value)} className={`text-xs rounded px-2 py-1 ${theme==='gold'?'bg-white text-gray-900 border border-gray-300':'bg-gray-800 text-gray-100 border border-gray-700'}`}>
            <option value="all">All</option>
            {allProfiles.map(p => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Dashboard semplificata */}
      <div className={`grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3`}>
        <div className={`border rounded p-3 ${cardClass}`}>
          <div className={`text-[11px] ${rowText}`}>Total Pomodoros</div>
          <div className={`text-sm font-semibold ${rowText}`}>{totals.poms}</div>
        </div>
        <div className={`border rounded p-3 ${cardClass}`}>
          <div className={`text-[11px] ${rowText}`}>Total Hours</div>
          <div className={`text-sm font-semibold ${rowText}`}>{formatMinSec(totalOverall)}</div>
        </div>
        <div className={`border rounded p-3 ${cardClass}`}>
          <div className={`text-[11px] ${rowText}`}>Total Active Hours</div>
          <div className={`text-sm font-semibold ${rowText}`}>{formatMinSec(totals.active)}</div>
        </div>
        <div className={`border rounded p-3 ${cardClass}`}>
          <div className={`text-[11px] ${rowText}`}>Most Active Profile</div>
          <div className={`text-sm font-semibold ${rowText}`}>{topProfile ? `${topProfile.name} (${formatMinSec(topProfile.active)})` : '—'}</div>
        </div>
      </div>

      {/* Session list */}
      <div className={`border rounded p-2 ${cardClass}`}>
        <div className={`text-sm font-semibold ${rowText}`}>Completed Sessions</div>
        <div className="mt-2">
          <div className={`hidden sm:grid grid-cols-6 gap-2 text-[11px] font-semibold ${rowText} mb-2 text-center`}>
            <div>Pomodoros</div>
            <div>Activity</div>
            <div>Total</div>
            <div>Active</div>
            <div>Break</div>
            <div>Date/Stop</div>
          </div>
          
          {sessionsFiltered.length === 0 && (
            <div className={`text-xs ${rowText}`}>No sessions</div>
          )}
          
          {pagedSessions.map((s, idx) => {
            const active = Math.max(0, (s as any).active ?? 0);
            const brk = Math.max(0, (s as any).break ?? (s as any).brk ?? 0);
            const total = active + brk;
            const ended = new Date(s.endedAt);
            const timeStr = `${ended.getHours().toString().padStart(2,'0')}:${ended.getMinutes().toString().padStart(2,'0')}`;
            const zebra = theme === 'gold'
              ? (idx % 2 === 0 ? 'bg-white/80' : 'bg-white/60')
              : (idx % 2 === 0 ? 'bg-black/40' : 'bg-black/25');
            
            return (
              <div key={s.id} className={`text-xs ${rowText} border rounded p-2 ${cardClass} ${zebra}`}>
                <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 text-center">
                  <div>
                    <div className="sm:hidden opacity-70">Pomodoros</div>
                    <div className="font-mono text-sm">{s.pomodoros}</div>
                  </div>
                  <div>
                    <div className="sm:hidden opacity-70">Activity</div>
                    <div className="text-sm font-semibold">{s.profile}</div>
                  </div>
                  <div>
                    <div className="sm:hidden opacity-70">Total</div>
                    <div className="font-mono text-sm">{formatMinSec(total)}</div>
                  </div>
                  <div>
                    <div className="sm:hidden opacity-70">Active</div>
                    <div className="font-mono text-sm">{formatMinSec(active)}</div>
                  </div>
                  <div>
                    <div className="sm:hidden opacity-70">Break</div>
                    <div className="font-mono text-sm">{formatMinSec(brk)}</div>
                  </div>
                  <div>
                    <div className="sm:hidden opacity-70">Date/Stop</div>
                    <div className="font-mono text-sm">{s.dateKey} {timeStr}</div>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Pagination controls */}
          {sessionsFiltered.length > 0 && (
            <div className="flex items-center justify-between mt-3">
              <div className={`text-[11px] ${rowText}`}>
                Showing {sessionsFiltered.length === 0 ? 0 : (startIdx + 1)}–{endIdx} of {sessionsFiltered.length}
              </div>
              <div className="flex items-center gap-2">
                <button
                  className={`${theme==='gold' ? 'bg-gray-200 hover:bg-gray-300 text-gray-900' : 'bg-gray-700 hover:bg-gray-600 text-gray-100'} text-[11px] font-semibold py-1 px-2 rounded disabled:opacity-50 disabled:cursor-not-allowed`}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                >Prev</button>
                <span className={`text-[11px] ${rowText}`}>Page {page} / {totalPages}</span>
                <button
                  className={`${theme==='gold' ? 'bg-gray-200 hover:bg-gray-300 text-gray-900' : 'bg-gray-700 hover:bg-gray-600 text-gray-100'} text-[11px] font-semibold py-1 px-2 rounded disabled:opacity-50 disabled:cursor-not-allowed`}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                >Next</button>
              </div>
            </div>
          )}
        </div>
      </div>
      {/* Vista storica per-day rimossa per semplificazione */}
    </div>
  );
};

export default Diary;


