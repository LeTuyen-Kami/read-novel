import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Settings } from 'lucide-react';
import { ChapterList } from '../components/ChapterList';
import { ChapterListButton } from '../components/ChapterListButton';
import { PlayerControls } from '../components/PlayerControls';
import { ReadingView, type ReadingViewRef } from '../components/ReadingView';
import { SettingsModal } from '../components/SettingsModal';
import { ImportButton } from '../components/ImportButton';
import { useNovels } from '../hooks/useNovels';
import { useSpeechSynthesis } from '../hooks/useSpeechSynthesis';
import { useTimer } from '../hooks/useTimer';

export function ChapterDetailPage() {
  const { novelId, chapterId } = useParams<{ novelId: string; chapterId: string }>();
  const navigate = useNavigate();
  const {
    currentNovel,
    currentChapterId,
    importNovel,
    selectNovel,
    selectChapter,
    getCurrentChapter,
    getNextChapterId,
    getPreviousChapterId,
  } = useNovels();

  const {
    voices,
    vietnameseVoices,
    selectedVoice,
    rate,
    pitch,
    progress,
    isPlaying,
    speak,
    pause,
    stop,
    changeVoice,
    changeRate,
    changePitch,
  } = useSpeechSynthesis();

  const {
    isActive: isTimerActive,
    timeLeft,
    timerSettings,
    startTimer,
    stopTimer,
    updateTimerSettings,
    formatTime,
  } = useTimer(() => {
    stop();
  });

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isChapterListOpen, setIsChapterListOpen] = useState(false);
  const [chaptersPlayed, setChaptersPlayed] = useState(0);
  const [wasPlayingBeforeChapterChange, setWasPlayingBeforeChapterChange] = useState(false);
  const [currentParagraphIndex, setCurrentParagraphIndex] = useState(0);
  const readingViewRef = useRef<ReadingViewRef>(null);

  // Load novel and chapter
  useEffect(() => {
    if (novelId && currentNovel?.id !== novelId) {
      selectNovel(novelId);
    }
  }, [novelId, currentNovel?.id, selectNovel]);

  useEffect(() => {
    if (chapterId && currentChapterId !== chapterId && currentNovel) {
      selectChapter(chapterId);
    }
  }, [chapterId, currentChapterId, currentNovel, selectChapter]);

  const { chapter } = getCurrentChapter();
  const nextChapterId = getNextChapterId();
  const previousChapterId = getPreviousChapterId();

  const handlePlayPause = () => {
    if (!chapter) return;

    if (isPlaying) {
      pause();
    } else {
      if (timerSettings.enabled && !isTimerActive) {
        startTimer();
      }

      speak(chapter.content, () => {
        if (timerSettings.enabled && timerSettings.type === 'chapter') {
          const newCount = chaptersPlayed + 1;
          setChaptersPlayed(newCount);
          if (newCount >= timerSettings.value) {
            stopTimer();
            return;
          }
        }

        if (nextChapterId && novelId) {
          navigate(`/novel/${novelId}/chapter/${nextChapterId}`);
        }
      });
    }
  };

  // Handle chapter change - stop current speech and resume if was playing
  useEffect(() => {
    if (chapter && wasPlayingBeforeChapterChange) {
      stop();
      setWasPlayingBeforeChapterChange(false);
      setTimeout(() => {
        speak(chapter.content, () => {
          if (timerSettings.enabled && timerSettings.type === 'chapter') {
            const newCount = chaptersPlayed + 1;
            setChaptersPlayed(newCount);
            if (newCount >= timerSettings.value) {
              stopTimer();
              return;
            }
          }

          if (nextChapterId && novelId) {
            navigate(`/novel/${novelId}/chapter/${nextChapterId}`);
          }
        });
      }, 100);
    } else if (chapter && isPlaying) {
      stop();
    }
  }, [chapterId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Reset chapters played when timer settings change
  useEffect(() => {
    if (timerSettings.type === 'chapter') {
      setChaptersPlayed(0);
    }
  }, [timerSettings.type, timerSettings.value]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stop();
      stopTimer();
    };
  }, [stop, stopTimer]);

  const handleSelectChapter = (selectedChapterId: string) => {
    if (novelId) {
      navigate(`/novel/${novelId}/chapter/${selectedChapterId}`);
    }
  };

  const handlePrevious = () => {
    if (previousChapterId && novelId) {
      stop();
      navigate(`/novel/${novelId}/chapter/${previousChapterId}`);
    }
  };

  const handleNext = () => {
    if (nextChapterId && novelId) {
      stop();
      navigate(`/novel/${novelId}/chapter/${nextChapterId}`);
    }
  };

  // Get paragraphs for current chapter
  const getParagraphs = () => {
    if (!chapter) return [];
    return chapter.content.split('\n').filter((p) => p.trim().length > 0);
  };

  const paragraphs = getParagraphs();
  const totalParagraphs = paragraphs.length;

  const handlePreviousParagraph = () => {
    if (currentParagraphIndex > 0) {
      const newIndex = currentParagraphIndex - 1;
      setCurrentParagraphIndex(newIndex);
      readingViewRef.current?.scrollToParagraph(newIndex);
    }
  };

  const handleNextParagraph = () => {
    if (currentParagraphIndex < totalParagraphs - 1) {
      const newIndex = currentParagraphIndex + 1;
      setCurrentParagraphIndex(newIndex);
      readingViewRef.current?.scrollToParagraph(newIndex);
    }
  };

  // Update current paragraph index based on scroll
  useEffect(() => {
    if (!readingViewRef.current || !chapter) return;

    const updateParagraphIndex = () => {
      const index = readingViewRef.current?.getCurrentParagraphIndex() || 0;
      setCurrentParagraphIndex(index);
    };

    // Update on scroll
    const interval = setInterval(updateParagraphIndex, 500);
    updateParagraphIndex(); // Initial update

    return () => clearInterval(interval);
  }, [chapter?.id]);

  if (!currentNovel || !chapter) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-slate-500 dark:text-slate-400">Đang tải...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-slate-900">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border-b border-slate-200 dark:border-slate-700">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <button
                onClick={() => navigate(`/novel/${novelId}`)}
                className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors duration-200 cursor-pointer shrink-0"
                aria-label="Quay lại danh sách chương"
              >
                <ArrowLeft className="w-5 h-5 text-slate-700 dark:text-slate-300" />
              </button>
              <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100 truncate">
                {currentNovel.title}
              </h1>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsSettingsOpen(true)}
                className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors duration-200 cursor-pointer"
                aria-label="Cài đặt"
              >
                <Settings className="w-5 h-5 text-slate-700 dark:text-slate-300" />
              </button>
              <ImportButton onImport={importNovel} />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden pb-24 md:pb-4">
        <div className="max-w-7xl mx-auto h-full flex flex-col">
          {/* Chapter List Button - Desktop */}
          <div className="hidden md:block sticky top-16 z-20 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border-b border-slate-200 dark:border-slate-700">
            <div className="max-w-7xl mx-auto px-4 py-3">
              <ChapterListButton
                onClick={() => setIsChapterListOpen(true)}
                chapterCount={currentNovel.chapters.length}
              />
            </div>
          </div>

          {/* Chapter List Button - Mobile */}
          <div className="md:hidden px-4 py-3 border-b border-slate-200 dark:border-slate-700 shrink-0">
            <ChapterListButton
              onClick={() => setIsChapterListOpen(true)}
              chapterCount={currentNovel.chapters.length}
            />
          </div>

          {/* Reading View */}
          <div className="flex-1 min-h-0">
            <ReadingView
              ref={readingViewRef}
              chapter={chapter}
              novelId={novelId || null}
              currentParagraphIndex={currentParagraphIndex}
            />
          </div>
        </div>
      </main>

      {/* Player Controls - Fixed Bottom (Mobile) */}
      <div className="fixed bottom-0 left-0 right-0 md:relative md:border-t md:border-slate-200 md:dark:border-slate-700">
        <PlayerControls
          isPlaying={isPlaying}
          progress={progress}
          onPlay={handlePlayPause}
          onPause={pause}
          onPrevious={handlePrevious}
          onNext={handleNext}
          onPreviousParagraph={handlePreviousParagraph}
          onNextParagraph={handleNextParagraph}
          onSeek={(percentage) => {
            console.log('Seek to:', percentage);
          }}
          canGoPrevious={!!previousChapterId}
          canGoNext={!!nextChapterId}
          canGoPreviousParagraph={currentParagraphIndex > 0}
          canGoNextParagraph={currentParagraphIndex < totalParagraphs - 1}
          chapterTitle={chapter.title}
          timeLeft={isTimerActive ? formatTime(timeLeft) : undefined}
        />
      </div>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        vietnameseVoices={vietnameseVoices}
        allVoices={voices}
        selectedVoice={selectedVoice}
        rate={rate}
        pitch={pitch}
        timerSettings={timerSettings}
        onVoiceChange={changeVoice}
        onRateChange={changeRate}
        onPitchChange={changePitch}
        onTimerSettingsChange={updateTimerSettings}
      />

      {/* Chapter List Drawer */}
      <ChapterList
        chapters={currentNovel.chapters}
        currentChapterId={currentChapterId}
        onSelect={handleSelectChapter}
        isOpen={isChapterListOpen}
        onClose={() => setIsChapterListOpen(false)}
      />
    </div>
  );
}

