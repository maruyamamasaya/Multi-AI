# 共通Zoomの保存・復元

## 変更

- 共通Zoomを通常および名前付きワークスペースのsnapshotへ含め、変更時と終了時に保存するようにした。
- 起動時と名前付きワークスペース切替時に倍率を全WebContentsとrenderer表示へ復元する。
- 初回および倍率未保存の旧データは80%を既定値とし、不正値も同じ値へ安全に補正する。
- 100%リセット操作は従来どおり原寸へ戻す。

## 検証

- Fast Validation: lint、typecheck、16ファイル99テストに成功。
- Full Validation: lint、typecheck、16ファイル100テスト、production buildに成功。
