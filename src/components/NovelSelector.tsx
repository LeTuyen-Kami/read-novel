import { useState, useEffect } from 'react';
import { BookOpen, Trash2, Play, List } from 'lucide-react';
import type { NovelMetadata } from '../types';
import { ConfirmDialog } from './ConfirmDialog';

interface NovelSelectorProps {
  novels: NovelMetadata[];
  currentNovelId: string | null;
  onSelect: (novelId: string) => Promise<void>;
  onDelete: (novelId: string) => Promise<void>;
  onContinueReading?: (novelId: string) => void;
  onViewChapters?: (novelId: string) => void;
  getCurrentChapterId?: (novelId: string) => Promise<string | null>;
}

export function NovelSelector({
  novels,
  currentNovelId,
  onSelect,
  onDelete,
  onContinueReading,
  onViewChapters,
  getCurrentChapterId,
}: NovelSelectorProps) {
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string } | null>(null);
  const [chapterIds, setChapterIds] = useState<Record<string, string | null>>({});

  // Load chapter IDs for novels
  useEffect(() => {
    if (getCurrentChapterId) {
      novels.forEach(async (novel) => {
        const chapterId = await getCurrentChapterId(novel.id);
        setChapterIds((prev) => ({ ...prev, [novel.id]: chapterId }));
      });
    }
  }, [novels, getCurrentChapterId]);

  const handleDeleteClick = (e: React.MouseEvent, novel: NovelMetadata) => {
    e.stopPropagation();
    setDeleteTarget({ id: novel.id, title: novel.title });
  };

  const handleConfirmDelete = async () => {
    if (deleteTarget) {
      await onDelete(deleteTarget.id);
      setDeleteTarget(null);
    }
  };

  if (novels.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
        <BookOpen className="w-12 h-12 text-slate-400 dark:text-slate-600 mb-4" />
        <p className="text-slate-600 dark:text-slate-400 text-sm">
          Chưa có truyện nào. Hãy import file JSON để bắt đầu.
        </p>
      </div>
    );
  }

  const handleContinueReading = (e: React.MouseEvent, novelId: string) => {
    e.stopPropagation();
    if (onContinueReading) {
      onContinueReading(novelId);
    }
  };

  const handleViewChapters = (e: React.MouseEvent, novelId: string) => {
    e.stopPropagation();
    if (onViewChapters) {
      onViewChapters(novelId);
    }
  };

  return (
    <>
      <div className="space-y-2">
        {novels.map((novel) => {
          const hasReadingProgress = chapterIds[novel.id] !== null && chapterIds[novel.id] !== undefined;
          return (
            <div
              key={novel.id}
              className={`relative group rounded-lg border transition-colors duration-200 ${
                currentNovelId === novel.id
                  ? 'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-600'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              <button
                onClick={() => onSelect(novel.id).catch(console.error)}
                className="w-full text-left p-4 pr-12 pb-16 cursor-pointer"
              >
                <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-1">{novel.title}</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">{novel.author}</p>
                {novel.description && (
                  <p className="text-xs text-slate-500 dark:text-slate-500 line-clamp-2">{novel.description}</p>
                )}
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-2">
                  {novel.chapterCount} chương
                </p>
              </button>
              
              {/* Action Buttons */}
              <div className="absolute bottom-4 left-4 right-12 flex gap-2">
                {hasReadingProgress && onContinueReading && (
                  <button
                    onClick={(e) => handleContinueReading(e, novel.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-200 transition-colors duration-200 cursor-pointer"
                    aria-label="Tiếp tục đọc"
                  >
                    <Play className="w-3.5 h-3.5" />
                    <span>Tiếp tục đọc</span>
                  </button>
                )}
                {onViewChapters && (
                  <button
                    onClick={(e) => handleViewChapters(e, novel.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors duration-200 cursor-pointer"
                    aria-label="Danh sách chương"
                  >
                    <List className="w-3.5 h-3.5" />
                    <span>Danh sách chương</span>
                  </button>
                )}
              </div>

              {/* Delete Button */}
              <button
                onClick={(e) => handleDeleteClick(e, novel)}
                className="absolute top-4 right-4 p-2 rounded-lg opacity-70 group-hover:opacity-100 transition-opacity duration-200 hover:bg-red-100 dark:hover:bg-red-900/30 cursor-pointer"
                aria-label={`Xóa truyện ${novel.title}`}
              >
                <Trash2 className="w-5 h-5 text-red-600 dark:text-red-500" />
              </button>
            </div>
          );
        })}
      </div>

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        title="Xóa truyện"
        message={`Bạn có chắc chắn muốn xóa truyện "${deleteTarget?.title}"? Hành động này không thể hoàn tác.`}
        confirmText="Xóa"
        cancelText="Hủy"
        variant="danger"
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </>
  );
}
