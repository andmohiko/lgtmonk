import type {
  CreateImageDto,
  Image,
  ImageId,
  UpdateImageDto,
} from '@lgtmonk/common'
import { imageCollection } from '@lgtmonk/common'
import type { Unsubscribe } from 'firebase/firestore'
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  increment,
  limit,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
  where,
} from 'firebase/firestore'

import { db } from '@/lib/firebase'
import { convertDate } from '@/utils/convertDate'

// 日付変換が必要なカラムを定義
const dateColumns = ['createdAt', 'updatedAt'] as const satisfies Array<string>

// 1ページあたりの取得件数を定数で定義
export const IMAGES_PAGE_SIZE = 50

/**
 * 最新順で画像を取得
 */
export const fetchImagesOperation = async (
  pageSize: number = IMAGES_PAGE_SIZE,
): Promise<Array<Image>> => {
  const snapshot = await getDocs(
    query(
      collection(db, imageCollection),
      orderBy('createdAt', 'desc'),
      limit(pageSize),
    ),
  )

  return snapshot.docs.map((doc) => ({
    imageId: doc.id,
    ...convertDate(doc.data(), dateColumns),
  })) as Array<Image>
}

/**
 * キーワードで画像を検索
 */
export const fetchImagesByKeywordOperation = async (
  keyword: string,
  pageSize: number = IMAGES_PAGE_SIZE,
): Promise<Array<Image>> => {
  const snapshot = await getDocs(
    query(
      collection(db, imageCollection),
      where('keyword', '==', keyword),
      orderBy('createdAt', 'desc'),
      limit(pageSize),
    ),
  )

  return snapshot.docs.map((doc) => ({
    imageId: doc.id,
    ...convertDate(doc.data(), dateColumns),
  })) as Array<Image>
}

/**
 * ランダムに画像を取得
 * 注: Firestoreには真のランダム取得がないため、全件取得後にシャッフル
 * 本番環境では工夫が必要（例: ランダムフィールドを追加するなど）
 */
export const fetchRandomImagesOperation = async (
  pageSize: number = IMAGES_PAGE_SIZE,
): Promise<Array<Image>> => {
  const snapshot = await getDocs(
    query(collection(db, imageCollection), limit(pageSize * 2)),
  )

  const images = snapshot.docs.map((doc) => ({
    imageId: doc.id,
    ...convertDate(doc.data(), dateColumns),
  })) as Array<Image>

  // シャッフル（Fisher-Yatesアルゴリズム）
  for (let i = images.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[images[i], images[j]] = [images[j], images[i]]
  }

  return images.slice(0, pageSize)
}

/**
 * 単一画像をリアルタイム購読
 */
export const subscribeImageOperation = (
  imageId: ImageId,
  setter: (image: Image | null) => void,
): Unsubscribe => {
  const unsubscribe = onSnapshot(
    doc(db, imageCollection, imageId),
    (snapshot) => {
      const data = snapshot.data()
      if (!data) {
        setter(null)
        return
      }
      const image = {
        imageId: snapshot.id,
        ...convertDate(data, dateColumns),
      } as Image
      setter(image)
    },
  )
  return unsubscribe
}

/**
 * 画像を作成（IDは自動生成）
 */
export const createImageOperation = async (
  dto: CreateImageDto,
): Promise<ImageId> => {
  const docRef = await addDoc(collection(db, imageCollection), dto)
  return docRef.id
}

/**
 * 画像を更新
 */
export const updateImageOperation = async (
  imageId: ImageId,
  dto: UpdateImageDto,
): Promise<void> => {
  await updateDoc(doc(db, imageCollection, imageId), dto)
}

/**
 * コピー数をインクリメント
 */
export const incrementCopiedCountOperation = async (
  imageId: ImageId,
): Promise<void> => {
  await updateDoc(doc(db, imageCollection, imageId), {
    copiedCount: increment(1),
  })
}

/**
 * 表示回数をインクリメント
 */
export const incrementImpressionCountOperation = async (
  imageId: ImageId,
): Promise<void> => {
  await updateDoc(doc(db, imageCollection, imageId), {
    impressionCount: increment(1),
  })
}

/**
 * 画像が存在するかチェック
 */
export const isExistsImageOperation = async (
  imageId: ImageId,
): Promise<boolean> => {
  const docSnap = await getDoc(doc(db, imageCollection, imageId))
  return docSnap.exists()
}
