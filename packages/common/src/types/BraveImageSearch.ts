/**
 * Brave Search API - Image Search のレスポンス型定義
 * API仕様: https://api-dashboard.search.brave.com/app/documentation/image-search
 */

export type BraveImageSearchItem = {
  type: 'image_result'
  title: string
  url: string // 画像が掲載されているページのURL
  source: string // ドメイン名
  thumbnail: {
    src: string // プロキシ経由のサムネイルURL（幅500px）
  }
  properties: {
    url: string // 画像ファイルの直接URL（オリジナル）
    format: string // 'jpeg', 'png', 'webp' など
  }
  meta_url: {
    hostname: string // ソースドメイン
  }
}

export type BraveImageSearchResponse = {
  type: 'images'
  results: Array<BraveImageSearchItem>
}
