# LGTMonk Chrome拡張 実装計画書

## 1. 概要

### 1.1 目的
GitHub のプルリクエストに LGTM 画像を貼る作業を効率化するため、Chrome 拡張機能を開発します。現在は Web アプリケーションをタブで開いておく必要がありますが、拡張機能化により以下のメリットが得られます：

- ブラウザのツールバーからワンクリックでアクセス可能
- 複数のランダム LGTM 画像から選択可能
- Markdown 形式でワンクリックコピー
- GitHub のプルリクエスト画面から離れずに利用可能

### 1.2 実装方針
- **既存コードの再利用**: Web アプリの Firestore 操作ロジックを移植
- **モノレポ構成**: `apps/extension/` として既存プロジェクトに追加
- **シンプルな設計**: 認証不要、画像のランダム表示とコピーに特化
- **Manifest V3 対応**: 最新の Chrome 拡張仕様に準拠

---

## 2. 要件定義

### 2.1 機能要件

| ID | 機能名 | 詳細 | 優先度 |
|----|--------|------|--------|
| EXT-01 | ランダム画像表示 | ポップアップを開くと Firestore からランダムに 6 枚の LGTM 画像を取得して表示 | 必須 |
| EXT-02 | 画像リロード | 「リロード」ボタンで新しいランダム画像セットを取得 | 必須 |
| EXT-03 | Markdown コピー | 画像をクリックすると Markdown 形式（`![LGTM](URL)`）をクリップボードにコピー | 必須 |
| EXT-04 | URL コピー | 画像 URL のみをコピーするオプション | 必須 |
| EXT-05 | コピー成功フィードバック | コピー成功時にボタンが「Copied!」に変化 | 必須 |
| EXT-06 | コピーカウント記録 | コピー時に Firestore の `copiedCount` をインクリメント | 必須 |
| EXT-07 | ローディング表示 | 画像取得中はスケルトンローダーを表示 | 必須 |
| EXT-08 | エラーハンドリング | 取得失敗時はエラーメッセージを表示 | 必須 |

### 2.2 非機能要件

| 項目 | 要件 |
|------|------|
| **パフォーマンス** | ポップアップの初回表示は 1 秒以内 |
| **UI/UX** | Web アプリと一貫性のあるデザイン（Tailwind CSS） |
| **セキュリティ** | Manifest V3 のセキュリティベストプラクティスに準拠 |
| **ブラウザ対応** | Chrome 114 以降（Manifest V3 サポート） |
| **サイズ** | パッケージサイズは 5MB 以下 |

---

## 3. アーキテクチャ設計

### 3.1 プロジェクト構成

```
apps/extension/
├── manifest.json                    # Chrome 拡張マニフェスト（Manifest V3）
├── package.json                     # 依存関係定義
├── tsconfig.json                    # TypeScript 設定
├── vite.config.ts                   # Vite ビルド設定
├── tailwind.config.js               # Tailwind CSS 設定
├── postcss.config.js                # PostCSS 設定
├── README.md                        # 拡張機能の説明・ビルド手順
├── .env.example                     # 環境変数のサンプル
├── public/
│   └── icons/
│       ├── icon-16.png              # ツールバーアイコン（16x16）
│       ├── icon-48.png              # 拡張機能管理画面アイコン（48x48）
│       └── icon-128.png             # Chrome Web Store アイコン（128x128）
├── src/
│   ├── background/
│   │   └── service-worker.ts        # Service Worker（Firebase 初期化）
│   ├── popup/
│   │   ├── index.html               # ポップアップ HTML
│   │   ├── Popup.tsx                # ポップアップのメインコンポーネント
│   │   ├── components/
│   │   │   ├── ImageGrid.tsx        # 画像グリッドコンポーネント
│   │   │   ├── ImageCard.tsx        # 個別画像カードコンポーネント
│   │   │   ├── LoadingGrid.tsx      # スケルトンローダー
│   │   │   ├── ErrorMessage.tsx     # エラーメッセージ表示
│   │   │   └── Header.tsx           # ヘッダー（タイトル・リロードボタン）
│   │   ├── hooks/
│   │   │   └── useRandomImages.ts   # ランダム画像取得カスタムフック
│   │   └── styles/
│   │       └── popup.css            # Tailwind CSS のエントリーポイント
│   ├── shared/
│   │   ├── firebase.ts              # Firebase 初期化コード
│   │   ├── imageOperations.ts       # Firestore 画像操作
│   │   └── types/
│   │       └── Image.ts             # Image エンティティ型定義
│   └── utils/
│       ├── convertDate.ts           # Timestamp → Date 変換
│       ├── copyToClipboard.ts       # クリップボード操作
│       └── errorMessage.ts          # エラーメッセージ整形
└── dist/                            # ビルド出力ディレクトリ（.gitignore）
```

### 3.2 技術スタック

| レイヤー | 技術 | バージョン | 備考 |
|---------|------|-----------|------|
| **フレームワーク** | React | 18.x | UI コンポーネント構築 |
| **言語** | TypeScript | 5.x | 型安全性確保 |
| **ビルドツール** | Vite | 5.x | 高速ビルド・HMR |
| **ビルドプラグイン** | vite-plugin-web-extension | 4.x | Chrome 拡張用ビルド設定 |
| **スタイリング** | Tailwind CSS | 3.x | Web アプリと共通 |
| **UI コンポーネント** | shadcn/ui | latest | ボタン、トースト等 |
| **データベース** | Cloud Firestore | 10.x | 画像メタデータ取得 |
| **認証** | なし | - | 公開データのみアクセス |

### 3.3 データフロー

```
┌─────────────────────────────────────────────────────────┐
│                   Chrome Extension                       │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌───────────────────────────────────────────────────┐  │
│  │              Popup (React App)                    │  │
│  │                                                   │  │
│  │  ┌─────────────┐        ┌──────────────────┐     │  │
│  │  │   Header    │        │   ImageGrid      │     │  │
│  │  │ (Reload Btn)│        │  ┌────┐  ┌────┐  │     │  │
│  │  └─────────────┘        │  │Img1│  │Img2│  │     │  │
│  │         │               │  └────┘  └────┘  │     │  │
│  │         │ onClick       │  ┌────┐  ┌────┐  │     │  │
│  │         ▼               │  │Img3│  │Img4│  │     │  │
│  │  ┌──────────────────┐   │  └────┘  └────┘  │     │  │
│  │  │useRandomImages() │   │  ┌────┐  ┌────┐  │     │  │
│  │  │                  │   │  │Img5│  │Img6│  │     │  │
│  │  │ fetchRandom(6)   │   │  └────┘  └────┘  │     │  │
│  │  └──────────────────┘   │         │         │     │  │
│  │         │               │         │onClick  │     │  │
│  │         │               └─────────┼─────────┘     │  │
│  │         ▼                         ▼               │  │
│  │  ┌──────────────────────────────────────────┐     │  │
│  │  │    imageOperations.ts                    │     │  │
│  │  │  - fetchRandomImagesOperation()          │     │  │
│  │  │  - incrementCopiedCountOperation()       │     │  │
│  │  │  - copyToClipboard(markdown)             │     │  │
│  │  └──────────────────────────────────────────┘     │  │
│  │         │                        │                │  │
│  └─────────┼────────────────────────┼────────────────┘  │
│            │                        │                   │
│            ▼                        ▼                   │
│  ┌──────────────────┐    ┌──────────────────┐          │
│  │  Service Worker  │    │ Clipboard API    │          │
│  │  (Firebase Init) │    │                  │          │
│  └──────────────────┘    └──────────────────┘          │
│            │                                            │
└────────────┼────────────────────────────────────────────┘
             │
             ▼
  ┌──────────────────────┐
  │  Cloud Firestore     │
  │  images collection   │
  │  - imageUrl          │
  │  - keyword           │
  │  - copiedCount       │
  │  - createdAt         │
  └──────────────────────┘
```

---

## 4. 詳細設計

### 4.1 Manifest V3 設定

**ファイル:** `apps/extension/manifest.json`

```json
{
  "manifest_version": 3,
  "name": "LGTMonk - LGTM Image Generator",
  "version": "1.0.0",
  "description": "GitHub のプルリクエストに貼る LGTM 画像を手軽にコピーできる Chrome 拡張",
  "icons": {
    "16": "icons/icon-16.png",
    "48": "icons/icon-48.png",
    "128": "icons/icon-128.png"
  },
  "action": {
    "default_popup": "popup.html",
    "default_icon": {
      "16": "icons/icon-16.png",
      "48": "icons/icon-48.png",
      "128": "icons/icon-128.png"
    }
  },
  "background": {
    "service_worker": "service-worker.js",
    "type": "module"
  },
  "permissions": [
    "storage",
    "clipboardWrite"
  ],
  "host_permissions": [
    "https://firestore.googleapis.com/*",
    "https://storage.googleapis.com/*"
  ],
  "content_security_policy": {
    "extension_pages": "script-src 'self'; object-src 'self'"
  }
}
```

**重要ポイント:**
- `manifest_version: 3` - 最新仕様に準拠
- `action.default_popup` - ツールバークリックでポップアップ表示
- `background.service_worker` - Service Worker で Firebase 初期化
- `permissions.clipboardWrite` - クリップボードへの書き込み許可
- `host_permissions` - Firestore と Storage へのアクセス許可

### 4.2 Firebase 初期化

**ファイル:** `apps/extension/src/shared/firebase.ts`

```typescript
import { initializeApp } from 'firebase/firestore'
import { getFirestore } from 'firebase/firestore'

// 環境変数はビルド時に埋め込み（Viteの define 機能を使用）
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

const app = initializeApp(firebaseConfig)
const db = getFirestore(app)

export { db }
```

**重要ポイント:**
- Service Worker では `auth` は不要（認証なしでアクセス）
- `db` のみエクスポート
- 環境変数は `.env` から読み込み、ビルド時に埋め込み

### 4.3 型定義

**ファイル:** `apps/extension/src/shared/types/Image.ts`

```typescript
// packages/common/src/entities/Image.ts からコピー

export const imageCollection = 'images' as const

export type ImageId = string

export type Image = {
  imageId: ImageId
  copiedCount: number
  createdAt: Date
  createdBy: string | null
  imageUrl: string
  impressionCount: number
  keyword: string
  updatedAt: Date
}
```

### 4.4 Firestore 操作

**ファイル:** `apps/extension/src/shared/imageOperations.ts`

```typescript
import type { Image, ImageId } from './types/Image'
import { imageCollection } from './types/Image'
import { collection, getDocs, query, limit, doc, updateDoc, increment } from 'firebase/firestore'
import { db } from './firebase'
import { convertDate } from '../utils/convertDate'

const dateColumns = ['createdAt', 'updatedAt'] as const

// ランダムに画像を取得（Fisher-Yates シャッフル）
export const fetchRandomImagesOperation = async (
  pageSize: number = 6,
): Promise<Array<Image>> => {
  // ページサイズの2倍取得してシャッフル
  const snapshot = await getDocs(
    query(collection(db, imageCollection), limit(pageSize * 2)),
  )

  const images = snapshot.docs.map((doc) => ({
    imageId: doc.id,
    ...convertDate(doc.data(), dateColumns),
  })) as Array<Image>

  // Fisher-Yates アルゴリズムでシャッフル
  for (let i = images.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[images[i], images[j]] = [images[j], images[i]]
  }

  return images.slice(0, pageSize)
}

// コピー数をインクリメント
export const incrementCopiedCountOperation = async (
  imageId: ImageId,
): Promise<void> => {
  await updateDoc(doc(db, imageCollection, imageId), {
    copiedCount: increment(1),
  })
}
```

### 4.5 カスタムフック

**ファイル:** `apps/extension/src/popup/hooks/useRandomImages.ts`

```typescript
import { useState, useCallback } from 'react'
import type { Image } from '../../shared/types/Image'
import { fetchRandomImagesOperation } from '../../shared/imageOperations'

export type UseRandomImagesReturn = {
  images: Array<Image>
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export const useRandomImages = (pageSize: number = 6): UseRandomImagesReturn => {
  const [images, setImages] = useState<Array<Image>>([])
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  const fetchImages = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const fetchedImages = await fetchRandomImagesOperation(pageSize)
      setImages(fetchedImages)
    } catch (e) {
      console.error('Failed to fetch images:', e)
      setError('画像の取得に失敗しました')
    } finally {
      setIsLoading(false)
    }
  }, [pageSize])

  // 初回マウント時に画像を取得
  React.useEffect(() => {
    fetchImages()
  }, [fetchImages])

  return {
    images,
    isLoading,
    error,
    refetch: fetchImages,
  }
}
```

### 4.6 UI コンポーネント

#### 4.6.1 メインポップアップ

**ファイル:** `apps/extension/src/popup/Popup.tsx`

```typescript
import React from 'react'
import { Header } from './components/Header'
import { ImageGrid } from './components/ImageGrid'
import { LoadingGrid } from './components/LoadingGrid'
import { ErrorMessage } from './components/ErrorMessage'
import { useRandomImages } from './hooks/useRandomImages'
import './styles/popup.css'

export const Popup: React.FC = () => {
  const { images, isLoading, error, refetch } = useRandomImages(6)

  return (
    <div className="w-[600px] h-[400px] p-4 bg-gray-50">
      <Header onReload={refetch} isLoading={isLoading} />

      {error && <ErrorMessage message={error} />}

      {isLoading ? (
        <LoadingGrid />
      ) : (
        <ImageGrid images={images} />
      )}
    </div>
  )
}
```

#### 4.6.2 ヘッダーコンポーネント

**ファイル:** `apps/extension/src/popup/components/Header.tsx`

```typescript
import React from 'react'
import { RefreshCw } from 'lucide-react'

type HeaderProps = {
  onReload: () => void
  isLoading: boolean
}

export const Header: React.FC<HeaderProps> = ({ onReload, isLoading }) => {
  return (
    <div className="flex items-center justify-between mb-4">
      <h1 className="text-xl font-bold">LGTMonk</h1>
      <button
        onClick={onReload}
        disabled={isLoading}
        className="p-2 rounded-md hover:bg-gray-200 disabled:opacity-50"
        aria-label="Reload images"
      >
        <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
      </button>
    </div>
  )
}
```

#### 4.6.3 画像グリッド

**ファイル:** `apps/extension/src/popup/components/ImageGrid.tsx`

```typescript
import React from 'react'
import type { Image } from '../../shared/types/Image'
import { ImageCard } from './ImageCard'

type ImageGridProps = {
  images: Array<Image>
}

export const ImageGrid: React.FC<ImageGridProps> = ({ images }) => {
  return (
    <div className="grid grid-cols-3 gap-3">
      {images.map((image) => (
        <ImageCard key={image.imageId} image={image} />
      ))}
    </div>
  )
}
```

#### 4.6.4 画像カード

**ファイル:** `apps/extension/src/popup/components/ImageCard.tsx`

```typescript
import React, { useState } from 'react'
import { Check } from 'lucide-react'
import type { Image } from '../../shared/types/Image'
import { incrementCopiedCountOperation } from '../../shared/imageOperations'

type ImageCardProps = {
  image: Image
}

export const ImageCard: React.FC<ImageCardProps> = ({ image }) => {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    const markdown = `![LGTM](${image.imageUrl})`

    try {
      await navigator.clipboard.writeText(markdown)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)

      // コピーカウントをインクリメント
      await incrementCopiedCountOperation(image.imageId)
    } catch (error) {
      console.error('Failed to copy:', error)
      alert('コピーに失敗しました')
    }
  }

  return (
    <div className="relative group">
      <button
        onClick={handleCopy}
        className="w-full h-32 overflow-hidden rounded-md border-2 border-transparent hover:border-blue-500 transition-all"
      >
        <img
          src={image.imageUrl}
          alt={image.keyword || 'LGTM Image'}
          className="w-full h-full object-cover"
        />

        {copied && (
          <div className="absolute inset-0 bg-green-500 bg-opacity-80 flex items-center justify-center">
            <Check className="w-8 h-8 text-white" />
          </div>
        )}
      </button>
    </div>
  )
}
```

### 4.7 ビルド設定

**ファイル:** `apps/extension/vite.config.ts`

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import webExtension from 'vite-plugin-web-extension'

export default defineConfig({
  plugins: [
    react(),
    webExtension({
      manifest: './manifest.json',
      watchFilePaths: ['manifest.json', 'src/**/*'],
    }),
  ],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        popup: './src/popup/index.html',
        'service-worker': './src/background/service-worker.ts',
      },
    },
  },
})
```

---

## 5. 実装手順

### フェーズ 1: プロジェクトセットアップ（1-2 時間）

#### 5.1 ディレクトリ作成
```bash
cd /Users/andmohiko/Development/lgtmonk
mkdir -p apps/extension/src/{background,popup/{components,hooks,styles},shared/types,utils}
mkdir -p apps/extension/public/icons
```

#### 5.2 package.json 作成
```bash
cd apps/extension
pnpm init
```

**必要な依存関係:**
```json
{
  "name": "@lgtmonk/extension",
  "version": "1.0.0",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "firebase": "^10.7.1",
    "lucide-react": "^0.294.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "@vitejs/plugin-react": "^4.2.0",
    "vite": "^5.0.0",
    "vite-plugin-web-extension": "^4.0.0",
    "typescript": "^5.0.0",
    "tailwindcss": "^3.3.0",
    "postcss": "^8.4.0",
    "autoprefixer": "^10.4.0"
  }
}
```

#### 5.3 pnpm workspace に追加

**ファイル:** `/Users/andmohiko/Development/lgtmonk/pnpm-workspace.yaml`

```yaml
packages:
  - 'apps/*'
  - 'packages/*'
```

#### 5.4 TypeScript 設定
```bash
cd apps/extension
touch tsconfig.json
```

**内容:**
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

#### 5.5 Tailwind CSS 設定
```bash
cd apps/extension
pnpm add -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

**tailwind.config.js:**
```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
```

**src/popup/styles/popup.css:**
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

### フェーズ 2: 既存コードの移植（2-3 時間）

#### 2.1 型定義のコピー
```bash
# packages/common/src/entities/Image.ts の内容をコピー
cp /path/to/packages/common/src/entities/Image.ts apps/extension/src/shared/types/Image.ts
```

**修正点:**
- `FieldValue` 関連の型定義を削除（CreateDto/UpdateDto は不要）
- `imageCollection` と `Image` 型のみ残す

#### 2.2 Firebase 初期化コードの作成
`apps/web/src/lib/firebase.ts` を参考に `apps/extension/src/shared/firebase.ts` を作成

#### 2.3 Firestore 操作の移植
`apps/web/src/infrastructure/firestore/ImageOperations.ts` から以下の関数をコピー:
- `fetchRandomImagesOperation`
- `incrementCopiedCountOperation`

#### 2.4 ユーティリティ関数のコピー
```bash
cp apps/web/src/utils/convertDate.ts apps/extension/src/utils/convertDate.ts
```

### フェーズ 3: UI 実装（3-4 時間）

#### 3.1 ポップアップ HTML の作成

**ファイル:** `apps/extension/src/popup/index.html`

```html
<!DOCTYPE html>
<html lang="ja">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>LGTMonk</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="./index.tsx"></script>
  </body>
</html>
```

#### 3.2 React エントリーポイントの作成

**ファイル:** `apps/extension/src/popup/index.tsx`

```typescript
import React from 'react'
import ReactDOM from 'react-dom/client'
import { Popup } from './Popup'
import './styles/popup.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Popup />
  </React.StrictMode>
)
```

#### 3.3 各コンポーネントの実装
- `Popup.tsx`
- `components/Header.tsx`
- `components/ImageGrid.tsx`
- `components/ImageCard.tsx`
- `components/LoadingGrid.tsx`
- `components/ErrorMessage.tsx`

#### 3.4 カスタムフックの実装
- `hooks/useRandomImages.ts`

### フェーズ 4: Service Worker 実装（1 時間）

**ファイル:** `apps/extension/src/background/service-worker.ts`

```typescript
// Firebase の初期化
import { db } from '../shared/firebase'

console.log('LGTMonk Extension Service Worker started')

// Service Worker がアクティブになったときに Firebase 接続を確認
self.addEventListener('activate', (event) => {
  console.log('Service Worker activated')
})
```

### フェーズ 5: アイコン作成（1 時間）

#### 5.1 アイコンデザイン
- 16x16px, 48x48px, 128x128px の 3 サイズ
- Web アプリのロゴと統一感を持たせる
- 背景透過 PNG 形式

#### 5.2 配置
```bash
apps/extension/public/icons/
├── icon-16.png
├── icon-48.png
└── icon-128.png
```

### フェーズ 6: ビルド・テスト（2-3 時間）

#### 6.1 開発ビルド
```bash
cd apps/extension
pnpm dev
```

#### 6.2 Chrome にロード
1. Chrome で `chrome://extensions/` を開く
2. 「デベロッパーモード」を有効化
3. 「パッケージ化されていない拡張機能を読み込む」をクリック
4. `apps/extension/dist` ディレクトリを選択

#### 6.3 動作確認
- [ ] ポップアップが表示される
- [ ] 6 枚の画像がグリッド表示される
- [ ] リロードボタンで新しい画像セットが表示される
- [ ] 画像クリックで Markdown がクリップボードにコピーされる
- [ ] コピー成功時に緑色のチェックマークが表示される
- [ ] エラー時にエラーメッセージが表示される

#### 6.4 本番ビルド
```bash
cd apps/extension
pnpm build
```

### フェーズ 7: ドキュメント作成（1 時間）

#### 7.1 README.md

**ファイル:** `apps/extension/README.md`

```markdown
# LGTMonk Chrome Extension

GitHub のプルリクエストに貼る LGTM 画像を手軽にコピーできる Chrome 拡張機能です。

## 機能

- ランダムに 6 枚の LGTM 画像を表示
- ワンクリックで Markdown 形式コピー
- リロードボタンで新しい画像セットを取得

## インストール方法

### Chrome Web Store から（公開後）

1. [Chrome Web Store](https://chrome.google.com/webstore/category/extensions) で「LGTMonk」を検索
2. 「Chrome に追加」をクリック

### 開発版のインストール

1. このリポジトリをクローン
2. 依存関係をインストール:
   ```bash
   pnpm install
   ```
3. ビルド:
   ```bash
   cd apps/extension
   pnpm build
   ```
4. Chrome で `chrome://extensions/` を開く
5. 「デベロッパーモード」を有効化
6. 「パッケージ化されていない拡張機能を読み込む」をクリック
7. `apps/extension/dist` を選択

## 使い方

1. ツールバーの LGTMonk アイコンをクリック
2. 6 枚のランダム画像から好きなものをクリック
3. Markdown 形式がクリップボードにコピーされます
4. GitHub のプルリクエストのコメント欄に貼り付け

## 開発

### 開発サーバー起動

```bash
pnpm dev
```

### ビルド

```bash
pnpm build
```

### ディレクトリ構成

\```
apps/extension/
├── manifest.json
├── src/
│   ├── background/       # Service Worker
│   ├── popup/            # ポップアップ UI
│   ├── shared/           # Firebase・型定義
│   └── utils/            # ユーティリティ
└── dist/                 # ビルド出力
\```

## ライセンス

MIT
```

---

## 6. リリース手順

### 6.1 Chrome Web Store へのアップロード

#### 6.1.1 事前準備
- Google アカウントを用意
- Chrome Web Store デベロッパー登録（$5 の一回限りの登録料）
- ストアリスティング用の画像を準備:
  - アイコン: 128x128px
  - スクリーンショット: 1280x800px または 640x400px（3-5 枚）
  - プロモーション用タイル: 440x280px（オプション）

#### 6.1.2 アップロード手順
1. [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole) にアクセス
2. 「新しいアイテム」をクリック
3. `dist` ディレクトリを ZIP 化してアップロード:
   ```bash
   cd apps/extension
   pnpm build
   cd dist
   zip -r ../lgtmonk-extension-v1.0.0.zip .
   ```
4. ストアリスティング情報を入力:
   - **名前**: LGTMonk - LGTM Image Generator
   - **説明**: GitHub のプルリクエストに貼る LGTM 画像を手軽にコピーできる Chrome 拡張機能
   - **カテゴリ**: 生産性
   - **言語**: 日本語
5. プライバシー設定:
   - 単一目的: 「LGTM 画像のコピー機能を提供」
   - 権限の正当性: 「clipboardWrite - クリップボードへのコピーに必要」
6. 審査に提出

#### 6.1.3 審査期間
- 通常 1-3 営業日
- 初回は最大 1 週間かかる場合もあり

### 6.2 バージョン管理

#### セマンティックバージョニング
- **Major (1.x.x)**: 破壊的変更
- **Minor (x.1.x)**: 新機能追加
- **Patch (x.x.1)**: バグ修正

#### リリース手順
1. `manifest.json` の `version` を更新
2. `package.json` の `version` を更新
3. `CHANGELOG.md` に変更内容を記載
4. Git タグを作成:
   ```bash
   git tag -a v1.0.0 -m "Release v1.0.0"
   git push origin v1.0.0
   ```
5. ビルド・アップロード

---

## 7. 今後の拡張機能（オプション）

### 7.1 フェーズ 2: 検索機能（優先度: 中）

**概要:**
ポップアップにキーワード検索フィールドを追加し、特定のテーマの LGTM 画像を検索できるようにする。

**実装内容:**
- `fetchImagesByKeywordOperation` を追加
- 検索フィールドコンポーネント実装
- 検索結果の表示

### 7.2 フェーズ 3: お気に入り機能（優先度: 低）

**概要:**
Chrome Storage API を使用し、お気に入り画像を保存できるようにする。

**実装内容:**
- `chrome.storage.local` でお気に入り ID を保存
- お気に入りボタン実装
- お気に入りタブ実装

### 7.3 フェーズ 4: GitHub 統合（優先度: 低）

**概要:**
Content Script で GitHub のコメント欄に「LGTM 画像を挿入」ボタンを追加する。

**実装内容:**
- Content Script で GitHub UI を検出
- ボタンを動的に挿入
- クリックで Markdown を自動挿入

### 7.4 フェーズ 5: オプション画面（優先度: 低）

**概要:**
拡張機能のオプション画面を実装し、以下を設定可能にする:
- 表示枚数（3 / 6 / 9 枚）
- ポップアップのサイズ
- コピー形式（Markdown / URL / HTML）

---

## 8. トラブルシューティング

### 8.1 よくある問題

#### Q1: ポップアップが表示されない
**原因:**
- ビルドエラーが発生している
- manifest.json の設定が間違っている

**対処法:**
```bash
# ビルドログを確認
pnpm build

# Chrome 拡張のエラーログを確認
chrome://extensions/ > 拡張機能の詳細 > エラー
```

#### Q2: Firebase 接続エラー
**原因:**
- 環境変数が正しく設定されていない
- Firestore のセキュリティルールで拒否されている

**対処法:**
```bash
# .env ファイルを確認
cat apps/extension/.env

# Firestore ルールを確認
cat firestore.rules
```

#### Q3: 画像がコピーできない
**原因:**
- `clipboardWrite` 権限が付与されていない
- HTTPS でない環境でテストしている

**対処法:**
```json
// manifest.json を確認
"permissions": ["clipboardWrite"]
```

### 8.2 デバッグ方法

#### ポップアップのデバッグ
1. ポップアップを開く
2. ポップアップ上で右クリック → 「検証」
3. DevTools でコンソールを確認

#### Service Worker のデバッグ
1. `chrome://extensions/` を開く
2. 拡張機能の詳細 → 「Service Worker」をクリック
3. DevTools でログを確認

---

## 9. まとめ

### 9.1 開発スケジュール（目安）

| フェーズ | 内容 | 所要時間 |
|---------|------|---------|
| フェーズ 1 | プロジェクトセットアップ | 1-2 時間 |
| フェーズ 2 | 既存コードの移植 | 2-3 時間 |
| フェーズ 3 | UI 実装 | 3-4 時間 |
| フェーズ 4 | Service Worker 実装 | 1 時間 |
| フェーズ 5 | アイコン作成 | 1 時間 |
| フェーズ 6 | ビルド・テスト | 2-3 時間 |
| フェーズ 7 | ドキュメント作成 | 1 時間 |
| **合計** | | **11-17 時間** |

### 9.2 成果物

- ✅ Chrome 拡張機能本体（`apps/extension/`）
- ✅ ビルド済みパッケージ（`apps/extension/dist/`）
- ✅ 実装手順書（本ドキュメント）
- ✅ README（`apps/extension/README.md`）
- ✅ Chrome Web Store リスティング用素材

### 9.3 参考リンク

- [Chrome Extensions Documentation](https://developer.chrome.com/docs/extensions/mv3/)
- [Manifest V3 Migration Guide](https://developer.chrome.com/docs/extensions/mv3/intro/)
- [vite-plugin-web-extension](https://github.com/aklinker1/vite-plugin-web-extension)
- [Firebase JavaScript SDK](https://firebase.google.com/docs/web/setup)
- [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole)

---

## 付録 A: ファイル一覧

### 新規作成するファイル

```
apps/extension/
├── manifest.json
├── package.json
├── tsconfig.json
├── vite.config.ts
├── tailwind.config.js
├── postcss.config.js
├── .env.example
├── .gitignore
├── README.md
├── public/
│   └── icons/
│       ├── icon-16.png
│       ├── icon-48.png
│       └── icon-128.png
└── src/
    ├── background/
    │   └── service-worker.ts
    ├── popup/
    │   ├── index.html
    │   ├── index.tsx
    │   ├── Popup.tsx
    │   ├── components/
    │   │   ├── Header.tsx
    │   │   ├── ImageGrid.tsx
    │   │   ├── ImageCard.tsx
    │   │   ├── LoadingGrid.tsx
    │   │   └── ErrorMessage.tsx
    │   ├── hooks/
    │   │   └── useRandomImages.ts
    │   └── styles/
    │       └── popup.css
    ├── shared/
    │   ├── firebase.ts
    │   ├── imageOperations.ts
    │   └── types/
    │       └── Image.ts
    └── utils/
        ├── convertDate.ts
        └── errorMessage.ts
```

### 既存ファイルから移植

| 移植元 | 移植先 | 修正の有無 |
|--------|--------|-----------|
| `packages/common/src/entities/Image.ts` | `apps/extension/src/shared/types/Image.ts` | 一部削除 |
| `apps/web/src/lib/firebase.ts` | `apps/extension/src/shared/firebase.ts` | 修正あり |
| `apps/web/src/infrastructure/firestore/ImageOperations.ts` | `apps/extension/src/shared/imageOperations.ts` | 一部抽出 |
| `apps/web/src/utils/convertDate.ts` | `apps/extension/src/utils/convertDate.ts` | そのまま |

---

## 付録 B: .env.example

```bash
# Firebase 設定
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

---

**作成日:** 2026-03-08
**更新日:** 2026-03-08
**バージョン:** 1.0.0
