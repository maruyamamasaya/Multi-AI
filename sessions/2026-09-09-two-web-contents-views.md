# 2画面WebContentsView

## Request

ログイン不要の2ページをElectronアプリ内へ左右分割表示する。

## Investigation

main、renderer、IPC、テスト設定とElectron 44の `WebContentsView` 型定義を確認した。

## Changes

2つのsandboxed `WebContentsView`、リサイズ追従、権限・新規ウィンドウ拒否を追加し、rendererを上部ツールバーへ変更した。

## Files Changed

`src/main/`、`src/renderer/`、Vite設定、`CURRENT.md`、`CODEMAP.md`、`ARCHITECTURE.md`、`OPERATIONS.md`を更新した。

## Validation

Fast / Full Validationを実行し、分割座標2件と既存rendererテスト1件を確認した。`npm start`でElectronプロセスが継続起動することを確認後、手動終了した。

## Result

`example.com` と `example.org` を左右に表示するbuild可能な構成になった。

## Remaining Issues

実画面E2E、URL変更、ナビゲーション、セッション保持は未実装。
