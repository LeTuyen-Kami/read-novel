import type { AppSettings, SpeechSettings, TimerSettings } from '../types/settings';

const STORAGE_KEY = 'appSettings';

const DEFAULT_SETTINGS: AppSettings = {
  speech: {
    rate: 1,
    pitch: 1,
    voice: null,
  },
  timer: {
    enabled: false,
    type: 'time',
    value: 30, // 30 phút mặc định
  },
};

export const settingsStorage = {
  getSettings(): AppSettings {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (data) {
        const parsed = JSON.parse(data);
        // Merge with defaults to handle missing fields
        return {
          speech: { ...DEFAULT_SETTINGS.speech, ...parsed.speech },
          timer: { ...DEFAULT_SETTINGS.timer, ...parsed.timer },
        };
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
    return DEFAULT_SETTINGS;
  },

  saveSettings(settings: AppSettings): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch (error) {
      console.error('Error saving settings:', error);
    }
  },

  getSpeechSettings(): SpeechSettings {
    return this.getSettings().speech;
  },

  saveSpeechSettings(speech: SpeechSettings): void {
    const settings = this.getSettings();
    settings.speech = speech;
    this.saveSettings(settings);
  },

  getTimerSettings(): TimerSettings {
    return this.getSettings().timer;
  },

  saveTimerSettings(timer: TimerSettings): void {
    const settings = this.getSettings();
    settings.timer = timer;
    this.saveSettings(settings);
  },
};

