# macOS packaging

## 結果

- electron-builderへmacOS向けDMG／ZIP設定を追加した。
- 現在のMacと同じCPU、Apple Silicon、Intel、Universalを個別に生成できるnpm scriptを追加した。
- 生成した`.app`をFinderから直接起動できるようにし、配布形式と未署名時の注意を運用文書へ記録した。

## 検証

- Fast Validation: 成功（16 files / 100 tests）
- Full Validation: 成功（16 files / 100 tests、production build）
- macOS package: 成功（Apple Silicon向け `.app` / `.dmg` / `.zip`）
- 実行バイナリ確認: Mach-O 64-bit arm64、bundle ID `com.multiai.desktop`

## 残課題

- Apple Developer IDによるコード署名とApple公証は未導入。
- Intel／Universal成果物の実機起動確認は未実施。
