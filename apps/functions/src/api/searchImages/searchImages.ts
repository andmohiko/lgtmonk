import type { BraveImageSearchResponse } from '@lgtmonk/common'
import type { Request, Response } from 'express'

const BRAVE_API_KEY = process.env.BRAVE_SEARCH_API_KEY
const BRAVE_IMAGE_SEARCH_URL =
  'https://api.search.brave.com/res/v1/images/search'

type SearchResultImage = {
  thumbnailUrl: string
  imageUrl: string
  title: string
  width: number
  height: number
}

/**
 * Brave Search APIを使用して画像検索を行う
 */
export const handle = async (req: Request, res: Response) => {
  try {
    const { keyword, count = 20 } = req.query

    // バリデーション
    if (!BRAVE_API_KEY) {
      return res.status(500).json({
        error: 'Brave Search API key is not configured',
      })
    }

    if (
      !keyword ||
      typeof keyword !== 'string' ||
      keyword.trim().length === 0
    ) {
      return res.status(400).json({
        error: 'Keyword is required',
      })
    }

    if (keyword.length > 100) {
      return res.status(400).json({
        error: 'Keyword must be 100 characters or less',
      })
    }

    const searchCount =
      typeof count === 'string' ? Number.parseInt(count, 10) : 20

    // Brave Search APIを呼び出し
    const params = new URLSearchParams({
      q: keyword.trim(),
      count: searchCount.toString(),
      safesearch: 'strict',
      spellcheck: '1',
    })

    const apiUrl = `${BRAVE_IMAGE_SEARCH_URL}?${params}`

    console.log('[searchImages] Request:', {
      keyword: keyword.trim(),
      count: searchCount,
    })

    const response = await fetch(apiUrl, {
      headers: {
        'X-Subscription-Token': BRAVE_API_KEY,
        Accept: 'application/json',
      },
    })

    if (!response.ok) {
      let errorMessage = `Brave Image Search failed: ${response.statusText}`

      try {
        const errorData = await response.json()
        console.error('[searchImages] Brave API Error:', errorData)

        switch (response.status) {
          case 401:
            errorMessage = 'Brave Search APIキーが無効です'
            break
          case 403:
            errorMessage =
              'Brave Search APIへのアクセスが拒否されました。プランを確認してください。'
            break
          case 422:
            errorMessage = '検索パラメータが不正です'
            break
          case 429:
            errorMessage =
              'APIレートリミットを超過しました。しばらく待ってから再試行してください。'
            break
          default:
            if (errorData.message) {
              errorMessage = `Brave API Error: ${errorData.message}`
            }
        }
      } catch {
        // JSONパースに失敗した場合は元のエラーメッセージを使用
      }

      return res.status(response.status).json({ error: errorMessage })
    }

    const responseData: BraveImageSearchResponse = await response.json()

    if (!responseData.results || responseData.results.length === 0) {
      console.log(`[searchImages] No results found for "${keyword}"`)
      return res.json([])
    }

    const results: Array<SearchResultImage> = responseData.results.map(
      (item) => ({
        thumbnailUrl: item.thumbnail.src,
        imageUrl: item.properties.url,
        title: item.title,
        width: 500,
        height: 500,
      }),
    )

    console.log(
      `[searchImages] Found ${results.length} images for "${keyword}"`,
    )

    return res.json(results)
  } catch (error) {
    console.error('[searchImages] Error:', error)
    return res.status(500).json({
      error:
        error instanceof Error
          ? error.message
          : '画像検索に失敗しました。もう一度お試しください。',
    })
  }
}
