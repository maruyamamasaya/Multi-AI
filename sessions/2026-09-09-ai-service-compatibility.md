# AIサービス Electron互換性調査

日付: 2026-09-09

## 調査結果

- 外部ページはElectron 44.3.0 / Chromium 152の`WebContentsView`で表示し、全画面が永続`defaultSession`を共有している。
- remote contentは`nodeIntegration: false`、`contextIsolation: true`、`sandbox: true`。権限要求と新規ウィンドウは拒否している。
- User-Agentには`multi-ai/0.1.0`と`Electron/44.3.0`が含まれる。Cookieは有効で、localStorage、IndexedDB、Service Workerは対応サイトで利用できた。
- ChatGPTは約10〜15秒でログイン画面まで読み込み完了し、継続読み込みは再現しなかった。Googleログインは同一WebContentsでGoogleアカウント画面まで遷移した。
- Claudeはページ表示できるが、Googleログイン操作が新規ウィンドウを要求し、現行の全面拒否により開始できない。Google公式は埋め込みユーザーエージェントでのOAuthを禁止しているため、埋め込み許可やUser-Agent偽装による回避は行わない。
- Gemini、Perplexity、Grok、Microsoft Copilotは未認証ページを表示できた。NotebookLMはGoogleアカウント画面まで表示できた。
- 未認証状態の共通送信はPerplexityだけ成功した。Grokは入力UIがあるものの現行DOM識別子へadapterが未追随だったため、Grok固有セレクタだけを更新した。他5サービスは認証画面または送信不能状態として個別に安全に失敗した。

## 判断

- セッション保存機構、Web Storage、CSP、Service Workerに共通障害は確認されなかった。
- 認証情報を入力せずに行える範囲では、各サービスの最終ログイン完了は未確認。利用者による認証操作が必要。
- Google OAuth制約を迂回せず、既存セキュリティ境界を維持する。認証とは無関係に確認できたGrok adapterのDOM識別子だけを最小修正した。
- 検証後、通常ワークスペースをテスト前の2画面構成へ戻した。

## 検証

- 7サービスの`document.readyState`、URL、タイトル、主要本文、User-Agent、Cookie、Web Storage、Service WorkerをElectron実機で確認。
- ChatGPT / Claude / Perplexity / Grok / Microsoft Copilotのログイン開始操作と遷移先を確認。
- 全7サービスへ既存adapterで共通プロンプト送信を試験し、結果の独立性を確認。
- Grok adapter修正後、ページの読み込み完了を待ってElectron実機から送信成功を確認。
