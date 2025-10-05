import React from 'react';

type Theme = 'blue' | 'gold' | 'neo' | 'cosmic' | 'glass' | 'chrono';

interface WatchFaceProps {
  theme: Theme;
  onThemeChange?: (t: Theme) => void;
  children: React.ReactNode;
}

// WatchFace: a square device that scales to fill viewport while keeping aspect ratio.
// Uses inline style width=min(100vw, 100vh) to keep it fully visible on any device.
const WatchFace: React.FC<WatchFaceProps> = ({ theme, onThemeChange, children }) => {
  const outerStyle: React.CSSProperties = { width: 'min(100vw, 100vh)' };
  const isLight = theme === 'gold';
  const bezelClass = (
    theme === 'neo' ? 'border-[#6C757D] bg-[#0B0C10]' :
    theme === 'cosmic' ? 'border-[#30363D] bg-[#1E1E2E]' :
    theme === 'glass' ? 'border-[#64748B] bg-[#111827]' :
    theme === 'chrono' ? 'border-[#30363D] bg-[#0D1117]' :
    (isLight ? 'border-gray-400 bg-gradient-to-br from-gray-200 to-gray-300' : 'border-gray-700 bg-gradient-to-br from-gray-900 to-gray-800')
  );
  const innerClass = (
    theme === 'neo' ? 'from-[#0B0C10] to-[#0B0C10] border-[#6C757D]' :
    theme === 'cosmic' ? 'from-[#1E1E2E] to-[#232337] border-[#9CA3AF]' :
    theme === 'glass' ? 'from-[#0f172a] to-[#111827] border-[#64748B]' :
    theme === 'chrono' ? 'from-[#0D1117] to-[#0D1117] border-[#30363D]' :
    (isLight ? 'from-white to-gray-100 border-gray-300' : 'from-gray-950 to-gray-900 border-gray-700')
  );

  return (
    <div className="w-screen h-screen flex items-center justify-center bg-black/90">
      <div style={outerStyle} className="aspect-[1/1] p-3">
        <div className={`w-full h-full rounded-[28px] border-4 shadow-[inset_0_0_18px_rgba(0,0,0,0.35),0_10px_24px_rgba(0,0,0,0.6)] ${bezelClass}`}>
          {/* Top bar: title + theme toggle */}
          <div className="flex items-center justify-between px-4 pt-3 text-xs">
            <span className="flex items-center gap-2">
              <img src="/clessidia.svg" alt="Clessidia" className="w-4 h-4 drop-shadow" />
              <span
                className={`tracking-widest font-bold rounded px-2 py-0.5 shadow-sm ${
                  isLight ? 'bg-white/80 text-gray-900' : 'bg-black/50 text-white'
                }`}
              >CLESSIDIA</span>
            </span>
            {onThemeChange && (
              <div className="flex gap-1">
                {['blue','gold','neo','cosmic','glass','chrono'].map((t) => (
                  <button
                    key={t}
                    className={`px-2 py-0.5 rounded text-[10px]
                      ${theme===t ? 'ring-2 ring-white/70' : (t==='gold' ? 'ring-1 ring-black/40' : 'ring-1 ring-white/40')}
                      ${t==='blue'?'bg-tempoBlue text-white':''}
                      ${t==='gold' ? 'bg-tempoGold' : ''}
                      ${t==='gold' && theme===t ? 'text-amber-900' : ''}
                      ${t==='gold' && theme!==t ? 'text-amber-100' : ''}
                      ${t==='neo'?'bg-[#00F5D4] text-black':''}
                      ${t==='cosmic'?'bg-[#7DF9FF] text-black':''}
                      ${t==='glass'?'bg-[#38BDF8] text-black':''}
                      ${t==='chrono'?'bg-[#58A6FF] text-black':''}
                    `}
                    onClick={() => onThemeChange(t as Theme)}
                  >{t}</button>
                ))}
              </div>
            )}
          </div>
          {/* Inner display */}
          <div className={`m-3 rounded-2xl border bg-gradient-to-br ${innerClass} h-[calc(100%-44px)] p-4 overflow-auto`}> 
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};

export default WatchFace;


