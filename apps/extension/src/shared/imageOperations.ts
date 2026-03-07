import type { Image, ImageId } from './types/Image'
import { imageCollection } from './types/Image'
import { collection, getDocs, query, limit, doc, updateDoc, increment } from 'firebase/firestore'
import { db } from './firebase'
import { convertDate } from '../utils/convertDate'

const dateColumns = ['createdAt', 'updatedAt'] as const

/**
 * ランダムに画像を取得（Fisher-Yates シャッフル）
 * @param pageSize - 取得する画像の枚数（デフォルト: 6）
 * @returns ランダムな画像の配列
 */
export const fetchRandomImagesOperation = async (
  pageSize: number = 6,
): Promise<Array<Image>> => {
  // ページサイズの2倍取得してシャッフル
  const snapshot = await getDocs(
    query(collection(db, imageCollection), limit(pageSize * 2)),
  )

  const images = snapshot.docs.map((doc) => ({
    imageId: doc.id,
    ...convertDate(doc.data(), dateColumns),
  })) as Array<Image>

  // Fisher-Yates アルゴリズムでシャッフル
  for (let i = images.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[images[i], images[j]] = [images[j], images[i]]
  }

  return images.slice(0, pageSize)
}

/**
 * コピー数をインクリメント
 * @param imageId - 画像ID
 */
export const incrementCopiedCountOperation = async (
  imageId: ImageId,
): Promise<void> => {
  await updateDoc(doc(db, imageCollection, imageId), {
    copiedCount: increment(1),
  })
}
