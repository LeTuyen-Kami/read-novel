import { List } from 'lucide-react';

interface ChapterListButtonProps {
  onClick: () => void;
  chapterCount?: number;
}

export function ChapterListButton({ onClick, chapterCount }: ChapterListButtonProps) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg cursor-pointer transition-colors duration-200 hover:bg-slate-50 dark:hover:bg-slate-800"
      aria-label="Danh sách chương"
    >
      <List className="w-4 h-4 text-slate-700 dark:text-slate-300" />
      <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
        Danh sách chương
        {chapterCount !== undefined && (
          <span className="ml-1 text-slate-500 dark:text-slate-400">
            ({chapterCount})
          </span>
        )}
      </span>
    </button>
  );
}

