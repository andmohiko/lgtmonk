// Chrome拡張用のImage型定義（packages/common/src/entities/Image.ts から移植）

export const imageCollection = 'images' as const

export type ImageId = string

export type Image = {
  imageId: ImageId
  copiedCount: number
  createdAt: Date
  createdBy: string | null
  imageUrl: string
  impressionCount: number
  keyword: string
  random?: number // ランダム取得用フィールド（0〜1の一様乱数、既存データには存在しない可能性あり）
  updatedAt: Date
}
