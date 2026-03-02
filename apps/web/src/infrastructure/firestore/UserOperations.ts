import type {
  CreateUserDto,
  UpdateUserDto,
  User,
  UserId,
} from '@lgtmonk/common'
import { userCollection } from '@lgtmonk/common'
import type { Unsubscribe } from 'firebase/firestore'
import { doc, getDoc, onSnapshot, setDoc, updateDoc } from 'firebase/firestore'

import { db } from '@/lib/firebase'
import { convertDate } from '@/utils/convertDate'

// 日付変換が必要なカラムを定義
const dateColumns = ['createdAt'] as const satisfies Array<string>

/**
 * ユーザーをIDで取得
 */
export const fetchUserOperation = async (
  userId: UserId,
): Promise<User | null> => {
  const docSnap = await getDoc(doc(db, userCollection, userId))
  if (!docSnap.exists()) {
    return null
  }

  return {
    userId: docSnap.id,
    ...convertDate(docSnap.data(), dateColumns),
  } as User
}

/**
 * ユーザーをリアルタイム購読
 */
export const subscribeUserOperation = (
  userId: UserId,
  setter: (user: User | null) => void,
): Unsubscribe => {
  const unsubscribe = onSnapshot(
    doc(db, userCollection, userId),
    (snapshot) => {
      const data = snapshot.data()
      if (!data) {
        setter(null)
        return
      }
      const user = {
        userId: snapshot.id,
        ...convertDate(data, dateColumns),
      } as User
      setter(user)
    },
  )
  return unsubscribe
}

/**
 * ユーザーを作成（IDを指定）
 */
export const createUserOperation = async (
  userId: UserId,
  dto: CreateUserDto,
): Promise<void> => {
  await setDoc(doc(db, userCollection, userId), dto)
}

/**
 * ユーザーを更新
 */
export const updateUserOperation = async (
  userId: UserId,
  dto: UpdateUserDto,
): Promise<void> => {
  await updateDoc(doc(db, userCollection, userId), dto)
}

/**
 * ユーザーが存在するかチェック
 */
export const isExistsUserOperation = async (
  userId: UserId,
): Promise<boolean> => {
  const docSnap = await getDoc(doc(db, userCollection, userId))
  return docSnap.exists()
}
