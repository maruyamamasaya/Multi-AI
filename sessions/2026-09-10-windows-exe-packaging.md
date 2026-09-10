# Windows exe packaging

## 結果

- electron-builderを導入し、`npm run package:win` を追加した。
- Windows向けにインストーラー版（NSIS）とポータブル版の `.exe` を `release/` へ生成する。
- インストーラーはインストール先選択、デスクトップ／スタートメニューのショートカット作成に対応する。

## 検証

- Fast Validation: 成功（16 files / 100 tests）
- Full Validation: 成功（16 files / 100 tests、production build）
- Windows package: 成功（NSIS installer / portable、x64）

## 残課題

- コード署名、自動更新、CI/CDは未導入。
