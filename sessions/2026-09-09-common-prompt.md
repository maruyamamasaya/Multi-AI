# 共通プロンプト送信

日付: 2026-09-09

## 変更

- 共通プロンプト入力、画面単位の送信先選択、送信中・成功・失敗表示を追加した。
- 7サービスのDOMセレクタを個別adapterへ分離し、共通の安全な入力・送信処理をWebContents内で実行する。
- 認証画面、入力欄・送信ボタン不在、既存ドラフトありは画面を変更せず個別失敗とする。
- 空プロンプト、対象0件をrendererとmainで拒否し、1画面の失敗後も他画面を継続する。

## 検証

- 公式ページ確認: ChatGPT、Claude、Gemini、Perplexity、Grok、Microsoft Copilot、NotebookLMの現在ページと未ログイン時の遷移を確認した。
- Fast Validation: 成功（lint、typecheck、unit test 66件）。
- Full Validation: 成功（lint、typecheck、unit test 66件、production build）。
- 現行DOM確認: Electron内でPerplexityの `#ask-input` と日本語の送信ボタンを確認してadapterへ反映した。Copilotはサインイン画面、Geminiは利用可能な送信UIなしとして安全に失敗した。
- 4画面: 同一Perplexity 2画面の片方だけをONにし、Perplexity成功、Copilot・Gemini失敗を画面別表示した。
- 3画面: Perplexity成功後もCopilot失敗を独立表示し、処理継続を確認した。
- 2画面: 同一Perplexity 2画面を個別にONにし、一方の失敗が他方の成功へ影響しないことを確認した。
- 入力制約: 空プロンプトと対象0件をUI・IPC双方で拒否した。
- 状態維持: 送信前後でWebContentsを破棄せず、生成されたPerplexity会話URLとサービスIDを各画面に維持した。
- 再起動確認: 検証後に元の `example.com` / `example.org` 2画面へ戻し、再起動後もワークスペース、AI会話一覧、名前付きワークスペースUI、共通プロンプトUIが正常に起動した。
