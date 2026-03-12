<div align="center">
  <img src="public/logo.svg" alt="Claude Code UI" width="64" height="64">
  <h1>Claude Code UI — Summer Edition ☀️</h1>
  <p><a href="https://github.com/siteboon/claudecodeui">CloudCLI / Claude Code UI</a> のコミュニティフォーク、<b>Claude Code</b> 体験の向上に注力しています。<br>リアルタイムストリーミング、思考プロセスの可視化、ツール進捗表示、コスト追跡 — VS Code レベルのレンダリングを Web UI に実現します。</p>
</div>

> **注意**: これは改造版（Summer Edition）です。オリジナルプロジェクトは [siteboon/claudecodeui](https://github.com/siteboon/claudecodeui) をご覧ください。

<div align="right"><i><a href="./README.md">English</a> · <a href="./README.ru.md">Русский</a> · <a href="./README.ko.md">한국어</a> · <a href="./README.zh-CN.md">中文</a> · <b>日本語</b></i></div>

---

## Summer Edition の変更点

このフォークは **Claude Code** 統合体験の改善に注力しています。上流プロジェクトは Claude Code、Cursor CLI、Codex、Gemini CLI をサポートしており — マルチプロバイダーサポートを維持しつつ、Claude Code 体験を最高水準にすることに力を注いでいます。

### 主な改善点

| 機能 | 説明 |
|---|---|
| **リアルタイムストリームレンダリング** | SDK メッセージ（`stream_event`、`assistant`、`tool_progress` 等）が到着次第レンダリング、バッファリングなし |
| **思考ブロックの可視化** | `<Thinking>` ブロックがリアルタイムでストリーミングされ、思考時間を追跡（`thinkingDurationMs`） |
| **ツール進捗表示** | 実行中のツールのライブ進捗バーとステータステキスト |
| **サブエージェントコンテナ** | ネストされたエージェントタスクが taskId マッチングでレンダリングされ、進捗ログを表示 |
| **レート制限バナー** | API レート制限時にカウントダウンバナーを表示 |
| **コスト情報バー** | レスポンスごとのコスト、所要時間、モデル情報を表示 |
| **エージェントステータスフィード** | SDK ステータスメッセージ（`ファイル読み込み中...`、`コードベース検索中...`）を ClaudeStatus 経由でリアルタイム表示 |
| **ストリーム遅延の削減** | フラッシュ間隔を 100ms から 33ms に短縮し、よりスムーズなストリーミング |
| **セキュリティ強化** | gray-matter フロントマターエンジンを無効化し、コード実行を防止 |

### アーキテクチャの変更

- **バックエンド**: SDK メッセージが `classifySDKMessage()` で分類され、`subType` タグが付与されてから WebSocket で転送
- **フロントエンド**: モノリシックな `useChatRealtimeHandlers` をルーティングエントリ + 9つのモジュラーハンドラーファイルにリファクタリング
- **型定義**: `ChatMessage` に `isThinking`、`thinkingDurationMs`、`toolName`、`toolInput`、`progressPercentage`、`subagentId` 等を拡張
- **i18n**: 全新規 UI 文字列を 5 言語（en、zh-CN、ko、ja、ru）に追加

---

## スクリーンショット

<div align="center">

<table>
<tr>
<td align="center">
<h3>デスクトップビュー</h3>
<img src="public/screenshots/desktop-main.png" alt="Desktop Interface" width="400">
<br>
<em>プロジェクト概要とチャットを表示するメインインターフェース</em>
</td>
<td align="center">
<h3>モバイル体験</h3>
<img src="public/screenshots/mobile-chat.png" alt="Mobile Interface" width="250">
<br>
<em>タッチナビゲーション対応のレスポンシブモバイルデザイン</em>
</td>
</tr>
<tr>
<td align="center" colspan="2">
<h3>CLI 選択</h3>
<img src="public/screenshots/cli-selection.png" alt="CLI Selection" width="400">
<br>
<em>Claude Code、Cursor CLI、Codex から選択</em>
</td>
</tr>
</table>



</div>

## 機能

上流の全機能を維持:

- **レスポンシブデザイン** - デスクトップ、タブレット、モバイルでシームレスに動作
- **インタラクティブチャットインターフェース** - AI エージェントとシームレスに通信する組み込みチャット
- **統合シェルターミナル** - 組み込みシェル機能による CLI への直接アクセス
- **ファイルエクスプローラー** - シンタックスハイライトとライブ編集対応のインタラクティブファイルツリー
- **Git エクスプローラー** - 変更の確認、ステージング、コミット
- **セッション管理** - 会話の再開、複数セッションの管理、履歴の追跡
- **TaskMaster AI 統合** *（オプション）* - AI 駆動のタスク計画とワークフロー自動化

**Summer Edition の追加機能:**

- **🔥 リアルタイムメッセージストリーミング** - SDK メッセージが到着次第レンダリング（33ms フラッシュ間隔）
- **💭 思考ブロックストリーミング** - Claude の思考プロセスをリアルタイムで観察、時間追跡付き
- **🔧 ツール進捗表示** - 実行中のツールのライブ進捗バー
- **🤖 サブエージェントコンテナ** - 進捗ログ付きのネストされたエージェントタスク
- **⏱️ コストと所要時間の追跡** - レスポンスごとのコスト、モデル、時間情報
- **🚦 レート制限処理** - 制限発生時の視覚的カウントダウンバナー
- **📡 エージェントステータスフィード** - SDK リアルタイムステータステキスト（読み込み中、検索中など）


## クイックスタート

### 開発環境（このフォークから）

```bash
git clone https://github.com/FuHesummer/claudecodeui-summer.git
cd claudecodeui-summer
npm install
cp .env.example .env
npm run dev
```

`http://localhost:3001` を開くと — 既存の Claude Code セッションが自動的に検出されます。

### 上流との同期

```bash
git remote add upstream https://github.com/siteboon/claudecodeui.git
git fetch upstream
# 特定のコミットをチェリーピック（関連のないヒストリーのため merge は競合）
git cherry-pick <commit-hash>
```

### PM2 バックグラウンド実行（本番環境）

```bash
npm install -g pm2
pm2 start ecosystem.config.cjs
pm2 startup && pm2 save  # ブート時に自動起動
```

> このフォークには `WORKSPACES_ROOT` 環境変数が設定済みの `ecosystem.config.cjs` が含まれています。

## セキュリティとツール設定

**🔒 重要**: すべての Claude Code ツールは**デフォルトで無効**になっています。これにより、潜在的に有害な操作が自動的に実行されることを防ぎます。

### ツールの有効化

Claude Code の全機能を使用するには、手動でツールを有効にする必要があります:

1. **ツール設定を開く** - サイドバーの歯車アイコンをクリック
2. **選択的に有効化** - 必要なツールのみを有効にする
3. **設定を適用** - 環境設定はローカルに保存されます

<div align="center">

![ツール設定モーダル](public/screenshots/tools-modal.png)
*ツール設定インターフェース - 必要なものだけを有効にしましょう*

</div>

**推奨アプローチ**: 基本的なツールから有効にし、必要に応じて追加してください。これらの設定はいつでも調整できます。

## ライセンス

GNU General Public License v3.0 - 詳細は [LICENSE](LICENSE) ファイルをご覧ください。

このプロジェクトはオープンソースであり、GPL v3 ライセンスの下で自由に使用、変更、配布できます。

## 謝辞

### 上流プロジェクト
- **[CloudCLI / Claude Code UI](https://github.com/siteboon/claudecodeui)** - Siteboon が開発した原本プロジェクト、このフォークの基盤

### 使用技術
- **[Claude Code](https://docs.anthropic.com/en/docs/claude-code)** - Anthropic の公式 CLI
- **[Cursor CLI](https://docs.cursor.com/en/cli/overview)** - Cursor の公式 CLI
- **[Codex](https://developers.openai.com/codex)** - OpenAI Codex
- **[React](https://react.dev/)** - ユーザーインターフェースライブラリ
- **[Vite](https://vitejs.dev/)** - 高速ビルドツールと開発サーバー
- **[Tailwind CSS](https://tailwindcss.com/)** - ユーティリティファースト CSS フレームワーク
- **[CodeMirror](https://codemirror.net/)** - 高度なコードエディター
- **[TaskMaster AI](https://github.com/eyaltoledano/claude-task-master)** *（オプション）* - AI 駆動のプロジェクト管理とタスク計画

## コミュニティとサポート

- **上流プロジェクト**: [siteboon/claudecodeui](https://github.com/siteboon/claudecodeui) — 原本プロジェクト
- **このフォーク**: [FuHesummer/claudecodeui-summer](https://github.com/FuHesummer/claudecodeui-summer) — Summer Edition
- **上流ドキュメント**: [cloudcli.ai/docs](https://cloudcli.ai/docs) — インストール、設定、機能

---

<div align="center">
  <strong>Summer Edition ☀️ — Claude Code UI をより良く、ストリーミング一つずつ。</strong>
  <br><br>
  <sub><a href="https://github.com/siteboon/claudecodeui">CloudCLI</a> by <a href="https://siteboon.ai">Siteboon</a> ベース</sub>
</div>
