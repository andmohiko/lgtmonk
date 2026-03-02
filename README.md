# LGTMonk 要件定義書

LGTM画像メーカー

## 技術スタック

- フロントエンド
  - Tanstack Start
  - Tailwind + shadcn
  - TypeScript
- バックエンド
  - Cloud Functions
  - TypeScript
- インフラ
  - Firebase App Hosting
- データベース
  - Firestore
- オブジェクトストレージ
 - Cloud Storage for Firebase
- 認証認可
  - Firebase Auth

## 環境構築

### 1. 依存パッケージのインストール

```bash
pnpm install
```

### 2. 環境変数の設定

`apps/web/.env`ファイルを作成し、以下の環境変数を設定してください：

```bash
# Firebase Configuration
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your-messaging-sender-id
VITE_FIREBASE_APP_ID=your-app-id

# Google Custom Search API Configuration
VITE_GOOGLE_CUSTOM_SEARCH_API_KEY=your-google-custom-search-api-key
VITE_GOOGLE_CUSTOM_SEARCH_ENGINE_ID=your-search-engine-id

# Development settings
VITE_USE_EMULATOR=false
```

`.env.example`ファイルを参考にしてください。

### 3. Google Custom Search APIのセットアップ

Google画像検索機能を使用するには、Google Custom Search APIの設定が必要です。
詳細な手順は [docs/setup/google-custom-search-api-setup.md](docs/setup/google-custom-search-api-setup.md) を参照してください。

### 4. 開発サーバーの起動

```bash
cd apps/web && pnpm dev
```

ブラウザで http://localhost:3000 にアクセスしてください。