const STORAGE_KEY_PREFIX = 'readingProgress_';

export interface ReadingProgress {
  novelId: string;
  chapterId: string;
  scrollPosition: number; // Scroll position in pixels
  progress: number; // 0-100 percentage
  lastUpdated: number; // Timestamp
}

export const readingProgressStorage = {
  // Save reading progress for a chapter
  saveProgress(novelId: string, chapterId: string, scrollPosition: number, progress: number): void {
    try {
      const key = `${STORAGE_KEY_PREFIX}${novelId}_${chapterId}`;
      const data: ReadingProgress = {
        novelId,
        chapterId,
        scrollPosition,
        progress,
        lastUpdated: Date.now(),
      };
      localStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
      console.error('Error saving reading progress:', error);
    }
  },

  // Get reading progress for a chapter
  getProgress(novelId: string, chapterId: string): ReadingProgress | null {
    try {
      const key = `${STORAGE_KEY_PREFIX}${novelId}_${chapterId}`;
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Error getting reading progress:', error);
      return null;
    }
  },

  // Clear progress for a chapter
  clearProgress(novelId: string, chapterId: string): void {
    try {
      const key = `${STORAGE_KEY_PREFIX}${novelId}_${chapterId}`;
      localStorage.removeItem(key);
    } catch (error) {
      console.error('Error clearing reading progress:', error);
    }
  },

  // Clear all progress for a novel
  clearNovelProgress(novelId: string): void {
    try {
      const keys = Object.keys(localStorage);
      keys.forEach((key) => {
        if (key.startsWith(`${STORAGE_KEY_PREFIX}${novelId}_`)) {
          localStorage.removeItem(key);
        }
      });
    } catch (error) {
      console.error('Error clearing novel progress:', error);
    }
  },
};

