import { ArrowLeft, Settings } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ChapterList } from "../components/ChapterList";
import { ChapterListButton } from "../components/ChapterListButton";
import { ImportButton } from "../components/ImportButton";
import { PlayerControls } from "../components/PlayerControls";
import { ReadingView, type ReadingViewRef } from "../components/ReadingView";
import { SettingsModal } from "../components/SettingsModal";
import { useNovels } from "../hooks/useNovels";
import { useSpeechSynthesis } from "../hooks/useSpeechSynthesis";
import { useTimer } from "../hooks/useTimer";
import { splitTextNested } from "../utils/helper";

export function ChapterDetailPage() {
	const { novelId, chapterId } = useParams<{
		novelId: string;
		chapterId: string;
	}>();
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
		vietnameseVoices,
		selectedVoice,
		rate,
		pitch,
		pause,
		stop,
		changeVoice: originalChangeVoice,
		changeRate: originalChangeRate,
		changePitch: originalChangePitch,
		voices: allVoices,
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
	const [wasPlayingBeforeChapterChange, setWasPlayingBeforeChapterChange] =
		useState(false);
	const [currentParagraphIndex, setCurrentParagraphIndex] = useState(0);
	const [errorMessage, setErrorMessage] = useState<string | null>(null);
	const [currentSegmentId, setCurrentSegmentId] = useState<string | null>(null);
	const [isSpeaking, setIsSpeaking] = useState(false);
	const readingViewRef = useRef<ReadingViewRef>(null);
	const synthRef = useRef<SpeechSynthesis | null>(null);
	const currentSegmentIndexRef = useRef(0);
	const flattenedSegmentsRef = useRef<
		Array<{ text: string; id: string; type: string }>
	>([]);

	// Wrap change functions to sync state
	const changeVoice = useCallback(
		(voiceName: string) => {
			if (isSpeaking && synthRef.current) {
				synthRef.current.cancel();
				setIsSpeaking(false);
				setCurrentSegmentId(null);
			}
			originalChangeVoice(voiceName);
		},
		[isSpeaking, originalChangeVoice],
	);

	const changeRate = useCallback(
		(newRate: number) => {
			if (isSpeaking && synthRef.current) {
				synthRef.current.cancel();
				setIsSpeaking(false);
				setCurrentSegmentId(null);
			}
			originalChangeRate(newRate);
		},
		[isSpeaking, originalChangeRate],
	);

	const changePitch = useCallback(
		(newPitch: number) => {
			if (isSpeaking && synthRef.current) {
				synthRef.current.cancel();
				setIsSpeaking(false);
				setCurrentSegmentId(null);
			}
			originalChangePitch(newPitch);
		},
		[isSpeaking, originalChangePitch],
	);

	// Initialize speech synthesis
	useEffect(() => {
		synthRef.current = window.speechSynthesis;
	}, []);

	// Load novel and chapter
	useEffect(() => {
		if (novelId && currentNovel?.id !== novelId) {
			selectNovel(novelId);
		}
	}, [novelId, currentNovel?.id, selectNovel]);

	useEffect(() => {
		if (chapterId && currentChapterId !== chapterId && currentNovel) {
			selectChapter(chapterId);
			// Reset segment index when chapter changes
			currentSegmentIndexRef.current = 0;
			setCurrentSegmentId(null);
		}
	}, [chapterId, currentChapterId, currentNovel, selectChapter]);

	const { chapter } = getCurrentChapter();
	const nextChapterId = getNextChapterId();
	const previousChapterId = getPreviousChapterId();

	// Split text into nested segments with minLength = 500
	const nestedResult = useMemo(() => {
		if (!chapter) return [];
		try {
			return splitTextNested(chapter.content, 500);
		} catch (error) {
			console.error("Error splitting text:", error);
			return [];
		}
	}, [chapter?.content]);

	// Flatten nested result
	const flattenedSegments = useMemo(() => {
		return nestedResult.flatMap((item) => {
			if (item?.segments?.length === 0) {
				return {
					text: item.text,
					type: item.type as string,
					id: item.id,
				};
			}
			return (
				item?.segments?.map((s) => {
					return {
						text: s.text,
						type: s.type,
						id: s.id,
					};
				}) || []
			);
		});
	}, [nestedResult]);

	// Update ref when segments change
	useEffect(() => {
		flattenedSegmentsRef.current = flattenedSegments;
	}, [flattenedSegments]);

	// Speak next segment
	const speakNextSegment = useCallback(
		(index: number) => {
			if (!synthRef.current || !chapter) return;

			const segments = flattenedSegmentsRef.current;
			if (index >= segments.length) {
				// Finished reading all segments
				setIsSpeaking(false);
				setCurrentSegmentId(null);

				if (timerSettings.enabled && timerSettings.type === "chapter") {
					const newCount = chaptersPlayed + 1;
					setChaptersPlayed(newCount);
					if (newCount >= timerSettings.value) {
						stopTimer();
						return;
					}
				}

				if (nextChapterId && novelId) {
					// Set flag to auto-resume reading in next chapter
					setWasPlayingBeforeChapterChange(true);
					navigate(`/novel/${novelId}/chapter/${nextChapterId}`);
				}
				return;
			}

			const segment = segments[index];
			setCurrentSegmentId(segment.id);
			currentSegmentIndexRef.current = index;

			// Scroll to segment - use setTimeout to ensure DOM is updated
			setTimeout(() => {
				readingViewRef.current?.scrollToSegment(segment.id);
			}, 100);

			const utterance = new SpeechSynthesisUtterance(segment.text);

			// Set voice
			if (selectedVoice) {
				const voices = synthRef.current.getVoices();
				const voice = voices.find((v) => v.name === selectedVoice);
				if (voice) {
					utterance.voice = voice;
				}
			}

			utterance.lang = "vi-VN";
			utterance.rate = rate;
			utterance.pitch = pitch;

			utterance.onend = () => {
				setCurrentSegmentId(null);
				speakNextSegment(index + 1);
			};

			utterance.onerror = () => {
				setErrorMessage("Có lỗi xảy ra khi đọc. Vui lòng thử lại.");
				setIsSpeaking(false);
				setCurrentSegmentId(null);
			};

			synthRef.current.speak(utterance);
		},
		[
			chapter,
			selectedVoice,
			rate,
			pitch,
			timerSettings,
			chaptersPlayed,
			nextChapterId,
			novelId,
			navigate,
			stopTimer,
		],
	);

	const handlePlayPause = () => {
		if (!chapter) return;

		if (isSpeaking) {
			// Stop speaking
			if (synthRef.current) {
				synthRef.current.cancel();
			}
			setIsSpeaking(false);
			setCurrentSegmentId(null);
			stop();
		} else {
			if (timerSettings.enabled && !isTimerActive) {
				startTimer();
			}

			setErrorMessage(null); // Clear previous error
			setIsSpeaking(true);
			currentSegmentIndexRef.current = 0;
			speakNextSegment(0);
		}
	};

	// Handle chapter change - stop current speech and resume if was playing
	useEffect(() => {
		if (chapter && wasPlayingBeforeChapterChange) {
			if (synthRef.current) {
				synthRef.current.cancel();
			}
			setIsSpeaking(false);
			setCurrentSegmentId(null);
			setWasPlayingBeforeChapterChange(false);
			setTimeout(() => {
				setIsSpeaking(true);
				currentSegmentIndexRef.current = 0;
				speakNextSegment(0);
			}, 100);
		} else if (chapter && isSpeaking) {
			if (synthRef.current) {
				synthRef.current.cancel();
			}
			setIsSpeaking(false);
			setCurrentSegmentId(null);
		}
	}, [chapterId, speakNextSegment]); // eslint-disable-line react-hooks/exhaustive-deps

	// Reset chapters played when timer settings change
	useEffect(() => {
		if (timerSettings.type === "chapter") {
			setChaptersPlayed(0);
		}
	}, [timerSettings.type, timerSettings.value]);

	// Cleanup on unmount
	useEffect(() => {
		return () => {
			if (synthRef.current) {
				synthRef.current.cancel();
			}
			setIsSpeaking(false);
			setCurrentSegmentId(null);
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
			if (synthRef.current) {
				synthRef.current.cancel();
			}
			setIsSpeaking(false);
			setCurrentSegmentId(null);
			stop();
			navigate(`/novel/${novelId}/chapter/${previousChapterId}`);
		}
	};

	const handleNext = () => {
		if (nextChapterId && novelId) {
			if (synthRef.current) {
				synthRef.current.cancel();
			}
			setIsSpeaking(false);
			setCurrentSegmentId(null);
			stop();
			navigate(`/novel/${novelId}/chapter/${nextChapterId}`);
		}
	};


	// Get paragraphs for current chapter
	const getParagraphs = () => {
		if (!chapter) return [];
		return chapter.content.split("\n").filter((p) => p.trim().length > 0);
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

	// Handle segment click - start reading from that segment
	const handleSegmentClick = useCallback(
		(segmentId: string) => {
			if (!chapter) return;

			const segments = flattenedSegmentsRef.current;
			const segmentIndex = segments.findIndex((s) => s.id === segmentId);

			if (segmentIndex === -1) return;

			// Stop current speech if playing
			if (synthRef.current) {
				synthRef.current.cancel();
			}
			setIsSpeaking(false);
			setCurrentSegmentId(null);

			// Scroll to segment first
			setTimeout(() => {
				readingViewRef.current?.scrollToSegment(segmentId);
			}, 50);

			// Start reading from this segment
			setTimeout(() => {
				if (timerSettings.enabled && !isTimerActive) {
					startTimer();
				}
				setErrorMessage(null);
				setIsSpeaking(true);
				currentSegmentIndexRef.current = segmentIndex;
				speakNextSegment(segmentIndex);
			}, 150);
		},
		[chapter, timerSettings, isTimerActive, startTimer, speakNextSegment],
	);

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
	}, [chapter]);

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
			<header className="sticky top-0 z-30 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border-b border-slate-200 dark:border-slate-700 safe-area-inset-top">
				<div className="max-w-7xl mx-auto px-4 py-3">
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-3 flex-1 min-w-0">
							<button
								type="button"
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
								type="button"
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
					{/* Error Message */}
					{/* {errorMessage && (
						<div className="mx-4 mt-4 p-4 bg-amber-50 dark:bg-amber-900 border border-amber-200 dark:border-amber-800 rounded-lg absolute top-12 left-0 right-0">
							<div className="flex items-start justify-between gap-2">
								<p className="text-sm text-amber-800 dark:text-amber-200 flex-1">
									{errorMessage}
								</p>
								<button
									type="button"
									onClick={() => setErrorMessage(null)}
									className="text-amber-600 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-200 cursor-pointer"
									aria-label="Đóng thông báo"
								>
									✕
								</button>
							</div>
						</div>
					)} */}

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
							nestedResult={nestedResult}
							currentSegmentId={currentSegmentId}
							onSegmentClick={handleSegmentClick}
						/>
					</div>
				</div>
			</main>

			{/* Player Controls - Fixed Bottom (Mobile) */}
			<div className="fixed bottom-0 left-0 right-0 md:relative md:border-t md:border-slate-200 md:dark:border-slate-700 safe-area-inset-bottom">
				<PlayerControls
					isPlaying={isSpeaking}
					onPlay={handlePlayPause}
					onPause={() => {
						if (synthRef.current) {
							synthRef.current.cancel();
						}
						setIsSpeaking(false);
						setCurrentSegmentId(null);
						pause();
					}}
					onPrevious={handlePrevious}
					onNext={handleNext}
					onPreviousParagraph={handlePreviousParagraph}
					onNextParagraph={handleNextParagraph}
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
				allVoices={allVoices}
				selectedVoice={selectedVoice}
				rate={rate}
				pitch={pitch}
				timerSettings={timerSettings}
				engine="native"
				onEngineChange={() => {
					// Engine is always native now
				}}
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
