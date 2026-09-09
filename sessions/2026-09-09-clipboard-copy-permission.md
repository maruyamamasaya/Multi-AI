# クリップボードコピー権限

## 結果

- 全Web権限の一律拒否が、AIサービスのコピーボタンで使われる `clipboard-sanitized-write` も遮断していた。
- defaultSessionのpermission check/requestの両方で、管理対象 `WebContentsView` からの安全なクリップボード書き込みだけを許可した。
- クリップボード読み取り、mediaなど他の権限、および管理外WebContentsからの要求は引き続き拒否する。

## 検証

- 権限ポリシーのunit testを追加した。
- Electron実画面での各サービスのコピーボタン確認は未実施。
