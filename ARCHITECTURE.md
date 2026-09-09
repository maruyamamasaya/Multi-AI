# システム構成

最終更新: 2026-09-09

## System Overview

Electron main processがデスクトップウィンドウと1～4個の `WebContentsView` を管理します。上部にはReact rendererの共通操作バー、下部には画面数に応じたWebページを表示します。preloadだけがElectron IPCへ接続し、rendererには限定した `window.multiAI` APIを公開します。

```text
Electron main
  ├─ BrowserWindow
  │    └─ React toolbar ← preload / contextBridge ← navigation IPC
  ├─ WebContentsView × 1～4
  └─ userData/
       ├─ bookmarks.json
       └─ workspace.json
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
- `addView` / `removeView`: 1～4個の外部ビューを管理する。
- `calculateViewBounds`: 画面数に応じて全画面、2分割、3分割、2×2を計算する。
- `registerIpcHandlers`: ビューIDを検証し、URL移動と履歴操作を処理する。
- `readBookmarks` / `saveBookmarks`: 名前とURLだけをuserData内のJSONへ保存する。
- `readWorkspaceSnapshot` / `writeWorkspaceSnapshot`: URL配列と選択位置を保存・復元する。
- preload: `contextBridge`で型付きの限定ナビゲーションAPIを公開する。
- `App` / `ViewToolbar`: 各ビューのURL、履歴ボタン、読み込み状態を表示する。

## Data Flow

mainは起動時に `workspace.json` を検証して画面数、URL、選択位置を復元します。追加・削除・URL移動・選択変更のたびに最新snapshotを書き込みます。保存データがない、壊れている、危険なURLを含む場合は既定の2画面へ戻します。

## API / Database / Authentication

- 外部API: なし
- Database: なし
- アプリ独自認証: なし
- Environment Variables: なし
- External Services: `example.com`、`example.org` を公開ページの表示確認に使用
- Local Data: Electron `userData/bookmarks.json` にブックマークだけを保存
- Workspace Data: Electron `userData/workspace.json` にURL配列と選択インデックスを保存

## Build and Deployment

build前に既存成果物だけを削除し、TypeScriptがmain/preload/sharedを `dist-electron/` へ、Viteがrendererを `dist-renderer/` へ出力します。インストーラー生成、署名、自動更新、CI/CDは未導入です。

## Security Boundaries

- rendererの `nodeIntegration` は無効。
- `contextIsolation` は有効。
- preloadは任意IPCを公開せず、ビューID付きの固定ナビゲーション操作だけを公開。
- URL入力はmainで正規化し、`http` と `https` 以外を拒否する。
- 復元するURLにも同じ制限を適用し、不正なsnapshot全体を既定値へ戻す。
- 外部ビューはsandbox、context isolation有効、Node.js integration無効。
- 外部ビューの新規ウィンドウとWeb権限要求は拒否する。

将来の分割ブラウザ方針と見直し条件は [`decisions/001-tiled-electron-browser.md`](decisions/001-tiled-electron-browser.md) を参照してください。
