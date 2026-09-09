# 現在のプロジェクト状態

最終更新: 2026-09-09

## プロジェクト

複数の AI サービスの既存 Web 画面を一つのデスクトップ画面に並べる、タイル型マルチ AI ブラウザです。

## 現在のフェーズ

1～4画面の構成とURLを再起動後も復元できる、最小ブラウザとして動作する段階です。プロダクト方針は [`decisions/001-tiled-electron-browser.md`](decisions/001-tiled-electron-browser.md) を参照してください。

## 実装済み

- Electron main process、preload、React renderer
- context isolationを維持した最小IPC疎通
- IPC状態を確認できる最小画面
- `WebContentsView`による `example.com` と `example.org` の左右分割表示
- ウィンドウリサイズへの追従、新規ウィンドウとWeb権限要求の拒否
- 各ビューのURL入力、戻る、進む、再読み込み
- URL・履歴・読み込み状態のmainからrendererへの同期
- `http` / `https` 限定のURL正規化とIPC共有型
- 1～4画面の追加・削除と画面数に応じた自動レイアウト
- 選択中ビューのページを保存・表示・削除するローカルブックマーク
- 画面数、各画面の最終URL、選択中画面のローカル保存・復元
- 壊れた保存データと非HTTP(S) URLの安全な既定値フォールバック
- ESLint、TypeScript、Vitest、Vite build
- Fast / Full Validationの標準入口

## 進行中

- なし

## 未実装

- Cookieを含むブラウザセッション方針と互換性検証
- AIサービス連携、ログイン互換性検証、アプリ配布

## 既知の問題

- 実アプリ画面の自動E2Eとパッケージングは未導入です。
- Electron上での各AIサービスのログインと基本操作は未検証です。

## 技術的負債

- main processのナビゲーションIPCはElectron runtimeでの自動テストがなく、共有URL処理とrenderer操作のみunit test済みです。

## 次に行うこと

1. セッションを全画面で共有するか、画面ごとに分離可能にするか決める。
2. 最初の対象AIサービスと検証項目を決める。
3. 対象AIサービスを1件追加し、ログインと基本操作を検証する。
