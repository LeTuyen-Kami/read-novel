import { X, Volume2, Gauge, Music, Clock } from 'lucide-react';
import { useState, useEffect } from 'react';
import type { Voice } from '../hooks/useSpeechSynthesis';
import type { TimerSettings } from '../types/settings';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  vietnameseVoices: Voice[];
  allVoices?: Voice[]; // Optional: all voices for debugging
  selectedVoice: string | null;
  rate: number;
  pitch: number;
  timerSettings: TimerSettings;
  onVoiceChange: (voice: string) => void;
  onRateChange: (rate: number) => void;
  onPitchChange: (pitch: number) => void;
  onTimerSettingsChange: (settings: TimerSettings) => void;
}

export function SettingsModal({
  isOpen,
  onClose,
  vietnameseVoices,
  allVoices,
  selectedVoice,
  rate,
  pitch,
  timerSettings,
  onVoiceChange,
  onRateChange,
  onPitchChange,
  onTimerSettingsChange,
}: SettingsModalProps) {
  const [showAllVoices, setShowAllVoices] = useState(false);
  const [localRate, setLocalRate] = useState(rate);
  const [localPitch, setLocalPitch] = useState(pitch);
  const [localTimerSettings, setLocalTimerSettings] = useState(timerSettings);

  useEffect(() => {
    setLocalRate(rate);
    setLocalPitch(pitch);
    setLocalTimerSettings(timerSettings);
  }, [rate, pitch, timerSettings]);

  if (!isOpen) return null;

  const handleRateChange = (newRate: number) => {
    setLocalRate(newRate);
    onRateChange(newRate);
  };

  const handlePitchChange = (newPitch: number) => {
    setLocalPitch(newPitch);
    onPitchChange(newPitch);
  };

  const handleTimerToggle = (enabled: boolean) => {
    const newSettings = { ...localTimerSettings, enabled };
    setLocalTimerSettings(newSettings);
    onTimerSettingsChange(newSettings);
  };

  const handleTimerTypeChange = (type: 'chapter' | 'time') => {
    const newSettings = { ...localTimerSettings, type };
    setLocalTimerSettings(newSettings);
    onTimerSettingsChange(newSettings);
  };

  const handleTimerValueChange = (value: number) => {
    const newSettings = { ...localTimerSettings, value };
    setLocalTimerSettings(newSettings);
    onTimerSettingsChange(newSettings);
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-50"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div
          className="bg-white dark:bg-slate-900 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto pointer-events-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="sticky top-0 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 px-6 py-4 flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Cài đặt</h2>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors duration-200 cursor-pointer"
              aria-label="Đóng"
            >
              <X className="w-5 h-5 text-slate-700 dark:text-slate-300" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-8">
            {/* Voice Selection */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Volume2 className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                    Giọng đọc
                  </h3>
                </div>
                {allVoices && allVoices.length > vietnameseVoices.length && (
                  <button
                    onClick={() => setShowAllVoices(!showAllVoices)}
                    className="text-xs text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 cursor-pointer transition-colors duration-200"
                  >
                    {showAllVoices ? 'Chỉ tiếng Việt' : `Tất cả (${allVoices.length})`}
                  </button>
                )}
              </div>
              <div className="mb-2 text-xs text-slate-500 dark:text-slate-400">
                {showAllVoices 
                  ? `Hiển thị ${allVoices?.length || 0} giọng đọc` 
                  : `Tìm thấy ${vietnameseVoices.length} giọng tiếng Việt`}
              </div>
              <select
                value={selectedVoice || ''}
                onChange={(e) => onVoiceChange(e.target.value)}
                className="w-full px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 cursor-pointer transition-colors duration-200 hover:bg-slate-50 dark:hover:bg-slate-700"
              >
                {(showAllVoices && allVoices ? allVoices : vietnameseVoices).map((voice) => (
                  <option key={voice.name} value={voice.name}>
                    {voice.name} ({voice.lang})
                  </option>
                ))}
              </select>
            </div>

            {/* Rate */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Gauge className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                  Tốc độ đọc: {localRate.toFixed(1)}x
                </h3>
              </div>
              <input
                type="range"
                min="0.5"
                max="2"
                step="0.1"
                value={localRate}
                onChange={(e) => handleRateChange(parseFloat(e.target.value))}
                className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-slate-900 dark:accent-slate-100"
              />
              <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400 mt-1">
                <span>0.5x</span>
                <span>1.0x</span>
                <span>2.0x</span>
              </div>
            </div>

            {/* Pitch */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Music className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                  Độ cao giọng: {localPitch.toFixed(1)}
                </h3>
              </div>
              <input
                type="range"
                min="0.5"
                max="2"
                step="0.1"
                value={localPitch}
                onChange={(e) => handlePitchChange(parseFloat(e.target.value))}
                className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-slate-900 dark:accent-slate-100"
              />
              <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400 mt-1">
                <span>Thấp (0.5)</span>
                <span>Bình thường (1.0)</span>
                <span>Cao (2.0)</span>
              </div>
            </div>

            {/* Timer */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Clock className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                  Hẹn giờ tắt
                </h3>
              </div>
              
              <div className="space-y-4">
                {/* Enable/Disable */}
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={localTimerSettings.enabled}
                    onChange={(e) => handleTimerToggle(e.target.checked)}
                    className="w-5 h-5 rounded border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-100 focus:ring-slate-900 dark:focus:ring-slate-100 cursor-pointer"
                  />
                  <span className="text-slate-900 dark:text-slate-100">Bật hẹn giờ</span>
                </label>

                {localTimerSettings.enabled && (
                  <div className="space-y-4 pl-8">
                    {/* Timer Type */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        Loại hẹn giờ
                      </label>
                      <div className="flex gap-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="timerType"
                            value="time"
                            checked={localTimerSettings.type === 'time'}
                            onChange={() => handleTimerTypeChange('time')}
                            className="cursor-pointer"
                          />
                          <span className="text-slate-900 dark:text-slate-100">Theo thời gian</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="timerType"
                            value="chapter"
                            checked={localTimerSettings.type === 'chapter'}
                            onChange={() => handleTimerTypeChange('chapter')}
                            className="cursor-pointer"
                          />
                          <span className="text-slate-900 dark:text-slate-100">Theo số chương</span>
                        </label>
                      </div>
                    </div>

                    {/* Timer Value */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        {localTimerSettings.type === 'time'
                          ? `Thời gian: ${localTimerSettings.value} phút`
                          : `Số chương: ${localTimerSettings.value}`}
                      </label>
                      <input
                        type="range"
                        min={localTimerSettings.type === 'time' ? 5 : 1}
                        max={localTimerSettings.type === 'time' ? 120 : 50}
                        step={localTimerSettings.type === 'time' ? 5 : 1}
                        value={localTimerSettings.value}
                        onChange={(e) => handleTimerValueChange(parseInt(e.target.value))}
                        className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-slate-900 dark:accent-slate-100"
                      />
                      <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400 mt-1">
                        <span>{localTimerSettings.type === 'time' ? '5 phút' : '1 chương'}</span>
                        <span>
                          {localTimerSettings.type === 'time' ? '120 phút' : '50 chương'}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

