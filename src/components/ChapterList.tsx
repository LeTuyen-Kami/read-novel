import { X, BookOpen, List } from 'lucide-react';
import type { Chapter } from '../types';

interface ChapterListProps {
  chapters: Chapter[];
  currentChapterId: string | null;
  onSelect: (chapterId: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

export function ChapterList({
  chapters,
  currentChapterId,
  onSelect,
  isOpen,
  onClose,
}: ChapterListProps) {
  const currentIndex = chapters.findIndex((c) => c.id === currentChapterId);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-50"
        onClick={onClose}
      />

      {/* Drawer/Modal */}
      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-white dark:bg-slate-900 shadow-xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-slate-200 dark:border-slate-700 flex-shrink-0">
          <div className="flex items-center gap-2">
            <List className="w-5 h-5 text-slate-700 dark:text-slate-300" />
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
              Danh sách chương ({chapters.length})
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors duration-200 cursor-pointer"
            aria-label="Đóng"
          >
            <X className="w-5 h-5 text-slate-700 dark:text-slate-300" />
          </button>
        </div>

        {/* Chapter List */}
        <div className="flex-1 overflow-y-auto px-4 py-4 min-h-0">
          {chapters.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <BookOpen className="w-12 h-12 text-slate-400 dark:text-slate-600 mb-4" />
              <p className="text-slate-600 dark:text-slate-400 text-sm">
                Chưa có chương nào
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              {chapters.map((chapter, index) => {
                const isCurrent = chapter.id === currentChapterId;
                return (
                  <button
                    key={chapter.id}
                    onClick={() => {
                      onSelect(chapter.id);
                      onClose();
                    }}
                    className={`w-full text-left p-3 rounded-lg border transition-colors duration-200 cursor-pointer ${
                      isCurrent
                        ? 'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-600'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium ${
                          isCurrent
                            ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900'
                            : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        {index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3
                          className={`text-sm font-medium mb-1 ${
                            isCurrent
                              ? 'text-slate-900 dark:text-slate-100'
                              : 'text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          {chapter.title}
                        </h3>
                        {isCurrent && (
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            Đang đọc
                          </p>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer - Current Chapter Info */}
        {currentIndex >= 0 && (
          <div className="px-4 py-3 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 flex-shrink-0">
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Chương {currentIndex + 1} / {chapters.length}
            </p>
          </div>
        )}
      </div>
    </>
  );
}

