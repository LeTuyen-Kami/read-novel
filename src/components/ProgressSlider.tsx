import { useRef, useState, useEffect } from 'react';

interface ProgressSliderProps {
  progress: number; // 0-100
  onSeek?: (percentage: number) => void;
  disabled?: boolean;
}

export function ProgressSlider({ progress, onSeek, disabled = false }: ProgressSliderProps) {
  const sliderRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleMove = (e: React.MouseEvent | MouseEvent) => {
    if (!sliderRef.current || !onSeek) return;
    const rect = sliderRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
    onSeek(percentage);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (disabled || !onSeek) return;
    setIsDragging(true);
    handleMove(e);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging || disabled || !onSeek) return;
    handleMove(e);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Add global mouse events for dragging
  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging]);

  return (
    <div className="w-full">
      <div
        ref={sliderRef}
        className="relative h-2 bg-slate-200 dark:bg-slate-700 rounded-full cursor-pointer"
        onMouseDown={handleMouseDown}
      >
        <div
          className="absolute top-0 left-0 h-full bg-slate-900 dark:bg-slate-100 rounded-full transition-all duration-100"
          style={{ width: `${progress}%` }}
        />
        <div
          className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-slate-900 dark:bg-slate-100 rounded-full border-2 border-white dark:border-slate-900 shadow-md transition-all duration-100 hover:scale-110"
          style={{ left: `calc(${progress}% - 8px)` }}
        />
      </div>
    </div>
  );
}

