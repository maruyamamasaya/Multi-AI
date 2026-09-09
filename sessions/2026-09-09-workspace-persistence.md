# ワークスペース復元

## Request

画面数、最後のURL、選択中画面を保存し、再起動時に復元する。

## Investigation

画面追加・削除、URL移動、選択変更、userData保存、初期renderer同期を確認した。
保存済みワークスペースからの再起動時、ビュー配列の初期化完了前にロードイベントが発火し、対象ビュー検索が失敗する競合を確認した。

## Changes

URL配列と選択インデックスを `workspace.json` へ逐次保存し、起動時に検証・復元する処理を追加した。初期ロード中の状態通知は登録済みビューの検索に依存せず、生成中のビュー情報から組み立てるよう修正した。

## Files Changed

main、preload、renderer、workspace共有型・保存処理・テストと、`CURRENT.md`、`CODEMAP.md`、`ARCHITECTURE.md`、`OPERATIONS.md`を更新した。

## Validation

Fast / Full Validation（4ファイル、14テスト）、保存ファイル生成、保存済み状態からのElectron再起動を確認した。

## Result

画面構成、各画面の最終HTTP(S) URL、選択画面が再起動後に復元される。

## Remaining Issues

Cookieセッション方針、Electron runtime E2E、AIサービス互換性検証は未実装。
