# システム構成

最終更新: 2026-09-09

## System Overview

Electron main processがデスクトップウィンドウを生成し、ViteでbuildしたReact rendererを読み込みます。preloadだけがElectron IPCへ接続し、rendererには限定した `window.multiAI` APIを公開します。

```text
Electron main
  │  ipcMain: app:ping
  ▼
preload / contextBridge
  │  window.multiAI.ping()
  ▼
React renderer
```

## Technology Stack

- Electron 44
- React 19
- TypeScript 6
- Vite 8
- ESLint 10
- Vitest 5、Testing Library、jsdom
- npm / `package-lock.json`

正確な依存バージョンは `package.json` と `package-lock.json` を正本とします。

## Directory Structure

```text
src/
├─ main/              # Electron main process
├─ preload/           # rendererへ公開する限定API
└─ renderer/          # React UIとunit test
scripts/              # リポジトリ共通Verify
```

build成果物は `dist-electron/` と `dist-renderer/` に生成され、Git管理外です。

## Main Components

- `createMainWindow`: 安全なwebPreferencesで `BrowserWindow` を生成する。
- preload: `contextBridge`で `multiAI.ping` だけを公開する。
- `App`: IPC接続状態を表示する最小React画面。

## Data Flow

利用者が接続確認ボタンを押すと、rendererが `window.multiAI.ping()` を呼び、preloadが `app:ping` をmainへ送ります。mainの `ipcMain.handle` が `pong` を返し、rendererが接続済み表示へ更新します。

## API / Database / Authentication

- 外部API: なし
- Database: なし
- アプリ独自認証: なし
- Environment Variables: なし
- External Services: 未接続

## Build and Deployment

TypeScriptがmain/preloadを `dist-electron/` へ出力し、Viteがrendererを `dist-renderer/` へ出力します。インストーラー生成、署名、自動更新、CI/CDは未導入です。

## Security Boundaries

- rendererの `nodeIntegration` は無効。
- `contextIsolation` は有効。
- preloadは任意IPCを公開せず、固定した `ping` 操作のみ公開。
- 外部Webコンテンツはまだ読み込まない。

将来の分割ブラウザ方針と見直し条件は [`decisions/001-tiled-electron-browser.md`](decisions/001-tiled-electron-browser.md) を参照してください。
