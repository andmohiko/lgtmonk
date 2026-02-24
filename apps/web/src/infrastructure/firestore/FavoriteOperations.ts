import type {
  CreateFavoriteDto,
  Favorite,
  FavoriteId,
  UserId,
} from '@lgtmonk/common'
import { favoriteCollection, userCollection } from '@lgtmonk/common'
import type { Unsubscribe } from 'firebase/firestore'
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
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
 * お気に入りを取得
 */
export const fetchFavoritesOperation = async (
  userId: UserId,
  pageSize = 50,
): Promise<Array<Favorite>> => {
  const snapshot = await getDocs(
    query(
      collection(db, userCollection, userId, favoriteCollection),
      orderBy('createdAt', 'desc'),
      limit(pageSize),
    ),
  )

  return snapshot.docs.map((doc) => ({
    favoriteId: doc.id,
    ...convertDate(doc.data(), dateColumns),
  })) as Array<Favorite>
}

/**
 * お気に入りをリアルタイム購読
 */
export const subscribeFavoritesOperation = (
  userId: UserId,
  pageSize: number,
  setter: (favorites: Array<Favorite>) => void,
): Unsubscribe => {
  const unsubscribe = onSnapshot(
    query(
      collection(db, userCollection, userId, favoriteCollection),
      orderBy('createdAt', 'desc'),
      limit(pageSize),
    ),
    (snapshot) => {
      const favorites = snapshot.docs.map((doc) => ({
        favoriteId: doc.id,
        ...convertDate(doc.data(), dateColumns),
      })) as Array<Favorite>
      setter(favorites)
    },
  )
  return unsubscribe
}

/**
 * お気に入りを作成（画像IDをドキュメントIDとして使用）
 */
export const createFavoriteOperation = async (
  userId: UserId,
  favoriteId: FavoriteId,
  dto: CreateFavoriteDto,
): Promise<void> => {
  await setDoc(
    doc(db, userCollection, userId, favoriteCollection, favoriteId),
    dto,
  )
}

/**
 * お気に入りを削除
 */
export const deleteFavoriteOperation = async (
  userId: UserId,
  favoriteId: FavoriteId,
): Promise<void> => {
  await deleteDoc(
    doc(db, userCollection, userId, favoriteCollection, favoriteId),
  )
}

/**
 * お気に入りが存在するかチェック
 */
export const isExistsFavoriteOperation = async (
  userId: UserId,
  favoriteId: FavoriteId,
): Promise<boolean> => {
  const docSnap = await getDoc(
    doc(db, userCollection, userId, favoriteCollection, favoriteId),
  )
  return docSnap.exists()
}
