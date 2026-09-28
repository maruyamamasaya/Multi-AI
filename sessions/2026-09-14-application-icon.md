# アプリケーションアイコン設定

- 既存の `build/icon-source.png` から16～256pxを含むWindows用 `build/icon.ico` を作成した。
- electron-builderのWindowsアイコンへ `build/icon.ico` を明示設定した。
- インストーラー版とポータブル版を再生成し、Electron標準アイコンではなくMulti-AIロゴが埋め込まれることを確認した。
- 標準検証と `npm run package:win` を実行した。
