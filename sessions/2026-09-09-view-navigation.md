# ビュー別ナビゲーション

## Request

左右の各ビューへ戻る、進む、再読み込み、URL変更を追加する。

## Investigation

main、preload、rendererのIPC参照とElectron 44の `navigationHistory` APIを確認した。

## Changes

ビューID付きの限定IPC、状態通知、URLツールバー、履歴ボタン、読み込み表示、HTTP(S) URL正規化を追加した。build前に古い成果物を除去するclean処理も追加した。

## Files Changed

`src/main/`、`src/preload/`、`src/renderer/`、`src/shared/`、TypeScript・Vitest設定、`CURRENT.md`、`CODEMAP.md`、`ARCHITECTURE.md`を更新した。

## Validation

Fast / Full ValidationとElectron起動確認を実施した。

## Result

左右のビューを独立して任意のHTTP(S)ページへ移動し、履歴操作できる構成になった。

## Remaining Issues

セッション・URL保存、Electron runtimeでの自動E2E、AIサービス互換性検証は未実装。
