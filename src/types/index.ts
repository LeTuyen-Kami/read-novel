export interface Chapter {
  id: string;
  title: string;
  content: string;
}

export interface Novel {
  id: string;
  title: string;
  author: string;
  description?: string;
  chapters: Chapter[];
}

export interface NovelMetadata {
  id: string;
  title: string;
  author: string;
  description?: string;
  chapterCount: number;
}

export interface PlaybackState {
  isPlaying: boolean;
  currentPosition: number;
}

export interface AppState {
  novels: NovelMetadata[];
  currentNovelId: string | null;
  currentChapterId: string | null;
  currentVoice: string | null;
  playbackState: PlaybackState;
}

// Re-export settings types
export type { SpeechSettings, TimerSettings, AppSettings } from './settings';

