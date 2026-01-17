import { EdgeTTS, listVoices } from "edge-tts-universal/browser";
import { Pause, Play, Square, Volume2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

export function TestEdgeTTSPage() {
	const [text, setText] = useState(
		"Xin chào, đây là test Edge TTS. Tôi đang kiểm tra xem Edge TTS có hoạt động không.",
	);
	const [selectedVoice, setSelectedVoice] = useState<string>("");
	const [voices, setVoices] = useState<
		Array<{ ShortName: string; FriendlyName: string; Locale: string }>
	>([]);
	const [isLoading, setIsLoading] = useState(false);
	const [isPlaying, setIsPlaying] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [audioUrl, setAudioUrl] = useState<string | null>(null);
	const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(
		null,
	);
	const [progress, setProgress] = useState(0);
	const [rate, setRate] = useState("+0%");
	const [pitch, setPitch] = useState("+0Hz");

	// Load voices on mount
	useEffect(() => {
		listVoices()
			.then((vs) => {
				setVoices(vs);
				// Find Vietnamese voice
				const viVoice = vs.find((v) => v.Locale.toLowerCase().startsWith("vi"));
				if (viVoice) {
					setSelectedVoice(viVoice.ShortName);
				} else if (vs.length > 0) {
					setSelectedVoice(vs[0].ShortName);
				}
			})
			.catch((err) => {
				setError(`Lỗi khi load voices: ${err.message}`);
			});
	}, []);

	const handleSynthesize = useCallback(async () => {
		if (!text.trim() || !selectedVoice) {
			setError("Vui lòng nhập text và chọn voice");
			return;
		}

		setIsLoading(true);
		setError(null);
		setProgress(0);

		try {
			// Cleanup previous audio
			if (audioElement) {
				audioElement.pause();
				audioElement.src = "";
			}
			if (audioUrl) {
				URL.revokeObjectURL(audioUrl);
			}

			const tts = new EdgeTTS(text, selectedVoice, {
				rate,
				pitch,
			});

			console.log("Starting synthesis...", {
				text: text.substring(0, 50),
				selectedVoice,
				rate,
				pitch,
			});
			const result = await tts.synthesize();
			console.log("Synthesis completed", result);

			const audioBlob = new Blob([await result.audio.arrayBuffer()], {
				type: "audio/mpeg",
			});
			const url = URL.createObjectURL(audioBlob);
			setAudioUrl(url);

			const audio = new Audio(url);
			setAudioElement(audio);

			// Track progress
			audio.ontimeupdate = () => {
				if (audio.duration) {
					setProgress((audio.currentTime / audio.duration) * 100);
				}
			};

			audio.onended = () => {
				setIsPlaying(false);
				setProgress(100);
			};

			audio.onerror = (e) => {
				console.error("Audio error:", e);
				setError("Lỗi khi phát audio");
				setIsPlaying(false);
			};

			await audio.play();
			setIsPlaying(true);
		} catch (err) {
			console.error("Synthesis error:", err);
			setError(err instanceof Error ? err.message : "Lỗi không xác định");
		} finally {
			setIsLoading(false);
		}
	}, [text, selectedVoice, rate, pitch, audioElement, audioUrl]);

	const handlePlay = useCallback(() => {
		if (audioElement) {
			audioElement.play();
			setIsPlaying(true);
		}
	}, [audioElement]);

	const handlePause = useCallback(() => {
		if (audioElement) {
			audioElement.pause();
			setIsPlaying(false);
		}
	}, [audioElement]);

	const handleStop = useCallback(() => {
		if (audioElement) {
			audioElement.pause();
			audioElement.currentTime = 0;
			setIsPlaying(false);
			setProgress(0);
		}
	}, [audioElement]);

	const handleCleanup = useCallback(() => {
		if (audioElement) {
			audioElement.pause();
			audioElement.src = "";
			setAudioElement(null);
		}
		if (audioUrl) {
			URL.revokeObjectURL(audioUrl);
			setAudioUrl(null);
		}
		setIsPlaying(false);
		setProgress(0);
	}, [audioElement, audioUrl]);

	return (
		<div className="min-h-screen bg-white dark:bg-slate-900 p-4 md:p-8">
			<div className="max-w-4xl mx-auto">
				<h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-6">
					Test Edge TTS
				</h1>

				{/* Error Display */}
				{error && (
					<div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
						<p className="text-sm text-red-800 dark:text-red-200">{error}</p>
					</div>
				)}

				{/* Voice Selection */}
				<div className="mb-4">
					<label
						htmlFor="voice"
						className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2"
					>
						Chọn giọng đọc ({voices.length} voices)
					</label>
					<select
						value={selectedVoice}
						onChange={(e) => setSelectedVoice(e.target.value)}
						className="w-full px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
					>
						{voices.map((voice) => (
							<option key={voice.ShortName} value={voice.ShortName}>
								{voice.FriendlyName} ({voice.Locale})
							</option>
						))}
					</select>
				</div>

				{/* Rate and Pitch */}
				<div className="grid grid-cols-2 gap-4 mb-4">
					<div>
						<label
							htmlFor="rate"
							className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2"
						>
							Tốc độ (rate)
						</label>
						<input
							type="text"
							value={rate}
							onChange={(e) => setRate(e.target.value)}
							placeholder="+0%"
							className="w-full px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
						/>
						<p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
							Ví dụ: +10%, -20%
						</p>
					</div>
					<div>
						<label
							htmlFor="pitch"
							className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2"
						>
							Độ cao (pitch)
						</label>
						<input
							type="text"
							value={pitch}
							onChange={(e) => setPitch(e.target.value)}
							placeholder="+0Hz"
							className="w-full px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
						/>
						<p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
							Ví dụ: +20Hz, -10Hz
						</p>
					</div>
				</div>

				{/* Text Input */}
				<div className="mb-4">
					<label
						htmlFor="text"
						className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2"
					>
						Text để đọc
					</label>
					<textarea
						value={text}
						onChange={(e) => setText(e.target.value)}
						rows={6}
						className="w-full px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
						placeholder="Nhập text để test..."
					/>
					<p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
						{text.length} ký tự
					</p>
				</div>

				{/* Controls */}
				<div className="flex items-center gap-2 mb-4">
					<button
						type="button"
						onClick={handleSynthesize}
						disabled={isLoading || !selectedVoice || !text.trim()}
						className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-colors duration-200 flex items-center gap-2"
					>
						<Volume2 className="w-4 h-4" />
						{isLoading ? "Đang synthesize..." : "Synthesize & Play"}
					</button>

					{audioElement && (
						<>
							{isPlaying ? (
								<button
									type="button"
									onClick={handlePause}
									className="px-4 py-2 bg-slate-500 text-white rounded-lg hover:bg-slate-600 cursor-pointer transition-colors duration-200 flex items-center gap-2"
								>
									<Pause className="w-4 h-4" />
									Pause
								</button>
							) : (
								<button
									type="button"
									onClick={handlePlay}
									className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 cursor-pointer transition-colors duration-200 flex items-center gap-2"
								>
									<Play className="w-4 h-4" />
									Play
								</button>
							)}

							<button
								type="button"
								onClick={handleStop}
								className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 cursor-pointer transition-colors duration-200 flex items-center gap-2"
							>
								<Square className="w-4 h-4" />
								Stop
							</button>

							<button
								type="button"
								onClick={handleCleanup}
								className="px-4 py-2 bg-slate-300 dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-lg hover:bg-slate-400 dark:hover:bg-slate-600 cursor-pointer transition-colors duration-200"
							>
								Cleanup
							</button>
						</>
					)}
				</div>

				{/* Progress */}
				{audioElement && (
					<div className="mb-4">
						<div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
							<div
								className="h-full bg-blue-500 transition-all duration-100"
								style={{ width: `${progress}%` }}
							/>
						</div>
						<p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
							Progress: {progress.toFixed(1)}%
						</p>
					</div>
				)}

				{/* Debug Info */}
				<div className="mt-6 p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
					<h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">
						Debug Info
					</h2>
					<div className="text-sm text-slate-700 dark:text-slate-300 space-y-1">
						<p>Selected Voice: {selectedVoice || "None"}</p>
						<p>Text Length: {text.length} characters</p>
						<p>Rate: {rate}</p>
						<p>Pitch: {pitch}</p>
						<p>Audio URL: {audioUrl ? "Set" : "Not set"}</p>
						<p>Audio Element: {audioElement ? "Created" : "Not created"}</p>
						<p>Is Playing: {isPlaying ? "Yes" : "No"}</p>
						{audioElement && (
							<>
								<p>
									Duration:{" "}
									{audioElement.duration
										? `${audioElement.duration.toFixed(2)}s`
										: "Loading..."}
								</p>
								<p>Current Time: {audioElement.currentTime.toFixed(2)}s</p>
							</>
						)}
					</div>
				</div>

				{/* Instructions */}
				<div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
					<h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">
						Hướng dẫn
					</h2>
					<ul className="text-sm text-slate-700 dark:text-slate-300 space-y-1 list-disc list-inside">
						<li>Chọn giọng đọc từ dropdown (ưu tiên chọn giọng tiếng Việt)</li>
						<li>Nhập hoặc chỉnh sửa text cần đọc</li>
						<li>Nhấn "Synthesize & Play" để tạo audio và phát</li>
						<li>Sử dụng Play/Pause/Stop để điều khiển playback</li>
						<li>Kiểm tra Console để xem logs chi tiết</li>
					</ul>
				</div>
			</div>
		</div>
	);
}
