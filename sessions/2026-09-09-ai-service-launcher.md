# AIサービス選択ランチャー

## Request

画面追加時に7つの対応AIから選べるランチャーを表示し、既存機能と4画面上限、再起動復元を維持する。

## Investigation

画面追加IPC、React操作バー、ネイティブ `WebContentsView` の重なり、ワークスペース保存経路を確認した。サービスURLは各公式Web入口で確認した。

## Changes

サービスID、表示名、URL、表示マークを共有定義へ集約した。画面追加ボタンはモーダル型ランチャーを開き、選択確定時だけ検証済みサービスURLのビューを追加する。ランチャー表示中は外部ビューを一時的に隠し、キャンセルでは状態を変更しない。

## Files Changed

共有サービス定義、main・preload IPC、renderer UI・スタイル・テスト、および関連文書を更新した。

## Validation

Fast / Full Validationはlint、typecheck、6ファイル22テスト、production buildに成功した。Electronでランチャーのキャンセル、7候補すべての遷移先、ChatGPTの重複追加、4画面時の追加無効化を確認した。Geminiを3画面目に選んで終了・再起動し、3画面構成、選択位置、`https://gemini.google.com/app` の復元を確認した。検証後は元の2画面、画面1選択へ戻した。

## Result

対応AIを選択して新規画面を追加でき、既存の追加・削除、上限、保存・復元、ブックマーク経路を維持した。

## Remaining Issues

各サービスのログイン互換性は資格情報を扱うため今回の範囲外。
