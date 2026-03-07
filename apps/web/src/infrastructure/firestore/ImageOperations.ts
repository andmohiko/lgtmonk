import type {
  CreateImageDto,
  Image,
  ImageId,
  UpdateImageDto,
} from '@lgtmonk/common'
import { imageCollection } from '@lgtmonk/common'
import type { DocumentSnapshot, Unsubscribe } from 'firebase/firestore'
import {
  addDoc,
  collection,
  deleteDoc,
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
export const IMAGES_PAGE_SIZE = 20

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
 * pivotの直後のドキュメントを1件取得する
 * 終端を超えた場合はpivot=0でラップアラウンドする
 */
const fetchOneAfterPivot = async (pivot: number): Promise<DocumentSnapshot | null> => {
  const q = query(
    collection(db, imageCollection),
    where('random', '>=', pivot),
    orderBy('random'),
    limit(1),
  )
  const snap = await getDocs(q)

  if (!snap.empty) {
    return snap.docs[0]
  }

  // ラップアラウンド
  const q2 = query(
    collection(db, imageCollection),
    orderBy('random'),
    limit(1),
  )
  const snap2 = await getDocs(q2)
  return snap2.empty ? null : snap2.docs[0]
}

/**
 * ランダムに画像を取得
 * randomフィールド（0〜1の一様乱数）を活用した最適化アルゴリズム
 * - pageSize * 1.5件の独立したpivot値を生成して取得
 * - 重複を排除してpageSize件を返却
 * - 既存データ（randomフィールドなし）への後方互換性あり
 */
export const fetchRandomImagesOperation = async (
  pageSize: number = IMAGES_PAGE_SIZE,
): Promise<Array<Image>> => {
  // 重複回避のため、pageSize * 1.5件取得（20件必要なら30件取得）
  const fetchCount = Math.ceil(pageSize * 1.5)
  const fetchedIds = new Set<string>()
  const results: Array<DocumentSnapshot> = []

  // 最大試行回数（無限ループ防止）
  const maxAttempts = fetchCount * 2
  let attempts = 0

  while (results.length < fetchCount && attempts < maxAttempts) {
    const pivot = Math.random()
    const docSnapshot = await fetchOneAfterPivot(pivot)

    if (docSnapshot && !fetchedIds.has(docSnapshot.id)) {
      fetchedIds.add(docSnapshot.id)
      results.push(docSnapshot)
    }

    attempts++
  }

  // DocumentSnapshotをImage型に変換
  const images = results.map((doc) => {
    const data = doc.data()
    if (!data) {
      throw new Error('Document data is undefined')
    }
    return {
      imageId: doc.id,
      ...convertDate(data, dateColumns),
    }
  }) as Array<Image>

  // 重複排除後、pageSize件に制限して返却
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

/**
 * 画像を削除
 */
export const deleteImageOperation = async (
  imageId: ImageId,
): Promise<void> => {
  await deleteDoc(doc(db, imageCollection, imageId))
}
