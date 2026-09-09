# ワークスペース復元

## Request

画面数、最後のURL、選択中画面、分割レイアウトを保存し、再起動時に復元する。

## Investigation

画面追加・削除、URL移動、選択変更、userData保存、初期renderer同期を確認した。Electron 44ではTypeScript出力のローカル共有モジュールを読むpreloadが既定sandbox内で初期化に失敗し、`window.multiAI` が未定義になる実行時エラーも確認した。
保存済みワークスペースからの再起動時、ビュー配列の初期化完了前にロードイベントが発火し、対象ビュー検索が失敗する競合を確認した。

## Changes

画面数、URL配列、選択インデックス、分割レイアウトを `workspace.json` へ逐次保存し、起動時に検証・復元する。全ビューの登録と配置が完了してからURLロードを開始し、終了時は最後の保存完了を待つ。保存データの欠損・破損時は1画面へ戻す。外部Webビューのsandboxは維持し、ローカル操作バーのpreloadだけ共有モジュールを読み込める設定へ修正した。

## Files Changed

main、preload、renderer、workspace共有型・保存処理・テストと、`CURRENT.md`、`CODEMAP.md`、`ARCHITECTURE.md`、`OPERATIONS.md`を更新した。

## Validation

Fast / Full Validation（5ファイル、18テスト）を実行した。Electronで3画面、3画面目 `https://example.net/`、画面2選択の状態を作って終了し、再起動後に画面数、全URL、選択画面、`primary-left` レイアウトが復元されること、およびrenderer初期化例外がないことを確認した。検証後は元の2画面、画面1選択へ戻した。

## Result

画面構成、各画面の最終HTTP(S) URL、選択画面が再起動後に復元される。

## Remaining Issues

Cookieセッション方針、Electron runtime E2E、AIサービス互換性検証は未実装。
