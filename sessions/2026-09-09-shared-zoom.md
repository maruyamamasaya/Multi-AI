# 一括Zoom

日付: 2026-09-09

## 変更

- ツールバーへ全画面Zoom Out、100% Reset、Zoom Inと現在倍率表示を追加した。
- 50、67、80、90、100、110、125、150、175、200%の固定段階とした。
- main processが一時的な共通倍率を管理し、既存の全WebContentsへ一括適用する。
- 新規画面とワークスペース切替で生成される画面にも現在倍率を適用する。
- WebContentsの再生成・再読込は行わず、Zoom状態は永続化しない。

## 検証

- Fast Validation: 成功（lint、typecheck、unit test 74件）。
- Full Validation: 成功（lint、typecheck、unit test 74件、production build）。
- Electron実動作: 成功。隔離プロファイルで2画面90%、3画面80%、4画面90%、比較内集中100%、比較復帰100%、125%からReset 100%を確認した。
- 80%の状態で追加した4画面目も80%を引き継ぎ、全WebContentsの`devicePixelRatio`が同じ倍率へ変化することを確認した。
- 初回検証でElectron既定のorigin共有Zoom modeによる不一致を検出し、各WebContentsを`isolated` modeへ変更して修正・再確認した。
- 125%の状態で終了・再起動し、main stateとツールバー表示が100%へ戻ることを確認した。
