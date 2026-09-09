# 動的画面とブックマーク

## Request

画面をボタンで増減し、シンプルなブックマークをアプリ側へ追加する。

## Investigation

固定2画面の管理、レイアウト計算、ナビゲーションIPC、Electron userDataの利用箇所を確認した。

## Changes

1～4画面の追加・削除、自動レイアウト、対象ビュー選択、ローカルJSONブックマークを追加した。

## Files Changed

main、preload、renderer、shared型、レイアウトテスト、`CURRENT.md`、`CODEMAP.md`、`ARCHITECTURE.md`、`OPERATIONS.md`を更新した。

## Validation

Fast / Full ValidationとElectron起動確認を実施した。

## Result

画面数を1～4で変更でき、選択中ページのブックマークを追加・表示・削除できる。

## Remaining Issues

画面構成・最終URLの保存、セッション設計、Electron runtime E2Eは未実装。
