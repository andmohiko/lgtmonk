import type { Image } from '@lgtmonk/common'
import { useCallback, useEffect, useState } from 'react'
import {
  fetchImagesOperation,
  fetchRandomImagesOperation,
  IMAGES_PAGE_SIZE,
} from '@/infrastructure/firestore/ImageOperations'
import { logTabChange } from '@/lib/analytics'

export type DisplayMode = 'latest' | 'random' | 'favorites'

export type UseImagesReturn = {
  images: Array<Image>
  error: string | null
  isLoading: boolean
  displayMode: DisplayMode
  setDisplayMode: (mode: DisplayMode) => void
  refetch: () => Promise<void>
}

/**
 * 画像一覧を取得するカスタムフック
 * F-01: LGTM画像一覧表示機能
 */
export const useImages = (): UseImagesReturn => {
  const [images, setImages] = useState<Array<Image>>([])
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [displayMode, setDisplayMode] = useState<DisplayMode>('latest')

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
        case 'favorites':
          // TODO: お気に入り機能の実装
          // localStorageからお気に入りIDを取得して表示
          fetchedImages = []
          break
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
  }
}
