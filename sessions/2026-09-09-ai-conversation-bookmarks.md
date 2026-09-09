# AI会話URL専用ブックマーク

日付: 2026-09-09

## 変更

- ブックマークを対応7サービスのAIページ専用にし、表示名、URL、AIサービスIDを保存する形式へ拡張した。
- 旧形式はURLからサービスIDを補完し、未対応URL、不正項目、重複URLを安全に除外する。
- 一覧へ中央定義のAIアイコン、AI名、表示名を表示し、現在選択中の画面へ会話URLを開く。
- 対応外ページでは保存操作を無効化し、main IPCでも保存を拒否する。

## 検証

- Fast Validation: 成功（lint、typecheck、unit test 53件）。
- Full Validation: 成功（lint、typecheck、unit test 53件、production build）。
- Electron実動作: 一般URLの保存拒否と、Perplexityページの表示名・URL・サービスID付き保存を確認した。
- 一覧表示: `P Perplexity · Perplexity` としてアイコン、AI名、表示名が表示された。
- 重複・永続化: 同じURLを再保存しても1件のままで、終了・再起動後も保存内容が残った。
- 復元・削除: 別の選択画面へURLとPerplexityサービスIDを復元し、保存項目を削除できた。
- 旧形式互換: unit testでID、title、URLだけの旧項目へサービスIDを補完し、起動時に安全に読めることを確認した。
- 検証後はテスト用ブックマークと追加画面を削除し、元の2画面・画面1選択へ戻した。
