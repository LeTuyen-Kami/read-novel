import { useCallback, useEffect, useRef, useState } from "react";
import { settingsStorage } from "../utils/settingsStorage";
import { storage } from "../utils/storage";

export interface Voice {
	name: string;
	lang: string;
	default?: boolean;
	localService?: boolean;
}

export function useSpeechSynthesis() {
	const [voices, setVoices] = useState<Voice[]>([]);
	const [vietnameseVoices, setVietnameseVoices] = useState<Voice[]>([]);
	const [isPlaying, setIsPlaying] = useState(false);
	const [selectedVoice, setSelectedVoice] = useState<string | null>(null);
	const [rate, setRate] = useState(1);
	const [pitch, setPitch] = useState(1);
	const synthRef = useRef<SpeechSynthesis | null>(null);
	const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

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
		synthRef.current = window.speechSynthesis;

		const processVoices = (availableVoices: SpeechSynthesisVoice[]) => {
			const allVoices: Voice[] = availableVoices.map((voice) => ({
				name: voice.name,
				lang: voice.lang,
				default: voice.default,
				localService: voice.localService,
			}));

			setVoices(allVoices);

			// Filter Vietnamese voices - more comprehensive filter
			const vietnamese = allVoices.filter((voice) => {
				const lang = voice.lang.toLowerCase();
				const name = voice.name.toLowerCase();

				return (
					lang.startsWith("vi") ||
					lang.includes("vietnamese") ||
					name.includes("vietnamese") ||
					name.includes("viet nam") ||
					// Some Safari voices might have different formats
					(lang.includes("vn") && (lang.includes("vi") || name.includes("vi")))
				);
			});
			setVietnameseVoices(vietnamese);

			// Set default Vietnamese voice if available
			if (vietnamese.length > 0 && !selectedVoice) {
				const savedVoice =
					settingsStorage.getSpeechSettings().voice ||
					storage.getCurrentVoice();
				if (savedVoice && vietnamese.some((v) => v.name === savedVoice)) {
					setSelectedVoice(savedVoice);
				} else {
					const defaultVoice =
						vietnamese.find((v) => v.default) || vietnamese[0];
					setSelectedVoice(defaultVoice.name);
					const currentSettings = settingsStorage.getSpeechSettings();
					settingsStorage.saveSpeechSettings({
						...currentSettings,
						rate,
						pitch,
						voice: defaultVoice.name,
					});
				}
			}
		};

		const loadVoices = () => {
			const availableVoices = synthRef.current?.getVoices() || [];

			// Safari sometimes needs a trigger to load all voices
			// Try to get voices multiple times
			if (availableVoices.length === 0) {
				// Retry after a short delay
				setTimeout(() => {
					const retryVoices = synthRef.current?.getVoices() || [];
					if (retryVoices.length > 0) {
						processVoices(retryVoices);
					}
				}, 100);
				return;
			}

			processVoices(availableVoices);
		};

		// Safari trick: trigger a small utterance to force voice loading
		// This is a known workaround for Safari
		if (synthRef.current) {
			const testUtterance = new SpeechSynthesisUtterance("");
			testUtterance.volume = 0;
			synthRef.current.speak(testUtterance);
			synthRef.current.cancel();
		}

		// Load voices immediately
		loadVoices();

		// Some browsers load voices asynchronously
		if (synthRef.current.onvoiceschanged !== undefined) {
			synthRef.current.onvoiceschanged = loadVoices;
		}

		// Also try loading after a delay (Safari sometimes needs this)
		const timeoutId = setTimeout(() => {
			loadVoices();
		}, 500);

		// Additional retry for Safari
		const safariRetryId = setTimeout(() => {
			loadVoices();
		}, 1000);

		return () => {
			if (synthRef.current) {
				synthRef.current.onvoiceschanged = null;
			}
			clearTimeout(timeoutId);
			clearTimeout(safariRetryId);
		};
	}, [selectedVoice, rate, pitch]);

	const speak = useCallback(
		(text: string, onEnd?: () => void, onError?: () => void) => {
			if (!synthRef.current || !text.trim()) return;

			// Stop any ongoing speech
			synthRef.current.cancel();

			const utterance = new SpeechSynthesisUtterance(text);
			utteranceRef.current = utterance;

			// Set voice
			if (selectedVoice) {
				const voice = synthRef.current
					.getVoices()
					.find((v) => v.name === selectedVoice);
				if (voice) {
					utterance.voice = voice;
				}
			}

			// Set language to Vietnamese
			utterance.lang = "vi-VN";

			// Set rate and pitch
			utterance.rate = rate;
			utterance.pitch = pitch;

			// Event handlers
			utterance.onstart = () => {
				setIsPlaying(true);
			};

			utterance.onend = () => {
				setIsPlaying(false);
				onEnd?.();
			};

			utterance.onerror = () => {
				setIsPlaying(false);
				onError?.();
			};

			utterance.onpause = () => {
				setIsPlaying(false);
			};

			utterance.onresume = () => {
				setIsPlaying(true);
			};

			synthRef.current.speak(utterance);
		},
		[selectedVoice, rate, pitch],
	);

	const pause = useCallback(() => {
		if (synthRef.current?.speaking) {
			synthRef.current.pause();
			setIsPlaying(false);
		}
	}, []);

	const resume = useCallback(() => {
		if (synthRef.current?.paused) {
			synthRef.current.resume();
			setIsPlaying(true);
		}
	}, []);

	const stop = useCallback(() => {
		if (synthRef.current) {
			synthRef.current.cancel();
			setIsPlaying(false);
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
			storage.saveCurrentVoice(voiceName);
			// Stop current speech if playing
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
			// Stop and restart if playing to apply new rate
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
			// Stop and restart if playing to apply new pitch
			if (isPlaying) {
				stop();
			}
		},
		[isPlaying, stop],
	);

	return {
		voices,
		vietnameseVoices,
		selectedVoice,
		rate,
		pitch,
		isPlaying,
		speak,
		pause,
		resume,
		stop,
		changeVoice,
		changeRate,
		changePitch,
	};
}
