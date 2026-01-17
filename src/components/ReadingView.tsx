import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import { twMerge } from "tailwind-merge";
import type { Chapter } from "../types";
import type { NestedSplitTextResult, ParagraphSegment } from "../utils/helper";
import { readingProgressStorage } from "../utils/readingProgress";

interface ReadingViewProps {
	chapter: Chapter | null;
	novelId: string | null;
	onScroll?: (scrollPosition: number, progress: number) => void;
	currentParagraphIndex?: number;
	nestedResult?: NestedSplitTextResult;
	currentSegmentId?: string | null;
	onSegmentClick?: (segmentId: string) => void;
}

export interface ReadingViewRef {
	scrollToParagraph: (index: number) => void;
	scrollToSegment: (segmentId: string) => void;
	getParagraphs: () => string[];
	getCurrentParagraphIndex: () => number;
}

export const ReadingView = forwardRef<ReadingViewRef, ReadingViewProps>(
	(
		{
			chapter,
			novelId,
			onScroll,
			currentParagraphIndex,
			nestedResult,
			currentSegmentId,
			onSegmentClick,
		},
		ref,
	) => {
		const contentRef = useRef<HTMLDivElement>(null);
		const containerRef = useRef<HTMLDivElement>(null);
		const paragraphRefsRef = useRef<(HTMLParagraphElement | null)[]>([]);
		const segmentRefsRef = useRef<Map<string, HTMLElement>>(new Map());

		const getParagraphs = () => {
			if (!chapter) return [];
			return chapter.content.split("\n").filter((p) => p.trim().length > 0);
		};

		const getCurrentParagraphIndex = (): number => {
			if (!containerRef.current || !paragraphRefsRef.current.length) return 0;

			const container = containerRef.current;
			const scrollTop = container.scrollTop;
			const containerHeight = container.clientHeight;
			const viewportCenter = scrollTop + containerHeight / 2;

			// Find paragraph closest to viewport center
			let closestIndex = 0;
			let closestDistance = Infinity;

			paragraphRefsRef.current.forEach((paraRef, index) => {
				if (!paraRef) return;
				const paraTop = paraRef.offsetTop - container.scrollTop;
				const paraCenter = paraTop + paraRef.offsetHeight / 2;
				const distance = Math.abs(viewportCenter - paraCenter);

				if (distance < closestDistance) {
					closestDistance = distance;
					closestIndex = index;
				}
			});

			return closestIndex;
		};

		const scrollToParagraph = (index: number) => {
			if (!containerRef.current || !paragraphRefsRef.current[index]) return;

			const paraRef = paragraphRefsRef.current[index];
			if (paraRef && containerRef.current) {
				const container = containerRef.current;
				const paraTop = paraRef.offsetTop;
				const scrollPosition = paraTop - 123; // Scroll to show paragraph at 1/3 from top

				container.scrollTo({
					top: Math.max(0, scrollPosition),
					behavior: "smooth",
				});
			}
		};

		const scrollToSegment = (segmentId: string) => {
			if (!containerRef.current) return;

			const segmentElement = segmentRefsRef.current.get(segmentId);

			if (segmentElement && containerRef.current) {
				containerRef.current.scrollTo({
					top: segmentElement.offsetTop - 150,
					behavior: "smooth",
				});
			}
		};

		useImperativeHandle(ref, () => ({
			scrollToParagraph,
			scrollToSegment,
			getParagraphs,
			getCurrentParagraphIndex,
		}));

		// Restore scroll position on mount
		useEffect(() => {
			if (!chapter || !novelId || !contentRef.current || !containerRef.current)
				return;

			const savedProgress = readingProgressStorage.getProgress(
				novelId,
				chapter.id,
			);
			if (savedProgress && savedProgress.scrollPosition > 0) {
				setTimeout(() => {
					if (containerRef.current) {
						containerRef.current.scrollTop = savedProgress.scrollPosition;
					}
				}, 100);
			}
		}, [chapter?.id, novelId]);

		// Scroll to current paragraph if provided
		useEffect(() => {
			if (currentParagraphIndex !== undefined && currentParagraphIndex >= 0) {
				scrollToParagraph(currentParagraphIndex);
			}
		}, [currentParagraphIndex]);

		// Scroll to current segment if provided
		useEffect(() => {
			if (currentSegmentId) {
				scrollToSegment(currentSegmentId);
			}
		}, [currentSegmentId]);

		// Track scroll position
		useEffect(() => {
			if (!chapter || !novelId || !containerRef.current) return;

			const container = containerRef.current;
			let scrollTimeout: number | null = null;

			const handleScroll = () => {
				if (scrollTimeout) {
					clearTimeout(scrollTimeout);
				}

				scrollTimeout = window.setTimeout(() => {
					if (!contentRef.current || !container) return;

					const scrollTop = container.scrollTop;
					const scrollHeight = container.scrollHeight;
					const clientHeight = container.clientHeight;
					const maxScroll = scrollHeight - clientHeight;
					const progress = maxScroll > 0 ? (scrollTop / maxScroll) * 100 : 0;

					readingProgressStorage.saveProgress(
						novelId,
						chapter.id,
						scrollTop,
						progress,
					);
					onScroll?.(scrollTop, progress);
				}, 200);
			};

			container.addEventListener("scroll", handleScroll, { passive: true });

			return () => {
				container.removeEventListener("scroll", handleScroll);
				if (scrollTimeout) {
					clearTimeout(scrollTimeout);
				}
			};
		}, [chapter?.id, novelId, onScroll]);

		if (!chapter) {
			return (
				<div className="flex items-center justify-center py-12 px-4">
					<p className="text-slate-500 dark:text-slate-400 text-sm">
						Chọn một chương để bắt đầu đọc
					</p>
				</div>
			);
		}

		// Use nested result if provided, otherwise fallback to paragraphs
		const paragraphs = chapter.content
			.split("\n")
			.filter((p) => p.trim().length > 0);

		return (
			<div
				ref={containerRef}
				className="max-w-3xl mx-auto px-4 py-6 pb-32 md:pb-12 h-[calc(100vh-283px)] overflow-y-auto"
			>
				<h2 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-slate-100 mb-6 leading-tight">
					{chapter.title}
				</h2>
				<div className="prose prose-slate dark:prose-invert">
					<div
						ref={contentRef}
						className="text-slate-900 dark:text-slate-100 text-base md:text-lg leading-relaxed whitespace-pre-wrap font-sans"
					>
						{nestedResult
							? nestedResult.map((paragraph) => (
									<TextItem
										key={paragraph.id}
										paragraph={paragraph}
										currentSegmentId={currentSegmentId}
										segmentRefsRef={segmentRefsRef}
										onSegmentClick={onSegmentClick || (() => {})}
									/>
								))
							: paragraphs.map((paragraph, index) => (
									<p
										key={index}
										ref={(el) => {
											paragraphRefsRef.current[index] = el;
										}}
										className="mb-4 last:mb-0"
									>
										{paragraph || "\u00A0"}
									</p>
								))}
					</div>
				</div>
			</div>
		);
	},
);

const TextItem = ({
	paragraph,
	currentSegmentId,
	segmentRefsRef,
	onSegmentClick,
}: {
	paragraph: ParagraphSegment;
	currentSegmentId?: string | null;
	segmentRefsRef: React.MutableRefObject<Map<string, HTMLElement>>;
	onSegmentClick: (segmentId: string) => void;
}) => {
	if (paragraph?.segments?.length === 0) {
		return (
			<p
				id={paragraph.id}
				onClick={() => onSegmentClick(paragraph.id)}
				ref={(el) => {
					if (el) {
						segmentRefsRef.current.set(paragraph.id, el);
					}
				}}
				className="mb-4 last:mb-0 text-justify active:bg-fuchsia-300"
			>
				<span
					className={twMerge(
						currentSegmentId === paragraph.id &&
							"bg-yellow-300 dark:bg-yellow-900/80",
						"inline [box-decoration-break:clone]",
					)}
				>
					{paragraph.text}
				</span>
			</p>
		);
	}

	return (
		<p className="last:mb-0 text-justify w-fit">
			{paragraph?.segments?.map((segment) => (
				<span
					onClick={() => onSegmentClick(segment.id)}
					key={segment.id}
					id={segment.id}
					ref={(el) => {
						if (el) {
							segmentRefsRef.current.set(segment.id, el);
						}
					}}
					className={twMerge(
						currentSegmentId === segment.id &&
							"bg-yellow-300 dark:bg-yellow-900/80 active:bg-fuchsia-300",
					)}
				>
					{segment.text}{" "}
				</span>
			))}
		</p>
	);
};

ReadingView.displayName = "ReadingView";
