# LGTMonk Chrome拡張 リリースガイド

## 目次

1. [事前準備](#1-事前準備)
2. [リリースパッケージの作成](#2-リリースパッケージの作成)
3. [Chrome Web Store へのアップロード](#3-chrome-web-store-へのアップロード)
4. [審査への提出](#4-審査への提出)
5. [バージョン管理](#5-バージョン管理)
6. [公開後の運用](#6-公開後の運用)
7. [トラブルシューティング](#7-トラブルシューティング)

---

## 1. 事前準備

### 1.1 Google アカウントとデベロッパー登録

1. Google アカウントを用意
2. [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole) にアクセス
3. **$5 の一回限りの登録料**を支払ってデベロッパー登録

### 1.2 ストアリスティング用の素材を準備

#### 必要な画像素材

| 種類 | サイズ | 状態 | 備考 |
|------|--------|------|------|
| **アイコン** | 128x128px | ✅ 完了 | `apps/extension/public/icons/icon-128.png` |
| **スクリーンショット** | 1280x800px または 640x400px | 📝 要作成 | 3-5枚推奨 |
| **プロモーション用タイル** | 440x280px | ⚪ オプション | - |

#### スクリーンショットの内容例

1. ポップアップの初期表示画面（6枚の画像グリッド）
2. 画像にマウスオーバー時の状態
3. コピー成功時の画面（緑のチェックマーク表示）
4. リロードボタンの位置を示す画面
5. GitHub のプルリクエストで使用している様子

---

## 2. リリースパッケージの作成

### 2.1 本番ビルド

```bash
cd apps/extension
pnpm build
```

### 2.2 ZIPファイルの作成

#### 手動での作成

```bash
cd dist
zip -r ../lgtmonk-extension-v1.0.0.zip .
```

#### 自動化スクリプト（推奨）

**apps/extension/package.json に追加:**

```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "package": "pnpm build && cd dist && zip -r ../lgtmonk-extension-$(node -p \"require('../package.json').version\").zip ."
  }
}
```

**使用方法:**

```bash
cd apps/extension
pnpm package
```

これにより、`apps/extension/lgtmonk-extension-1.0.0.zip` が自動生成されます。

### 2.3 リリース前チェックリスト

- [ ] すべての機能が正常に動作する
- [ ] エラーやコンソール警告がない
- [ ] manifest.json の version が正しい
- [ ] .env ファイルが本番用の設定になっている
- [ ] 不要なログ出力が削除されている
- [ ] アイコンが正しく表示される

---

## 3. Chrome Web Store へのアップロード

### 3.1 新しいアイテムの作成

1. [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole) にアクセス
2. 「新しいアイテム」ボタンをクリック
3. 作成したZIPファイルをアップロード
4. アップロード完了を待つ（数秒〜数分）

### 3.2 ストアリスティング情報の入力

#### 基本情報

| 項目 | 内容 |
|------|------|
| **名前** | LGTMonk - LGTM Image Generator |
| **概要**<br>(132文字以内) | GitHubのプルリクエストに貼るLGTM画像を手軽にコピーできるChrome拡張機能 |

**詳細な説明:**

```
LGTMonkは、GitHubのプルリクエストに貼るLGTM画像を手軽にコピーできるChrome拡張機能です。

【主な機能】
✓ ランダムに6枚のLGTM画像を表示
✓ ワンクリックでMarkdown形式をコピー
✓ リロードボタンで新しい画像セットを取得
✓ シンプルで使いやすいインターフェース

【使い方】
1. ツールバーのLGTMonkアイコンをクリック
2. 6枚のランダム画像から好きなものを選択
3. Markdown形式（![LGTM](URL)）がクリップボードにコピーされます
4. GitHubのプルリクエストのコメント欄に貼り付け

【Web版も提供中】
https://lgtmonk.com

【オープンソース】
ソースコードはGitHubで公開しています。
バグ報告や機能リクエストはIssuesからお願いします。
https://github.com/andmohiko/lgtmonk
```

#### カテゴリと言語

- **カテゴリ**: 生産性（Productivity）
- **言語**: 日本語

#### 画像のアップロード

1. **アイコン（128x128px）**: `apps/extension/public/icons/icon-128.png` をアップロード
2. **スクリーンショット**: 3-5枚をアップロード（1280x800px 推奨）
3. **プロモーション用タイル**（オプション）: 440x280px

### 3.3 プライバシー設定

#### 単一目的の説明

```
この拡張機能はLGTM画像をFirebase Firestoreから取得し、ユーザーがMarkdown形式でクリップボードにコピーできるようにする単一の目的を持っています。
```

#### 権限の正当性

各権限について、なぜ必要かを明確に説明します：

| 権限 | 正当性の説明 |
|------|-------------|
| **clipboardWrite** | ユーザーが選択したLGTM画像のMarkdown形式（`![LGTM](URL)`）をクリップボードにコピーするために必要です。 |
| **storage** | （将来的に）お気に入り画像の保存に使用します。現在のバージョンでは使用していません。 |

**host_permissions:**

```
https://firestore.googleapis.com/*
https://storage.googleapis.com/*
```

**説明:**
```
Firebase Firestoreから公開されているLGTM画像のメタデータを取得し、Cloud Storageから画像を表示するために必要です。
```

#### プライバシーポリシー

現在の実装では個人を特定できる情報を収集していないため、以下のような簡潔なポリシーで問題ありません：

```markdown
# LGTMonk Chrome拡張機能 プライバシーポリシー

## データ収集について

この拡張機能は、以下のデータのみを扱います：

### 収集するデータ
- **画像のコピー数**: ユーザーが画像をコピーした際に、Firebase Firestoreの該当画像の`copiedCount`フィールドをインクリメントします（匿名）
- **画像表示回数**: 今後の機能として、画像の表示回数を記録する可能性があります（匿名）

### 収集しないデータ
- 個人を特定できる情報（名前、メールアドレスなど）
- 閲覧履歴
- 位置情報
- クリップボードの内容（コピー操作は行いますが、内容を保存・送信することはありません）

### データの利用目的
- 人気のある画像を把握し、サービスの改善に役立てる
- 統計情報の表示（今後の機能として検討中）

### データの保存場所
- Firebase Firestore（Google Cloud Platform）
- データは暗号化され、安全に保管されます

### お問い合わせ
プライバシーに関するご質問は、以下までお願いします：
GitHub Issues: https://github.com/andmohiko/lgtmonk/issues

最終更新日: 2026-03-08
```

**プライバシーポリシーの公開方法:**
1. GitHub Pages で公開する
2. Web版（lgtmonk.com）に `/privacy` ページを作成する
3. その URL を Chrome Web Store の「プライバシーポリシー」欄に入力

---

## 4. 審査への提出

### 4.1 最終チェックリスト

審査に提出する前に、以下を確認してください：

- [ ] manifest.json の version が正しい
- [ ] すべての機能が正常に動作する
- [ ] エラーやコンソール警告がない
- [ ] アイコンとスクリーンショットが正しく表示される
- [ ] プライバシーポリシーが公開されている
- [ ] ストアリスティング情報がすべて入力されている
- [ ] 権限の正当性が明確に説明されている

### 4.2 提出

「審査に送信」ボタンをクリック

### 4.3 審査期間

- **通常**: 1-3営業日
- **初回**: 最大1週間かかる場合あり
- 審査中も編集可能（ただし再審査が必要）

### 4.4 審査結果の確認

審査が完了すると、登録したメールアドレスに通知が届きます。

**承認された場合:**
- 自動的に公開されます
- Chrome Web Store で検索可能になります

**却下された場合:**
- 却下理由が通知されます
- 修正して再提出できます

---

## 5. バージョン管理

### 5.1 セマンティックバージョニング

| バージョン | 用途 | 例 |
|-----------|------|-----|
| **Major (x.0.0)** | 破壊的変更 | manifest_version変更、API仕様変更 |
| **Minor (1.x.0)** | 新機能追加 | 検索機能、お気に入り機能の追加 |
| **Patch (1.0.x)** | バグ修正 | UI調整、パフォーマンス改善 |

### 5.2 更新リリース手順

#### ステップ1: バージョンを更新

**apps/extension/manifest.json:**

```json
{
  "manifest_version": 3,
  "name": "LGTMonk - LGTM Image Generator",
  "version": "1.1.0",
  ...
}
```

**apps/extension/package.json:**

```json
{
  "name": "@lgtmonk/extension",
  "version": "1.1.0",
  ...
}
```

#### ステップ2: CHANGELOG.md を作成/更新

**apps/extension/CHANGELOG.md:**

```markdown
# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] - 2026-03-15

### Added
- キーワード検索機能を追加
- お気に入り機能を追加
- ダークモード対応

### Changed
- ポップアップのレイアウトを改善
- 画像読み込み速度を最適化

### Fixed
- 画像が表示されない問題を修正
- リロードボタンが反応しない問題を修正

## [1.0.0] - 2026-03-08

### Added
- 初回リリース
- ランダムに6枚のLGTM画像を表示
- ワンクリックでMarkdown形式をコピー
- リロードボタンで新しい画像セットを取得
```

#### ステップ3: Gitタグを作成

```bash
# 変更をコミット
git add apps/extension/manifest.json apps/extension/package.json apps/extension/CHANGELOG.md
git commit -m "chore(extension): bump version to 1.1.0"

# タグを作成
git tag -a extension-v1.1.0 -m "Release Chrome Extension v1.1.0"

# プッシュ
git push origin main
git push origin extension-v1.1.0
```

#### ステップ4: ビルド & パッケージ

```bash
cd apps/extension
pnpm package
```

#### ステップ5: Chrome Web Store で更新

1. [Developer Dashboard](https://chrome.google.com/webstore/devconsole) で該当アイテムを選択
2. 「パッケージをアップロード」→ 新しいZIPを選択
3. 「変更内容」セクションに更新内容を記載（英語推奨）:

```
Version 1.1.0

New Features:
- Added keyword search functionality
- Added favorite images feature
- Dark mode support

Improvements:
- Improved popup layout
- Optimized image loading speed

Bug Fixes:
- Fixed image display issues
- Fixed reload button not responding
```

4. 「変更を保存して審査に送信」をクリック

---

## 6. 公開後の運用

### 6.1 ユーザーフィードバックの監視

#### Chrome Web Store のレビュー

- Developer Dashboard で定期的にレビューをチェック
- 低評価には丁寧に返信する
- バグ報告は GitHub Issues に誘導

#### GitHub Issues でバグ報告を受け付ける

Issue テンプレートを作成：

**.github/ISSUE_TEMPLATE/bug_report_extension.md:**

```markdown
---
name: Chrome拡張 バグ報告
about: Chrome拡張機能のバグを報告
title: '[Extension] '
labels: 'bug, extension'
assignees: ''
---

**バグの説明**
バグの内容を簡潔に説明してください。

**再現手順**
1. '...' をクリック
2. '...' にスクロール
3. '...' を確認

**期待される動作**
本来どうあるべきかを説明してください。

**実際の動作**
実際に何が起きたかを説明してください。

**スクリーンショット**
可能であればスクリーンショットを添付してください。

**環境情報**
 - OS: [例: macOS 14.0]
 - Chrome バージョン: [例: 120.0.6099.129]
 - 拡張機能バージョン: [例: 1.0.0]
```

### 6.2 アナリティクス（オプション）

Google Analytics を組み込むことで、使用状況を把握できます。

#### 実装例

**apps/extension/src/background/service-worker.ts:**

```typescript
import { db } from '../shared/firebase'

// インストール時のトラッキング
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('LGTMonk Extension installed')
    // アナリティクスに送信（オプション）
  } else if (details.reason === 'update') {
    console.log('LGTMonk Extension updated to', chrome.runtime.getManifest().version)
  }
})
```

**注意:**
- Google Analytics を使用する場合、プライバシーポリシーに明記する必要があります
- ユーザーの同意が必要な場合があります

### 6.3 サポート対応

#### サポートURLの設定

**manifest.json に追加:**

```json
{
  "homepage_url": "https://github.com/andmohiko/lgtmonk",
  ...
}
```

#### 問い合わせ先

Developer Dashboard で以下を設定：
- **サポートURL**: https://github.com/andmohiko/lgtmonk/issues
- **サポートメール**: （任意）開発者のメールアドレス

---

## 7. トラブルシューティング

### 7.1 よくある審査却下理由

#### 1. 権限の説明不足

**問題:**
```
The justification for the requested permissions is insufficient.
```

**解決策:**
各権限について、具体的かつ詳細に説明する：

```
clipboardWrite: This permission is required to copy the selected LGTM image's Markdown format (e.g., ![LGTM](URL)) to the user's clipboard when they click on an image. Without this permission, the core functionality of the extension would not work.
```

#### 2. 単一目的の違反

**問題:**
```
Your extension must have a single purpose that is clear to users.
```

**解決策:**
- 拡張機能は1つの明確な目的のみを持つべき
- 説明文で単一目的を明確に示す
- 不要な機能を削除する

**良い例:**
```
This extension provides LGTM images for GitHub pull requests.
```

**悪い例:**
```
This extension provides LGTM images, tracks your coding time, and manages your GitHub notifications.
```

#### 3. スクリーンショット不足

**問題:**
```
Please provide more screenshots to demonstrate the functionality.
```

**解決策:**
- 最低3枚、できれば5枚用意
- 実際の使用場面を示す
- 日本語UIの場合、英語の説明を追加

#### 4. プライバシーポリシーの欠如

**問題:**
```
You must provide a privacy policy if you collect user data.
```

**解決策:**
- プライバシーポリシーを作成し、公開URLを提供
- 収集するデータと収集しないデータを明記
- データの利用目的を明確に説明

#### 5. manifest.json の設定ミス

**問題:**
```
The requested permissions are too broad.
```

**解決策:**
- permissions や host_permissions が過剰でないか確認
- 不要な権限は削除
- 必要最小限の権限のみリクエスト

**良い例:**
```json
{
  "permissions": ["clipboardWrite"],
  "host_permissions": [
    "https://firestore.googleapis.com/*",
    "https://storage.googleapis.com/*"
  ]
}
```

**悪い例:**
```json
{
  "permissions": ["clipboardWrite", "tabs", "history", "cookies"],
  "host_permissions": ["<all_urls>"]
}
```

### 7.2 技術的なトラブル

#### ビルドエラー

**問題:**
```
Error: Cannot find module 'firebase'
```

**解決策:**
```bash
cd apps/extension
pnpm install
pnpm build
```

#### ZIPファイルのエラー

**問題:**
```
Invalid package: manifest.json not found
```

**解決策:**
`dist` ディレクトリ内でZIPを作成していることを確認：

```bash
cd apps/extension/dist
zip -r ../lgtmonk-extension-v1.0.0.zip .
```

（`cd apps/extension && zip -r lgtmonk-extension.zip dist` は NG）

#### Firebaseエラー

**問題:**
```
Firebase: Error (auth/invalid-api-key)
```

**解決策:**
`.env` ファイルが正しく設定されているか確認：

```bash
cat apps/extension/.env
```

ビルド時に環境変数が埋め込まれているか確認：

```bash
cat apps/extension/dist/src/background/service-worker.js | grep VITE_FIREBASE_API_KEY
```

### 7.3 審査に関する問い合わせ

審査が遅い、または理由が不明な場合：

1. Developer Dashboard で「サポートに連絡」
2. 具体的な質問を英語で記載
3. 拡張機能のIDを明記

**問い合わせ例:**

```
Subject: Question about review status for extension [ID]

Hello,

I submitted my extension "LGTMonk - LGTM Image Generator" (ID: xxxxxxxxxxxxx) for review 5 days ago, but I haven't received any updates.

Could you please let me know the current status or if there are any issues that need to be addressed?

Thank you for your assistance.

Best regards,
[Your Name]
```

---

## 8. リリースチェックリスト

### 初回リリース

- [ ] Google アカウントを用意
- [ ] Chrome Web Store デベロッパー登録（$5支払い）
- [ ] アイコン（128x128px）を準備
- [ ] スクリーンショット（3-5枚）を作成
- [ ] プライバシーポリシーを作成・公開
- [ ] `.env` ファイルを本番設定に変更
- [ ] `pnpm build` でビルド
- [ ] ZIPファイルを作成
- [ ] Developer Dashboard でアップロード
- [ ] ストアリスティング情報を入力
- [ ] 権限の正当性を説明
- [ ] 審査に提出

### 更新リリース

- [ ] バージョン番号を更新（manifest.json, package.json）
- [ ] CHANGELOG.md を更新
- [ ] Gitタグを作成
- [ ] `pnpm package` でビルド & ZIP作成
- [ ] Developer Dashboard で新しいパッケージをアップロード
- [ ] 変更内容を記載
- [ ] 審査に提出

---

## まとめ

Chrome拡張のリリースは、以下の流れで行います：

1. **事前準備**: デベロッパー登録（$5）とスクリーンショット作成
2. **パッケージ作成**: `pnpm package` でZIPファイル生成
3. **アップロード**: Developer Dashboard で情報入力
4. **審査**: 1-3営業日で結果通知
5. **公開**: 承認されると自動公開
6. **運用**: ユーザーフィードバックの監視と定期更新

現在のLGTMonk拡張機能は既にビルド可能な状態なので、スクリーンショットを撮影すれば**すぐにリリース可能**です！

---

**作成日:** 2026-03-08
**最終更新日:** 2026-03-08
**バージョン:** 1.0.0
