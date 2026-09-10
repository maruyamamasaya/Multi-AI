# システム構成

最終更新: 2026-09-09

## System Overview

Electron main processがデスクトップウィンドウと最大32個の独立した `WebContentsView` タブを管理し、そのうち1～6個を同時表示します。上部にはReact rendererの共通操作バー、各表示領域の先頭には28pxの識別ヘッダー、下部にはWebページを表示します。preloadだけがElectron IPCへ接続し、rendererには限定した `window.multiAI` APIを公開します。

外部ページのWeb権限はdefaultSessionで拒否を基本とし、Multi-AIが管理する `WebContentsView` に限って `clipboard-sanitized-write` だけを許可します。これにより各AIサービスのコピーボタンは動作させつつ、クリップボード読み取り、カメラ、マイク、位置情報などは許可しません。renderer UIや管理外WebContentsからの要求も拒否します。

```text
Electron main
  ├─ BrowserWindow
  │    └─ React toolbar ← preload / contextBridge ← navigation IPC
  ├─ WebContentsView tabs × 1～32（同時表示1～6）
  └─ userData/
       ├─ bookmarks.json
       ├─ named-workspaces.json
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
- `addView` / `removeView` / `moveView`: 1～6個の外部ビューを表示し、選択中画面を削除し、ビュー単位で左右へ並び替える。
- `updateViewBounds`: 通常時の分割配置と集中表示時の単一ビュー配置・可視性を切り替える。
- `AI_SERVICES` / `ServiceLauncher`: 対応AIの識別子・表示名・アイコン・URL・判定ホストを一元管理し、画面追加前の選択UIを提供する。
- `calculateViewBounds`: 画面数に応じて全画面、または2～6画面の等幅縦分割（横一列）を計算する。通常表示では各列を最低240pxに保ち、rendererのペイン見出しと共有するスクロール位置をboundsへ反映する。
- `registerIpcHandlers`: ビューIDを検証し、URL移動と履歴操作を処理する。
- `parseBookmarks` / `readBookmarks` / `saveBookmarks`: 対応AIの表示名、URL、サービスIDだけをuserData内のJSONへ保存し、旧形式を読み替える。
- `readWorkspaceSnapshot` / `writeWorkspaceSnapshot`: URL配列と選択位置を保存・復元する。
- `readNamedWorkspaceFile` / `writeNamedWorkspaceFile`: バージョン付きの名前付きワークスペース一覧を別JSONへ保存する。
- `StartupWorkspaceSelector`: 名前付き保存がある起動時だけ、前回状態または保存構成を選ぶモーダルを表示する。
- `promptAdapters`: サービス固有の入力欄・送信ボタンセレクタを個別ファイルに局所化し、共通の安全なDOM入力処理へ渡す。
- comparison layout state: 共通送信結果のビューだけを対象に、一時的な均等配置・除外・集中表示を管理する。
- preload: `contextBridge`で型付きの限定ナビゲーションAPIを公開する。
- `App` / `ViewToolbar`: 各ビューのURL、履歴ボタン、読み込み状態を表示する。
- `UI_THEMES` / theme CSS layer: 検証済みテーマIDをrendererの`localStorage`へ保存し、document rootの`data-theme`でMulti-AIの操作UIだけを切り替える。

## Data Flow

UIテーマはワークスペースや外部Webセッションから独立したrenderer表示設定です。起動時に保存済みIDを許可リストで検証し、不明な値は既存のデフォルトテーマへ戻します。切替時は`data-theme`属性と`localStorage`だけを更新するため、`WebContentsView`のURL、Cookie、配置、操作状態には影響しません。

mainは起動時に `workspace.json` を検証して画面数、URL、選択位置、分割レイアウト、共通Zoomを復元します。追加・削除・URL移動・選択変更・Zoom変更と終了時に最新snapshotを書き込みます。Zoom未保存の旧データや不正な倍率は既定の80%で補い、保存データがない、壊れている、危険なURLを含む場合は安全な既定の1画面へ戻します。全ビューを管理配列へ登録して選択状態と配置を確定してからURLロードを開始し、復元中のロードイベントが未初期化状態を参照しないようにします。

並び替えは上部の左右ボタンまたは各表示領域ヘッダーのドラッグ＆ドロップを入口とし、`PageView` オブジェクトを配列内で交換してから全ビューのboundsを再計算します。WebContents、URL、サービスID、履歴は同じオブジェクトに残り、選択状態はビューIDで維持されます。交換後の配列順と選択位置をworkspaceへ保存します。

集中表示は選択中の `WebContentsView` だけを表示領域全体へ広げ、他のビューは破棄せず一時的に非表示にします。解除時は同じ配列順から分割boundsを再計算するため、URL、AIサービス、履歴、ページ内状態、選択状態を維持します。集中表示はプロセス内だけの一時状態で `workspace.json` には含めず、再起動時は通常の分割表示に戻します。集中表示中は追加・削除・並び替え・別画面選択をrendererとmainの両方で抑止します。

名前付きワークスペースは通常の終了時復元用 `workspace.json` から分離し、`named-workspaces.json` にバージョン、安定ID、名前、作成・更新日時、検証済みsnapshotを保存します。同名は大文字小文字を区別せず検出し、利用者が上書きを確認した場合だけ既存IDを更新します。読み込み時は全URLを開く前に新しいビュー配列、AIサービスID、選択状態、boundsを確定し、その構成を通常の `workspace.json` にも書き込みます。集中表示はsnapshotに含みません。

起動前にmainが名前付き一覧を検証し、1件以上ある場合だけ起動選択状態にします。選択中は作成済みの外部 `WebContentsView` をすべて非表示にし、rendererの選択モーダルだけを前面へ出します。「前回の続き」は起動時に読んだ `workspace.json` の構成をそのまま表示し、名前付き構成は通常の安全な差し替え処理を経て `workspace.json` に反映します。一覧がない、壊れている、または有効な項目がない場合は選択を省略して従来どおり起動します。

画面追加時はrendererのランチャーが `src/shared/ai-services.ts` の候補を表示し、選択したサービスIDだけをmainへ渡します。mainは同じ定義からIDを検証して対応URLを開きます。ランチャー表示中は外部 `WebContentsView` を一時的に隠し、キャンセル時はビューや保存状態を変更せず再表示します。

rendererは各ビューに保持したサービスIDを使い、画面タブへ番号、サービスアイコン、AI名を表示します。サービスIDはURLとともにworkspaceへ保存し、会話ページや外部認証ページへ遷移しても表示を維持します。旧workspaceでは対応ホストからIDを推定し、未対応URLは汎用の `AIサービス` 表示へ安全にフォールバックします。

ブックマーク追加時は現在URLのホストを `AI_SERVICES` と照合し、対応AIのページだけを表示名、正規化URL、サービスID、保存日時とともに保存します。同じURLは追加しません。旧 `bookmarks.json` のID、title、URLだけの項目はURLからサービスIDを補完し、保存日時は推測せず「日時不明」として扱います。未対応URL、不正項目、重複URLは安全に一覧から除外します。rendererは同じ中央定義からアイコン、AI名、表示名を一覧へ表示し、選択した会話URLを現在選択中のビューへ開きます。

AI会話管理はrenderer内の専用全画面ダイアログとして通常ワークスペースから分離します。表示中はmainが外部 `WebContentsView` だけを一時的に非表示にし、閉じると同じタブ構成とページ状態を復元します。検索とサービス絞り込みはrenderer内で行い、タイトル／URL編集はmainで再検証して既存JSONへ保存します。URL変更時はサービスIDを再判定し、重複URLを拒否します。削除は確認ダイアログを経由します。

共通プロンプトはrendererからプロンプト本文と選択したビューIDだけをmainへ渡します。mainは各ビューの現在URLからサービスを再判定し、`src/main/prompt-adapters/` の対応adapterを各WebContents内で独立実行します。共通基盤は可視かつ空の入力欄だけへDOMイベント付きでテキストを設定し、サービス固有の有効な送信ボタンをクリックします。認証画面、iframe内、入力欄・ボタン不在、既存ドラフトありの場合はページ遷移や上書きをせず、そのビューだけ失敗にします。全対象は独立したPromiseとして最後まで実行し、画面ごとの成功・失敗をrendererへ返します。OSクリップボードやキーボード操作は使用しません。

回答比較v1は回答DOMを読まず、直前の共通送信結果とビューIDだけをrendererに保持します。mainは候補IDを比較開始時に固定し、対象中のWebContentsだけを2～4画面の等幅縦分割（横一列）へbounds再配置します。除外ビューは破棄せず非表示にし、再追加時に同じWebContentsを戻します。比較内集中表示は比較対象1画面だけを全面へ広げ、解除すると比較対象の配置へ戻します。比較終了時は一時状態を破棄して通常の全ビュー配列からboundsを復元し、workspaceへは保存しません。比較中は通常の追加・削除・並び替え・選択・集中表示・ナビゲーション・保存操作を抑止します。

共通Zoomはmain processで倍率を1つだけ保持し、通常表示・比較表示・集中表示を問わず全外部WebContentsへ直接適用します。新規画面やワークスペース切替で生成される画面は作成直後に現在倍率を引き継ぎます。ページの再読込は行わず、倍率は通常および名前付きworkspaceのsnapshotへ保存します。初回の既定倍率は80%で、100%リセット操作は原寸へ戻します。

## API / Database / Authentication

- 外部API: なし
- Database: なし
- アプリ独自認証: なし
- Environment Variables: なし
- External Services: ChatGPT、Claude、Gemini、Perplexity、Grok、Microsoft Copilot、NotebookLM。正確なURLは `src/shared/ai-services.ts` を正本とする
- Local Data: Electron `userData/bookmarks.json` に対応AIの会話ブックマーク（表示名、URL、AIサービスID、新規データでは保存日時）だけを保存
- Workspace Data: Electron `userData/workspace.json` に画面数、URL配列、サービスID配列、選択インデックス、分割レイアウト、共通Zoomを保存
- Named Workspace Data: Electron `userData/named-workspaces.json` にバージョン付きの名前、ID、日時、ワークスペースsnapshot一覧を保存

## Build and Deployment

build前に既存成果物だけを削除し、TypeScriptがmain/preload/sharedを `dist-electron/` へ、Viteがrendererを `dist-renderer/` へ出力します。electron-builderでWindows向けNSIS／portableと、macOS向けDMG／ZIP／展開済み`.app`を生成します。コード署名、公証、自動更新、CI/CDは未導入です。

## Security Boundaries

- ローカル操作バーrendererの `nodeIntegration` は無効、`contextIsolation` は有効。preloadはTypeScript出力の共有モジュールを読み込むため明示的にsandbox対象外とし、公開APIを `contextBridge` に限定する。
- preloadは任意IPCを公開せず、ビューID付きの固定ナビゲーション操作だけを公開。
- 共通プロンプトIPCは空本文・対象なしを拒否し、現在存在するビューと対応AIホストだけへadapterを実行する。
- 画面追加IPCは任意URLではなく、中央定義に存在するAIサービスIDだけを受け付ける。
- URL入力はmainで正規化し、`http` と `https` 以外を拒否する。
- 復元するURLにも同じ制限を適用し、不正なsnapshot全体を既定値へ戻す。
- 外部ビューはsandbox、context isolation有効、Node.js integration無効。
- 外部ビューの新規ウィンドウとWeb権限要求は拒否する。

将来の分割ブラウザ方針と見直し条件は [`decisions/001-tiled-electron-browser.md`](decisions/001-tiled-electron-browser.md) を参照してください。
