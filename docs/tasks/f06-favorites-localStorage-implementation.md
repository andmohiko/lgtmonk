# F-06: お気に入り登録（未ログイン）実装計画

## 概要

LGTM画像に「お気に入り」機能を追加し、未ログイン状態でもlocalStorageを使用してお気に入り画像を保存・表示できるようにする。

お気に入りタブは**30件ずつページネーション表示**し、「もっと見る」ボタンで追加読み込みを行う。これによりFirestoreの`in`句の30件制限に対応し、バッチ処理を実装せずにシンプルな実装を実現する。

## 背景

spec.mdのF-06要件:
- 各画像カードにお気に入りボタン（♡）を設置する
- 未ログイン時は画像IDの配列をlocalStorageに保存する
- 一覧画面の「お気に入り」タブで保存した画像を表示する
- 将来的にF-09でログイン時にFirestoreへマイグレーションする

## 現状分析

### 実装済みの機能
- ✅ お気に入りタブのUI（表示モード切り替え）
- ✅ Firestore上の`users/{uid}/favorites`サブコレクション操作（FavoriteOperations.ts）
- ✅ 画像一覧表示（最新・ランダム）
- ✅ 画像詳細モーダル（ImageDetailDialog）
- ✅ アナリティクス関数（logFavorite）

### 実装が必要な機能
- ❌ localStorage操作ユーティリティ
- ❌ 画像ID配列から画像を取得するFirestore操作
- ❌ お気に入り状態管理フック
- ❌ お気に入りボタンコンポーネント
- ❌ 画像カード・詳細モーダルへのお気に入りボタン追加
- ❌ お気に入りタブでのlocalStorage画像表示

## アーキテクチャ

CLAUDE.mdに従った4層アーキテクチャを採用:

```
UI Layer (Image Cards, ImageDetailDialog)
    ↓
Hooks Layer (useFavorites, useToggleFavorite)
    ↓
Operations Layer (localStorage utilities, Firestore operations)
    ↓
Storage (localStorage, Firestore)
```

## 実装計画

### Phase 1: Infrastructure Layer（インフラ層）

#### 1-1. localStorage操作ユーティリティの作成

**ファイル**: `apps/web/src/infrastructure/localStorage/favoriteStorage.ts`

**実装内容**:
```typescript
// 型定義
export type LocalStorageFavorite = {
  imageId: string
  imageUrl: string
  addedAt: string  // ISO 8601 string
}

// localStorage キー定数
const FAVORITES_KEY = 'lgtmonk_favorites' as const

// 機能一覧:
// - getFavoritesFromLocalStorage(): Array<LocalStorageFavorite>
// - addFavoriteToLocalStorage(imageId: string, imageUrl: string): void
// - removeFavoriteFromLocalStorage(imageId: string): void
// - isFavoriteInLocalStorage(imageId: string): boolean
// - clearFavoritesFromLocalStorage(): void
```

**実装ポイント**:
- try-catchでlocalStorageアクセスエラーをハンドリング
- JSONパースエラーを考慮（不正なデータはクリア）
- 重複チェック（同じimageIdは保存しない）
- タイムスタンプ付きで保存（将来のソート・マイグレーションに備える）

#### 1-2. Firestore操作の追加

**ファイル**: `apps/web/src/infrastructure/firestore/ImageOperations.ts`（既存ファイルに追加）

**実装内容**:
```typescript
/**
 * 画像IDの配列から画像を取得する（最大30件）
 * @param imageIds - 取得する画像IDの配列（最大30件）
 * @returns 画像の配列（存在しないIDはスキップされる）
 */
export const fetchImagesByIdsOperation = async (
  imageIds: Array<ImageId>,
): Promise<Array<Image>>
```

**実装ポイント**:
- Firestoreの`where(documentId(), 'in', ids)`を使用
- `in`句は最大30件の制限があるため、**引数は最大30件まで受け付ける**
- 31件以上は渡さない（呼び出し側で制御）
- localStorageの順序を保持するためにソート処理
- 空配列の場合は早期リターン

### Phase 2: Hooks Layer（フック層）

#### 2-1. お気に入り状態管理フックの作成

**ファイル**: `apps/web/src/hooks/useFavorites.ts`

**実装内容**:
```typescript
export type UseFavoritesReturn = {
  favoriteIds: Set<string>          // 高速検索用Set
  favorites: Array<LocalStorageFavorite>  // 全データ
  isFavorite: (imageId: string) => boolean  // お気に入り判定
  toggleFavorite: (imageId: string, imageUrl: string) => void  // 追加/削除
  clearFavorites: () => void         // 全削除（F-09マイグレーション用）
}

export const useFavorites = (): UseFavoritesReturn
```

**実装ポイント**:
- マウント時にlocalStorageから読み込み
- `favoriteIds`はSetで管理し、`isFavorite`の高速化
- `toggleFavorite`で追加/削除を切り替え
- アナリティクス（logFavorite）を統合
- useCallback/useMemoで最適化

#### 2-2. useImagesフックの拡張（ページネーション対応）

**ファイル**: `apps/web/src/hooks/useImages.ts`（既存ファイルを修正）

**実装内容**:
- `displayMode === 'favorites'`の分岐処理を追加
- `getFavoritesFromLocalStorage()`でIDを取得
- **最初の30件のみ取得**（Firestoreの`in`句制限に対応）
- ページネーション状態の管理を追加
- `loadMoreFavorites`関数で追加読み込み

**変更箇所**:
```typescript
// 新規state追加
const [favoritePageIndex, setFavoritePageIndex] = useState(0)
const FAVORITES_PAGE_SIZE = 30

case 'favorites':
  const localFavorites = getFavoritesFromLocalStorage()
  if (localFavorites.length === 0) {
    fetchedImages = []
  } else {
    // 最初の30件のみ取得
    const startIndex = 0
    const endIndex = FAVORITES_PAGE_SIZE
    const pageIds = localFavorites
      .slice(startIndex, endIndex)
      .map(f => f.imageId)
    fetchedImages = await fetchImagesByIdsOperation(pageIds)
    setFavoritePageIndex(0)
  }
  break

// 追加読み込み関数
const loadMoreFavorites = async () => {
  const localFavorites = getFavoritesFromLocalStorage()
  const nextPageIndex = favoritePageIndex + 1
  const startIndex = nextPageIndex * FAVORITES_PAGE_SIZE
  const endIndex = startIndex + FAVORITES_PAGE_SIZE

  if (startIndex >= localFavorites.length) {
    return // これ以上データがない
  }

  const pageIds = localFavorites
    .slice(startIndex, endIndex)
    .map(f => f.imageId)
  const newImages = await fetchImagesByIdsOperation(pageIds)
  setImages(prev => [...prev, ...newImages])
  setFavoritePageIndex(nextPageIndex)
}
```

**戻り値に追加**:
```typescript
export type UseImagesReturn = {
  // 既存
  images: Array<Image>
  error: string | null
  isLoading: boolean
  displayMode: DisplayMode
  setDisplayMode: (mode: DisplayMode) => void
  refetch: () => Promise<void>
  // 新規追加
  loadMoreFavorites: () => Promise<void>
  hasMoreFavorites: boolean
  totalFavoritesCount: number
}
```

### Phase 3: UI Layer（UI層）

#### 3-1. お気に入りボタンコンポーネントの作成

**ファイル**: `apps/web/src/components/FavoriteButton.tsx`

**実装内容**:
```typescript
type FavoriteButtonProps = {
  imageId: string
  imageUrl: string
  isFavorite: boolean
  onToggle: (imageId: string, imageUrl: string) => void
  size?: 'sm' | 'md' | 'lg'
  variant?: 'default' | 'ghost'
}

export function FavoriteButton(props: FavoriteButtonProps)
```

**UI仕様**:
- `lucide-react`の`Heart`アイコンを使用
- お気に入り時: 塗りつぶし + 赤色（`#f85149`）
- 未お気に入り時: アウトライン + グレー（`#8b949e`）
- ホバー時: 赤色にアニメーション
- クリック時: 拡大アニメーション（scale-125）
- `e.stopPropagation()`でカードクリックを防止
- アクセシビリティ: `aria-label`を設定

#### 3-2. 画像カードへのお気に入りボタン追加

**ファイル**: `apps/web/src/routes/index.tsx`（既存ファイルを修正）

**実装内容**:
1. `useFavorites()`フックをインポート
2. 各画像カードの右上にお気に入りボタンを配置
3. 絶対配置（`absolute top-2 right-2`）でオーバーレイ表示
4. ホバー時のみ表示するオプションも検討

**配置イメージ**:
```tsx
<button className="relative group">
  <img src={image.imageUrl} />
  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100">
    {/* 既存のキーワード表示 */}
  </div>
  <div className="absolute top-2 right-2 z-10">
    <FavoriteButton
      imageId={image.imageId}
      imageUrl={image.imageUrl}
      isFavorite={isFavorite(image.imageId)}
      onToggle={toggleFavorite}
      size="sm"
    />
  </div>
</button>
```

#### 3-3. ImageDetailDialogへのお気に入りボタン追加

**ファイル**: `apps/web/src/components/ImageDetailDialog.tsx`（既存ファイルを修正）

**実装内容**:
1. propsに`isFavorite`と`onToggleFavorite`を追加
2. ダイアログヘッダー（画像の上部または右上）にボタンを配置
3. 大きめのサイズ（`size="md"`）で視認性を確保

**プロップス追加**:
```typescript
type ImageDetailDialogProps = {
  // 既存のprops
  image: Image | null
  open: boolean
  onOpenChange: (open: boolean) => void
  // 新規追加
  isFavorite: boolean
  onToggleFavorite: (imageId: string, imageUrl: string) => void
}
```

#### 3-4. 空状態の表示と「もっと見る」ボタン

**ファイル**: `apps/web/src/routes/index.tsx`

**実装内容（空状態）**:
- `displayMode === 'favorites'`かつ`images.length === 0`の場合
- 空状態メッセージを表示:
  - "まだお気に入りがありません"
  - "画像をお気に入りに追加すると、ここに表示されます"
  - ハートアイコンを含めたデザイン

**実装内容（もっと見るボタン）**:
- `displayMode === 'favorites'`かつ`hasMoreFavorites === true`の場合
- 画像グリッドの下部に「もっと見る」ボタンを表示
- クリックで`loadMoreFavorites()`を実行
- 読み込み中は「読み込み中...」と表示
- お気に入り総数を表示（例: "50件中30件表示"）

```tsx
{displayMode === 'favorites' && hasMoreFavorites && (
  <div className="flex flex-col items-center gap-2 mt-8">
    <p className="text-sm text-[#8b949e]">
      {totalFavoritesCount}件中{images.length}件表示
    </p>
    <button
      onClick={loadMoreFavorites}
      disabled={isLoadingMore}
      className="px-6 py-2 bg-[#238636] hover:bg-[#2ea043] text-white rounded-md transition-colors"
    >
      {isLoadingMore ? '読み込み中...' : 'もっと見る'}
    </button>
  </div>
)}
```

### Phase 4: Integration & Testing（統合・テスト）

#### 4-1. 機能テスト項目

1. **お気に入り追加**
   - [ ] 画像カードのハートボタンをクリックして追加
   - [ ] 詳細モーダルのハートボタンをクリックして追加
   - [ ] ボタンの状態が即座に変化（塗りつぶし→赤色）
   - [ ] localStorageに保存されている

2. **お気に入り削除**
   - [ ] ハートボタンをクリックして削除
   - [ ] ボタンの状態が即座に変化（赤色→グレー）
   - [ ] localStorageから削除されている

3. **お気に入りタブ表示**
   - [ ] お気に入りタブをクリックすると保存した画像が表示される（最初の30件）
   - [ ] 画像の順序が保持されている（追加順）
   - [ ] 空の場合、適切なメッセージが表示される

3-2. **お気に入りページネーション**
   - [ ] 31件以上お気に入りがある場合、「もっと見る」ボタンが表示される
   - [ ] 「もっと見る」ボタンをクリックすると次の30件が追加表示される
   - [ ] お気に入り総数と表示件数が正しく表示される（例: "50件中30件表示"）
   - [ ] 全て表示したら「もっと見る」ボタンが消える

4. **localStorage永続化**
   - [ ] ページをリロードしてもお気に入りが保持される
   - [ ] ブラウザを再起動してもお気に入りが保持される

5. **エラーハンドリング**
   - [ ] localStorageが無効な環境でもエラーが出ない
   - [ ] 不正なJSONデータがあっても動作する
   - [ ] お気に入りした画像が削除されても表示がクラッシュしない

6. **アナリティクス**
   - [ ] お気に入り追加時に`logFavorite('add', imageId)`が呼ばれる
   - [ ] お気に入り削除時に`logFavorite('remove', imageId)`が呼ばれる

#### 4-2. ブラウザ互換性テスト

- [ ] Chrome
- [ ] Firefox
- [ ] Safari
- [ ] Edge

#### 4-3. レスポンシブデザインテスト

- [ ] モバイル（375px）
- [ ] タブレット（768px）
- [ ] デスクトップ（1024px+）

## ファイル変更一覧

### 新規作成ファイル（4ファイル）

1. `apps/web/src/infrastructure/localStorage/favoriteStorage.ts`
2. `apps/web/src/hooks/useFavorites.ts`
3. `apps/web/src/components/FavoriteButton.tsx`
4. `docs/tasks/f06-favorites-localStorage-implementation.md`（本ファイル）

### 修正ファイル（3ファイル）

1. `apps/web/src/infrastructure/firestore/ImageOperations.ts`
   - `fetchImagesByIdsOperation`関数を追加

2. `apps/web/src/hooks/useImages.ts`
   - `displayMode === 'favorites'`の処理を追加

3. `apps/web/src/routes/index.tsx`
   - `useFavorites`フックを統合
   - 画像カードにお気に入りボタンを追加
   - 空状態表示を追加
   - `ImageDetailDialog`にpropsを渡す

4. `apps/web/src/components/ImageDetailDialog.tsx`
   - propsに`isFavorite`と`onToggleFavorite`を追加
   - お気に入りボタンを配置

## スタイリング指針

GitHub Dark Themeに従う:

```css
/* お気に入りボタン */
.favorite-button-active {
  color: #f85149;        /* 赤色（お気に入り状態） */
  fill: #f85149;
}

.favorite-button-inactive {
  color: #8b949e;        /* グレー（未お気に入り状態） */
}

.favorite-button-inactive:hover {
  color: #f85149;        /* ホバー時は赤色 */
}

/* 空状態メッセージ */
.empty-state-text {
  color: #8b949e;        /* セカンダリテキスト */
}
```

## 実装上の注意点

1. **localStorage容量制限**
   - 通常5-10MBの制限がある
   - 画像URLとIDのみ保存（画像データは保存しない）
   - 数千件のお気に入りでも問題なし

2. **Firestoreクエリ制限とページネーション**
   - `where(documentId(), 'in', ids)`は最大30件まで
   - **ページネーションで対応**: 1ページあたり30件表示、追加読み込みで次の30件取得
   - **バッチ処理は不要**: `fetchImagesByIdsOperation`は常に30件以下のIDを受け取る
   - 呼び出し側（useImages.ts）で30件ずつスライスして渡す

3. **クリックイベントの伝播**
   - お気に入りボタンのクリック時に`e.stopPropagation()`を呼ぶ
   - 画像カードのクリックイベントと競合しないようにする

4. **アニメーション**
   - Tailwind CSSの`transition-all`と`scale-*`を使用
   - 過度なアニメーションは避ける（300ms程度）

5. **アクセシビリティ**
   - ボタンに`aria-label`を必ず設定
   - キーボード操作可能にする
   - 色だけでなく形状でも状態を示す（塗りつぶし/アウトライン）
   - 「もっと見る」ボタンは読み込み中に`disabled`属性を設定

6. **F-09への準備**
   - `clearFavoritesFromLocalStorage()`関数を用意
   - タイムスタンプ付きで保存（マイグレーション時のソート用）
   - 画像URLも保存（Firestoreへの書き込み用）

7. **ページネーション状態管理**
   - `favoritePageIndex`でページインデックスを管理
   - タブ切り替え時にリセット（`displayMode`が変わったら`favoritePageIndex = 0`）
   - 追加読み込み時は既存画像に結合（`[...prev, ...newImages]`）

## 見積もり工数

| フェーズ | タスク | 見積もり |
|---------|-------|----------|
| Phase 1 | localStorage操作ユーティリティ | 1.5h |
| Phase 1 | Firestore操作追加（シンプル化） | 0.5h |
| Phase 2 | useFavoritesフック | 1.5h |
| Phase 2 | useImagesフック拡張（ページネーション込み） | 1.5h |
| Phase 3 | FavoriteButtonコンポーネント | 1.5h |
| Phase 3 | 画像カードへの統合 | 1.0h |
| Phase 3 | ImageDetailDialogへの統合 | 1.0h |
| Phase 3 | 空状態表示＋もっと見るボタン | 1.0h |
| Phase 4 | 機能テスト（ページネーション込み） | 2.5h |
| Phase 4 | ブラウザ互換性テスト | 0.5h |
| **合計** | | **12.5h** |

**変更点**:
- Firestore操作がシンプルになり-0.5h
- useImagesフックにページネーション実装で+1.0h
- もっと見るボタン実装で+0.5h
- ページネーションテストで+0.5h
- **合計: +1.5h**

## 依存関係

既存の依存関係のみ使用（新規追加なし）:
- `firebase`: v11.5.0
- `lucide-react`: v0.561.0
- `react`: v19.2.0
- `tailwindcss`: v4.1.18

## 参考資料

- [spec.md](../spec.md) - F-06要件定義
- [CLAUDE.md](../../CLAUDE.md) - Firestore実装ガイド
- [Web Storage API](https://developer.mozilla.org/ja/docs/Web/API/Web_Storage_API) - localStorage仕様
- [Firestore Queries](https://firebase.google.com/docs/firestore/query-data/queries) - Firestoreクエリ制限

## 次のステップ（F-09実装時）

F-06実装完了後、将来的にF-09（お気に入りマイグレーション）を実装する際の準備:

1. Firebase Auth Providerの実装
2. `onAuthStateChanged`リスナーの設定
3. ログイン時のマイグレーション処理:
   ```typescript
   const migrateLocalStorageFavorites = async (uid: string) => {
     const favorites = getFavoritesFromLocalStorage()
     for (const fav of favorites) {
       await createFavoriteOperation(uid, fav.imageId, {
         imageUrl: fav.imageUrl,
         createdAt: serverTimestamp,
       })
     }
     clearFavoritesFromLocalStorage()
   }
   ```

---

## 実装開始の準備

このドキュメントを確認後、以下の順序で実装を開始:

1. Phase 1-1: `favoriteStorage.ts`を作成
2. Phase 1-2: `ImageOperations.ts`に関数追加
3. Phase 2-1: `useFavorites.ts`を作成
4. Phase 2-2: `useImages.ts`を修正
5. Phase 3-1: `FavoriteButton.tsx`を作成
6. Phase 3-2: `index.tsx`を修正
7. Phase 3-3: `ImageDetailDialog.tsx`を修正
8. Phase 4: テスト実施

各フェーズ完了後、動作確認を行いながら進めることを推奨します。
