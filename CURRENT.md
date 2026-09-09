# 現在のプロジェクト状態

最終更新: 2026-09-09

## プロジェクト

複数の AI サービスの既存 Web 画面を一つのデスクトップ画面に並べる、タイル型マルチ AI ブラウザです。

## 現在のフェーズ

Electronアプリの最小基盤が動作し、外部Web画面の分割表示へ進む前の段階です。プロダクト方針は [`decisions/001-tiled-electron-browser.md`](decisions/001-tiled-electron-browser.md) を参照してください。

## 実装済み

- Electron main process、preload、React renderer
- context isolationを維持した最小IPC疎通
- IPC状態を確認できる最小画面
- ESLint、TypeScript、Vitest、Vite build
- Fast / Full Validationの標準入口

## 進行中

- なし

## 未実装

- `WebContentsView`による外部Web画面の分割表示
- ナビゲーション、セッション保持、レイアウト保存
- AIサービス連携、ログイン互換性検証、アプリ配布

## 既知の問題

- 実アプリ画面の自動E2Eとパッケージングは未導入です。
- Electron上での各AIサービスのログインと基本操作は未検証です。

## 技術的負債

- IPCチャンネル名とpreload API型は小規模なため各実装に直接記述されています。APIが増えた時点で共有定義を検討します。

## 次に行うこと

1. `WebContentsView`で任意の2ページを左右に表示する。
2. 外部コンテンツの権限、ポップアップ、新規ウィンドウを制御する。
3. ログインを伴わない公開ページで表示とリサイズを検証する。
