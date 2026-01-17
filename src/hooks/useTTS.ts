import { useCallback, useState } from "react";
import type { TTSEngine } from "../types/settings";
import { settingsStorage } from "../utils/settingsStorage";
import { useEdgeTTS } from "./useEdgeTTS";
import { useSpeechSynthesis } from "./useSpeechSynthesis";

// Unified Voice type for compatibility
export interface UnifiedVoice {
	name: string;
	lang?: string;
	locale?: string;
	gender?: string;
	shortName?: string;
}

export function useTTS() {
	const nativeTTS = useSpeechSynthesis();
	const edgeTTS = useEdgeTTS();
	const [edgeTTSFailed, setEdgeTTSFailed] = useState(false);

	const settings = settingsStorage.getSpeechSettings();
	const currentEngine: TTSEngine = settings.engine || "native";

	// Auto-fallback to native if Edge TTS fails
	const effectiveEngine: TTSEngine =
		currentEngine === "edge" && edgeTTSFailed ? "native" : currentEngine;

	const activeTTS = effectiveEngine === "native" ? nativeTTS : edgeTTS;

	const changeEngine = useCallback(
		(engine: TTSEngine) => {
			// Stop current playback
			activeTTS.stop();

			// Reset failure state when manually changing engine
			if (engine === "edge") {
				setEdgeTTSFailed(false);
			}

			// Save engine preference
			const currentSettings = settingsStorage.getSpeechSettings();
			settingsStorage.saveSpeechSettings({
				...currentSettings,
				engine,
			});
		},
		[activeTTS],
	);

	// Wrap speak function to detect Edge TTS failures and auto-fallback
	const speakWithFallback = useCallback(
		async (text: string, onEnd?: () => void, onError?: () => void) => {
			if (currentEngine === "edge" && !edgeTTSFailed) {
				try {
					await edgeTTS.speak(text, onEnd, () => {
						// Edge TTS failed, fallback to native
						console.warn("Edge TTS failed, falling back to Native TTS");
						setEdgeTTSFailed(true);
						// Automatically switch to native and retry
						nativeTTS.speak(text, onEnd, onError);
					});
				} catch (error) {
					// Edge TTS failed, fallback to native
					console.warn("Edge TTS error, falling back to Native TTS:", error);
					setEdgeTTSFailed(true);
					nativeTTS.speak(text, onEnd, onError);
				}
			} else {
				// Use native TTS (either selected or as fallback)
				nativeTTS.speak(text, onEnd, onError);
			}
		},
		[currentEngine, edgeTTSFailed, edgeTTS, nativeTTS],
	);

	// Convert native voices to unified format
	const nativeVoicesUnified: UnifiedVoice[] = nativeTTS.vietnameseVoices.map(
		(v) => ({
			name: v.name,
			lang: v.lang,
		}),
	);

	const allNativeVoicesUnified: UnifiedVoice[] = nativeTTS.voices.map((v) => ({
		name: v.name,
		lang: v.lang,
	}));

	// Convert edge voices to unified format
	const edgeVoicesUnified: UnifiedVoice[] = edgeTTS.vietnameseVoices.map(
		(v) => ({
			name: v.name,
			locale: v.locale,
			gender: v.gender,
			shortName: v.shortName,
		}),
	);

	const allEdgeVoicesUnified: UnifiedVoice[] = edgeTTS.voices.map((v) => ({
		name: v.name,
		locale: v.locale,
		gender: v.gender,
		shortName: v.shortName,
	}));

	return {
		...activeTTS,
		// Override speak with fallback version
		speak:
			currentEngine === "edge" && !edgeTTSFailed
				? speakWithFallback
				: activeTTS.speak,
		engine: effectiveEngine,
		originalEngine: currentEngine,
		edgeTTSFailed,
		changeEngine,
		// Expose both voice lists for settings
		nativeVoices: nativeVoicesUnified,
		edgeVoices: edgeVoicesUnified,
		allNativeVoices: allNativeVoicesUnified,
		allEdgeVoices: allEdgeVoicesUnified,
		// Keep original voice lists for compatibility
		vietnameseVoices:
			effectiveEngine === "native" ? nativeVoicesUnified : edgeVoicesUnified,
		voices:
			effectiveEngine === "native"
				? allNativeVoicesUnified
				: allEdgeVoicesUnified,
		allVoices:
			effectiveEngine === "native"
				? allNativeVoicesUnified
				: allEdgeVoicesUnified,
	};
}
