# Code Map

コード探索を始めるための入口です。全ファイル一覧ではありません。

## Application Entry

Primary paths:
- `src/main/main.ts`
- `src/renderer/main.tsx`

Search keywords:
- `createMainWindow`
- `app.whenReady`
- `createRoot`

Key entry points:
- `createMainWindow`
- `createRoot(root).render`

Related tests:
- `src/renderer/App.test.tsx`

## Main Process

Primary paths:
- `src/main/`

Search keywords:
- `BrowserWindow`
- `ipcMain`
- `window-all-closed`

Key entry points:
- `createMainWindow`
- `ipcMain.handle('app:ping')`

Related tests:
- なし（Electron runtime testは未導入）

## Preload and IPC

Primary paths:
- `src/preload/preload.ts`
- `src/renderer/global.d.ts`

Search keywords:
- `app:ping`
- `contextBridge`
- `multiAI`
- `ping`

Key entry points:
- `contextBridge.exposeInMainWorld`
- `window.multiAI.ping`

Related tests:
- `src/renderer/App.test.tsx`

## Renderer UI

Primary paths:
- `src/renderer/`

Search keywords:
- `App`
- `checkConnection`
- `connectionStatus`
- `status-card`

Key entry points:
- `App`

Related tests:
- `src/renderer/App.test.tsx`

## Build and Validation

Primary paths:
- `package.json`
- `scripts/verify.ps1`
- `vite.config.mts`
- `tsconfig.*.json`
- `eslint.config.mjs`

Search keywords:
- `verify:fast`
- `verify`
- `build:electron`
- `build:renderer`

Key entry points:
- `scripts/verify.ps1`
- npm scripts in `package.json`

Related tests:
- `src/renderer/App.test.tsx`

## Search Strategy

- 概念だけ分かる: semantic / repository searchを優先する。
- シンボル名が分かる: symbol searchとreferences searchを使う。
- IPC変更: チャンネル文字列とpreload API名をexact searchし、main・preload・global type・利用側・テストを確認する。
- 固有文字列、URL、環境変数、エラーメッセージ: `rg` または `git grep` を使う。
- 変更前: definition、references、関連テスト、設定、データ依存を確認する。
