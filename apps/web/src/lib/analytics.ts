import { logEvent } from 'firebase/analytics'
import { analytics } from './firebase'

/**
 * ページビューを記録する
 * @param pagePath - ページパス（例: '/generate', '/mypage'）
 * @param pageTitle - ページタイトル
 */
export const logPageView = (pagePath: string, pageTitle?: string) => {
  if (!analytics) return

  logEvent(analytics, 'page_view', {
    page_path: pagePath,
    page_title: pageTitle,
  })
}

/**
 * 画像コピーイベントを記録する
 * @param imageId - 画像ID
 * @param keyword - 検索キーワード（あれば）
 */
export const logImageCopy = (imageId: string, keyword?: string) => {
  if (!analytics) return

  logEvent(analytics, 'image_copy', {
    image_id: imageId,
    keyword: keyword || '',
  })
}

/**
 * 画像生成イベントを記録する
 * @param method - 生成方法（'upload' または 'search'）
 * @param keyword - 検索キーワード（検索の場合のみ）
 */
export const logImageGenerate = (
  method: 'upload' | 'search',
  keyword?: string,
) => {
  if (!analytics) return

  logEvent(analytics, 'image_generate', {
    method,
    keyword: keyword || '',
  })
}

/**
 * タブ切り替えイベントを記録する
 * @param tabName - タブ名（'latest', 'random', 'favorites'）
 */
export const logTabChange = (tabName: string) => {
  if (!analytics) return

  logEvent(analytics, 'tab_change', {
    tab_name: tabName,
  })
}

/**
 * お気に入り追加/削除イベントを記録する
 * @param action - アクション（'add' または 'remove'）
 * @param imageId - 画像ID
 */
export const logFavorite = (action: 'add' | 'remove', imageId: string) => {
  if (!analytics) return

  logEvent(analytics, 'favorite', {
    action,
    image_id: imageId,
  })
}

/**
 * 検索イベントを記録する
 * @param keyword - 検索キーワード
 * @param resultCount - 検索結果件数
 */
export const logSearch = (keyword: string, resultCount: number) => {
  if (!analytics) return

  logEvent(analytics, 'search', {
    search_term: keyword,
    result_count: resultCount,
  })
}
