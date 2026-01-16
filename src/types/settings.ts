export interface SpeechSettings {
  rate: number; // 0.1 to 10, default 1
  pitch: number; // 0 to 2, default 1
  voice: string | null;
}

export interface TimerSettings {
  enabled: boolean;
  type: 'chapter' | 'time'; // 'chapter' = số chương, 'time' = thời gian (phút)
  value: number; // số chương hoặc số phút
}

export interface AppSettings {
  speech: SpeechSettings;
  timer: TimerSettings;
}

