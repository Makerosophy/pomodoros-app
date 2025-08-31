import React from 'react';

type Theme = 'blue' | 'gold' | 'neo' | 'cosmic' | 'glass' | 'chrono';

interface WorkdayProgressProps {
  totalWorkdayDuration: number; // Total workday duration in seconds
  elapsedWorkdayTime: number; // Elapsed time in seconds
  mode?: 'workday' | 'cycles';
  targetCycles?: number;
  pomodorosCompleted?: number;
  theme?: Theme;
  cumulativeActiveSec?: number;
  cumulativeBreakSec?: number;
}

const WorkdayProgress: React.FC<WorkdayProgressProps> = ({
  totalWorkdayDuration,
  elapsedWorkdayTime,
  mode = 'workday',
  targetCycles = 0,
  pomodorosCompleted = 0,
  theme = 'blue',
  cumulativeActiveSec,
  cumulativeBreakSec,
}) => {
  let progressPct = 0;
  let label = '';
  if (mode === 'workday') {
    progressPct = totalWorkdayDuration > 0 ? (elapsedWorkdayTime / totalWorkdayDuration) * 100 : 0;
    label = `Workday: ${(progressPct).toFixed(1)}%`;
  } else {
    progressPct = targetCycles > 0 ? (pomodorosCompleted / targetCycles) * 100 : 0;
    const remaining = Math.max(0, targetCycles - pomodorosCompleted);
    label = `Cycles: ${pomodorosCompleted}/${targetCycles} (${remaining} remaining)`;
  }

  const labelClass = theme === 'gold' ? 'text-gray-800' : 'text-gray-200';
  const trackClass = theme === 'gold' ? 'bg-gray-300' : 'bg-gray-700';
  const fillStyle: React.CSSProperties = theme === 'neo'
    ? { background: 'linear-gradient(90deg,#00F5D4,#FF3366)' }
    : theme === 'cosmic'
    ? { background: 'linear-gradient(90deg,#7DF9FF,#FFD700)' }
    : theme === 'glass'
    ? { background: 'linear-gradient(90deg,#38BDF8,#9333EA)' }
    : theme === 'chrono'
    ? { background: 'linear-gradient(90deg,#58A6FF,#F85149)' }
    : theme === 'gold'
    ? { background: 'linear-gradient(90deg,#F59E0B,#FCD34D)' }
    : { background: 'linear-gradient(90deg,#0ea5e9,#22d3ee)' };

  const fmt = (s: number | undefined) => {
    if (s == null) return '0:00';
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2,'0')}`;
  };

  return (
    <div className="w-full mt-4">
      <div className={`w-full ${trackClass} rounded-full h-4 overflow-hidden`}>
        <div
          className={`h-4 rounded-full transition-all`}
          style={{ width: `${Math.min(100, Math.max(0, progressPct))}%`, ...fillStyle }}
        />
      </div>
      <p className={`text-sm ${labelClass} mt-2 font-medium`}>{label}</p>
      <div className={`mt-1 text-xs ${labelClass} grid grid-cols-2 gap-2`}>
        <div className="text-xs text-gray-400 space-y-1">
          <div>Activity: {fmt(cumulativeActiveSec)}</div>
          <div>Break: {fmt(cumulativeBreakSec)}</div>
        </div>
      </div>
    </div>
  );
};

export default WorkdayProgress;
