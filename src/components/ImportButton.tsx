import { useRef, useState } from 'react';
import { Upload, Loader2 } from 'lucide-react';
import type { Novel } from '../types';
import { storage } from '../utils/storage';

interface ImportButtonProps {
  onImport: (novel: Novel) => Promise<{ success: boolean; message: string }>;
}

export function ImportButton({ onImport }: ImportButtonProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    setProgress(0);
    setMessage(null);

    try {
      // Step 1: Read file
      setProgress(10);
      const text = await file.text();
      setProgress(30);

      // Step 2: Parse JSON (async to avoid blocking)
      setProgress(40);
      const novel: Novel = await storage.parseJSONAsync<Novel>(text);
      setProgress(60);

      // Step 3: Validate structure
      if (!novel.id || !novel.title || !novel.author || !Array.isArray(novel.chapters)) {
        throw new Error('Cấu trúc JSON không hợp lệ');
      }

      for (const chapter of novel.chapters) {
        if (!chapter.id || !chapter.title || typeof chapter.content !== 'string') {
          throw new Error('Cấu trúc chương không hợp lệ');
        }
      }

      setProgress(70);

      // Step 4: Import to storage (IndexedDB)
      setProgress(80);
      const result = await onImport(novel);
      setProgress(90);

      setMessage({ text: result.message, type: result.success ? 'success' : 'error' });
      setProgress(100);

      // Clear message after 5 seconds
      setTimeout(() => setMessage(null), 5000);

      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Lỗi không xác định';
      setMessage({ text: `Lỗi khi import: ${errorMessage}`, type: 'error' });
      setTimeout(() => setMessage(null), 5000);
    } finally {
      setIsLoading(false);
      setTimeout(() => setProgress(0), 500);
    }
  };

  return (
    <div className="relative">
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        onChange={handleFileSelect}
        className="hidden"
        id="import-file-input"
        disabled={isLoading}
      />
      <label
        htmlFor="import-file-input"
        className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg cursor-pointer transition-colors duration-200 ${
          isLoading
            ? 'bg-slate-400 dark:bg-slate-600 cursor-not-allowed'
            : 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-200'
        }`}
      >
        {isLoading ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="text-sm font-medium">Đang xử lý...</span>
          </>
        ) : (
          <>
            <Upload className="w-5 h-5" />
            <span className="text-sm font-medium">Import JSON</span>
          </>
        )}
      </label>
      {isLoading && (
        <div className="absolute top-full left-0 right-0 mt-2 h-1 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-slate-900 dark:bg-slate-100 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
      {message && (
        <div
          className={`absolute top-full left-0 mt-2 px-3 py-2 rounded-lg text-sm z-50 max-w-xs ${
            message.type === 'success'
              ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
              : 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
          }`}
        >
          {message.text}
        </div>
      )}
    </div>
  );
}
