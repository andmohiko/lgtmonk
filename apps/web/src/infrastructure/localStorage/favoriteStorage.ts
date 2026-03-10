/**
 * お気に入り画像のlocalStorage操作ユーティリティ
 * 未ログイン時のお気に入り機能を提供する
 */

// localStorageに保存する型定義
export type LocalStorageFavorite = {
  imageId: string
  imageUrl: string
  addedAt: string // ISO 8601 string
}

// localStorage キー定数
const FAVORITES_KEY = 'lgtmonk_favorites' as const

/**
 * localStorageからお気に入り画像を取得する
 * @returns お気に入り画像の配列（追加順）
 */
export const getFavoritesFromLocalStorage = (): Array<LocalStorageFavorite> => {
  try {
    const stored = localStorage.getItem(FAVORITES_KEY)
    if (!stored) {
      return []
    }

    const parsed = JSON.parse(stored)

    // 配列でない場合はクリアして空配列を返す
    if (!Array.isArray(parsed)) {
      console.warn('Invalid favorites data format, clearing...')
      localStorage.removeItem(FAVORITES_KEY)
      return []
    }

    return parsed as Array<LocalStorageFavorite>
  } catch (error) {
    console.error('Failed to get favorites from localStorage:', error)
    // JSONパースエラーの場合はクリア
    try {
      localStorage.removeItem(FAVORITES_KEY)
    } catch {
      // 何もしない
    }
    return []
  }
}

/**
 * localStorageにお気に入り画像を追加する
 * @param imageId - 画像ID
 * @param imageUrl - 画像URL
 */
export const addFavoriteToLocalStorage = (
  imageId: string,
  imageUrl: string,
): void => {
  try {
    const favorites = getFavoritesFromLocalStorage()

    // 重複チェック
    const alreadyExists = favorites.some((fav) => fav.imageId === imageId)
    if (alreadyExists) {
      return
    }

    // 新しいお気に入りを先頭に追加（最新が先頭になる）
    const newFavorite: LocalStorageFavorite = {
      imageId,
      imageUrl,
      addedAt: new Date().toISOString(),
    }

    const updated = [newFavorite, ...favorites]
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(updated))
  } catch (error) {
    console.error('Failed to add favorite to localStorage:', error)
    throw new Error('お気に入りの追加に失敗しました')
  }
}

/**
 * localStorageからお気に入り画像を削除する
 * @param imageId - 削除する画像ID
 */
export const removeFavoriteFromLocalStorage = (imageId: string): void => {
  try {
    const favorites = getFavoritesFromLocalStorage()
    const filtered = favorites.filter((fav) => fav.imageId !== imageId)
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(filtered))
  } catch (error) {
    console.error('Failed to remove favorite from localStorage:', error)
    throw new Error('お気に入りの削除に失敗しました')
  }
}

/**
 * 画像がお気に入りに登録されているかチェックする
 * @param imageId - チェックする画像ID
 * @returns お気に入りに登録されている場合はtrue
 */
export const isFavoriteInLocalStorage = (imageId: string): boolean => {
  try {
    const favorites = getFavoritesFromLocalStorage()
    return favorites.some((fav) => fav.imageId === imageId)
  } catch (error) {
    console.error('Failed to check favorite in localStorage:', error)
    return false
  }
}

/**
 * localStorageのお気に入りをすべてクリアする
 * F-09（マイグレーション）で使用する
 */
export const clearFavoritesFromLocalStorage = (): void => {
  try {
    localStorage.removeItem(FAVORITES_KEY)
  } catch (error) {
    console.error('Failed to clear favorites from localStorage:', error)
    throw new Error('お気に入りのクリアに失敗しました')
  }
}
