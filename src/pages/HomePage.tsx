import { NovelSelector } from '../components/NovelSelector';
import { ImportButton } from '../components/ImportButton';
import { useNovels } from '../hooks/useNovels';
import { useNavigate } from 'react-router-dom';

export function HomePage() {
  const { novels, currentNovelId, importNovel, selectNovel, deleteNovel, getCurrentChapterIdForNovel } = useNovels();
  const navigate = useNavigate();

  const handleSelectNovel = async (novelId: string) => {
    await selectNovel(novelId);
    
    // Check if there's a saved chapter for this novel
    const savedChapterId = await getCurrentChapterIdForNovel(novelId);
    
    if (savedChapterId) {
      // Navigate to saved chapter
      navigate(`/novel/${novelId}/chapter/${savedChapterId}`);
    } else {
      // Navigate to chapters list
      navigate(`/novel/${novelId}`);
    }
  };

  const handleContinueReading = async (novelId: string) => {
    const chapterId = await getCurrentChapterIdForNovel(novelId);
    if (chapterId) {
      navigate(`/novel/${novelId}/chapter/${chapterId}`);
    } else {
      // If no saved chapter, go to chapters list
      navigate(`/novel/${novelId}`);
    }
  };

  const handleViewChapters = (novelId: string) => {
    navigate(`/novel/${novelId}`);
  };

  return (
    <div className="min-h-screen bg-white dark:bg-slate-900">
      <header className="sticky top-0 z-30 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border-b border-slate-200 dark:border-slate-700 safe-area-inset-top">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100">Đọc Truyện</h1>
            <ImportButton onImport={importNovel} />
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8">
        <NovelSelector
          novels={novels}
          currentNovelId={currentNovelId}
          onSelect={handleSelectNovel}
          onDelete={deleteNovel}
          onContinueReading={handleContinueReading}
          onViewChapters={handleViewChapters}
          getCurrentChapterId={getCurrentChapterIdForNovel}
        />
      </main>
    </div>
  );
}

