import { Play, Pause, SkipBack, SkipForward, ChevronLeft, ChevronRight } from 'lucide-react';
import { ProgressSlider } from './ProgressSlider';

interface PlayerControlsProps {
  isPlaying: boolean;
  progress: number;
  onPlay: () => void;
  onPause: () => void;
  onPrevious: () => void;
  onNext: () => void;
  onPreviousParagraph?: () => void;
  onNextParagraph?: () => void;
  onSeek?: (percentage: number) => void;
  canGoPrevious: boolean;
  canGoNext: boolean;
  canGoPreviousParagraph?: boolean;
  canGoNextParagraph?: boolean;
  chapterTitle?: string;
  timeLeft?: string; // Timer display
}

export function PlayerControls({
  isPlaying,
  progress,
  onPlay,
  onPause,
  onPrevious,
  onNext,
  onPreviousParagraph,
  onNextParagraph,
  onSeek,
  canGoPrevious,
  canGoNext,
  canGoPreviousParagraph = false,
  canGoNextParagraph = false,
  chapterTitle,
  timeLeft,
}: PlayerControlsProps) {
  return (
    <div className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700">
      <div className="max-w-3xl mx-auto px-4 py-4">
        {chapterTitle && (
          <div className="text-center mb-3">
            <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
              {chapterTitle}
            </p>
          </div>
        )}

        {/* Progress Slider */}
        <div className="mb-4">
          <ProgressSlider progress={progress} onSeek={onSeek} disabled={!onSeek} />
        </div>

        {/* Timer Display */}
        {timeLeft && (
          <div className="text-center mb-3">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Hẹn giờ: {timeLeft}
            </p>
          </div>
        )}

        {/* Paragraph Navigation - Small buttons */}
        {(onPreviousParagraph || onNextParagraph) && (
          <div className="flex items-center justify-center gap-2 mb-3">
            <button
              onClick={onPreviousParagraph}
              disabled={!canGoPreviousParagraph}
              className="p-1.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 transition-colors duration-200 cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed"
              aria-label="Đoạn trước"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs text-slate-500 dark:text-slate-400 px-2">
              Đoạn
            </span>
            <button
              onClick={onNextParagraph}
              disabled={!canGoNextParagraph}
              className="p-1.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 transition-colors duration-200 cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed"
              aria-label="Đoạn tiếp"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Controls */}
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={onPrevious}
            disabled={!canGoPrevious}
            className="p-3 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors duration-200 cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-slate-100 dark:disabled:hover:bg-slate-800"
            aria-label="Chương trước"
          >
            <SkipBack className="w-5 h-5" />
          </button>

          <button
            onClick={isPlaying ? onPause : onPlay}
            className="p-4 rounded-full bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 transition-colors duration-200 cursor-pointer hover:bg-slate-800 dark:hover:bg-slate-200"
            aria-label={isPlaying ? 'Tạm dừng' : 'Phát'}
          >
            {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
          </button>

          <button
            onClick={onNext}
            disabled={!canGoNext}
            className="p-3 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors duration-200 cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-slate-100 dark:disabled:hover:bg-slate-800"
            aria-label="Chương tiếp"
          >
            <SkipForward className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
