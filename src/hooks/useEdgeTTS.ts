import { useState, useEffect, useRef, useCallback } from "react";
import { EdgeTTS, listVoices } from "edge-tts-universal/browser";
import { settingsStorage } from "../utils/settingsStorage";

export interface EdgeVoice {
	name: string;
	locale: string;
	gender: string;
	shortName: string;
}

// Maximum characters per chunk to avoid Edge TTS limits
const MAX_CHUNK_LENGTH = 5000;

// Split text into chunks by newlines, and split long chunks
function splitTextIntoChunks(text: string): string[] {
	const paragraphs = text.split("\n").filter((p) => p.trim().length > 0);
	const chunks: string[] = [];

	for (const paragraph of paragraphs) {
		if (paragraph.length <= MAX_CHUNK_LENGTH) {
			chunks.push(paragraph);
		} else {
			// Split long paragraph by sentences or spaces
			let remaining = paragraph;
			while (remaining.length > 0) {
				if (remaining.length <= MAX_CHUNK_LENGTH) {
					chunks.push(remaining);
					break;
				}

				// Try to split at sentence boundary
				const lastPeriod = remaining.lastIndexOf(".", MAX_CHUNK_LENGTH);
				const lastExclamation = remaining.lastIndexOf("!", MAX_CHUNK_LENGTH);
				const lastQuestion = remaining.lastIndexOf("?", MAX_CHUNK_LENGTH);
				const lastNewline = remaining.lastIndexOf("\n", MAX_CHUNK_LENGTH);

				const splitIndex = Math.max(
					lastPeriod,
					lastExclamation,
					lastQuestion,
					lastNewline,
				);

				if (splitIndex > MAX_CHUNK_LENGTH * 0.5) {
					// Found a good split point
					chunks.push(remaining.substring(0, splitIndex + 1));
					remaining = remaining.substring(splitIndex + 1).trim();
				} else {
					// No good split point, split at space
					const lastSpace = remaining.lastIndexOf(" ", MAX_CHUNK_LENGTH);
					if (lastSpace > MAX_CHUNK_LENGTH * 0.5) {
						chunks.push(remaining.substring(0, lastSpace));
						remaining = remaining.substring(lastSpace + 1);
					} else {
						// Force split
						chunks.push(remaining.substring(0, MAX_CHUNK_LENGTH));
						remaining = remaining.substring(MAX_CHUNK_LENGTH);
					}
				}
			}
		}
	}

	return chunks;
}

export function useEdgeTTS() {
	const [voices, setVoices] = useState<EdgeVoice[]>([]);
	const [vietnameseVoices, setVietnameseVoices] = useState<EdgeVoice[]>([]);
	const [isPlaying, setIsPlaying] = useState(false);
	const [selectedVoice, setSelectedVoice] = useState<string | null>(null);
	const [rate, setRate] = useState(1);
	const [pitch, setPitch] = useState(1);
	const [progress, setProgress] = useState(0);
	const audioRef = useRef<HTMLAudioElement | null>(null);
	const progressIntervalRef = useRef<number | null>(null);
	const chunksRef = useRef<string[]>([]);
	const currentChunkIndexRef = useRef(0);
	const audioQueueRef = useRef<HTMLAudioElement[]>([]);
	const totalDurationRef = useRef(0);
	const playedDurationRef = useRef(0);
	const onEndCallbackRef = useRef<(() => void) | undefined>(undefined);
	const preSynthesizedAudioRef = useRef<HTMLAudioElement | null>(null);
	const isPreSynthesizingRef = useRef(false);

	// Load settings on mount
	useEffect(() => {
		const settings = settingsStorage.getSpeechSettings();
		setRate(settings.rate);
		setPitch(settings.pitch);
		if (settings.voice) {
			setSelectedVoice(settings.voice);
		}
	}, []);

	// Load voices
	useEffect(() => {
		const loadVoices = async () => {
			try {
				const allVoices = await listVoices();
				const edgeVoices: EdgeVoice[] = allVoices.map((voice) => ({
					name: voice.FriendlyName || voice.Name,
					locale: voice.Locale,
					gender: voice.Gender,
					shortName: voice.ShortName,
				}));

				setVoices(edgeVoices);

				// Filter Vietnamese voices
				const vietnamese = edgeVoices.filter((voice) => {
					const locale = voice.locale.toLowerCase();
					return locale.startsWith("vi") || locale.includes("vietnamese");
				});

				setVietnameseVoices(vietnamese);

				// Set default Vietnamese voice if available
				if (vietnamese.length > 0 && !selectedVoice) {
					const savedVoice = settingsStorage.getSpeechSettings().voice;
					if (
						savedVoice &&
						vietnamese.some(
							(v) => v.shortName === savedVoice || v.name === savedVoice,
						)
					) {
						setSelectedVoice(savedVoice);
					} else {
						const defaultVoice = vietnamese[0];
						setSelectedVoice(defaultVoice.shortName);
						settingsStorage.saveSpeechSettings({
							...settingsStorage.getSpeechSettings(),
							voice: defaultVoice.shortName,
						});
					}
				}
			} catch (error) {
				console.error("Error loading Edge TTS voices:", error);
			}
		};

		loadVoices();
	}, [selectedVoice]);

	// Calculate delay based on rate and chunk length
	// Higher rate = shorter playback time, but synthesis time is constant
	// We need to ensure next chunk is ready before current ends
	const calculateDelay = useCallback(
		(chunkLength: number, currentRate: number): number => {
			// Estimate synthesis time: ~100-300ms per 100 chars (network + processing)
			const estimatedSynthesisTime = (chunkLength / 100) * 100; // ms

			// Estimate playback time at current rate
			// Average speaking rate: ~150 chars/sec at rate 1.0
			const charsPerSecond = 150 * currentRate;
			const estimatedPlaybackTime = (chunkLength / charsPerSecond) * 1000; // ms

			// If playback is faster than synthesis, we need to pre-synthesize
			// Add buffer time: 50-100ms for smooth transition
			const bufferTime = 100;

			// If synthesis takes longer than playback, we need more buffer
			if (estimatedSynthesisTime > estimatedPlaybackTime) {
				return Math.max(
					0,
					estimatedSynthesisTime - estimatedPlaybackTime + bufferTime,
				);
			}

			// Otherwise, small buffer is enough
			return bufferTime;
		},
		[],
	);

	// Synthesize a single chunk
	const synthesizeChunk = useCallback(
		async (chunk: string): Promise<HTMLAudioElement> => {
			const ratePercent = ((rate - 1) * 100).toFixed(2);
			const rateString = ratePercent.startsWith("-")
				? `${ratePercent}%`
				: `+${ratePercent}%`;
			const pitchHz = ((pitch - 1) * 50).toFixed(0);
			const pitchString = pitchHz.startsWith("-")
				? `${pitchHz}Hz`
				: `+${pitchHz}Hz`;

			const tts = new EdgeTTS(chunk, selectedVoice!, {
				rate: rateString,
				pitch: pitchString,
			});

			const synthesizePromise = tts.synthesize();
			const timeoutPromise = new Promise<never>((_, reject) => {
				setTimeout(() => reject(new Error("Edge TTS timeout")), 15000);
			});

			const result = await Promise.race([synthesizePromise, timeoutPromise]);
			const audioBlob = new Blob([await result.audio.arrayBuffer()], {
				type: "audio/mpeg",
			});
			const audioUrl = URL.createObjectURL(audioBlob);
			const audio = new Audio(audioUrl);
			audio.playbackRate = rate;
			return audio;
		},
		[selectedVoice, rate, pitch],
	);

	// Pre-synthesize next chunk while current is playing
	const preSynthesizeNextChunk = useCallback(async (): Promise<void> => {
		const nextIndex = currentChunkIndexRef.current + 1;
		if (nextIndex >= chunksRef.current.length || isPreSynthesizingRef.current) {
			return;
		}

		isPreSynthesizingRef.current = true;
		try {
			const nextChunk = chunksRef.current[nextIndex];
			const audio = await synthesizeChunk(nextChunk);

			// Wait for metadata
			await new Promise<void>((resolve, reject) => {
				const timeout = setTimeout(
					() => reject(new Error("Pre-synthesis timeout")),
					5000,
				);
				audio.onloadedmetadata = () => {
					clearTimeout(timeout);
					resolve();
				};
				audio.onerror = () => {
					clearTimeout(timeout);
					reject(new Error("Pre-synthesis error"));
				};
			});

			// Cleanup old pre-synthesized audio
			if (preSynthesizedAudioRef.current) {
				if (preSynthesizedAudioRef.current.src.startsWith("blob:")) {
					URL.revokeObjectURL(preSynthesizedAudioRef.current.src);
				}
			}

			preSynthesizedAudioRef.current = audio;
			totalDurationRef.current += audio.duration;
		} catch (error) {
			console.warn("Pre-synthesis failed, will synthesize on demand:", error);
			// If pre-synthesis fails, we'll synthesize on demand
		} finally {
			isPreSynthesizingRef.current = false;
		}
	}, [synthesizeChunk]);

	const stop = useCallback(() => {
		// Stop and cleanup all audio
		audioQueueRef.current.forEach((audio) => {
			audio.pause();
			if (audio.src.startsWith("blob:")) {
				URL.revokeObjectURL(audio.src);
			}
		});
		audioQueueRef.current = [];

		if (audioRef.current) {
			audioRef.current.pause();
			if (audioRef.current.src.startsWith("blob:")) {
				URL.revokeObjectURL(audioRef.current.src);
			}
			audioRef.current = null;
		}

		// Cleanup pre-synthesized audio
		if (preSynthesizedAudioRef.current) {
			preSynthesizedAudioRef.current.pause();
			if (preSynthesizedAudioRef.current.src.startsWith("blob:")) {
				URL.revokeObjectURL(preSynthesizedAudioRef.current.src);
			}
			preSynthesizedAudioRef.current = null;
		}

		if (progressIntervalRef.current) {
			clearInterval(progressIntervalRef.current);
			progressIntervalRef.current = null;
		}

		setIsPlaying(false);
		setProgress(0);
		currentChunkIndexRef.current = 0;
		totalDurationRef.current = 0;
		playedDurationRef.current = 0;
		isPreSynthesizingRef.current = false;
	}, []);

	// Play next chunk in queue
	const playNextChunk = useCallback(async () => {
		if (currentChunkIndexRef.current >= chunksRef.current.length) {
			// All chunks played
			setIsPlaying(false);
			setProgress(100);
			playedDurationRef.current = totalDurationRef.current;
			onEndCallbackRef.current?.();
			return;
		}

		try {
			let audio: HTMLAudioElement;

			// Check if we have pre-synthesized audio ready
			if (preSynthesizedAudioRef.current) {
				audio = preSynthesizedAudioRef.current;
				preSynthesizedAudioRef.current = null;
				// Duration already added in pre-synthesis
			} else {
				// Synthesize on demand
				const chunk = chunksRef.current[currentChunkIndexRef.current];
				audio = await synthesizeChunk(chunk);

				// Wait for audio metadata to load
				await new Promise<void>((resolve, reject) => {
					const timeout = setTimeout(
						() => reject(new Error("Audio load timeout")),
						5000,
					);
					audio.onloadedmetadata = () => {
						clearTimeout(timeout);
						totalDurationRef.current += audio.duration;
						resolve();
					};
					audio.onerror = () => {
						clearTimeout(timeout);
						reject(new Error("Audio load error"));
					};
				});
			}

			audioQueueRef.current.push(audio);
			audioRef.current = audio;

			// Calculate delay based on rate and next chunk length
			const currentChunk = chunksRef.current[currentChunkIndexRef.current];
			const nextIndex = currentChunkIndexRef.current + 1;

			// Start pre-synthesizing next chunk if available
			if (nextIndex < chunksRef.current.length) {
				// Pre-synthesize in background (don't await)
				preSynthesizeNextChunk().catch((err) => {
					console.warn("Background pre-synthesis failed:", err);
				});
			}

			// Calculate delay for smooth transition
			const delay = calculateDelay(currentChunk.length, rate);

			// Small delay to ensure smooth transition (especially at high rates)
			if (delay > 0) {
				await new Promise((resolve) =>
					setTimeout(resolve, Math.min(delay, 200)),
				);
			}

			// Play audio
			await audio.play();
			setIsPlaying(true);

			// Update progress while playing
			const updateProgress = () => {
				if (!audio.paused && !audio.ended) {
					const currentChunkProgress = audio.currentTime / audio.duration;
					const playedChunks = currentChunkIndexRef.current;
					const totalChunks = chunksRef.current.length;
					const chunkProgress =
						(playedChunks + currentChunkProgress) / totalChunks;
					setProgress(Math.min(100, Math.max(0, chunkProgress * 100)));
				}
			};

			progressIntervalRef.current = window.setInterval(updateProgress, 100);

			// Handle chunk end
			audio.onended = () => {
				playedDurationRef.current += audio.duration;
				currentChunkIndexRef.current++;

				if (progressIntervalRef.current) {
					clearInterval(progressIntervalRef.current);
					progressIntervalRef.current = null;
				}

				URL.revokeObjectURL(audio.src);

				// Small delay before next chunk for smooth transition
				// At high rates, this helps ensure next chunk is ready
				const nextChunkIndex = currentChunkIndexRef.current;
				if (nextChunkIndex < chunksRef.current.length) {
					const nextChunk = chunksRef.current[nextChunkIndex];
					const transitionDelay = calculateDelay(nextChunk.length, rate);

					setTimeout(
						() => {
							playNextChunk();
						},
						Math.min(transitionDelay, 100),
					); // Cap at 150ms for responsiveness
				} else {
					// No more chunks, play immediately
					playNextChunk();
				}
			};

			audio.onerror = () => {
				setIsPlaying(false);
				setProgress(0);
				if (progressIntervalRef.current) {
					clearInterval(progressIntervalRef.current);
					progressIntervalRef.current = null;
				}
				URL.revokeObjectURL(audio.src);
			};
		} catch (error) {
			console.error("Error synthesizing chunk:", error);
			setIsPlaying(false);
			setProgress(0);
		}
	}, [preSynthesizeNextChunk, calculateDelay, rate, synthesizeChunk]);

	const speak = useCallback(
		async (text: string, onEnd?: () => void, onError?: () => void) => {
			if (!text.trim() || !selectedVoice) return;

			// Stop any ongoing audio
			stop();

			// Split text into chunks
			chunksRef.current = splitTextIntoChunks(text);
			currentChunkIndexRef.current = 0;
			totalDurationRef.current = 0;
			playedDurationRef.current = 0;
			audioQueueRef.current = [];
			onEndCallbackRef.current = onEnd;

			if (chunksRef.current.length === 0) {
				onEnd?.();
				return;
			}

			setProgress(0);
			setIsPlaying(true);

			// Start playing chunks
			try {
				await playNextChunk();
			} catch (error) {
				console.error("Error with Edge TTS:", error);
				setIsPlaying(false);
				setProgress(0);
				onError?.();
			}
		},
		[selectedVoice, playNextChunk, stop],
	);

	const pause = useCallback(() => {
		if (audioRef.current && !audioRef.current.paused) {
			audioRef.current.pause();
			setIsPlaying(false);
		}
	}, []);

	const resume = useCallback(() => {
		if (audioRef.current && audioRef.current.paused) {
			audioRef.current.play();
			setIsPlaying(true);
		}
	}, []);

	const changeVoice = useCallback(
		(voiceName: string) => {
			setSelectedVoice(voiceName);
			const settings = settingsStorage.getSpeechSettings();
			settingsStorage.saveSpeechSettings({
				...settings,
				voice: voiceName,
			});
			if (isPlaying) {
				stop();
			}
		},
		[isPlaying, stop],
	);

	const changeRate = useCallback(
		(newRate: number) => {
			setRate(newRate);
			const settings = settingsStorage.getSpeechSettings();
			settingsStorage.saveSpeechSettings({
				...settings,
				rate: newRate,
			});
			if (audioRef.current) {
				// Note: Edge TTS rate is set during synthesis, so we need to restart
				// But we can adjust playbackRate as a workaround
				audioRef.current.playbackRate = newRate;
			}
			if (isPlaying) {
				stop();
			}
		},
		[isPlaying, stop],
	);

	const changePitch = useCallback(
		(newPitch: number) => {
			setPitch(newPitch);
			const settings = settingsStorage.getSpeechSettings();
			settingsStorage.saveSpeechSettings({
				...settings,
				pitch: newPitch,
			});
			// Note: Edge TTS pitch is set during synthesis, so we need to restart
			if (isPlaying) {
				stop();
			}
		},
		[isPlaying, stop],
	);

	const seekTo = useCallback(
		(percentage: number) => {
			if (chunksRef.current.length === 0) return;

			// Calculate which chunk to seek to
			const targetChunkIndex = Math.floor(
				(percentage / 100) * chunksRef.current.length,
			);
			const targetChunkProgress =
				((percentage / 100) * chunksRef.current.length) % 1;

			// If seeking to a different chunk, stop and restart from that chunk
			if (targetChunkIndex !== currentChunkIndexRef.current) {
				stop();
				currentChunkIndexRef.current = targetChunkIndex;
				totalDurationRef.current = 0;
				playedDurationRef.current = 0;

				// Restart from the target chunk
				playNextChunk().then(() => {
					// Seek within the current chunk if needed
					if (audioRef.current && targetChunkProgress > 0) {
						audioRef.current.currentTime =
							targetChunkProgress * audioRef.current.duration;
					}
				});
			} else if (audioRef.current) {
				// Seek within current chunk
				if (audioRef.current.duration) {
					audioRef.current.currentTime =
						targetChunkProgress * audioRef.current.duration;
				}
			}

			setProgress(percentage);
		},
		[stop, playNextChunk],
	);

	return {
		voices,
		vietnameseVoices,
		selectedVoice,
		rate,
		pitch,
		progress,
		isPlaying,
		speak,
		pause,
		resume,
		stop,
		changeVoice,
		changeRate,
		changePitch,
		seekTo,
	};
}
