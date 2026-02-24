import type { FieldValue } from 'firebase/firestore'
import type { ImageId } from './Image'

// サブコレクション名を定数として定義
export const generateCollection = 'generates' as const

// ID型のエイリアス（ImageIdと同じ）
export type GenerateId = ImageId

// メインのEntity型（Firestoreから取得したデータ）
export type Generate = {
  generateId: GenerateId
  createdAt: Date
  imageUrl: string
}

// 作成用DTO（IDとタイムスタンプを除く）
export type CreateGenerateDto = Omit<Generate, 'generateId' | 'createdAt'> & {
  createdAt: FieldValue // serverTimestamp()を使用
}

// 生成履歴は更新しないため、UpdateDtoは定義しない
