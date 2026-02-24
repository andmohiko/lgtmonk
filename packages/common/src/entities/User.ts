import type { FieldValue } from 'firebase/firestore'
import type { Uid } from './Auth'

// コレクション名を定数として定義
export const userCollection = 'users' as const

// ID型のエイリアス
export type UserId = Uid

// メインのEntity型（Firestoreから取得したデータ）
export type User = {
  userId: UserId
  createdAt: Date
  displayName: string
  email: string
}

// 作成用DTO（IDとタイムスタンプを除く）
export type CreateUserDto = Omit<User, 'userId' | 'createdAt'> & {
  createdAt: FieldValue // serverTimestamp()を使用
}

// 更新用DTO（更新可能なフィールドのみ）
export type UpdateUserDto = {
  displayName?: User['displayName']
  email?: User['email']
}
