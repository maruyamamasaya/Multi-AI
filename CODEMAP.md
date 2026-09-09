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
- `src/main/layout.test.ts`

## Web Content Views

Primary paths:
- `src/main/main.ts`
- `src/main/layout.ts`

Search keywords:
- `WebContentsView`
- `PAGE_URLS`
- `attachPageViews`
- `calculateViewBounds`
- `addView`
- `removeView`
- `moveView`
- `focusedViewId`
- `setFocusMode`
- `paneLayoutChannels`
- `MINIMUM_PANE_WIDTH`
- `setPermissionRequestHandler`
- `setWindowOpenHandler`

Key entry points:
- `createPageView`
- `attachPageViews`
- `moveView`
- `updateViewBounds`

Related tests:
- `src/main/layout.test.ts`

## AI Service Launcher

Primary paths:
- `src/shared/ai-services.ts`
- `src/renderer/App.tsx`
- `src/main/main.ts`

Search keywords:
- `AI_SERVICES`
- `getAiService`
- `getAiServiceByUrl`
- `UNKNOWN_AI_SERVICE`
- `ServiceLauncher`
- `launcherChannels`

Key entry points:
- `ServiceLauncher`
- `addView`
- AI名・アイコン付き画面タブ in `App`
- launcher IPC handler in `registerIpcHandlers`

Related tests:
- `src/shared/ai-services.test.ts`
- `src/renderer/App.test.tsx`

## Common Prompt

Primary paths:
- `src/shared/prompt.ts`
- `src/main/prompt-adapters/`
- `src/main/main.ts`
- `src/renderer/App.tsx`

Search keywords:
- `promptChannels`
- `sendCommonPrompt`
- `promptAdapters`
- `buildPromptScript`
- `common-prompt-row`

Key entry points:
- prompt IPC handler in `registerIpcHandlers`
- `createPromptAdapter`
- `sendCommonPrompt` in renderer

Related tests:
- `src/shared/prompt.test.ts`
- `src/main/prompt-adapters/prompt-adapters.test.ts`
- `src/renderer/App.test.tsx`

## Answer Comparison

Primary paths:
- `src/shared/comparison.ts`
- `src/main/main.ts`
- `src/renderer/App.tsx`

Search keywords:
- `comparisonChannels`
- `comparisonLayout`
- `startComparison`
- `comparison-row`

Key entry points:
- comparison IPC handlers in `registerIpcHandlers`
- comparison branch in `updateViewBounds`
- comparison mode UI in `App`

Related tests:
- `src/shared/comparison.test.ts`
- `src/renderer/App.test.tsx`

## Tab Visibility and Multi-tab Views

Primary paths:
- `src/shared/tab-visibility.ts`
- `src/shared/pane-layout.ts`
- `src/shared/workspace.ts`
- `src/main/main.ts`
- `src/renderer/App.tsx`

Search keywords:
- `isVisible`
- `visibleIndices`
- `tabVisibilityChannels`
- `pane-headers`
- `pane-actions`
- `reorderPane`
- `draggedPaneId`
- `tabLabel`
- `setPaneScrollOffset`

Related tests:
- `src/shared/workspace.test.ts`
- `src/main/workspace-store.test.ts`
- `src/renderer/App.test.tsx`

## Shared Zoom

Primary paths:
- `src/shared/zoom.ts`
- `src/main/main.ts`
- `src/renderer/App.tsx`

Search keywords:
- `zoomChannels`
- `zoomPercent`
- `setZoomFactor`
- `changeZoom`
- `zoom-actions`

Key entry points:
- zoom IPC handlers in `registerIpcHandlers`
- Zoom toolbar group in `App`
- zoom inheritance in `createPageView`

Related tests:
- `src/shared/zoom.test.ts`
- `src/renderer/App.test.tsx`

## Bookmarks

Primary paths:
- `src/main/main.ts`
- `src/shared/bookmarks.ts`
- `src/renderer/App.tsx`
- `src/renderer/BookmarkManager.tsx`

Search keywords:
- `bookmarkChannels`
- `parseBookmarks`
- `readBookmarks`
- `saveBookmarks`
- `addBookmark`
- `openBookmark`
- `removeBookmark`
- `updateBookmark`
- `BookmarkManager`
- `managerSetOpen`

Key entry points:
- bookmark IPC handlers in `registerIpcHandlers`
- `bookmark-actions`
- `bookmark-manager`

Related tests:
- `src/shared/bookmarks.test.ts`
- `src/renderer/App.test.tsx`

## Workspace Persistence

Primary paths:
- `src/main/workspace-store.ts`
- `src/shared/workspace.ts`
- `src/main/main.ts`

Search keywords:
- `WorkspaceSnapshot`
- `parseWorkspaceSnapshot`
- `persistWorkspace`
- `workspaceFile`
- `selectedViewId`
- `workspaceChannels`

Key entry points:
- `readWorkspaceSnapshot`
- `writeWorkspaceSnapshot`
- workspace IPC handlers in `registerIpcHandlers`

Related tests:
- `src/shared/workspace.test.ts`
- `src/renderer/App.test.tsx`

## Named Workspaces

Primary paths:
- `src/shared/named-workspaces.ts`
- `src/main/named-workspace-store.ts`
- `src/main/main.ts`
- `src/renderer/App.tsx`

Search keywords:
- `NamedWorkspace`
- `namedWorkspaceChannels`
- `named-workspaces.json`
- `replaceWorkspace`
- `saveNamedWorkspace`
- `StartupWorkspaceSelector`
- `isStartupSelectionOpen`

Key entry points:
- `parseNamedWorkspaceFile`
- named workspace IPC handlers in `registerIpcHandlers`
- `saved-workspace-row`
- `startup-workspace:start`

Related tests:
- `src/shared/named-workspaces.test.ts`
- `src/main/named-workspace-store.test.ts`
- `src/renderer/App.test.tsx`

## Preload and IPC

Primary paths:
- `src/preload/preload.ts`
- `src/renderer/global.d.ts`
- `src/shared/navigation.ts`

Search keywords:
- `app:ping`
- `contextBridge`
- `multiAI`
- `ping`
- `navigationChannels`
- `NavigationState`

Key entry points:
- `contextBridge.exposeInMainWorld`
- `window.multiAI.ping`
- `registerIpcHandlers`

Related tests:
- `src/renderer/App.test.tsx`
- `src/shared/navigation.test.ts`

## Renderer UI

Primary paths:
- `src/renderer/`

Search keywords:
- `App`
- `checkConnection`
- `connectionStatus`
- `ViewToolbar`
- `navigate`
- `runNavigation`

Key entry points:
- `App`

Related tests:
- `src/renderer/App.test.tsx`
- `src/shared/navigation.test.ts`

## Build and Validation

Primary paths:
- `package.json`
- `scripts/verify.ps1`
- `scripts/clean.mjs`
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
