import type { MenuItemConstructorOptions } from 'electron';

const editSubmenu: MenuItemConstructorOptions[] = [
  { label: '元に戻す', role: 'undo' },
  { label: 'やり直す', role: 'redo' },
  { type: 'separator' },
  { label: '切り取り', role: 'cut' },
  { label: 'コピー', role: 'copy' },
  { label: '貼り付け', role: 'paste' },
  { label: 'すべて選択', role: 'selectAll' },
];

export interface ApplicationMenuActions {
  openBookmarkManager?: () => void;
}

export const createJapaneseApplicationMenu = (
  platform = process.platform,
  actions: ApplicationMenuActions = {},
): MenuItemConstructorOptions[] => [
  ...(platform === 'darwin' ? [{
    label: 'Multi-AI',
    submenu: [
      { label: 'Multi-AIについて', role: 'about' as const },
      { type: 'separator' as const },
      { label: 'Multi-AIを隠す', role: 'hide' as const },
      { label: 'ほかを隠す', role: 'hideOthers' as const },
      { label: 'すべて表示', role: 'unhide' as const },
      { type: 'separator' as const },
      { label: 'Multi-AIを終了', role: 'quit' as const },
    ],
  }] : []),
  {
    label: 'ファイル',
    submenu: platform === 'darwin'
      ? [
          { label: 'AI会話管理…', accelerator: 'CmdOrCtrl+Shift+B', click: actions.openBookmarkManager },
          { type: 'separator' },
          { label: 'ウィンドウを閉じる', role: 'close' },
        ]
      : [
          { label: 'AI会話管理…', accelerator: 'CmdOrCtrl+Shift+B', click: actions.openBookmarkManager },
          { type: 'separator' },
          { label: '終了', role: 'quit' },
        ],
  },
  { label: '編集', submenu: editSubmenu },
  {
    label: '表示',
    submenu: [
      { label: '再読み込み', role: 'reload' },
      { label: '強制再読み込み', role: 'forceReload' },
      { label: '開発者ツールを表示', role: 'toggleDevTools' },
      { type: 'separator' },
      { label: '表示倍率をリセット', role: 'resetZoom' },
      { label: '拡大', role: 'zoomIn' },
      { label: '縮小', role: 'zoomOut' },
      { type: 'separator' },
      { label: '全画面表示', role: 'togglefullscreen' },
    ],
  },
  {
    label: 'ウィンドウ',
    submenu: [
      { label: '最小化', role: 'minimize' },
      ...(platform === 'darwin'
        ? [
            { label: '拡大／縮小', role: 'zoom' as const },
            { type: 'separator' as const },
            { label: 'すべてを手前に移動', role: 'front' as const },
          ]
        : [{ label: 'ウィンドウを閉じる', role: 'close' as const }]),
    ],
  },
];
