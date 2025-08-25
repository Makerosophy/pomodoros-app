import React, { useState, useEffect, useRef } from 'react';

type Theme = 'blue' | 'gold' | 'neo' | 'cosmic' | 'glass' | 'chrono';

interface TimerProps {
  duration: number; // Duration in seconds
  isRunning: boolean;
  onTimerEnd: () => void;
  theme?: Theme;
  sessionId?: number; // changes to force full reset without changing duration
  accentHex?: string; // custom accent color
  glowHex?: string;   // custom glow color for text shadow
}

const Timer: React.FC<TimerProps> = ({ duration, isRunning, onTimerEnd, theme = 'blue', sessionId = 0, accentHex, glowHex }) => {
  const [displaySeconds, setDisplaySeconds] = useState<number>(duration);
  const remainingMsRef = useRef<number>(duration * 1000);
  const targetTsRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);
  const endedRef = useRef<boolean>(false);

  // Reset when duration or session changes
  useEffect(() => {
    remainingMsRef.current = Math.max(0, Math.floor(duration * 1000));
    setDisplaySeconds(Math.ceil(remainingMsRef.current / 1000));
    endedRef.current = false;
    targetTsRef.current = null;
  }, [duration, sessionId]);

  const stopLoop = () => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    targetTsRef.current = null;
  };

  const tick = (now: number) => {
    if (targetTsRef.current == null) {
      targetTsRef.current = now + remainingMsRef.current;
    }
    const msLeft = Math.max(0, targetTsRef.current - now);
    remainingMsRef.current = msLeft;
    const secs = Math.ceil(msLeft / 1000);
    setDisplaySeconds((prev) => (prev !== secs ? secs : prev));

    if (msLeft <= 0 && !endedRef.current) {
      endedRef.current = true;
      stopLoop();
      onTimerEnd();
      return;
    }
    rafRef.current = requestAnimationFrame(tick);
  };

  useEffect(() => {
    if (isRunning) {
      // Start loop
      rafRef.current = requestAnimationFrame(tick);
    } else {
      // Pause
      stopLoop();
    }
    return () => stopLoop();
  }, [isRunning]);

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = time % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const fallbackClass = theme === 'gold'
    ? 'text-tempoGold'
    : 'text-tempoBlue';
  const textStyle: React.CSSProperties | undefined = accentHex
    ? { color: accentHex, textShadow: `0 0 6px ${glowHex ?? accentHex}` }
    : undefined;

  return (
    <div className="mb-6 select-none">
      <div className="mx-auto w-full text-center">
        <span className={`text-6xl sm:text-7xl lg:text-8xl font-digital tracking-widest ${fallbackClass}`} style={textStyle}>
          {formatTime(displaySeconds)}
        </span>
      </div>
    </div>
  );
};

export default Timer;
