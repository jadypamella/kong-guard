import { useState, useEffect } from 'react';

export interface Settings {
  gatewayUrl: string;
  gatewayPath: string;
  systemPrompt: string;
  includeContextSecret: boolean;
  contextSecret: string;
}

const DEFAULT_SETTINGS: Settings = {
  gatewayUrl: 'https://kong-f156c191deeusgnly.kongcloud.dev',
  gatewayPath: 'validate-code',
  systemPrompt: 'You are KongGuard',
  includeContextSecret: false,
  contextSecret: '',
};

export function useSettings() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);

  useEffect(() => {
    const stored = localStorage.getItem('kongguard_settings');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setSettings({ ...DEFAULT_SETTINGS, ...parsed });
      } catch {
        // Invalid JSON, use defaults
      }
    }
  }, []);

  const updateSettings = (newSettings: Partial<Settings>) => {
    const updated = { ...settings, ...newSettings };
    setSettings(updated);
    localStorage.setItem('kongguard_settings', JSON.stringify(updated));
  };

  return { settings, updateSettings };
}