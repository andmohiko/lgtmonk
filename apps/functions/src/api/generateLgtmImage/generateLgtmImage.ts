import type { Request, Response } from 'express'
import {
  generateLgtmImageFromBase64,
  generateLgtmImageFromUrl,
} from '../../useCases/generateLgtmImage'

type GenerateLgtmImageRequestBody = {
  imageUrl?: string // 外部URLから生成する場合
  base64Image?: string // Base64から生成する場合
  keyword: string // 検索キーワード（Firestoreに保存用）
}

/**
 * LGTM画像を生成するAPIエンドポイント
 *
 * リクエストボディ:
 * - imageUrl: 外部画像のURL（imageUrlかbase64Imageのどちらか必須）
 * - base64Image: Base64エンコードされた画像データ（imageUrlかbase64Imageのどちらか必須）
 * - keyword: 検索キーワード（Firestoreに保存用）
 *
 * レスポンス:
 * - imageUrl: 生成されたLGTM画像の公開URL
 */
export const handle = async (req: Request, res: Response) => {
  try {
    const { imageUrl, base64Image, keyword } =
      req.body as GenerateLgtmImageRequestBody

    // バリデーション
    if (!imageUrl && !base64Image) {
      return res.status(400).json({
        error: 'imageUrl or base64Image is required',
      })
    }

    if (!keyword || typeof keyword !== 'string' || keyword.trim().length === 0) {
      return res.status(400).json({
        error: 'keyword is required',
      })
    }

    if (keyword.length > 100) {
      return res.status(400).json({
        error: 'keyword must be 100 characters or less',
      })
    }

    console.log('[generateLgtmImage] Request:', {
      hasImageUrl: !!imageUrl,
      hasBase64Image: !!base64Image,
      keyword: keyword.trim(),
    })

    // LGTM画像を生成
    let generatedImageUrl: string

    if (imageUrl) {
      // 外部URLから生成
      if (typeof imageUrl !== 'string' || imageUrl.trim().length === 0) {
        return res.status(400).json({
          error: 'imageUrl must be a valid URL string',
        })
      }

      // URLの妥当性チェック
      try {
        new URL(imageUrl)
      } catch {
        return res.status(400).json({
          error: 'imageUrl must be a valid URL',
        })
      }

      generatedImageUrl = await generateLgtmImageFromUrl(
        imageUrl.trim(),
        keyword.trim(),
      )
    } else {
      // Base64から生成
      if (
        typeof base64Image !== 'string' ||
        base64Image.trim().length === 0
      ) {
        return res.status(400).json({
          error: 'base64Image must be a valid base64 string',
        })
      }

      // Base64のフォーマットチェック
      if (!base64Image.match(/^data:image\/(jpeg|jpg|png|gif|webp);base64,/)) {
        return res.status(400).json({
          error:
            'base64Image must start with data:image/(jpeg|jpg|png|gif|webp);base64,',
        })
      }

      generatedImageUrl = await generateLgtmImageFromBase64(base64Image.trim())
    }

    console.log('[generateLgtmImage] Successfully generated LGTM image', {
      imageUrl: generatedImageUrl,
    })

    return res.status(200).json({
      imageUrl: generatedImageUrl,
    })
  } catch (error) {
    console.error('[generateLgtmImage] Error:', error)

    // エラーの詳細をログに記録
    if (error instanceof Error) {
      console.error('[generateLgtmImage] Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack,
      })
    }

    return res.status(500).json({
      error:
        error instanceof Error
          ? error.message
          : 'LGTM画像の生成に失敗しました。もう一度お試しください。',
    })
  }
}
