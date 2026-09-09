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

## 環境変数

現在必要な環境変数はありません。追加時は値を記載せず、変数名、用途、必須性をここへ記録します。

## Database

Databaseは未導入で、セットアップやmigrationはありません。

## External Services

AIサービスとの接続は未実装です。実装後も各サービスの資格情報をアプリ独自に保存しません。

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
- 画面数、URL、選択位置は同じ `userData` 配下の `workspace.json` へ保存される。

## Troubleshooting

標準Verifyが失敗した場合は、最初に失敗したnpm scriptを個別実行します。起動時に画面を読み込めない場合は、先に `npm run build` を実行し、`dist-electron/` と `dist-renderer/` が生成されたことを確認します。

検証の詳細は [`TESTING.md`](TESTING.md)、現在地は [`CURRENT.md`](CURRENT.md) を参照してください。
