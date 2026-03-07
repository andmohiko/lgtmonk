import type { FieldValue } from 'firebase/firestore'
import type { UserId } from './User'

// コレクション名を定数として定義
export const imageCollection = 'images' as const

// ID型の定義
export type ImageId = string

// メインのEntity型（Firestoreから取得したデータ）
export type Image = {
  imageId: ImageId
  copiedCount: number
  createdAt: Date
  createdBy: UserId | null // 生成者のuid（未ログイン時はnull）
  imageUrl: string
  impressionCount: number
  keyword: string // 生成時の検索キーワード（アップロード時は空文字）
  random?: number // ランダム取得用フィールド（0〜1の一様乱数、既存データには存在しない可能性あり）
  updatedAt: Date
}

// 作成用DTO（IDとタイムスタンプを除く）
export type CreateImageDto = Omit<
  Image,
  'imageId' | 'createdAt' | 'updatedAt' | 'random'
> & {
  createdAt: FieldValue // serverTimestamp()を使用
  random: number // ランダム取得用（0〜1の一様乱数）
  updatedAt: FieldValue
}

// 更新用DTO（更新可能なフィールドのみ）
export type UpdateImageDto = {
  copiedCount?: Image['copiedCount']
  impressionCount?: Image['impressionCount']
  keyword?: Image['keyword']
  updatedAt: FieldValue // updatedAtは必須
}
