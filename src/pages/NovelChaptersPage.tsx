import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { ImportButton } from '../components/ImportButton';
import { useNovels } from '../hooks/useNovels';

export function NovelChaptersPage() {
  const { novelId } = useParams<{ novelId: string }>();
  const navigate = useNavigate();
  const { currentNovel, importNovel, selectNovel } = useNovels();

  // Load novel if not loaded
  useEffect(() => {
    if (novelId && currentNovel?.id !== novelId) {
      selectNovel(novelId);
    }
  }, [novelId, currentNovel?.id, selectNovel]);

  const handleSelectChapter = (chapterId: string) => {
    navigate(`/novel/${novelId}/chapter/${chapterId}`);
  };

  if (!currentNovel || currentNovel.id !== novelId) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-slate-500 dark:text-slate-400">Đang tải...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-slate-900">
      <header className="sticky top-0 z-30 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border-b border-slate-200 dark:border-slate-700 safe-area-inset-top">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <button
                onClick={() => navigate('/')}
                className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors duration-200 cursor-pointer flex-shrink-0"
                aria-label="Quay lại"
              >
                <ArrowLeft className="w-5 h-5 text-slate-700 dark:text-slate-300" />
              </button>
              <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100 truncate">
                {currentNovel.title}
              </h1>
            </div>
            <ImportButton onImport={importNovel} />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto">
        {/* Chapter List */}
        <div className="px-4 py-6">
          {currentNovel.chapters.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <p className="text-slate-500 dark:text-slate-400 text-sm">
                Chưa có chương nào
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {currentNovel.chapters.map((chapter, index) => (
                <button
                  key={chapter.id}
                  onClick={() => handleSelectChapter(chapter.id)}
                  className="w-full text-left p-4 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors duration-200 cursor-pointer"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400 flex items-center justify-center text-xs font-medium">
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-medium text-slate-900 dark:text-slate-100">
                        {chapter.title}
                      </h3>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

