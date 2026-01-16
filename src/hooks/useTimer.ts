import { useCallback, useEffect, useRef, useState } from 'react';
import type { TimerSettings } from '../types/settings';
import { settingsStorage } from '../utils/settingsStorage';

export function useTimer(onTimerEnd: () => void) {
  const [isActive, setIsActive] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0); // seconds
  const [timerSettings, setTimerSettings] = useState<TimerSettings>(() =>
    settingsStorage.getTimerSettings()
  );
  const intervalRef = useRef<number | null>(null);
  const initialTimeRef = useRef(0);

  // Load settings on mount
  useEffect(() => {
    const settings = settingsStorage.getTimerSettings();
    setTimerSettings(settings);
  }, []);

  // Timer countdown
  useEffect(() => {
    if (isActive && timeLeft > 0) {
      intervalRef.current = window.setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            setIsActive(false);
            onTimerEnd();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isActive, timeLeft, onTimerEnd]);

  const startTimer = useCallback(() => {
    if (!timerSettings.enabled) return;

    let seconds = 0;
    if (timerSettings.type === 'time') {
      seconds = timerSettings.value * 60; // Convert minutes to seconds
    } else {
      // For chapter-based timer, we'll need to estimate based on average chapter duration
      // This is a simplified version - you might want to track actual chapter durations
      seconds = timerSettings.value * 10 * 60; // Estimate 10 minutes per chapter
    }

    setTimeLeft(seconds);
    initialTimeRef.current = seconds;
    setIsActive(true);
  }, [timerSettings]);

  const stopTimer = useCallback(() => {
    setIsActive(false);
    setTimeLeft(0);
  }, []);

  const updateTimerSettings = useCallback((settings: TimerSettings) => {
    setTimerSettings(settings);
    settingsStorage.saveTimerSettings(settings);
    if (isActive) {
      stopTimer();
    }
  }, [isActive, stopTimer]);

  const formatTime = useCallback((seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }, []);

  return {
    isActive,
    timeLeft,
    timerSettings,
    startTimer,
    stopTimer,
    updateTimerSettings,
    formatTime,
  };
}

