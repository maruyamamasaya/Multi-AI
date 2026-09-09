# 比較レイアウトの等幅縦分割

## 目的

2画面を左右2分割、3画面を縦3分割、4画面を縦4分割（横一列）にし、比較内集中表示とWebContentsの状態維持を保つ。

## 変更

- `calculateViewBounds` を1px境界込みの等幅列計算へ変更した。
- 3画面・4画面と最小ウィンドウ幅720pxのboundsをunit testへ追加した。
- 実装に合わせて `CURRENT.md`、`ARCHITECTURE.md`、`OPERATIONS.md` を更新した。

## 検証

- Fast / Full Validation: 実装直後にlint、typecheck、12ファイル70テスト、production buildに成功した。最終再実行時は並行作業の未追跡 `.tmp-grok-send.mjs` が標準lintを失敗させたため、このファイルだけを除外してlint、typecheck、12ファイル71テスト、production build、diff checkの成功を確認した。
- Electron実機: 2画面は約541/542px、3画面は約360/361px、4画面は約270/271pxの等幅列を確認した。
- 最小ウィンドウ幅720pxでは4画面が約175/176pxへ追従し、同じ高さを維持して各AIページのresponsive / overflowが隣列へ重ならないことを確認した。
- 4画面比較からChatGPTを集中表示し、同一WebContentsのURLとサービスIDを維持したまま4画面比較へ復帰することを確認した。除外画面はhiddenのまま保持された。
- 検証後は比較モードを終了し、追加した画面を削除して元の1画面構成へ戻した。

## 結果

WebContentsを破棄・再生成せず、2～4画面を全高の等幅列で比較できる。
