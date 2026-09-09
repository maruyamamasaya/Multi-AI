# AIサービス名・アイコン表示

## Request

各画面へ現在のAIサービス名とアイコンを表示し、会話URL、重複AI、復元、未対応URLを安全に扱う。

## Investigation

中央サービス定義、ナビゲーション状態同期、画面選択タブ、ワークスペース復元を確認した。ネイティブWebビューを狭めず常時確認できる既存の画面タブを表示位置に選んだ。

## Changes

`AI_SERVICES` にアイコンと判定ホストを追加し、URLからサービスを判別する共通関数と安全なフォールバックを実装した。画面タブを番号、アイコン、AI名のコンパクトな表示へ拡張し、選択状態へ `aria-current` を追加した。外部認証URLへ遷移した場合にも識別を維持するため、ビューとworkspaceへサービスIDを保持する。

## Files Changed

共有サービス定義とテスト、renderer UI・スタイル・テスト、および関連文書を更新した。

## Validation

Fast / Full Validationはlint、typecheck、6ファイル34テスト、production buildに成功した。Electronで7サービスすべての名称・アイコン・選択表示、ChatGPTの重複2画面、未対応URLのフォールバックを確認した。NotebookLMがGoogle認証URLへ遷移した状態で終了・再起動し、3画面構成、選択状態、`N` アイコン、`NotebookLM` 名の復元を確認した。検証後は元の2画面、画面1選択へ戻した。

## Result

各画面でAI名とアイコンを識別でき、内部遷移、外部認証、重複、旧・未対応URL、再起動を安全に扱える。

## Remaining Issues

なし。
