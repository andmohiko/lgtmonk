import { useState, useCallback, useEffect } from 'react'
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
  useEffect(() => {
    fetchImages()
  }, [fetchImages])

  return {
    images,
    isLoading,
    error,
    refetch: fetchImages,
  }
}
