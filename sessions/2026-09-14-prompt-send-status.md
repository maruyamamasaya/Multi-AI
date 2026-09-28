# Prompt送信状態表示

## Request

Prompt送信後も「実行中」が残る表示を、回答生成完了を追跡せず最小変更で修正する。

## Investigation

rendererは送信開始時に対象を `running` にする一方、送信結果の成功時に状態を更新していなかった。

## Changes

- 送信開始時の表示を「送信中」に変更した。
- 送信操作の成功結果を受けた画面を「送信済み」へ更新するようにした。
- 失敗時の表示と既存のPrompt送信処理、各AI用アダプターは変更していない。

## Files Changed

- `src/renderer/App.tsx`
- `src/renderer/App.test.tsx`
- `CURRENT.md`
- `sessions/2026-09-14-prompt-send-status.md`

## Validation

- Fast Validation: 成功（16 test files、100 tests）
- Full Validation: 成功（lint、typecheck、16 test files・100 tests、production build）

## Result

UI状態はPrompt送信操作の完了までを表し、AI側の回答生成完了は追跡しない。

## Remaining Issues

回答生成完了の検知は未実装のままだが、今回の仕様では対象外。
