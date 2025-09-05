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
  pomodorosCompleted?: number; // number of pomodoros completed so far
}

const labelFor = (t: SegmentType) =>
  t === 'pomodoro' ? 'Pomodoro' : t === 'shortBreak' ? 'Short Break' : 'Long Break';

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

// Decide the next break type given the schedule settings and how many pomodoros
// will have been completati dopo il prossimo pomodoro.
const getBreakType = (
  scheduleType: 'standard' | 'shortOnly' | 'longOnly',
  longEvery: number,
  completedPomodorosAfterNext: number
): SegmentType => {
  if (scheduleType === 'shortOnly') return 'shortBreak';
  if (scheduleType === 'longOnly') return 'longBreak';
  return completedPomodorosAfterNext > 0 && longEvery > 0 && (completedPomodorosAfterNext % longEvery === 0)
    ? 'longBreak'
    : 'shortBreak';
};

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
  pomodorosCompleted = 0,
}) => {
  // Calculate only the next segment
  const getNextSegment = (): { type: SegmentType; label: string; remaining: number } => {
    if (currentType === 'pomodoro') {
      // After a pomodoro comes a break, except if this was the final pomodoro (cycles mode)
      const totalRemaining = remainingPomodoros ?? 0;
      if (totalRemaining <= 1) {
        // No further break after the last pomodoro
        return { type: 'pomodoro', label: 'Pomodoro', remaining: 0 };
      }

      const nextPomCompleted = (pomodorosCompleted || 0) + 1;
      const nextBreak = getBreakType(scheduleType, longEvery, nextPomCompleted);
      return { type: nextBreak, label: labelFor(nextBreak), remaining: totalRemaining };
    }

    // After a break comes a pomodoro
    return { type: 'pomodoro', label: 'Pomodoro', remaining: Math.max(0, (remainingPomodoros ?? 0) - 1) };
  };

  const nextSegment = getNextSegment();
  
  // Calculate remaining totals
  const getRemainingInfo = () => {
    if (remainingPomodoros !== null && remainingPomodoros !== undefined) {
      // Cycles mode - simulate the remaining sequence stepwise (include current segment fully)
      const totalPomodoros = remainingPomodoros;
      type Step = { type: SegmentType; duration: number };
      const steps: Step[] = [];
      let pomsLeft = totalPomodoros;
      let completed = pomodorosCompleted || 0;

      // Include current running segment fully (stepwise behavior)
      if (currentType === 'pomodoro') {
        steps.push({ type: 'pomodoro', duration: pomodoroSeconds });
        pomsLeft = Math.max(0, pomsLeft - 1);
        completed += 1;
        // Include the immediate break after the current pomodoro if there are more pomodoros left
        if (pomsLeft > 0) {
          const breakType = getBreakType(scheduleType, longEvery, completed);
          steps.push({ type: breakType, duration: breakType === 'longBreak' ? longBreakSeconds : shortBreakSeconds });
        }
      } else if (currentType === 'shortBreak') {
        steps.push({ type: 'shortBreak', duration: shortBreakSeconds });
      } else if (currentType === 'longBreak') {
        steps.push({ type: 'longBreak', duration: longBreakSeconds });
      }

      // Generate the rest of the schedule until all remaining pomodoros are consumed
      while (pomsLeft > 0) {
        // Add next pomodoro
        steps.push({ type: 'pomodoro', duration: pomodoroSeconds });
        pomsLeft -= 1;
        completed += 1;

        // Add a break only if there are still pomodoros left (no break after final pomodoro)
        if (pomsLeft > 0) {
          const breakType = getBreakType(scheduleType, longEvery, completed);
          steps.push({ type: breakType, duration: breakType === 'longBreak' ? longBreakSeconds : shortBreakSeconds });
        }
      }

      const totalTime = steps.reduce((acc, s) => acc + s.duration, 0);
      return { pomodoros: totalPomodoros, time: totalTime, mode: 'cycles' as const };
    } else if (totalSecondsLeft !== null && totalSecondsLeft !== undefined) {
      // Workday mode
      const remainingHours = Math.floor(totalSecondsLeft / 3600);
      const remainingMinutes = Math.floor((totalSecondsLeft % 3600) / 60);
      
      return {
        time: totalSecondsLeft,
        hours: remainingHours,
        minutes: remainingMinutes,
        mode: 'workday' as const
      };
    }
    return null;
  };

  const remainingInfo = getRemainingInfo();

  if (!remainingInfo) {
    return (
      <div className="text-sm text-gray-400 text-center">No segments planned</div>
    );
  }

  const headingClass = theme === 'gold' ? 'text-amber-300' : 
                      theme === 'neo' ? 'text-[#00F5D4]' : 
                      theme === 'cosmic' ? 'text-[#7DF9FF]' : 
                      theme === 'glass' ? 'text-[#38BDF8]' : 
                      theme === 'chrono' ? 'text-[#58A6FF]' : 
                      'text-sky-300';

  const formatTime = (seconds: number): string => {
    if (seconds <= 0) return '0h 0m';
    
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    
    if (h > 0) {
      return `${h}h ${m}m`;
    } else if (m > 0) {
      return `${m}m ${s}s`;
    } else {
      return `${s}s`;
    }
  };

  return (
    <div className="w-full">
      <h3 className={`font-semibold mb-3 ${headingClass}`}>Next Segments</h3>
      
      {/* Next segment */}
      <div className="mb-3">
        <div className="text-xs text-gray-400 mb-1">Next:</div>
        <div className={`px-3 py-2 rounded-lg text-sm font-medium ${colorFor(nextSegment.type, theme)}`}>
          {nextSegment.label}
        </div>
      </div>

      {/* Remaining counters */}
      <div className="grid grid-cols-2 gap-3">
        {remainingInfo.mode === 'cycles' && (
          <>
            <div className="text-center">
              <div className="text-xs text-gray-400 mb-1">Pomodoros</div>
              <div className={`text-lg font-bold ${headingClass}`}>{remainingInfo.pomodoros}</div>
            </div>
            <div className="text-center">
              <div className="text-xs text-gray-400 mb-1">Total Time</div>
              <div className={`text-lg font-bold ${headingClass}`}>{formatTime(remainingInfo.time)}</div>
            </div>
          </>
        )}
        
        {remainingInfo.mode === 'workday' && (
          <>
            <div className="text-center">
              <div className="text-xs text-gray-400 mb-1">Hours Left</div>
              <div className={`text-lg font-bold ${headingClass}`}>{remainingInfo.hours}h {remainingInfo.minutes}m</div>
            </div>
            <div className="text-center">
              <div className="text-xs text-gray-400 mb-1">Total Time</div>
              <div className={`text-lg font-bold ${headingClass}`}>{formatTime(remainingInfo.time)}</div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default SchedulePreview;


