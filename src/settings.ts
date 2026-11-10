import { createContext, useContext } from 'react';

/** Personal viewing preferences (spec S1). localStorage only — never in the URL. */
export interface DisplaySettings {
  showMarks: boolean;                  // 迫 / 墓 / 刑 in palace cells
  symbolColor: 'luck' | 'element';     // 神/门/星 colour mode
  showLunar: boolean;                  // 农历 line in day cells
  showDayGanzhi: boolean;              // 日干支 line in day cells
}
export const DEFAULT_SETTINGS: DisplaySettings =
  { showMarks: true, symbolColor: 'luck', showLunar: true, showDayGanzhi: false };

export const SETTINGS_KEY = 'qmdj.display.v1';

export function parseSettings(raw: string | null): DisplaySettings {
  try {
    const v = JSON.parse(raw ?? 'null');
    return v && typeof v === 'object' && !Array.isArray(v) ? { ...DEFAULT_SETTINGS, ...v } : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export const SettingsContext = createContext<{ settings: DisplaySettings; set: (patch: Partial<DisplaySettings>) => void }>(
  { settings: DEFAULT_SETTINGS, set: () => {} });
export const useSettings = () => useContext(SettingsContext);
