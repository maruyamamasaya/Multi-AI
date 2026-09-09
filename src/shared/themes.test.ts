import { describe, expect, it } from 'vitest';
import { DEFAULT_UI_THEME, parseUiTheme } from './themes';

describe('parseUiTheme', () => {
  it('accepts every supported theme', () => {
    expect(parseUiTheme('terminal')).toBe('terminal');
    expect(parseUiTheme('cyber')).toBe('cyber');
    expect(parseUiTheme('windows-98')).toBe('windows-98');
    expect(parseUiTheme('retro-pc')).toBe('retro-pc');
  });

  it('falls back safely for missing or unknown values', () => {
    expect(parseUiTheme(undefined)).toBe(DEFAULT_UI_THEME);
    expect(parseUiTheme('unknown-theme')).toBe(DEFAULT_UI_THEME);
  });
});
