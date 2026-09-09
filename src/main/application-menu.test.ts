import { describe, expect, it } from 'vitest';
import { createJapaneseApplicationMenu } from './application-menu';

describe('Japanese application menu', () => {
  it('uses Japanese labels for the main Windows menus', () => {
    const menu = createJapaneseApplicationMenu('win32');
    expect(menu.map(({ label }) => label)).toEqual(['ファイル', '編集', '表示', 'ウィンドウ']);
    expect(menu.flatMap(({ submenu }) => Array.isArray(submenu) ? submenu : []).map(({ label }) => label))
      .toContain('再読み込み');
  });

  it('adds the localized application menu on macOS', () => {
    expect(createJapaneseApplicationMenu('darwin')[0].label).toBe('Multi-AI');
  });
});
