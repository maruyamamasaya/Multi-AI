# 検証方法

## 標準コマンド

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\verify.ps1
```

必須文書、ローカルMarkdownリンク、Git差分に加えて、lint、typecheck、unit test、production buildを検証します。

## Fast Validation

実装中に、変更箇所へ素早くフィードバックするために実行します。

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\verify.ps1 -Fast
```

文書検証に加え、`npm run verify:fast` からlint、typecheck、unit testを実行します。buildは行いません。

## Full Validation

作業完了前に標準コマンドを実行します。文書検証と `npm run verify` により、lint、typecheck、全unit test、production buildを実行します。E2Eは未導入です。

## 変更タイプ別の必要検証

| 変更タイプ | Fast | 完了前 |
|---|---|---|
| Markdown・AI作業規約 | `verify.ps1 -Fast` | 標準Verify |
| 検証スクリプト | スクリプトを直接実行 | 標準Verifyと意図した失敗ケース |
| Electronメインプロセス | 関連テスト、typecheck | lint、typecheck、全テスト、build |
| React UI | 関連テスト、typecheck | lint、typecheck、全テスト、build |
| セッション・権限・IPC | 関連テスト、セキュリティ確認 | Full Validationと手動動作確認 |
| アーキテクチャ変更 | 関連テスト | Full Validation、build、文書整合性 |

未導入のコマンドは実装時に確定し、本書と標準Verifyを同じ変更で更新します。

## 検証カテゴリの現状

| カテゴリ | 状態 |
|---|---|
| Lint | `npm run lint` |
| Format check | `git diff --check` を標準Verifyから実行 |
| Typecheck | `npm run typecheck` |
| Unit test | `npm test` |
| Integration test | 未導入 |
| E2E | 未導入 |
| Build | `npm run build` |
| Windows package | `npm run package:win`（Windows上で手動実行） |
| macOS package | `npm run package:mac`（Mac上で同じCPU向けを手動実行） |
| Documentation | 必須文書、ローカルリンク、差分を標準Verifyで検証 |
