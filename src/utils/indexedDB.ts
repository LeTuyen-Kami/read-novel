import type { Novel, NovelMetadata } from '../types';
import { sortChapters } from './chapterSort';

const DB_NAME = 'read-novel-db';
const DB_VERSION = 1;
const STORE_NAME = 'novels';

// Initialize IndexedDB
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
  });
}

// Get novel by ID
export async function getNovelById(id: string): Promise<Novel | null> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(id);

      request.onsuccess = () => {
        const novel = request.result as Novel | null;
        if (novel && novel.chapters) {
          // Ensure chapters are sorted when loading
          novel.chapters = sortChapters(novel.chapters);
        }
        resolve(novel || null);
      };
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Error getting novel from IndexedDB:', error);
    return null;
  }
}

// Save novel
export async function saveNovel(novel: Novel): Promise<{ success: boolean; message: string }> {
  try {
    const db = await openDB();
    
    // Sort chapters before saving
    const sortedNovel: Novel = {
      ...novel,
      chapters: sortChapters(novel.chapters),
    };

    return new Promise((resolve) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(sortedNovel);

      request.onsuccess = () => {
        resolve({ success: true, message: '' });
      };

      request.onerror = () => {
        resolve({
          success: false,
          message: `Lỗi khi lưu: ${request.error?.message || 'Unknown error'}`,
        });
      };
    });
  } catch (error) {
    return {
      success: false,
      message: `Lỗi khi lưu: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

// Get all novels (metadata only)
export async function getAllNovels(): Promise<NovelMetadata[]> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => {
        const novels = request.result as Novel[];
        const metadata: NovelMetadata[] = novels.map((novel) => ({
          id: novel.id,
          title: novel.title,
          author: novel.author,
          description: novel.description,
          chapterCount: novel.chapters.length,
        }));
        resolve(metadata);
      };

      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Error getting all novels from IndexedDB:', error);
    return [];
  }
}

// Delete novel
export async function deleteNovel(id: string): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Error deleting novel from IndexedDB:', error);
  }
}

// Add novel (merge chapters if exists)
export async function addNovel(novel: Novel): Promise<{ success: boolean; message: string }> {
  try {
    const existing = await getNovelById(novel.id);

    if (existing) {
      // Merge chapters
      const existingChapterIds = new Set(existing.chapters.map((c) => c.id));
      const newChapters = novel.chapters.filter((c) => !existingChapterIds.has(c.id));

      const mergedNovel: Novel = {
        ...existing,
        ...novel,
        chapters: [...existing.chapters, ...newChapters],
      };

      // Sort merged chapters before saving
      return await saveNovel(mergedNovel);
    } else {
      // Sort chapters before saving new novel
      return await saveNovel(novel);
    }
  } catch (error) {
    return {
      success: false,
      message: `Lỗi khi thêm truyện: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

// Check if IndexedDB is available
export function isIndexedDBAvailable(): boolean {
  return typeof indexedDB !== 'undefined';
}

