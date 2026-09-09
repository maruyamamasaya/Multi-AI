# AI開発基盤の検索・検証導線整備

## Request

AIが必要な情報とコードへ検索優先で到達し、少ないコンテキストで安全に変更・検証できる基盤を整える。

## Investigation

全リポジトリ構造、主要文書、Git履歴、コード・設定・テスト・ビルド定義の有無を確認した。アプリケーションコードとツールチェーンは存在しなかった。

## Changes

文書の役割と更新条件を固定し、検索入口、検証、運用の正本を追加した。依存不要のFast / Full Verifyを用意した。責務境界がないため子 `AGENTS.md` は作成しなかった。

## Files Changed

`AGENTS.md`、`CURRENT.md`、`ARCHITECTURE.md`、`README.md`、`sessions/README.md`を更新し、`CODEMAP.md`、`TESTING.md`、`OPERATIONS.md`、`scripts/verify.ps1`を追加した。

## Validation

Fast / Full Verify、意図したリンク切れの検出、文書間の役割とリンクを確認した。

## Result

検索優先の探索フローと1コマンドの標準検証入口が利用可能になった。

## Remaining Issues

アプリ実装後に実在するエントリーポイント、シンボル、関連テストを `CODEMAP.md` へ追加し、コード用検証を標準Verifyへ統合する必要がある。
