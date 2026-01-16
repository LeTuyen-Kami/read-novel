import { useState, useEffect, useRef, useCallback } from 'react';
import { storage } from '../utils/storage';
import { settingsStorage } from '../utils/settingsStorage';

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
  const [progress, setProgress] = useState(0); // 0-100
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const progressIntervalRef = useRef<number | null>(null);
  const totalCharsRef = useRef(0);
  const currentCharIndexRef = useRef(0);

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
          lang.startsWith('vi') ||
          lang.includes('vietnamese') ||
          name.includes('vietnamese') ||
          name.includes('viet nam') ||
          // Some Safari voices might have different formats
          (lang.includes('vn') && (lang.includes('vi') || name.includes('vi')))
        );
      });
      
      // Debug logging
      console.log('Total voices found:', allVoices.length);
      console.log('Vietnamese voices found:', vietnamese.length);
      console.log('Vietnamese voices:', vietnamese.map(v => `${v.name} (${v.lang})`));
      console.log('All voices:', allVoices.map(v => `${v.name} (${v.lang})`));
      
      setVietnameseVoices(vietnamese);

      // Set default Vietnamese voice if available
      if (vietnamese.length > 0 && !selectedVoice) {
        const savedVoice = settingsStorage.getSpeechSettings().voice || storage.getCurrentVoice();
        if (savedVoice && vietnamese.some((v) => v.name === savedVoice)) {
          setSelectedVoice(savedVoice);
        } else {
          const defaultVoice = vietnamese.find((v) => v.default) || vietnamese[0];
          setSelectedVoice(defaultVoice.name);
          settingsStorage.saveSpeechSettings({
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
      const testUtterance = new SpeechSynthesisUtterance('');
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

  // Update progress tracking
  const updateProgress = useCallback(() => {
    if (totalCharsRef.current > 0) {
      const newProgress = (currentCharIndexRef.current / totalCharsRef.current) * 100;
      setProgress(Math.min(100, Math.max(0, newProgress)));
    }
  }, []);

  const speak = useCallback(
    (text: string, onEnd?: () => void, onError?: () => void) => {
      if (!synthRef.current || !text.trim()) return;

      // Stop any ongoing speech
      synthRef.current.cancel();
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }

      const utterance = new SpeechSynthesisUtterance(text);
      utteranceRef.current = utterance;

      // Set voice
      if (selectedVoice) {
        const voice = synthRef.current.getVoices().find((v) => v.name === selectedVoice);
        if (voice) {
          utterance.voice = voice;
        }
      }

      // Set language to Vietnamese
      utterance.lang = 'vi-VN';

      // Set rate and pitch
      utterance.rate = rate;
      utterance.pitch = pitch;

      // Initialize progress tracking
      totalCharsRef.current = text.length;
      currentCharIndexRef.current = 0;
      setProgress(0);

      // Estimate progress based on time (since we can't track exact character position)
      const estimatedDuration = (text.length / (rate * 150)) * 1000; // Rough estimate: 150 chars/sec at rate 1
      const updateInterval = Math.max(100, estimatedDuration / 100); // Update every 1% of duration

      // Event handlers
      utterance.onstart = () => {
        setIsPlaying(true);
        // Start progress tracking
        progressIntervalRef.current = window.setInterval(() => {
          if (synthRef.current?.speaking && !synthRef.current.paused) {
            // Estimate based on elapsed time
            const elapsed = Date.now() - (utteranceRef.current as any).startTime;
            const estimatedProgress = Math.min(100, (elapsed / estimatedDuration) * 100);
            setProgress(estimatedProgress);
          }
        }, updateInterval);
        (utteranceRef.current as any).startTime = Date.now();
      };

      utterance.onend = () => {
        setIsPlaying(false);
        setProgress(100);
        if (progressIntervalRef.current) {
          clearInterval(progressIntervalRef.current);
          progressIntervalRef.current = null;
        }
        onEnd?.();
      };

      utterance.onerror = () => {
        setIsPlaying(false);
        setProgress(0);
        if (progressIntervalRef.current) {
          clearInterval(progressIntervalRef.current);
          progressIntervalRef.current = null;
        }
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
    [selectedVoice, rate, pitch, updateProgress]
  );

  const pause = useCallback(() => {
    if (synthRef.current && synthRef.current.speaking) {
      synthRef.current.pause();
      setIsPlaying(false);
    }
  }, []);

  const resume = useCallback(() => {
    if (synthRef.current && synthRef.current.paused) {
      synthRef.current.resume();
      setIsPlaying(true);
    }
  }, []);

  const stop = useCallback(() => {
    if (synthRef.current) {
      synthRef.current.cancel();
      setIsPlaying(false);
      setProgress(0);
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
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
    [isPlaying, stop]
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
    [isPlaying, stop]
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
    [isPlaying, stop]
  );

  const seekTo = useCallback(
    (percentage: number) => {
      // Note: SpeechSynthesis API doesn't support seeking directly
      // This would require re-speaking from the calculated position
      // For now, we'll just update the progress visually
      setProgress(percentage);
    },
    []
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
