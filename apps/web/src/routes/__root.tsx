import {
  createRootRoute,
  HeadContent,
  Outlet,
  Scripts,
} from '@tanstack/react-router'

import { Header } from '../components/layout/Header'
import { usePageTracking } from '../hooks/usePageTracking'
import appCss from '../styles.css?url'

export const Route = createRootRoute({
  head: () => ({
    meta: [
      {
        charSet: 'utf-8',
      },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1',
      },
      {
        title: 'LGTMonk - LGTM Image Generator',
      },
      {
        name: 'description',
        content: 'LGTMの僧侶、LGTMonk。LGTM画像を生成します。',
      },
      // OGP meta tags
      {
        property: 'og:title',
        content: 'LGTMonk - LGTM Image Generator',
      },
      {
        property: 'og:description',
        content: 'LGTMの僧侶、LGTMonk。LGTM画像を生成します。',
      },
      {
        property: 'og:type',
        content: 'website',
      },
      {
        property: 'og:site_name',
        content: 'LGTMonk',
      },
      {
        property: 'og:image',
        content: '/ogp.webp',
      },
      {
        property: 'og:image:width',
        content: '1200',
      },
      {
        property: 'og:image:height',
        content: '630',
      },
      // Twitter Card meta tags
      {
        name: 'twitter:card',
        content: 'summary_large_image',
      },
      {
        name: 'twitter:image',
        content: '/ogp.webp',
      },
      {
        name: 'twitter:title',
        content: 'LGTMonk - LGTM Image Generator',
      },
      {
        name: 'twitter:description',
        content: 'LGTM画像の僧侶、LGTMonk。LGTM画像を生成します。',
      },
    ],
    links: [
      {
        rel: 'stylesheet',
        href: appCss,
      },
    ],
  }),
  component: RootLayout,
  shellComponent: RootDocument,
})

function RootLayout() {
  // ページ遷移の追跡
  usePageTracking()

  return (
    <div className="flex min-h-screen flex-col bg-[#0d1117]">
      <Header />
      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  )
}

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body suppressHydrationWarning>
        {children}
        <Scripts />
      </body>
    </html>
  )
}
