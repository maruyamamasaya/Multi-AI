# 複数AIの回答比較 v1

日付: 2026-09-09

## 変更

- 直前の共通プロンプト送信対象を見やすく再配置する比較モードを追加した。
- 画面ごとのAI名、アイコン、送信成否と、一時除外・再追加操作を表示する。
- 比較内の1画面集中表示、比較配置への復帰、通常ワークスペースへの終了を追加した。
- WebContentsや回答DOMには触れず、可視性とboundsだけを一時変更する。
- 比較中の通常ワークスペース変更を抑止し、比較状態は永続化しない。

## 検証

- Fast Validation: 成功（lint、typecheck、unit test 69件）。
- Full Validation: 成功（lint、typecheck、unit test 69件、production build）。
- Electron実動作: 成功。Perplexity / Claude / Gemini / Microsoft Copilot の4画面を共通送信対象にし、4画面2×2、3画面、2画面左右、除外対象の再追加、比較内集中表示、比較表示への復帰を確認した。
- 共通送信は Perplexity が成功し、未認証または入力不能状態の Claude / Gemini / Microsoft Copilot は個別に安全に失敗した。失敗が他画面を中断せず、各結果が比較UIへ表示された。
- 比較開始から終了まで外部WebContentsは4件のまま維持され、終了後もURL、AIサービスID、並び順、選択画面が維持された。
- Electron終了・再起動後、4画面の通常ワークスペースが復元され、比較モードは復元されないことを確認した。検証後はテスト前の2画面構成へ戻した。
