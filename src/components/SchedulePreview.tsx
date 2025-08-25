import React from 'react';

type SegmentType = 'pomodoro' | 'shortBreak' | 'longBreak';

type Theme = 'blue' | 'gold' | 'neo' | 'cosmic' | 'glass' | 'chrono';

interface SchedulePreviewProps {
  currentType: SegmentType;
  pomodoroSeconds: number;
  shortBreakSeconds: number;
  longBreakSeconds: number;
  longEvery: number;
  remainingPomodoros?: number | null; // when cycles mode
  totalSecondsLeft?: number | null; // when workday mode
  theme?: Theme;
  scheduleType?: 'standard' | 'shortOnly' | 'longOnly';
}

const labelFor = (t: SegmentType) =>
  t === 'pomodoro' ? 'Pomodoro' : t === 'shortBreak' ? 'Pausa breve' : 'Pausa lunga';

const colorFor = (t: SegmentType, theme: Theme) => {
  if (theme === 'neo') {
    return t === 'pomodoro' ? 'bg-[#00F5D4] text-black' : t === 'shortBreak' ? 'bg-[#6C757D]' : 'bg-[#FF3366]';
  }
  if (theme === 'cosmic') {
    return t === 'pomodoro' ? 'bg-[#7DF9FF] text-black' : t === 'shortBreak' ? 'bg-[#9CA3AF]' : 'bg-[#FFD700] text-black';
  }
  if (theme === 'glass') {
    return t === 'pomodoro' ? 'bg-[#38BDF8] text-black' : t === 'shortBreak' ? 'bg-[#64748B]' : 'bg-[#9333EA]';
  }
  if (theme === 'chrono') {
    return t === 'pomodoro' ? 'bg-[#58A6FF]' : t === 'shortBreak' ? 'bg-[#30363D]' : 'bg-[#F85149]';
  }
  return t === 'pomodoro' ? 'bg-blue-500' : t === 'shortBreak' ? 'bg-emerald-500' : 'bg-amber-500';
};

const secondsFor = (t: SegmentType, p: number, s: number, l: number) =>
  t === 'pomodoro' ? p : t === 'shortBreak' ? s : l;

const SchedulePreview: React.FC<SchedulePreviewProps> = ({
  currentType,
  pomodoroSeconds,
  shortBreakSeconds,
  longBreakSeconds,
  longEvery,
  remainingPomodoros,
  totalSecondsLeft,
  theme = 'blue',
  scheduleType = 'standard',
}) => {
  // Create a forecast of up to 12 upcoming segments and show +N more
  const segments: SegmentType[] = [];
  let type: SegmentType = currentType;
  let completedModulo = 0;
  let secondsBudget = totalSecondsLeft ?? Number.MAX_SAFE_INTEGER;
  let pomLeft = remainingPomodoros ?? Number.MAX_SAFE_INTEGER;
  for (let i = 0; i < 12; i++) {
    // Determine next after currentType
    if (type === 'pomodoro') {
      // push next (break)
      const nextPomCount = completedModulo + 1;
      const nextBreak: SegmentType = scheduleType==='shortOnly' ? 'shortBreak' : scheduleType==='longOnly' ? 'longBreak' : (nextPomCount % longEvery === 0 ? 'longBreak' : 'shortBreak');
      const sec = secondsFor(nextBreak, pomodoroSeconds, shortBreakSeconds, longBreakSeconds);
      if (secondsBudget - sec < 0) break;
      segments.push(nextBreak);
      secondsBudget -= sec;
      type = nextBreak;
      completedModulo = nextPomCount;
    } else {
      // after break is a pomodoro
      if (pomLeft <= 0) break;
      const sec = pomodoroSeconds;
      if (secondsBudget - sec < 0) break;
      segments.push('pomodoro');
      secondsBudget -= sec;
      type = 'pomodoro';
      pomLeft -= 1;
    }
  }

  if (segments.length === 0) {
    return (
      <div className="text-sm text-gray-400 text-center">Nessun segmento pianificato</div>
    );
  }

  const extraCount = (remainingPomodoros ?? 0) + (totalSecondsLeft ? Math.floor(totalSecondsLeft / pomodoroSeconds) : 0) - segments.filter(s => s === 'pomodoro').length;

  return (
    <div className="w-full">
      <h3 className={`font-semibold mb-2 ${theme==='gold' ? 'text-amber-300' : theme==='neo' ? 'text-[#00F5D4]' : theme==='cosmic' ? 'text-[#7DF9FF]' : theme==='glass' ? 'text-[#38BDF8]' : theme==='chrono' ? 'text-[#58A6FF]' : 'text-sky-300'}`}>Prossimi segmenti</h3>
      <div className="flex flex-wrap gap-2 items-center">
        {segments.map((seg, idx) => (
          <div key={idx} className={`px-3 py-1 rounded-full text-xs ${colorFor(seg, theme)}`}>
            {labelFor(seg)}
          </div>
        ))}
        {extraCount > 0 && (
          <div className={`px-3 py-1 rounded-full text-xs ${theme==='gold' ? 'bg-amber-600 text-black' : theme==='neo' ? 'bg-[#00F5D4] text-black' : theme==='cosmic' ? 'bg-[#7DF9FF] text-black' : theme==='glass' ? 'bg-[#38BDF8] text-black' : theme==='chrono' ? 'bg-[#58A6FF] text-black' : 'bg-blue-700 text-white'}`}>+{extraCount}</div>
        )}
      </div>
    </div>
  );
};

export default SchedulePreview;


