import { useState, useEffect, useCallback } from 'react';
import type { Novel, NovelMetadata, Chapter } from '../types';
import { storage } from '../utils/storage';

export function useNovels() {
  const [novels, setNovels] = useState<NovelMetadata[]>([]);
  const [currentNovel, setCurrentNovel] = useState<Novel | null>(null);
  const [currentNovelId, setCurrentNovelId] = useState<string | null>(null);
  const [currentChapterId, setCurrentChapterId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load novels on mount
  useEffect(() => {
    async function loadNovels() {
      setIsLoading(true);
      try {
        const metadata = await storage.getNovelMetadata();
        setNovels(metadata);

        // Restore current state
        const savedNovelId = storage.getCurrentNovelId();
        const savedChapterId = storage.getCurrentChapterId();

        if (savedNovelId) {
          const novel = await storage.getNovelById(savedNovelId);
          if (novel) {
            setCurrentNovel(novel);
            setCurrentNovelId(savedNovelId);

            if (savedChapterId && novel.chapters.some((c) => c.id === savedChapterId)) {
              setCurrentChapterId(savedChapterId);
            }
          }
        }
      } catch (error) {
        console.error('Error loading novels:', error);
      } finally {
        setIsLoading(false);
      }
    }

    loadNovels();
  }, []);

  const importNovel = useCallback(async (novel: Novel): Promise<{ success: boolean; message: string }> => {
    const result = await storage.addNovel(novel);

    if (result.success) {
      // Refresh metadata
      const metadata = await storage.getNovelMetadata();
      setNovels(metadata);

      return { success: true, message: `Đã import truyện "${novel.title}" thành công` };
    }

    return result;
  }, []);

  const selectNovel = useCallback(async (novelId: string, autoSelectFirstChapter = false) => {
    if (!novelId) {
      // Clear selection
      setCurrentNovel(null);
      setCurrentNovelId(null);
      setCurrentChapterId(null);
      storage.saveCurrentNovelId(null);
      storage.saveCurrentChapterId(null);
      return;
    }

    const novel = await storage.getNovelById(novelId);
    if (novel) {
      setCurrentNovel(novel);
      setCurrentNovelId(novelId);
      storage.saveCurrentNovelId(novelId);

      // Select first chapter if autoSelectFirstChapter is true (for backward compatibility)
      if (autoSelectFirstChapter && novel.chapters.length > 0) {
        const firstChapterId = novel.chapters[0].id;
        setCurrentChapterId(firstChapterId);
        storage.saveCurrentChapterId(firstChapterId);
      }
    }
  }, []);

  const selectChapter = useCallback((chapterId: string) => {
    if (currentNovel && currentNovel.chapters.some((c) => c.id === chapterId)) {
      setCurrentChapterId(chapterId);
      storage.saveCurrentChapterId(chapterId);
    }
  }, [currentNovel]);

  const getCurrentChapter = useCallback((): { chapter: Chapter | null; index: number } => {
    if (!currentNovel || !currentChapterId) {
      return { chapter: null, index: -1 };
    }

    const index = currentNovel.chapters.findIndex((c) => c.id === currentChapterId);
    return {
      chapter: index >= 0 ? currentNovel.chapters[index] : null,
      index,
    };
  }, [currentNovel, currentChapterId]);

  const getNextChapterId = useCallback((): string | null => {
    const { index } = getCurrentChapter();
    if (index >= 0 && currentNovel && index < currentNovel.chapters.length - 1) {
      return currentNovel.chapters[index + 1].id;
    }
    return null;
  }, [getCurrentChapter, currentNovel]);

  const getPreviousChapterId = useCallback((): string | null => {
    const { index } = getCurrentChapter();
    if (index > 0 && currentNovel) {
      return currentNovel.chapters[index - 1].id;
    }
    return null;
  }, [getCurrentChapter, currentNovel]);

  const getCurrentChapterIdForNovel = useCallback(async (novelId: string): Promise<string | null> => {
    // Check if this novel is currently selected
    if (currentNovelId === novelId && currentChapterId) {
      return currentChapterId;
    }
    
    // Check localStorage for saved chapter
    const savedNovelId = storage.getCurrentNovelId();
    if (savedNovelId === novelId) {
      const savedChapterId = storage.getCurrentChapterId();
      if (savedChapterId) {
        // Verify chapter exists in novel
        const novel = await storage.getNovelById(novelId);
        if (novel && novel.chapters.some((c) => c.id === savedChapterId)) {
          return savedChapterId;
        }
      }
    }
    
    return null;
  }, [currentNovelId, currentChapterId]);

  const deleteNovel = useCallback(async (novelId: string): Promise<void> => {
    await storage.deleteNovel(novelId);

    // If deleted novel is currently selected, clear selection
    if (currentNovelId === novelId) {
      setCurrentNovel(null);
      setCurrentNovelId(null);
      setCurrentChapterId(null);
      storage.saveCurrentNovelId(null);
      storage.saveCurrentChapterId(null);
    }

    // Refresh metadata
    const metadata = await storage.getNovelMetadata();
    setNovels(metadata);
  }, [currentNovelId]);

  return {
    novels,
    currentNovel,
    currentNovelId,
    currentChapterId,
    isLoading,
    importNovel,
    selectNovel,
    selectChapter,
    deleteNovel,
    getCurrentChapter,
    getNextChapterId,
    getPreviousChapterId,
    getCurrentChapterIdForNovel,
  };
}
