import { useCallback, useEffect, useMemo, useState } from "react";
import { twMerge } from "tailwind-merge";
import {
	type NestedSplitTextResult,
	type ParagraphSegment,
	splitTextNested,
} from "../utils/helper";

const flattenNestedResult = (result: NestedSplitTextResult) => {
	return result.flatMap((i) => {
		if (i?.segments?.length === 0) {
			return {
				text: i.text,
				type: i.type as string,
				id: i.id,
			};
		}
		return i?.segments?.map((s) => {
			return {
				text: s.text,
				type: s.type,
				id: s.id,
			};
		});
	});
};

export function TestSplitTextPage() {
	const [soeakIndex, setSpeakIndex] = useState(0);
	const [vietnameVoice, setVietnameVoice] =
		useState<SpeechSynthesisVoice | null>(null);

	useEffect(() => {
		const synth = window.speechSynthesis;

		const loadVoice = () => {
			const voices = synth.getVoices();
			const viVoice = voices.find((v) => v.lang.startsWith("vi"));
			setVietnameVoice(viVoice ?? null);
		};

		// thử load ngay (có thể fail)
		loadVoice();

		// nghe event khi browser load xong voice
		synth.addEventListener("voiceschanged", loadVoice);

		return () => {
			synth.removeEventListener("voiceschanged", loadVoice);
		};
	}, []);
	const [isSpeaking, setIsSpeaking] = useState(false);
	const [text, setText] = useState(
		`Đây là đoạn text dài để test hàm splitText. Hàm này sẽ phân tách text thành các đoạn nhỏ hơn theo điều kiện: đầu tiên split theo xuống dòng, sau đó split theo dấu chấm, tiếp theo split theo dấu phẩy, và cuối cùng split theo khoảng trắng nếu vẫn còn dài.

Đoạn thứ hai này cũng rất dài và sẽ được test với các điều kiện phân tách khác nhau. Chúng ta sẽ xem hàm hoạt động như thế nào với các loại text khác nhau, bao gồm cả text có nhiều dấu câu và text không có dấu câu.

Đoạn cuối cùng này để đảm bảo test đầy đủ các trường hợp.`,
	);
	const [minLength, setMinLength] = useState(50);
	const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

	const nestedResult = useMemo(() => {
		try {
			return splitTextNested(text, minLength);
		} catch (error) {
			return [];
		}
	}, [text, minLength]);

	const flattenedResult = useMemo(() => {
		return flattenNestedResult(nestedResult);
	}, [nestedResult]);

	const speakNext = (index: number) => {
		if (index >= flattenedResult.length) {
			return;
		}

		const paragraph = flattenedResult[index];

		const documentById = document.getElementById(paragraph.id);
		if (documentById) {
			documentById.classList.add("bg-red-500");
		}

		const utterance = new SpeechSynthesisUtterance(paragraph.text);
		utterance.voice = vietnameVoice!;
		utterance.lang = "vi-VN";
		utterance.rate = 1;
		utterance.pitch = 1;
		utterance.onend = () => {
			documentById?.classList.remove("bg-red-500");
			speakNext(index + 1);
		};
		window.speechSynthesis.speak(utterance);
	};

	const onSpeak = () => {
		if (isSpeaking) {
			//stop speaking
			window.speechSynthesis.cancel();
			setIsSpeaking(false);
			return;
		}
		setIsSpeaking(true);
		speakNext(0);
	};

	return (
		<div className="min-h-screen bg-white dark:bg-slate-900 p-4 md:p-8">
			<div className="max-w-6xl mx-auto">
				<h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-6">
					Test Split Text Function (Nested Structure)
				</h1>

				<button type="button" onClick={onSpeak}>
					{isSpeaking ? "Stop" : "Speak"}
				</button>

				{/* Input Section */}
				<div className="mb-6 space-y-4">
					<div>
						<label
							htmlFor="minLength"
							className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2"
						>
							Min Length (giá trị tối thiểu)
						</label>
						<input
							id="minLength"
							type="number"
							value={minLength}
							onChange={(e) => setMinLength(Number(e.target.value))}
							min="1"
							className="w-full px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
						/>
					</div>

					<div>
						<label
							htmlFor="text"
							className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2"
						>
							Text Input ({text.length} ký tự)
						</label>
						<textarea
							id="text"
							value={text}
							onChange={(e) => setText(e.target.value)}
							rows={8}
							className="w-full px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 font-mono text-sm"
							placeholder="Nhập text để test..."
						/>
					</div>
				</div>

				{/* Results Section */}
				<div className="mb-6">
					{/* Text Display */}
					<div className="p-6 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
						<div className="text-base text-slate-900 dark:text-slate-100 leading-relaxed break-words space-y-2">
							{nestedResult.map((item, index) => (
								<TextItem key={index} paragraph={item} />
							))}
						</div>
					</div>
				</div>

				{/* Instructions */}
				<div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
					<h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">
						Hướng dẫn
					</h2>
					<ul className="text-sm text-slate-700 dark:text-slate-300 space-y-1 list-disc list-inside">
						<li>Nhập text cần test vào ô text input</li>
						<li>Điều chỉnh Min Length để xem cách hàm phân tách text</li>
						<li>
							Hàm sẽ phân tách theo thứ tự: xuống dòng → dấu chấm → dấu phẩy →
							khoảng trắng
						</li>
						<li>
							Các đoạn màu đỏ là các đoạn vượt quá giới hạn (có thể do từ quá
							dài)
						</li>
						<li>Kiểm tra Console để xem logs chi tiết nếu cần</li>
					</ul>
				</div>
			</div>
		</div>
	);
}

const TextItem = ({ paragraph }: { paragraph: ParagraphSegment }) => {
	if (paragraph?.segments?.length === 0) {
		return (
			<p id={paragraph?.id} className="hover:bg-red-500">
				{paragraph.text}
			</p>
		);
	}

	return (
		<p>
			{paragraph?.segments?.map((segment, index) => (
				<span
					key={index}
					id={segment?.id}
					className={twMerge("hover:bg-red-500")}
				>
					{segment.text}{" "}
				</span>
			))}
		</p>
	);
};
