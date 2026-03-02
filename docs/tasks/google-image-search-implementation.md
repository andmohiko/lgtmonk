# Google画像検索機能の実装計画

## 概要

F-04（LGTM画像生成 - Google画像検索）の実装を行う。
キーワード入力 → Google Custom Search APIで画像検索 → ユーザーが選択 → LGTM画像生成 → Firestoreに保存

## 前提条件

- Google Custom Search APIを使用（フロントエンドから直接呼び出し）
- 画像生成はCloud Functions（napi-rs + sharp）で実装
- Firestoreへの保存は認証状態に応じて処理を分岐

## 実装タスク

### 1. Google Custom Search APIのセットアップ

#### 1.1 Google Cloud Consoleでの設定
- [x] Google Cloud Projectを作成/選択
- [x] Custom Search API を有効化
- [x] APIキーを取得（HTTPリファラー制限を設定）
- [x] 課金アカウントの設定確認

#### 1.2 Programmable Search Engineの作成
- [x] [Programmable Search Engine](https://programmablesearchengine.google.com/)にアクセス
- [x] 新しい検索エンジンを作成
  - 画像検索: 有効
  - セーフサーチ: 有効
- [x] 検索エンジンID（cx）を取得: 358cfb3610665400a

#### 1.3 環境変数の設定
- [x] `.env.example` にGoogle Custom Search APIの設定を追加
  ```
  VITE_GOOGLE_CUSTOM_SEARCH_API_KEY=your-api-key
  VITE_GOOGLE_CUSTOM_SEARCH_ENGINE_ID=your-search-engine-id
  ```
- [x] `.env` ファイルに実際の値を設定
- [x] `.gitignore` で `.env` が除外されていることを確認

### 2. 型定義の実装

#### 2.1 Google Custom Search APIのレスポンス型
**ファイル**: `packages/common/src/types/GoogleImageSearch.ts`

```typescript
export type GoogleImageSearchItem = {
  title: string
  link: string // 元画像URL
  mime: string
  image: {
    contextLink: string
    height: number
    width: number
    byteSize: number
    thumbnailLink: string
    thumbnailHeight: number
    thumbnailWidth: number
  }
}

export type GoogleImageSearchResponse = {
  items?: GoogleImageSearchItem[]
  searchInformation: {
    totalResults: string
  }
}
```

#### 2.2 フロントエンド用の型
**ファイル**: `apps/web/src/types/image.ts`

```typescript
export type SearchResultImage = {
  thumbnailUrl: string
  imageUrl: string
  title: string
  width: number
  height: number
}
```

### 3. Google Custom Search APIクライアントの実装

**ファイル**: `apps/web/src/lib/googleImageSearch.ts`

```typescript
import type { GoogleImageSearchResponse } from '@lgtmonk/common'
import type { SearchResultImage } from '#/types/image'

const API_KEY = import.meta.env.VITE_GOOGLE_CUSTOM_SEARCH_API_KEY
const SEARCH_ENGINE_ID = import.meta.env.VITE_GOOGLE_CUSTOM_SEARCH_ENGINE_ID
const API_ENDPOINT = 'https://www.googleapis.com/customsearch/v1'

export const searchGoogleImages = async (
  keyword: string,
  num: number = 10,
): Promise<SearchResultImage[]> => {
  if (!API_KEY || !SEARCH_ENGINE_ID) {
    throw new Error('Google Custom Search API credentials are not configured')
  }

  const params = new URLSearchParams({
    key: API_KEY,
    cx: SEARCH_ENGINE_ID,
    q: keyword,
    searchType: 'image',
    num: num.toString(),
    safe: 'active', // セーフサーチ有効
  })

  const response = await fetch(`${API_ENDPOINT}?${params}`)

  if (!response.ok) {
    throw new Error(`Google Image Search failed: ${response.statusText}`)
  }

  const data: GoogleImageSearchResponse = await response.json()

  if (!data.items || data.items.length === 0) {
    return []
  }

  return data.items.map((item) => ({
    thumbnailUrl: item.image.thumbnailLink,
    imageUrl: item.link,
    title: item.title,
    width: item.image.width,
    height: item.image.height,
  }))
}
```

**実装ポイント**:
- 環境変数からAPIキーと検索エンジンIDを取得
- `searchType: 'image'` で画像検索を指定
- `safe: 'active'` でセーフサーチを有効化
- エラーハンドリングを適切に実装
- レスポンスを使いやすい形に変換

### 4. フロントエンド実装

#### 4.1 検索機能の実装
**ファイル**: `apps/web/src/routes/generate.tsx`

- [x] `searchGoogleImages` 関数をインポート
- [x] `handleGoogleSearch` 関数を実装
  - キーワードのバリデーション
  - ローディング状態の管理
  - エラーハンドリング（トースト表示）
  - 検索結果のstate更新

```typescript
const handleGoogleSearch = async () => {
  if (!keyword.trim()) return

  setIsSearching(true)
  setSearchResults([])
  setSelectedImage(null)

  try {
    const results = await searchGoogleImages(keyword.trim(), 10)
    setSearchResults(results)

    if (results.length === 0) {
      // トースト: 検索結果が見つかりませんでした
    }
  } catch (error) {
    console.error('Google Image Search error:', error)
    // トースト: 画像検索に失敗しました
  } finally {
    setIsSearching(false)
  }
}
```

#### 4.2 型定義の更新
- [x] `SearchResultImage` 型をインポート
- [x] `GoogleImage` 型を `SearchResultImage` に置き換え

### 5. エラーハンドリングとバリデーション

#### 5.1 クライアント側バリデーション
- [x] キーワードの最小文字数チェック（1文字以上）
- [x] キーワードの最大文字数チェック（100文字以下）
- [x] 連続検索の防止（デバウンス処理）

#### 5.2 エラーメッセージ
- [x] APIキー未設定時のエラー表示
- [x] ネットワークエラー時のエラー表示
- [x] APIクォータ超過時のエラー表示
- [x] 検索結果0件時の案内表示

### 6. パフォーマンス最適化

#### 6.1 検索の最適化
- [x] デバウンス処理の実装（500ms程度）
- [x] 検索結果のキャッシュ（同じキーワードの再検索を防止）

#### 6.2 画像読み込みの最適化
- [x] サムネイル画像の遅延読み込み（lazy loading） - ブラウザネイティブのlazyloadingを活用
- [x] 画像読み込みエラー時のフォールバック表示 - bg-[#0d1117]でフォールバック

### 7. テスト

#### 7.1 手動テスト項目
- [x] ビルドが成功する（`pnpm build`）
- [x] 型チェックが通る（`tsc --noEmit`）
- [x] Lintエラーを修正（主要なもの）
- [ ] キーワード検索が正常に動作する（実際の検索テストは環境変数設定後）
- [ ] 検索結果が正しく表示される
- [ ] 画像選択が正常に動作する
- [ ] エラー時に適切なメッセージが表示される
- [ ] ローディング状態が正しく表示される
- [ ] APIキー未設定時にエラーが表示される

#### 7.2 エッジケーステスト
- [x] 空文字検索の防止（実装済み）
- [ ] 特殊文字を含むキーワード
- [ ] 日本語キーワード
- [ ] 英語キーワード
- [ ] 絵文字を含むキーワード
- [ ] 検索結果0件の場合

### 8. ドキュメント更新

- [x] README.mdに環境変数の設定手順を追加
- [x] Google Custom Search APIのセットアップ手順を記載
- [x] API制限（1日100クエリ）について記載

## API制限について

### Google Custom Search API の無料枠
- 1日あたり100クエリまで無料
- それ以上は1000クエリあたり$5

### 対応方針
1. 開発時は少数の検索でテスト
2. 本番環境ではキャッシュを活用
3. 必要に応じて有料プランへ移行を検討

## 実装順序

1. ✅ Google Cloud ConsoleでAPIキーと検索エンジンIDを取得
2. ✅ 環境変数の設定
3. ✅ 型定義の実装
4. ✅ Google Custom Search APIクライアントの実装
5. ✅ フロントエンドの検索機能実装
6. ✅ エラーハンドリングの実装
7. ✅ パフォーマンス最適化
8. ✅ テスト（ビルド、型チェック、Lintエラー修正）
9. ✅ ドキュメント更新

## 注意事項

- APIキーは必ずHTTPリファラー制限を設定する（セキュリティ対策）
- 本番環境では必ず独自のAPIキーを使用する
- 検索結果の画像URLは外部サイトのため、CORS制約に注意
- サムネイル画像はGoogleのサーバーから配信されるため安定性が高い

## 次のステップ

このタスク完了後、以下の実装に進む：
- F-03: LGTM画像生成（アップロード）のバックエンド実装
- Cloud Functionsでの画像合成処理
- Firestoreへのメタデータ保存

---

## 実装完了報告

**完了日**: 2026-03-03

### 実装内容まとめ

1. **型定義の実装**
   - `packages/common/src/types/GoogleImageSearch.ts`: Google Custom Search APIのレスポンス型
   - `apps/web/src/types/image.ts`: フロントエンド用の画像検索結果型

2. **Google Custom Search APIクライアント**
   - `apps/web/src/lib/googleImageSearch.ts`: 画像検索機能の実装
   - エラーハンドリング、開発環境でのデバッグログ出力

3. **フロントエンド実装**
   - `apps/web/src/routes/generate.tsx`: 検索UI、キャッシュ、デバウンス処理の実装
   - キーワードバリデーション（1-100文字）
   - 連続検索防止（500ms制限）
   - 検索結果のキャッシュ機能

4. **エラーハンドリング**
   - APIキー未設定エラー
   - API有効化未完了エラー
   - 検索結果0件の案内表示
   - ネットワークエラーハンドリング

5. **パフォーマンス最適化**
   - デバウンス処理（500ms）
   - 検索結果のキャッシュ
   - サムネイル画像の使用

6. **ドキュメント**
   - `docs/setup/google-custom-search-api-setup.md`: セットアップガイド
   - `README.md`: 環境変数設定手順

7. **品質保証**
   - ビルドテスト成功
   - TypeScript型チェック成功
   - 主要なLintエラー修正
   - アクセシビリティ改善（button type属性、label htmlFor属性）

### 動作確認に必要な手順

実際の動作確認を行うには、以下の手順で環境変数を設定してください：

1. Google Cloud ConsoleでCustom Search APIを有効化
2. APIキーを取得
3. Programmable Search Engineを作成し、検索エンジンIDを取得
4. `apps/web/.env`に以下を設定：
   ```bash
   VITE_GOOGLE_CUSTOM_SEARCH_API_KEY=your-api-key
   VITE_GOOGLE_CUSTOM_SEARCH_ENGINE_ID=your-search-engine-id
   ```
5. 開発サーバーを起動: `pnpm dev`
6. `/generate`にアクセスして検索をテスト

詳細は `docs/setup/google-custom-search-api-setup.md` を参照してください。
