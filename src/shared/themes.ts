export const UI_THEMES = [
  { id: 'default', name: 'Default', description: '静かで集中しやすい、現在のMulti-AI', glyph: 'M' },
  { id: 'terminal', name: 'Terminal', description: '黒とフォスファーグリーンの開発端末', glyph: '>_' },
  { id: 'cyber', name: 'Cyber', description: 'シアンとバイオレットの電子制御盤', glyph: '◇' },
  { id: 'windows-98', name: 'Windows 98', description: 'クラシックなデスクトップ環境', glyph: '▦' },
  { id: 'retro-pc', name: 'Retro PC', description: '琥珀色に発光するCRTワークステーション', glyph: '●' },
] as const;

export type UiThemeId = (typeof UI_THEMES)[number]['id'];

export const DEFAULT_UI_THEME: UiThemeId = 'default';
export const UI_THEME_STORAGE_KEY = 'multi-ai.ui-theme';

export const parseUiTheme = (value: unknown): UiThemeId =>
  UI_THEMES.some((theme) => theme.id === value) ? value as UiThemeId : DEFAULT_UI_THEME;
