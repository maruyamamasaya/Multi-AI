export const UI_THEMES = [
  { id: 'default', name: 'デフォルト', description: '現在の落ち着いたダークテーマ' },
  { id: 'terminal', name: 'Terminal', description: '黒と蛍光グリーンの端末風' },
  { id: 'cyber', name: 'Cyber / Electronic', description: 'ネオンが光る近未来の操作盤' },
  { id: 'windows-98', name: 'Windows 98', description: 'クラシックなデスクトップUI' },
  { id: 'retro-pc', name: 'Retro PC', description: '琥珀色CRTモニター風' },
] as const;

export type UiThemeId = (typeof UI_THEMES)[number]['id'];

export const DEFAULT_UI_THEME: UiThemeId = 'default';
export const UI_THEME_STORAGE_KEY = 'multi-ai.ui-theme';

export const parseUiTheme = (value: unknown): UiThemeId =>
  UI_THEMES.some((theme) => theme.id === value) ? value as UiThemeId : DEFAULT_UI_THEME;
