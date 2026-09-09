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
- `addView` / `removeView` / `moveView`: 1～4個の外部ビューを追加し、選択中画面を削除し、ビュー単位で左右へ並び替える。
- `updateViewBounds`: 通常時の分割配置と集中表示時の単一ビュー配置・可視性を切り替える。
- `AI_SERVICES` / `ServiceLauncher`: 対応AIの識別子・表示名・アイコン・URL・判定ホストを一元管理し、画面追加前の選択UIを提供する。
- `calculateViewBounds`: 画面数に応じて全画面、2分割、3分割、2×2を計算する。
- `registerIpcHandlers`: ビューIDを検証し、URL移動と履歴操作を処理する。
- `readBookmarks` / `saveBookmarks`: 名前とURLだけをuserData内のJSONへ保存する。
- `readWorkspaceSnapshot` / `writeWorkspaceSnapshot`: URL配列と選択位置を保存・復元する。
- preload: `contextBridge`で型付きの限定ナビゲーションAPIを公開する。
- `App` / `ViewToolbar`: 各ビューのURL、履歴ボタン、読み込み状態を表示する。

## Data Flow

mainは起動時に `workspace.json` を検証して画面数、URL、選択位置、分割レイアウトを復元します。追加・削除・URL移動・選択変更と終了時に最新snapshotを書き込みます。保存データがない、壊れている、危険なURLを含む場合は安全な既定の1画面へ戻します。全ビューを管理配列へ登録して選択状態と配置を確定してからURLロードを開始し、復元中のロードイベントが未初期化状態を参照しないようにします。

並び替えは `PageView` オブジェクトを配列内で交換してから全ビューのboundsを再計算します。WebContents、URL、サービスID、履歴は同じオブジェクトに残り、選択状態はビューIDで維持されます。交換後の配列順と選択位置をworkspaceへ保存します。

集中表示は選択中の `WebContentsView` だけを表示領域全体へ広げ、他のビューは破棄せず一時的に非表示にします。解除時は同じ配列順から分割boundsを再計算するため、URL、AIサービス、履歴、ページ内状態、選択状態を維持します。集中表示はプロセス内だけの一時状態で `workspace.json` には含めず、再起動時は通常の分割表示に戻します。集中表示中は追加・削除・並び替え・別画面選択をrendererとmainの両方で抑止します。

画面追加時はrendererのランチャーが `src/shared/ai-services.ts` の候補を表示し、選択したサービスIDだけをmainへ渡します。mainは同じ定義からIDを検証して対応URLを開きます。ランチャー表示中は外部 `WebContentsView` を一時的に隠し、キャンセル時はビューや保存状態を変更せず再表示します。

rendererは各ビューに保持したサービスIDを使い、画面タブへ番号、サービスアイコン、AI名を表示します。サービスIDはURLとともにworkspaceへ保存し、会話ページや外部認証ページへ遷移しても表示を維持します。旧workspaceでは対応ホストからIDを推定し、未対応URLは汎用の `AIサービス` 表示へ安全にフォールバックします。

## API / Database / Authentication

- 外部API: なし
- Database: なし
- アプリ独自認証: なし
- Environment Variables: なし
- External Services: ChatGPT、Claude、Gemini、Perplexity、Grok、Microsoft Copilot、NotebookLM。正確なURLは `src/shared/ai-services.ts` を正本とする
- Local Data: Electron `userData/bookmarks.json` にブックマークだけを保存
- Workspace Data: Electron `userData/workspace.json` に画面数、URL配列、サービスID配列、選択インデックス、分割レイアウトを保存

## Build and Deployment

build前に既存成果物だけを削除し、TypeScriptがmain/preload/sharedを `dist-electron/` へ、Viteがrendererを `dist-renderer/` へ出力します。インストーラー生成、署名、自動更新、CI/CDは未導入です。

## Security Boundaries

- ローカル操作バーrendererの `nodeIntegration` は無効、`contextIsolation` は有効。preloadはTypeScript出力の共有モジュールを読み込むため明示的にsandbox対象外とし、公開APIを `contextBridge` に限定する。
- preloadは任意IPCを公開せず、ビューID付きの固定ナビゲーション操作だけを公開。
- 画面追加IPCは任意URLではなく、中央定義に存在するAIサービスIDだけを受け付ける。
- URL入力はmainで正規化し、`http` と `https` 以外を拒否する。
- 復元するURLにも同じ制限を適用し、不正なsnapshot全体を既定値へ戻す。
- 外部ビューはsandbox、context isolation有効、Node.js integration無効。
- 外部ビューの新規ウィンドウとWeb権限要求は拒否する。

将来の分割ブラウザ方針と見直し条件は [`decisions/001-tiled-electron-browser.md`](decisions/001-tiled-electron-browser.md) を参照してください。
