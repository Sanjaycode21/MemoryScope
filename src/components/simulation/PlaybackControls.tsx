import React, { useEffect } from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  RotateCcw,
  Gauge,
} from 'lucide-react';

interface PlaybackControlsProps {
  currentStepIndex: number;
  totalSteps: number;
  isPlaying: boolean;
  speed: number;
  onPlay: () => void;
  onPause: () => void;
  onStepForward: () => void;
  onStepBack: () => void;
  onReset: () => void;
  onJumpToStep: (index: number) => void;
  onChangeSpeed: (speed: number) => void;
}

export const PlaybackControls: React.FC<PlaybackControlsProps> = ({
  currentStepIndex,
  totalSteps,
  isPlaying,
  speed,
  onPlay,
  onPause,
  onStepForward,
  onStepBack,
  onReset,
  onJumpToStep,
  onChangeSpeed,
}) => {
  // Global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if user is typing in an input
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        if (isPlaying) onPause();
        else onPlay();
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        onStepForward();
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        onStepBack();
      } else if (e.code === 'KeyR') {
        e.preventDefault();
        onReset();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, onPlay, onPause, onStepForward, onStepBack, onReset]);

  const speeds = [0.5, 1, 2, 4];

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 shadow-md flex flex-col md:flex-row items-center justify-between gap-4">
      {/* Control Buttons */}
      <div className="flex items-center space-x-2">
        <button
          onClick={onReset}
          title="Reset Simulation (R)"
          className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
        >
          <RotateCcw className="w-4 h-4" />
        </button>

        <button
          onClick={onStepBack}
          disabled={currentStepIndex <= 0}
          title="Step Back (Left Arrow)"
          className={`p-2 rounded-lg transition-colors ${
            currentStepIndex <= 0
              ? 'bg-slate-800/40 text-slate-600 cursor-not-allowed'
              : 'bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white'
          }`}
        >
          <SkipBack className="w-4 h-4" />
        </button>

        <button
          onClick={isPlaying ? onPause : onPlay}
          title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
          className="px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-500 text-white font-medium flex items-center gap-1.5 shadow-lg shadow-brand-600/30 transition-all"
        >
          {isPlaying ? (
            <>
              <Pause className="w-4 h-4 fill-white" />
              <span className="text-xs">Pause</span>
            </>
          ) : (
            <>
              <Play className="w-4 h-4 fill-white" />
              <span className="text-xs">
                {currentStepIndex >= totalSteps - 1 ? 'Replay' : 'Play'}
              </span>
            </>
          )}
        </button>

        <button
          onClick={onStepForward}
          disabled={currentStepIndex >= totalSteps - 1}
          title="Step Forward (Right Arrow)"
          className={`p-2 rounded-lg transition-colors ${
            currentStepIndex >= totalSteps - 1
              ? 'bg-slate-800/40 text-slate-600 cursor-not-allowed'
              : 'bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white'
          }`}
        >
          <SkipForward className="w-4 h-4" />
        </button>

        {/* Step Indicator */}
        <div className="text-xs font-mono text-slate-400 pl-2">
          Step <span className="text-brand-400 font-bold">{currentStepIndex + 1}</span> of{' '}
          <span className="text-slate-200">{totalSteps}</span>
        </div>
      </div>

      {/* Progress Scrubber */}
      <div className="flex-1 w-full max-w-md flex items-center gap-2">
        <input
          type="range"
          min="0"
          max={Math.max(0, totalSteps - 1)}
          value={currentStepIndex}
          onChange={(e) => onJumpToStep(Number(e.target.value))}
          className="w-full accent-brand-500 cursor-pointer h-2 bg-slate-950 rounded-lg"
        />
      </div>

      {/* Speed Controls & Hotkey Legend */}
      <div className="flex items-center space-x-3">
        <div className="flex items-center space-x-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
          <Gauge className="w-3.5 h-3.5 text-slate-500 ml-1" />
          {speeds.map((s) => (
            <button
              key={s}
              onClick={() => onChangeSpeed(s)}
              className={`px-1.5 py-0.5 text-[11px] font-mono rounded transition-colors ${
                speed === s
                  ? 'bg-brand-600 text-white font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {s}x
            </button>
          ))}
        </div>

        <div className="hidden xl:flex items-center gap-1.5 text-[10px] text-slate-500 font-mono">
          <span className="px-1 py-0.5 bg-slate-800 rounded text-slate-400">Space</span>
          <span>Play/Pause</span>
          <span className="px-1 py-0.5 bg-slate-800 rounded text-slate-400">←/→</span>
          <span>Step</span>
        </div>
      </div>
    </div>
  );
};
