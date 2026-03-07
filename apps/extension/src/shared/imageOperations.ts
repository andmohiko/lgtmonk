import type { Image, ImageId } from './types/Image'
import { imageCollection } from './types/Image'
import type { DocumentSnapshot } from 'firebase/firestore'
import { collection, getDocs, query, limit, doc, updateDoc, increment, where, orderBy } from 'firebase/firestore'
import { db } from './firebase'
import { convertDate } from '../utils/convertDate'

const dateColumns = ['createdAt', 'updatedAt'] as const

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
 * - pageSize * 1.5件の独立したpivot値を生成して取得（6件必要なら10件取得）
 * - 重複を排除してpageSize件を返却
 * - 既存データ（randomフィールドなし）への後方互換性あり
 * @param pageSize - 取得する画像の枚数（デフォルト: 6）
 * @returns ランダムな画像の配列
 */
export const fetchRandomImagesOperation = async (
  pageSize: number = 6,
): Promise<Array<Image>> => {
  // 重複回避のため、pageSize * 1.5件取得（6件必要なら10件取得）
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
