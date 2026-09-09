# 画面の追加・削除・入れ替え

## Request

既存のAI選択による追加と1～4画面制約を維持し、選択中画面の削除と、画面に紐づく状態を保った並び替えを実装する。

## Investigation

mainの `PageView` 配列、bounds計算、選択ビューID、workspace保存順、rendererの画面タブと追加・削除操作を確認した。

## Changes

選択中画面を左右へ1位置ずつ移動するIPCと操作ボタンを追加した。mainで `PageView` オブジェクトごと交換して再配置・保存するため、WebContents、URL、サービスID、AI表示、履歴が一緒に移動する。端の移動ボタン、1画面時の削除、4画面時の追加を無効化した。削除後は削除位置の隣接画面を選択する。

## Files Changed

main・preload IPC、共有型、renderer UI・スタイル・テスト、および関連文書を更新した。

## Validation

Fast / Full Validationはlint、typecheck、6ファイル37テスト、production buildに成功した。Electronで1～4画面の追加・削除、上下限制約、Claudeの左右移動、移動時のURL・AI・選択状態の追従を確認した。`AIサービス / ChatGPT / Claude / Gemini` の4画面順とClaude選択を保存して再起動し、同じ順序・URL対応・選択状態が復元されることを確認した。検証後は元の2画面、画面1選択へ戻した。

## Result

1～4画面の制約を保ちながら選択中画面を安全に削除・左右移動でき、並び替えた状態を再起動後も復元できる。

## Remaining Issues

なし。
