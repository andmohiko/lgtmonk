# Firebase Hosting vs App Hosting - 選択ガイド

## 概要

LGTMonkアプリケーションを Firebase にデプロイする際、**Firebase Hosting** と **Firebase App Hosting** のどちらを選択すべきかを分析します。

## 結論

**Firebase App Hosting を選択すべき**

### 理由

1. **TanStack Start はSSRフレームワーク**であり、サーバーサイドレンダリング (SSR) が必要
2. Firebase App Hosting は Next.js, Angular, TanStack Start などのフルスタックフレームワークを**ネイティブサポート**
3. Firebase Hosting は静的サイト専用で、SSRには Cloud Run などの別サービスとの組み合わせが必要

---

## Firebase Hosting vs App Hosting の比較

| 項目 | **Firebase Hosting** | **Firebase App Hosting** |
|------|---------------------|-------------------------|
| **対応フレームワーク** | 静的サイト (HTML/CSS/JS) のみ | Next.js, Angular, **TanStack Start** など |
| **SSR対応** | ❌ 非対応（別途Cloud Run等が必要） | ✅ ネイティブ対応 |
| **デプロイ方法** | Firebase CLI (`firebase deploy`) | GitHub連携の自動デプロイ |
| **サーバーサイド処理** | Cloud Functions 経由のみ | フレームワークのサーバー機能を利用可能 |
| **料金** | 無料枠あり（10GB/月、360MB/日転送） | 無料枠あり（5GB保存、200GB/月転送） |
| **カスタムドメイン** | ✅ 対応 | ✅ 対応 |
| **HTTP/2, SSL** | ✅ 自動 | ✅ 自動 |
| **グローバルCDN** | ✅ あり | ✅ あり |
| **適用ケース** | SPAや静的サイト | SSRが必要なフルスタックアプリ |

---

## TanStack Start の特徴とホスティング要件

### TanStack Start とは

- **フルスタックReactフレームワーク**（Next.js や Remix に類似）
- **SSR（サーバーサイドレンダリング）** をサポート
- **API Routes** をサポート（サーバーサイドエンドポイント）
- **Server Functions** をサポート（`createServerFn`）

### LGTMonk での TanStack Start の使用

仕様書 (`docs/spec.md`) より：

```
| フレームワーク | TanStack Start (TypeScript) |
```

TanStack Start は SSR を前提としたフレームワークであり、以下の機能を利用する可能性が高い：

1. **サーバーサイドレンダリング (SSR)**: 初回ページロードの高速化、SEO対策
2. **Server Functions**: データ取得、認証処理
3. **API Routes**: Cloud Functions と連携する内部API

これらの機能は**静的サイトホスティングでは動作しない**ため、**App Hosting が必須**。

---

## Firebase App Hosting の詳細

### 対応フレームワーク

公式ドキュメントによると、以下のフレームワークをサポート：

- Next.js (App Router, Pages Router)
- Angular (v17.2+)
- **TanStack Start** (明示的にサポート)
- その他のフルスタックフレームワーク

### デプロイフロー

```
GitHub リポジトリ
    ↓ (push / PR)
Firebase App Hosting
    ↓ (自動ビルド)
Cloud Run (自動管理)
    ↓ (デプロイ)
グローバル CDN
```

### 料金

| 項目 | 無料枠 | 超過時の料金 |
|------|--------|------------|
| ストレージ | 5GB | $0.026/GB |
| データ転送 | 200GB/月 | $0.15/GB |
| ビルド時間 | 120分/日 | $0.10/分 |
| Cloud Run インスタンス | 従量課金（無料枠あり） | vCPU: $0.00002400/秒<br>Memory: $0.00000250/GB/秒 |

### メリット

1. **GitHub連携の自動デプロイ**: `main` ブランチへのプッシュで自動デプロイ
2. **プレビュー環境**: Pull Request ごとにプレビューURLを自動生成
3. **フレームワークの最適化**: TanStack Start のビルド設定を自動認識
4. **スケーラビリティ**: Cloud Run により自動スケール
5. **Firebase サービスとの統合**: Firestore, Auth, Storage との連携が容易

### デメリット

1. **GitHub リポジトリが必須**: デプロイは GitHub 経由のみ
2. **ビルド時間の消費**: 複雑なアプリはビルド時間が長くなる可能性
3. **Cloud Run の料金**: アクセスが増えるとインスタンス料金が発生

---

## Firebase Hosting を使う場合の構成（非推奨）

もし Firebase Hosting を使う場合、以下の構成が必要：

```
Firebase Hosting (静的アセット)
    ↓
Cloud Run (SSR サーバー)
    ↓
Firebase services (Firestore, Auth, Storage)
```

### 実装手順（複雑）

1. TanStack Start を**ビルド時に静的化** (`pnpm build`)
2. 生成された静的ファイルを Firebase Hosting にデプロイ
3. SSR が必要なページは Cloud Run に別途デプロイ
4. Firebase Hosting のリライトルールで Cloud Run にプロキシ

### 問題点

- **設定が複雑**: リライトルール、CORS設定、環境変数の管理
- **デプロイが二重**: Hosting と Cloud Run を個別に管理
- **コスト**: Cloud Run の常時起動が必要
- **メンテナンスコスト**: フレームワーク更新時の対応が困難

---

## 実装計画: Firebase App Hosting を使用

### 前提条件

- [x] GitHub リポジトリが存在する
- [x] Firebase プロジェクトが作成済み
- [ ] Firebase App Hosting が有効化されている（設定手順は後述）

### タスク一覧

#### 1. Firebase App Hosting のセットアップ

- [ ] Firebase Console で App Hosting を有効化
- [ ] GitHub リポジトリを Firebase に連携
- [ ] デプロイトリガーを設定（`main` ブランチ）

#### 2. ビルド設定ファイルの作成

**ファイル**: `apphosting.yaml`（プロジェクトルート）

```yaml
# Firebase App Hosting configuration
runConfig:
  runtime: nodejs20
  cpu: 1
  memoryMiB: 512
  minInstances: 0
  maxInstances: 10
  concurrency: 80

env:
  - variable: NODE_ENV
    value: production
  - variable: VITE_FIREBASE_API_KEY
    secret: firebase-api-key
  - variable: VITE_FIREBASE_AUTH_DOMAIN
    secret: firebase-auth-domain
  - variable: VITE_FIREBASE_PROJECT_ID
    secret: firebase-project-id
  - variable: VITE_FIREBASE_STORAGE_BUCKET
    secret: firebase-storage-bucket
  - variable: VITE_FIREBASE_MESSAGING_SENDER_ID
    secret: firebase-messaging-sender-id
  - variable: VITE_FIREBASE_APP_ID
    secret: firebase-app-id
  - variable: VITE_FIREBASE_FUNCTIONS_URL
    secret: firebase-functions-url
  - variable: BRAVE_SEARCH_API_KEY
    secret: brave-search-api-key
```

**実装ポイント**:
- `runtime: nodejs20`: Node.js 20 を使用（TanStack Start の推奨バージョン）
- `minInstances: 0`: コールドスタート許容（コスト節約）
- `secret`: 環境変数は Firebase Secret Manager で管理

#### 3. ビルドスクリプトの確認

**ファイル**: `apps/web/package.json`

TanStack Start のビルドコマンドが正しく設定されているか確認：

```json
{
  "scripts": {
    "build": "vinxi build",
    "start": "vinxi start"
  }
}
```

Firebase App Hosting は `pnpm build` を自動実行します。

#### 4. 環境変数の設定

Firebase Console で Secret Manager にシークレットを追加：

```bash
# Firebase CLI を使用してシークレットを設定
firebase apphosting:secrets:set firebase-api-key
firebase apphosting:secrets:set firebase-auth-domain
firebase apphosting:secrets:set firebase-project-id
# ... 以下同様
```

または Firebase Console の Secret Manager から手動で設定。

#### 5. デプロイ

##### 5.1 初回デプロイ（Firebase Console）

1. Firebase Console → **App Hosting** にアクセス
2. 「Get started」をクリック
3. GitHub リポジトリを選択
4. ブランチを選択（`main`）
5. ルートディレクトリを指定（`apps/web`）
6. 「Deploy」をクリック

##### 5.2 継続的デプロイ（GitHub Push）

`main` ブランチへのプッシュで自動デプロイが開始されます。

```bash
git add .
git commit -m "feat: add Firebase App Hosting configuration"
git push origin main
```

#### 6. カスタムドメインの設定（オプション）

Firebase Console → App Hosting → Domains から独自ドメインを設定できます。

#### 7. 動作確認

デプロイ完了後、以下を確認：

- [ ] Firebase Console でデプロイ状況を確認
- [ ] デプロイされた URL にアクセス（`https://<project-id>.web.app`）
- [ ] トップページが正常に表示される
- [ ] 画像生成機能が動作する
- [ ] Firebase Auth でログインできる
- [ ] Firestore へのデータ保存が動作する
- [ ] Cloud Functions が呼び出せる

---

## ディレクトリ構成とモノレポ対応

LGTMonk は以下のモノレポ構成を取っています：

```
lgtmonk/
├── apps/
│   ├── web/              # TanStack Start アプリ
│   └── functions/        # Cloud Functions
├── packages/
│   └── common/           # 共通型定義
└── pnpm-workspace.yaml
```

### Firebase App Hosting の設定

`apphosting.yaml` でルートディレクトリを指定：

```yaml
# プロジェクトルートに配置
runConfig:
  rootDirectory: apps/web  # TanStack Start アプリのディレクトリ
```

または Firebase Console のセットアップ時に `apps/web` を指定。

---

## Cloud Functions との連携

### 構成

```
TanStack Start (App Hosting)
    ↓ fetch
Cloud Functions (/api/searchImages, /api/generateLgtmImage)
    ↓
Brave Search API, Storage, Firestore
```

### 環境変数の設定

**App Hosting側** (`apphosting.yaml`):
```yaml
env:
  - variable: VITE_FIREBASE_FUNCTIONS_URL
    value: https://us-central1-<project-id>.cloudfunctions.net/api
```

**Cloud Functions側** (`.env`):
```bash
BRAVE_SEARCH_API_KEY=your-brave-api-key
```

---

## コスト試算（月間1,000ユーザー想定）

### 前提条件

- 月間アクティブユーザー: 1,000人
- 1人あたり平均10ページビュー
- 1ページあたり500KB転送

### App Hosting のコスト

| 項目 | 使用量 | 無料枠 | 超過分 | 料金 |
|------|--------|--------|--------|------|
| データ転送 | 5GB | 200GB | 0GB | $0 |
| ストレージ | 1GB | 5GB | 0GB | $0 |
| ビルド時間 | 10分/日 | 120分/日 | 0分 | $0 |
| Cloud Run インスタンス | 月10時間 | 無料枠内 | 少額 | ~$1 |

**月額合計**: **~$1-2**（小規模運用なら無料枠内に収まる可能性が高い）

### Cloud Functions のコスト

| 項目 | 使用量 | 無料枠 | 超過分 | 料金 |
|------|--------|--------|--------|------|
| 呼び出し回数 | 10,000回 | 2,000,000回 | 0回 | $0 |
| 実行時間 | 月5時間 | 無料枠内 | 少額 | ~$1 |

**月額合計**: **~$1**

### Brave Search API のコスト

- 月1,000リクエスト: **$0**（無料クレジット$5内）

### 総コスト

**月額 $2-4**（小規模運用）

---

## 実装チェックリスト

### セットアップ

- [ ] Firebase Console で App Hosting を有効化
- [ ] GitHub リポジトリを Firebase に連携
- [ ] `apphosting.yaml` を作成
- [ ] Secret Manager で環境変数を設定

### デプロイ

- [ ] `main` ブランチにプッシュ
- [ ] Firebase Console でビルド状況を確認
- [ ] デプロイ完了を確認

### 動作確認

- [ ] トップページにアクセス
- [ ] 画像生成機能のテスト
- [ ] Firebase Auth のテスト
- [ ] Firestore へのデータ保存テスト
- [ ] Cloud Functions の呼び出しテスト

### ドキュメント

- [ ] README.md にデプロイ手順を追加
- [ ] 環境変数のセットアップガイドを作成

---

## まとめ

### 選択すべきホスティング

**Firebase App Hosting**

### 理由

1. TanStack Start のSSR機能をネイティブサポート
2. GitHub連携による自動デプロイが容易
3. Firebase サービスとの統合が優れている
4. プレビュー環境の自動生成
5. スケーラビリティと運用コストのバランスが良い

### 次のステップ

1. Firebase Console で App Hosting をセットアップ
2. `apphosting.yaml` を作成
3. GitHub リポジトリを連携
4. 環境変数を設定
5. `main` ブランチにプッシュしてデプロイ
6. 動作確認

---

## 参考リンク

- [Firebase App Hosting 公式ドキュメント](https://firebase.google.com/docs/app-hosting)
- [TanStack Start on Firebase App Hosting](https://firebase.google.com/docs/app-hosting/frameworks/tanstack-start)
- [Firebase App Hosting Pricing](https://firebase.google.com/pricing)
- [Cloud Run Pricing](https://cloud.google.com/run/pricing)
