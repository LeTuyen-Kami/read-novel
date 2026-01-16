import type { Novel, NovelMetadata } from '../types';
import * as idb from './indexedDB';

const STORAGE_KEYS = {
  CURRENT_NOVEL_ID: 'currentNovelId',
  CURRENT_CHAPTER_ID: 'currentChapterId',
  CURRENT_VOICE: 'currentVoice',
  PLAYBACK_STATE: 'playbackState',
} as const;

// Parse JSON in chunks to avoid blocking
async function parseJSONAsync<T>(text: string): Promise<T> {
  return new Promise((resolve, reject) => {
    // Use setTimeout to yield to browser
    setTimeout(() => {
      try {
        const result = JSON.parse(text) as T;
        resolve(result);
      } catch (error) {
        reject(error);
      }
    }, 0);
  });
}

export const storage = {
  // Check if IndexedDB is available
  isIndexedDBAvailable(): boolean {
    return idb.isIndexedDBAvailable();
  },

  // Get novel by ID (from IndexedDB)
  async getNovelById(id: string): Promise<Novel | null> {
    if (!idb.isIndexedDBAvailable()) {
      console.warn('IndexedDB not available, falling back to localStorage');
      return null;
    }
    return await idb.getNovelById(id);
  },

  // Get all novels metadata (from IndexedDB)
  async getNovelMetadata(): Promise<NovelMetadata[]> {
    if (!idb.isIndexedDBAvailable()) {
      console.warn('IndexedDB not available');
      return [];
    }
    return await idb.getAllNovels();
  },

  // Add novel (to IndexedDB)
  async addNovel(novel: Novel): Promise<{ success: boolean; message: string }> {
    if (!idb.isIndexedDBAvailable()) {
      return {
        success: false,
        message: 'IndexedDB không khả dụng. Vui lòng sử dụng trình duyệt hỗ trợ IndexedDB.',
      };
    }

    // Validate structure
    if (!novel.id || !novel.title || !novel.author || !Array.isArray(novel.chapters)) {
      return { success: false, message: 'Cấu trúc JSON không hợp lệ' };
    }

    // Validate chapters
    for (const chapter of novel.chapters) {
      if (!chapter.id || !chapter.title || typeof chapter.content !== 'string') {
        return { success: false, message: 'Cấu trúc chương không hợp lệ' };
      }
    }

    return await idb.addNovel(novel);
  },

  // Delete novel
  async deleteNovel(id: string): Promise<void> {
    if (idb.isIndexedDBAvailable()) {
      await idb.deleteNovel(id);
    }
  },

  // Current state storage (still use localStorage for small data)
  getCurrentNovelId(): string | null {
    try {
      return localStorage.getItem(STORAGE_KEYS.CURRENT_NOVEL_ID);
    } catch {
      return null;
    }
  },

  saveCurrentNovelId(id: string | null): void {
    try {
      if (id) {
        localStorage.setItem(STORAGE_KEYS.CURRENT_NOVEL_ID, id);
      } else {
        localStorage.removeItem(STORAGE_KEYS.CURRENT_NOVEL_ID);
      }
    } catch (error) {
      console.error('Failed to save current novel ID:', error);
    }
  },

  getCurrentChapterId(): string | null {
    try {
      return localStorage.getItem(STORAGE_KEYS.CURRENT_CHAPTER_ID);
    } catch {
      return null;
    }
  },

  saveCurrentChapterId(id: string | null): void {
    try {
      if (id) {
        localStorage.setItem(STORAGE_KEYS.CURRENT_CHAPTER_ID, id);
      } else {
        localStorage.removeItem(STORAGE_KEYS.CURRENT_CHAPTER_ID);
      }
    } catch (error) {
      console.error('Failed to save current chapter ID:', error);
    }
  },

  getCurrentVoice(): string | null {
    try {
      return localStorage.getItem(STORAGE_KEYS.CURRENT_VOICE);
    } catch {
      return null;
    }
  },

  saveCurrentVoice(voice: string | null): void {
    try {
      if (voice) {
        localStorage.setItem(STORAGE_KEYS.CURRENT_VOICE, voice);
      } else {
        localStorage.removeItem(STORAGE_KEYS.CURRENT_VOICE);
      }
    } catch (error) {
      console.error('Failed to save current voice:', error);
    }
  },

  // Async parse helper
  parseJSONAsync,
};
