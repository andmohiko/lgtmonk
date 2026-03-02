# Brave Search API - 画像検索機能 実装計画

## 概要

Google Custom Search APIの新規受付終了（2027年1月サービス終了予定）に伴い、**Brave Search API**を使用した画像検索機能に移行する。

## 背景

| API | 状態 |
|-----|------|
| Google Custom Search JSON API | 新規顧客受付終了（2027年1月終了予定） |
| Bing Image Search API v7 | 2025年8月11日廃止済み |
| **Brave Search API** | **利用可能（独自の350億ページ以上のインデックス）** |

## 実装タスク

### 1. Brave Search APIのセットアップ

#### 1.1 アカウント作成とAPIキー取得（手動作業）

- [x] https://brave.com/search/api/ にアクセス
- [x] 「Get Started」からアカウントを作成
- [x] Searchプランを選択（$5/1,000リクエスト、毎月$5の無料クレジット = 月1,000リクエスト無料）
- [x] クレジットカード登録（無料クレジット利用のため）
- [x] ダッシュボード（https://api-dashboard.search.brave.com）からAPIキーを取得

#### 1.2 環境変数の設定

**ファイル**: `apps/web/.env.example`

```bash
# Brave Search API Configuration
VITE_BRAVE_SEARCH_API_KEY=your-brave-api-key
```

- [x] `.env.example`に環境変数を追加
- [x] `.env`ファイルに実際のAPIキーを設定
- [x] `.gitignore`で`.env`が除外されていることを確認

### 2. 型定義の実装

#### 2.1 Brave Search APIのレスポンス型

**ファイル**: `packages/common/src/types/BraveImageSearch.ts`（新規作成）

```typescript
/**
 * Brave Search API - Image Search のレスポンス型定義
 * API仕様: https://api-dashboard.search.brave.com/app/documentation/image-search
 */

export type BraveImageSearchItem = {
  type: 'image_result'
  title: string
  url: string // 画像が掲載されているページのURL
  source: string // ドメイン名
  thumbnail: {
    src: string // プロキシ経由のサムネイルURL（幅500px）
  }
  properties: {
    url: string // 画像ファイルの直接URL（オリジナル）
    format: string // 'jpeg', 'png', 'webp' など
  }
  meta_url: {
    hostname: string // ソースドメイン
  }
}

export type BraveImageSearchResponse = {
  type: 'images'
  results: Array<BraveImageSearchItem>
}
```

#### 2.2 既存の型定義を再利用

`apps/web/src/types/image.ts`の`SearchResultImage`型はそのまま使用可能。

```typescript
export type SearchResultImage = {
  thumbnailUrl: string
  imageUrl: string
  title: string
  width: number
  height: number
}
```

### 3. Brave Search APIクライアントの実装

#### 3.1 既存ファイルの更新

**ファイル**: `apps/web/src/lib/googleImageSearch.ts` → `apps/web/src/lib/braveImageSearch.ts`にリネーム

```typescript
import type { BraveImageSearchResponse } from '@lgtmonk/common'
import type { SearchResultImage } from '@/types/image'

const BRAVE_API_KEY = import.meta.env.VITE_BRAVE_SEARCH_API_KEY
const BRAVE_IMAGE_SEARCH_URL = 'https://api.search.brave.com/res/v1/images/search'

/**
 * Brave Search APIを使用して画像検索を行う
 * @param keyword 検索キーワード
 * @param count 取得件数（デフォルト: 20、最大200）
 * @returns 検索結果の画像配列
 * @throws API認証情報が未設定の場合、またはAPIリクエストが失敗した場合
 */
export const searchBraveImages = async (
  keyword: string,
  count = 20,
): Promise<Array<SearchResultImage>> => {
  const isDev = import.meta.env.DEV

  if (!BRAVE_API_KEY) {
    throw new Error('Brave Search API key is not configured')
  }

  const params = new URLSearchParams({
    q: keyword,
    count: count.toString(),
    safesearch: 'strict', // セーフサーチ有効
    spellcheck: '1',
  })

  const url = `${BRAVE_IMAGE_SEARCH_URL}?${params}`

  // 開発環境でのみログ出力
  if (isDev) {
    console.log('Brave Search Request URL:', url.replace(BRAVE_API_KEY, 'API_KEY_HIDDEN'))
  }

  const response = await fetch(url, {
    headers: {
      'X-Subscription-Token': BRAVE_API_KEY,
      'Accept': 'application/json',
    },
  })

  if (!response.ok) {
    let errorMessage = `Brave Image Search failed: ${response.statusText}`

    // エラーレスポンスの詳細を取得
    try {
      const errorData = await response.json()
      if (isDev) {
        console.error('Brave API Error Details:', errorData)
      }

      // ステータスコード別のエラーメッセージ
      switch (response.status) {
        case 401:
          errorMessage = 'Brave Search APIキーが無効です'
          break
        case 403:
          errorMessage = 'Brave Search APIへのアクセスが拒否されました。プランを確認してください。'
          break
        case 422:
          errorMessage = '検索パラメータが不正です'
          break
        case 429:
          errorMessage = 'APIレートリミットを超過しました。しばらく待ってから再試行してください。'
          break
        default:
          if (errorData.message) {
            errorMessage = `Brave API Error: ${errorData.message}`
          }
      }
    } catch {
      // JSONパースに失敗した場合は元のエラーメッセージを使用
    }

    throw new Error(errorMessage)
  }

  const data: BraveImageSearchResponse = await response.json()

  if (!data.results || data.results.length === 0) {
    return []
  }

  return data.results.map((item) => ({
    thumbnailUrl: item.thumbnail.src,
    imageUrl: item.properties.url,
    title: item.title,
    width: 500, // サムネイルは固定幅500px
    height: 500, // アスペクト比情報がないため仮の値
  }))
}
```

**実装ポイント**:
- 認証は`X-Subscription-Token`ヘッダーで行う
- サムネイルはBraveのプロキシ経由（`thumbnail.src`）
- オリジナル画像URLは`properties.url`
- `safesearch: 'strict'`でセーフサーチを有効化
- レートリミット: 1 req/sec（Freeプラン）

### 4. フロントエンドの更新

#### 4.1 generate.tsxの更新

**ファイル**: `apps/web/src/routes/generate.tsx`

- [ ] インポートを`googleImageSearch`から`braveImageSearch`に変更
- [ ] 関数名を`searchGoogleImages`から`searchBraveImages`に変更
- [ ] エラーメッセージを更新

**変更箇所**:

```typescript
// Before
import { searchGoogleImages } from '@/lib/googleImageSearch'

// After
import { searchBraveImages } from '@/lib/braveImageSearch'
```

```typescript
// handleGoogleSearch関数内
try {
  const results = await searchBraveImages(trimmedKeyword, 20) // 20件取得
  setSearchResults(results)
  searchCacheRef.current.set(trimmedKeyword, results)

  if (results.length === 0) {
    setErrorMessage('検索結果が見つかりませんでした')
  }
} catch (error) {
  console.error('Brave Image Search error:', error)
  if (error instanceof Error) {
    if (error.message.includes('not configured')) {
      setErrorMessage(
        'Brave Search APIの設定が完了していません。管理者にお問い合わせください。',
      )
    } else {
      setErrorMessage(error.message)
    }
  } else {
    setErrorMessage('画像検索に失敗しました。もう一度お試しください。')
  }
}
```

#### 4.2 UIテキストの更新（オプション）

検索タブの表示名を「Google検索」から「画像検索」に変更する場合：

```typescript
// タブ名の変更
<Search className="w-4 h-4" />
Image Search
```

### 5. 型定義のエクスポート追加

**ファイル**: `packages/common/src/index.ts`

```typescript
// Brave Search API types
export type {
  BraveImageSearchItem,
  BraveImageSearchResponse,
} from './types/BraveImageSearch'
```

### 6. 古いファイルのクリーンアップ

- [ ] `apps/web/src/lib/googleImageSearch.ts`を削除
- [ ] `packages/common/src/types/GoogleImageSearch.ts`を削除（または保持して非推奨マーク）
- [ ] `.env.example`からGoogle Custom Search関連の環境変数を削除（または非推奨コメント）

### 7. ドキュメント更新

#### 7.1 README.mdの更新

**ファイル**: `README.md`

```markdown
## 環境変数の設定

### Brave Search API

画像検索機能を使用するには、Brave Search APIのセットアップが必要です。

1. https://brave.com/search/api/ でアカウントを作成
2. Searchプランを選択（月1,000リクエストまで無料）
3. ダッシュボードからAPIキーを取得
4. `apps/web/.env`に以下を設定：

```bash
VITE_BRAVE_SEARCH_API_KEY=your-brave-api-key
```

詳細は[docs/setup/brave-search-api-setup.md](docs/setup/brave-search-api-setup.md)を参照してください。

#### API制限
- 無料クレジット: 月$5（= 1,000リクエスト）
- レートリミット: 1 req/sec
- 無料クレジット利用には帰属表示が必要（フッターに「Powered by Brave Search」を記載）
```

#### 7.2 セットアップガイドの作成

**ファイル**: `docs/setup/brave-search-api-setup.md`

`docs/tasks/brave-image-search-guide.md`の内容をベースにセットアップ手順をまとめる。

### 8. 帰属表示の追加（無料クレジット利用のため）

**ファイル**: `apps/web/src/components/Footer.tsx`（または適切な場所）

無料クレジットを利用するには、「Powered by Brave Search」の帰属表示が必要です。

```tsx
<footer className="text-center text-xs text-[#8b949e] py-4">
  <p>Powered by <a href="https://brave.com/search/api/" className="text-[#58a6ff] hover:underline">Brave Search</a></p>
</footer>
```

### 9. テスト

#### 9.1 手動テスト項目

- [ ] ビルドが成功する（`pnpm build`）
- [ ] 型チェックが通る（`pnpm type-check`）
- [ ] Lintエラーがない（`pnpm lint`）
- [ ] キーワード検索が正常に動作する
- [ ] 検索結果が20件表示される
- [ ] 画像選択が正常に動作する
- [ ] サムネイル画像が正しく表示される
- [ ] エラー時に適切なメッセージが表示される
- [ ] ローディング状態が正しく表示される
- [ ] APIキー未設定時にエラーが表示される

#### 9.2 エッジケーステスト

- [ ] 空文字検索の防止（実装済み）
- [ ] 特殊文字を含むキーワード
- [ ] 日本語キーワード
- [ ] 英語キーワード
- [ ] 絵文字を含むキーワード
- [ ] 検索結果0件の場合
- [ ] レートリミット超過時のエラーハンドリング

## 実装順序

1. [x] Brave Search APIのアカウント作成とAPIキー取得（手動）
2. [x] 環境変数の設定
3. [x] 型定義の実装（BraveImageSearch.ts）
4. [x] 型エクスポートの追加（packages/common/src/index.ts）
5. [x] Cloud Functionsに画像検索APIを実装（searchImages.ts）
6. [x] フロントエンドの更新（generate.tsx）
7. [x] 古いファイルの削除（googleImageSearch.ts、TanStack Startのserver/api等）
8. [ ] 帰属表示の追加（Footer等）
9. [x] ビルドテスト成功（Functions & Web）
10. [ ] ドキュメント更新（README.md、セットアップガイド）

## API料金とレートリミット

### 料金
- **基本料金**: $5 / 1,000リクエスト
- **無料クレジット**: 毎月$5（= 月1,000リクエストまで実質無料）
- **無料クレジットの条件**: アプリに「Powered by Brave Search」の帰属表示が必要

### レートリミット
- **Freeプラン**: 1 req/sec
- **Baseプラン以上**: 5 req/sec

### エラーハンドリング

| ステータスコード | 原因 | 対処 |
|-----------------|------|------|
| 401 | APIキーが無効またはmissing | 環境変数を確認 |
| 403 | プランにImage Searchが含まれていない | ダッシュボードでSearchプランを有効化 |
| 422 | パラメータが不正 | クエリパラメータを確認 |
| 429 | レートリミット超過 | リトライロジックを実装（現在は500msデバウンス実装済み） |

## 移行前後の比較

### Google Custom Search API（旧）
- エンドポイント: `https://www.googleapis.com/customsearch/v1`
- 認証: APIキー（クエリパラメータ）
- 検索エンジンID: 必要
- 制限: 新規受付終了、2027年1月終了予定

### Brave Search API（新）
- エンドポイント: `https://api.search.brave.com/res/v1/images/search`
- 認証: `X-Subscription-Token`ヘッダー
- 検索エンジンID: 不要
- 制限: 月1,000リクエスト無料（帰属表示必要）

## 注意事項

- APIキーは環境変数で管理し、コミットしない
- 本番環境では必ず独自のAPIキーを使用する
- サムネイル画像はBraveのプロキシ経由で配信される（安定性が高い）
- オリジナル画像URLは外部サイトのため、CORS制約に注意
- レートリミット（1 req/sec）を超えないよう、デバウンス処理を実装済み

## 次のステップ

このタスク完了後、以下の実装に進む：
- Cloud Functionsでの画像合成処理（LGTM画像生成）
- Firestoreへのメタデータ保存
- 生成画像のプレビュー表示

---

## 実装完了チェックリスト

- [x] 型定義の実装
- [x] Cloud Functions APIの実装
- [x] フロントエンドの更新
- [x] 環境変数の設定
- [ ] 帰属表示の追加
- [x] 古いファイルの削除
- [ ] ドキュメント更新
- [x] ビルド・型チェック成功
- [ ] 動作確認完了（デプロイ後）

---

## 実装完了報告（2026-03-03）

### CORSエラー解決のための実装方針変更

当初、フロントエンドから直接Brave Search APIを呼び出す予定でしたが、CORSエラーが発生したため、Cloud Functionsをプロキシとして使用する方針に変更しました。

### 最終的な実装構成

```
フロントエンド (generate.tsx)
    ↓ fetch
Cloud Functions (/api/searchImages)
    ↓ fetch (X-Subscription-Token)
Brave Search API
```

### 実装したファイル

1. **型定義**
   - `packages/common/src/types/BraveImageSearch.ts`

2. **Cloud Functions API**
   - `apps/functions/src/api/searchImages/searchImages.ts`
   - `apps/functions/src/router.ts` (ルート追加)

3. **フロントエンド**
   - `apps/web/src/routes/generate.tsx` (Cloud Functions API呼び出し)
   - `apps/web/.env.example` (VITE_FIREBASE_FUNCTIONS_URL追加)

4. **削除したファイル**
   - `apps/web/src/lib/googleImageSearch.ts`
   - `apps/web/src/lib/braveImageSearch.ts`
   - `apps/web/src/server/searchImages.ts`
   - `apps/web/src/routes/api/search-images.ts`
   - `packages/common/src/types/GoogleImageSearch.ts`

### 環境変数設定

**Cloud Functions側** (`apps/functions/.env`):
```bash
BRAVE_SEARCH_API_KEY=your-brave-api-key
```

**フロントエンド側** (`apps/web/.env`):
```bash
VITE_FIREBASE_FUNCTIONS_URL=https://us-central1-your-project-id.cloudfunctions.net/api
# ローカル開発時は http://localhost:5001/lgtmonk-dev/us-central1/api
```

### デプロイ手順

1. **Cloud Functionsのデプロイ**
   ```bash
   cd apps/functions
   pnpm run pre-build
   pnpm run deploy
   ```

2. **環境変数の設定**
   ```bash
   firebase functions:config:set brave.api_key="your-brave-api-key"
   ```

3. **動作確認**
   - `/generate` ページで画像検索をテスト
   - ブラウザのコンソールでエラーがないか確認
   - 20件の画像が返ってくることを確認

### 次のステップ

- [ ] Cloud Functionsをデプロイ
- [ ] 本番環境での動作確認
- [ ] 帰属表示の追加（「Powered by Brave Search」）
- [ ] README.mdの更新
