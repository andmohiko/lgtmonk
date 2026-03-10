import {
  deleteObject,
  getDownloadURL,
  ref,
  uploadBytesResumable,
} from 'firebase/storage'

import { storage } from '@/lib/firebase'

export const uploadImage = async (
  path: string,
  blob: Blob,
): Promise<string> => {
  const imageRef = ref(storage, path)
  const snapShot = await uploadBytesResumable(imageRef, blob)
  return getDownloadURL(snapShot.ref)
}

/**
 * Cloud StorageからURLを元に画像を削除
 * @param imageUrl - 削除する画像のURL
 */
export const deleteImageFromStorage = async (
  imageUrl: string,
): Promise<void> => {
  try {
    console.log('🗑️ 削除対象のURL:', imageUrl)

    // URLからパスを抽出
    // 例: https://storage.googleapis.com/bucket-name/images/xxx.webp
    // または https://firebasestorage.googleapis.com/v0/b/bucket-name/o/images%2Fxxx.webp?token=...
    const url = new URL(imageUrl)
    console.log('🔍 ホスト名:', url.hostname)
    console.log('🔍 パス名:', url.pathname)

    let path: string

    if (url.hostname === 'storage.googleapis.com') {
      // storage.googleapis.com の場合
      // パス部分から最初のスラッシュとバケット名を除去
      const pathParts = url.pathname.split('/')
      const encodedPath = pathParts.slice(2).join('/') // バケット名の後のパスを取得
      // URLエンコードされているのでデコード
      path = decodeURIComponent(encodedPath)
      console.log('📁 抽出したパス (storage.googleapis.com):', path)
    } else if (url.hostname === 'firebasestorage.googleapis.com') {
      // firebasestorage.googleapis.com の場合
      // /v0/b/{bucket}/o/{path} の形式
      const encodedPath = url.pathname.split('/o/')[1]
      console.log('📝 エンコードされたパス:', encodedPath)
      if (!encodedPath) {
        throw new Error('Invalid Firebase Storage URL')
      }
      // URLエンコードされたパスをデコード（トークンパラメータを除去）
      path = decodeURIComponent(encodedPath.split('?')[0])
      console.log('📁 抽出したパス (firebasestorage.googleapis.com):', path)
    } else {
      throw new Error('Unsupported storage URL format')
    }

    // 参照を作成して削除
    console.log('🎯 最終的なパス:', path)
    const storageRef = ref(storage, path)
    console.log('🔑 Storage参照のfullPath:', storageRef.fullPath)
    await deleteObject(storageRef)
    console.log('✅ 削除成功')
  } catch (error) {
    console.error('❌ Cloud Storageからの画像削除に失敗しました:', error)
    throw error
  }
}
