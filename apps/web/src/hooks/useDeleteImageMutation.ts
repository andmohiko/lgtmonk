import type { ImageId } from '@lgtmonk/common'
import { useState } from 'react'
import { deleteImageOperation } from '@/infrastructure/firestore/ImageOperations'
import { deleteImageFromStorage } from '@/infrastructure/storage/UploadOperations'

/**
 * 画像削除用のミューテーションフック
 */
export const useDeleteImageMutation = () => {
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const deleteImage = async (imageId: ImageId, imageUrl: string) => {
    setIsDeleting(true)
    setError(null)

    try {
      // Cloud Storageから画像を削除
      await deleteImageFromStorage(imageUrl)

      // Firestoreのドキュメントを削除
      await deleteImageOperation(imageId)
    } catch (e) {
      const errorMessage =
        e instanceof Error ? e.message : '画像の削除に失敗しました'
      setError(errorMessage)
      throw e
    } finally {
      setIsDeleting(false)
    }
  }

  return { deleteImage, isDeleting, error }
}
