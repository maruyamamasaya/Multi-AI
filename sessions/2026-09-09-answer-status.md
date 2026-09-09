# 回答状態表示

## Request

各AI表示領域のヘッダー右側に、未実行・実行中・完了・失敗の簡単な回答状態表示を追加する。

## Investigation

既存の共通送信APIは送信操作の成否だけを返し、AIの回答生成完了は通知しない。送信成功を回答完了として扱うと誤判定になる。

## Changes

- 各ペインヘッダーへ小さな丸印と回答状態ラベルを追加した。
- 共通送信開始時に対象を実行中、明確な送信失敗時だけ失敗へ更新するようにした。
- 送信成功後は回答生成完了の安全な根拠がないため実行中を維持する。
- 状態ごとの色とアクセシブルなラベルを追加した。

## Files Changed

- `src/renderer/App.tsx`
- `src/renderer/App.test.tsx`
- `src/renderer/styles.css`
- `CURRENT.md`
- `sessions/2026-09-09-answer-status.md`

## Validation

- Fast Validation: 成功（13 test files、78 tests）
- Full Validation: 成功（lint、typecheck、13 test files・78 tests、production build）

## Result

既存の比較、タブ、WebContents、送信処理を変更せず、保守的な回答状態表示を追加した。

## Remaining Issues

回答生成完了を安全に通知できるサービス固有の仕組みは未導入。安全な判定方式を追加するまでは完了表示へ遷移しない。
