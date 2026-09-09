# 選択画面の集中表示

日付: 2026-09-09

## 変更

- 選択中の `WebContentsView` を破棄せず全面へ広げ、他ビューを一時的に非表示にする集中表示を追加した。
- 集中表示の切替ボタンと状態表示を追加し、1画面時は無効化した。
- 集中表示中の追加・削除・並び替え・別画面選択をrendererとmainの両方で抑止した。
- 集中表示をworkspaceへ保存せず、再起動時は通常の分割表示へ戻すようにした。

## 検証

- Fast Validation: 成功（lint、typecheck、unit test 39件）。
- Full Validation: 成功（lint、typecheck、unit test 39件、production build）。
- Electron実動作: 2・3・4画面で集中表示と解除を確認した。集中表示中も全WebContentsが残り、AIサービス、URL、画面順、選択状態が維持された。
- 再起動確認: 3画面・Gemini選択を復元しつつ、集中表示は永続化されず通常表示で起動した。
- 検証後は追加したAI画面を削除し、元の2画面・画面1選択へ戻した。
