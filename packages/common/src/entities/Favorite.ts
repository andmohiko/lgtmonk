import type { FieldValue } from 'firebase/firestore'
import type { ImageId } from './Image'

// サブコレクション名を定数として定義
export const favoriteCollection = 'favorites' as const

// ID型のエイリアス（ImageIdと同じ）
export type FavoriteId = ImageId

// メインのEntity型（Firestoreから取得したデータ）
export type Favorite = {
  favoriteId: FavoriteId
  createdAt: Date
  imageUrl: string
}

// 作成用DTO（IDとタイムスタンプを除く）
export type CreateFavoriteDto = Omit<Favorite, 'favoriteId' | 'createdAt'> & {
  createdAt: FieldValue // serverTimestamp()を使用
}

// お気に入りは更新しないため、UpdateDtoは定義しない
