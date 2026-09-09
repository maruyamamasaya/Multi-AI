# セットアップ・運用

## 現在利用できる操作

Node.jsとnpmを用意し、リポジトリルートで依存関係を復元します。

```powershell
npm ci
```

開発用の最小アプリをbuildして起動します。

```powershell
npm start
```

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\verify.ps1
```

## アプリケーションの起動

`npm start` はmain、preload、rendererをbuildした後にElectronを起動します。ホットリロード用の開発サーバーは未導入です。

起動後に左右のサンプルページを表示するには、`https://example.com/` と `https://example.org/` へのネットワーク接続が必要です。

「＋」を押すとAIサービス選択ランチャーが開きます。ChatGPT、Claude、Gemini、Perplexity、Grok、Microsoft Copilot、NotebookLMから選ぶと新しい画面が追加されます。キャンセルすると現在の画面構成を変更せず戻ります。画面は最大4つです。

「−」は選択中画面を削除し、最低1画面を維持します。左右の移動ボタンは選択中画面を隣の位置へ移動し、端では無効になります。移動後も同じ画面が選択されたまま、URL、AI情報、履歴ごと並び替わります。

「⛶」は2画面以上のときに選択中画面を集中表示します。集中表示中は「集中表示中」と表示され、同じ位置の「⊞」で元の分割表示へ戻ります。他の画面は破棄されないため、解除後もURLやページ内状態が維持されます。集中表示中は画面の追加・削除・並び替え・別画面選択が無効になります。集中表示自体は保存されず、再起動時は通常の分割表示です。

各画面タブには画面番号に加えて、現在のAIサービスのアイコンと名称が表示されます。対応AI内の会話ページへ移動しても表示は維持され、未対応URLでは `AIサービス` と表示されます。

## 環境変数

現在必要な環境変数はありません。追加時は値を記載せず、変数名、用途、必須性をここへ記録します。

## Database

Databaseは未導入で、セットアップやmigrationはありません。

## External Services

対応AIの入口URLは `src/shared/ai-services.ts` で一元管理します。各サービスの資格情報はアプリ独自に保存しません。

## Build

```powershell
npm run build
```

成果物は `dist-electron/` と `dist-renderer/` に生成されます。これらは再生成可能でGit管理外です。

## 配布・デプロイ

配布形式、署名、自動更新、CI/CDは未決定です。Electronアプリの最小実装と対象OSの決定後に定義します。

## 運用上の注意

- AIサービスの資格情報をリポジトリやアプリ独自の設定へ保存しない。
- Cookieなどのセッションデータをログやセッション記録へ含めない。
- 外部サービスのURL、権限要求、ポップアップは信頼済みとして自動許可しない。
- ブックマークはElectronの `userData` 配下にある `bookmarks.json` へ保存され、リポジトリには含まれない。
- 画面数、URL、AIサービスID、選択位置、分割レイアウトは同じ `userData` 配下の `workspace.json` へ保存される。ファイルがない、または壊れている場合は1画面で起動する。

## Troubleshooting

標準Verifyが失敗した場合は、最初に失敗したnpm scriptを個別実行します。起動時に画面を読み込めない場合は、先に `npm run build` を実行し、`dist-electron/` と `dist-renderer/` が生成されたことを確認します。

検証の詳細は [`TESTING.md`](TESTING.md)、現在地は [`CURRENT.md`](CURRENT.md) を参照してください。
