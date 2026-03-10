import { useCallback, useEffect, useMemo, useState } from 'react'
import type { LocalStorageFavorite } from '@/infrastructure/localStorage/favoriteStorage'
import {
  addFavoriteToLocalStorage,
  clearFavoritesFromLocalStorage,
  getFavoritesFromLocalStorage,
  isFavoriteInLocalStorage,
  removeFavoriteFromLocalStorage,
} from '@/infrastructure/localStorage/favoriteStorage'
import { logFavorite } from '@/lib/analytics'

export type UseFavoritesReturn = {
  favoriteIds: Set<string> // 高速検索用Set
  favorites: Array<LocalStorageFavorite> // 全データ
  isFavorite: (imageId: string) => boolean // お気に入り判定
  toggleFavorite: (imageId: string, imageUrl: string) => void // 追加/削除
  clearFavorites: () => void // 全削除（F-09マイグレーション用）
}

/**
 * お気に入り状態管理フック
 * 未ログイン時のlocalStorageベースのお気に入り機能を提供する
 */
export const useFavorites = (): UseFavoritesReturn => {
  const [favorites, setFavorites] = useState<Array<LocalStorageFavorite>>([])

  // マウント時にlocalStorageから読み込み
  useEffect(() => {
    const loadedFavorites = getFavoritesFromLocalStorage()
    setFavorites(loadedFavorites)
  }, [])

  // 高速検索用のSetを作成
  const favoriteIds = useMemo(() => {
    return new Set(favorites.map((fav) => fav.imageId))
  }, [favorites])

  // お気に入り判定
  const isFavorite = useCallback(
    (imageId: string): boolean => {
      return favoriteIds.has(imageId)
    },
    [favoriteIds],
  )

  // お気に入りの追加/削除を切り替え
  const toggleFavorite = useCallback(
    (imageId: string, imageUrl: string): void => {
      try {
        const isCurrentlyFavorite = isFavoriteInLocalStorage(imageId)

        if (isCurrentlyFavorite) {
          // 削除
          removeFavoriteFromLocalStorage(imageId)
          setFavorites((prev) => prev.filter((fav) => fav.imageId !== imageId))
          logFavorite('remove', imageId)
        } else {
          // 追加
          addFavoriteToLocalStorage(imageId, imageUrl)
          const newFavorite: LocalStorageFavorite = {
            imageId,
            imageUrl,
            addedAt: new Date().toISOString(),
          }
          setFavorites((prev) => [newFavorite, ...prev])
          logFavorite('add', imageId)
        }
      } catch (error) {
        console.error('Failed to toggle favorite:', error)
        // エラーはコンポーネント側でトーストなどで通知する想定
        throw error
      }
    },
    [],
  )

  // お気に入りをすべてクリア（F-09マイグレーション用）
  const clearFavorites = useCallback((): void => {
    clearFavoritesFromLocalStorage()
    setFavorites([])
  }, [])

  return {
    favoriteIds,
    favorites,
    isFavorite,
    toggleFavorite,
    clearFavorites,
  }
}
