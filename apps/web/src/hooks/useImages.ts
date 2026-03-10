import type { Image } from '@lgtmonk/common'
import { useCallback, useEffect, useState } from 'react'
import {
  fetchImagesByIdsOperation,
  fetchImagesOperation,
  fetchRandomImagesOperation,
  IMAGES_PAGE_SIZE,
} from '@/infrastructure/firestore/ImageOperations'
import { getFavoritesFromLocalStorage } from '@/infrastructure/localStorage/favoriteStorage'
import { logTabChange } from '@/lib/analytics'

export type DisplayMode = 'latest' | 'random' | 'favorites'

export type UseImagesReturn = {
  images: Array<Image>
  error: string | null
  isLoading: boolean
  displayMode: DisplayMode
  setDisplayMode: (mode: DisplayMode) => void
  refetch: () => Promise<void>
  // お気に入りページネーション用
  loadMoreFavorites: () => Promise<void>
  hasMoreFavorites: boolean
  totalFavoritesCount: number
  isLoadingMore: boolean
}

// お気に入りのページサイズ（Firestoreの`in`句制限）
const FAVORITES_PAGE_SIZE = 30

/**
 * 画像一覧を取得するカスタムフック
 * F-01: LGTM画像一覧表示機能
 * F-06: お気に入り機能（ページネーション対応）
 */
export const useImages = (): UseImagesReturn => {
  const [images, setImages] = useState<Array<Image>>([])
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false)
  const [displayMode, setDisplayMode] = useState<DisplayMode>('latest')

  // お気に入りページネーション用の状態
  const [favoritePageIndex, setFavoritePageIndex] = useState<number>(0)
  const [totalFavoritesCount, setTotalFavoritesCount] = useState<number>(0)
  const [hasMoreFavorites, setHasMoreFavorites] = useState<boolean>(false)

  // 画像を取得する関数
  const fetchImages = useCallback(async (mode: DisplayMode) => {
    setIsLoading(true)
    setError(null)

    try {
      let fetchedImages: Array<Image> = []

      switch (mode) {
        case 'latest':
          fetchedImages = await fetchImagesOperation(IMAGES_PAGE_SIZE)
          break
        case 'random':
          fetchedImages = await fetchRandomImagesOperation(IMAGES_PAGE_SIZE)
          break
        case 'favorites': {
          // localStorageからお気に入りを取得
          const localFavorites = getFavoritesFromLocalStorage()
          setTotalFavoritesCount(localFavorites.length)

          if (localFavorites.length === 0) {
            fetchedImages = []
            setHasMoreFavorites(false)
          } else {
            // 最初の30件のみ取得
            const startIndex = 0
            const endIndex = FAVORITES_PAGE_SIZE
            const pageIds = localFavorites
              .slice(startIndex, endIndex)
              .map((f) => f.imageId)

            fetchedImages = await fetchImagesByIdsOperation(pageIds)
            setFavoritePageIndex(0)
            setHasMoreFavorites(localFavorites.length > FAVORITES_PAGE_SIZE)
          }
          break
        }
        default:
          fetchedImages = []
      }

      setImages(fetchedImages)
    } catch (e) {
      console.error('画像の取得に失敗しました:', e)
      setError(
        e instanceof Error
          ? e.message
          : '画像の取得に失敗しました。もう一度お試しください。',
      )
      setImages([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  // お気に入りの追加読み込み
  const loadMoreFavorites = useCallback(async () => {
    if (displayMode !== 'favorites' || isLoadingMore) {
      return
    }

    setIsLoadingMore(true)
    setError(null)

    try {
      const localFavorites = getFavoritesFromLocalStorage()
      const nextPageIndex = favoritePageIndex + 1
      const startIndex = nextPageIndex * FAVORITES_PAGE_SIZE
      const endIndex = startIndex + FAVORITES_PAGE_SIZE

      if (startIndex >= localFavorites.length) {
        // これ以上データがない
        setHasMoreFavorites(false)
        return
      }

      const pageIds = localFavorites
        .slice(startIndex, endIndex)
        .map((f) => f.imageId)

      const newImages = await fetchImagesByIdsOperation(pageIds)
      setImages((prev) => [...prev, ...newImages])
      setFavoritePageIndex(nextPageIndex)
      setHasMoreFavorites(endIndex < localFavorites.length)
    } catch (e) {
      console.error('追加画像の取得に失敗しました:', e)
      setError(
        e instanceof Error
          ? e.message
          : '追加画像の取得に失敗しました。もう一度お試しください。',
      )
    } finally {
      setIsLoadingMore(false)
    }
  }, [displayMode, favoritePageIndex, isLoadingMore])

  // 再取得関数（外部から呼び出し可能）
  const refetch = useCallback(async () => {
    await fetchImages(displayMode)
  }, [displayMode, fetchImages])

  // 初回マウント時とdisplayMode変更時に画像を取得
  useEffect(() => {
    fetchImages(displayMode)
    // タブ変更時にAnalyticsイベントを記録（初回マウント以外）
    logTabChange(displayMode)
  }, [displayMode, fetchImages])

  return {
    images,
    error,
    isLoading,
    displayMode,
    setDisplayMode,
    refetch,
    loadMoreFavorites,
    hasMoreFavorites,
    totalFavoritesCount,
    isLoadingMore,
  }
}
