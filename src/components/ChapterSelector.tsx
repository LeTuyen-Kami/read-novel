import { useState } from 'react';
import { ChevronDown, BookOpen } from 'lucide-react';
import type { Chapter } from '../types';

interface ChapterSelectorProps {
  chapters: Chapter[];
  currentChapterId: string | null;
  onSelect: (chapterId: string) => void;
}

export function ChapterSelector({ chapters, currentChapterId, onSelect }: ChapterSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);

  const currentChapter = chapters.find((c) => c.id === currentChapterId);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg cursor-pointer transition-colors duration-200 hover:bg-slate-50 dark:hover:bg-slate-800"
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <BookOpen className="w-4 h-4 text-slate-500 dark:text-slate-400 flex-shrink-0" />
          <span className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
            {currentChapter?.title || 'Chọn chương'}
          </span>
        </div>
        <ChevronDown
          className={`w-4 h-4 text-slate-500 dark:text-slate-400 flex-shrink-0 transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg z-50 max-h-64 overflow-y-auto">
            {chapters.map((chapter) => (
              <button
                key={chapter.id}
                onClick={() => {
                  onSelect(chapter.id);
                  setIsOpen(false);
                }}
                className={`w-full text-left px-4 py-2 text-sm transition-colors duration-200 cursor-pointer ${
                  currentChapterId === chapter.id
                    ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                {chapter.title}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

