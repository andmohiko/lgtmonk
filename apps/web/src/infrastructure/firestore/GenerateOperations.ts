import type {
  CreateGenerateDto,
  Generate,
  GenerateId,
  UserId,
} from '@lgtmonk/common'
import { generateCollection, userCollection } from '@lgtmonk/common'
import type { Unsubscribe } from 'firebase/firestore'
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  setDoc,
} from 'firebase/firestore'

import { db } from '@/lib/firebase'
import { convertDate } from '@/utils/convertDate'

// 日付変換が必要なカラムを定義
const dateColumns = ['createdAt'] as const satisfies Array<string>

/**
 * 生成履歴を取得
 */
export const fetchGeneratesOperation = async (
  userId: UserId,
  pageSize = 50,
): Promise<Array<Generate>> => {
  const snapshot = await getDocs(
    query(
      collection(db, userCollection, userId, generateCollection),
      orderBy('createdAt', 'desc'),
      limit(pageSize),
    ),
  )

  return snapshot.docs.map((doc) => ({
    generateId: doc.id,
    ...convertDate(doc.data(), dateColumns),
  })) as Array<Generate>
}

/**
 * 生成履歴をリアルタイム購読
 */
export const subscribeGeneratesOperation = (
  userId: UserId,
  pageSize: number,
  setter: (generates: Array<Generate>) => void,
): Unsubscribe => {
  const unsubscribe = onSnapshot(
    query(
      collection(db, userCollection, userId, generateCollection),
      orderBy('createdAt', 'desc'),
      limit(pageSize),
    ),
    (snapshot) => {
      const generates = snapshot.docs.map((doc) => ({
        generateId: doc.id,
        ...convertDate(doc.data(), dateColumns),
      })) as Array<Generate>
      setter(generates)
    },
  )
  return unsubscribe
}

/**
 * 生成履歴を作成（画像IDをドキュメントIDとして使用）
 */
export const createGenerateOperation = async (
  userId: UserId,
  generateId: GenerateId,
  dto: CreateGenerateDto,
): Promise<void> => {
  await setDoc(
    doc(db, userCollection, userId, generateCollection, generateId),
    dto,
  )
}

/**
 * 生成履歴を削除
 */
export const deleteGenerateOperation = async (
  userId: UserId,
  generateId: GenerateId,
): Promise<void> => {
  await deleteDoc(
    doc(db, userCollection, userId, generateCollection, generateId),
  )
}
