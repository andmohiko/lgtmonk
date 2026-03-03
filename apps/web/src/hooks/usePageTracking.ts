import { useRouter } from '@tanstack/react-router'
import { useEffect } from 'react'
import { logPageView } from '@/lib/analytics'

/**
 * ページ遷移を追跡するカスタムフック
 * TanStack Routerのルート変更を検知してAnalyticsにページビューを送信する
 */
export const usePageTracking = () => {
  const router = useRouter()

  useEffect(() => {
    // 初回ページロード時のページビューを記録
    const currentPath = window.location.pathname
    logPageView(currentPath, document.title)

    // ルート変更を監視
    const unsubscribe = router.subscribe('onResolved', () => {
      const path = window.location.pathname
      logPageView(path, document.title)
    })

    return () => {
      unsubscribe()
    }
  }, [router])
}
