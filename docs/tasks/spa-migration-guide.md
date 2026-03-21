# LGTMonk SSR → SPA 移行ガイド（TanStack Start SPA Mode）

## 概要

LGTMonkアプリケーションを**TanStack Start（SSRモード）**から**TanStack Start（SPAモード）**に移行し、**Firebase Hosting**にデプロイするための詳細ガイドです。

### 移行の背景

- **現状**: TanStack Start（SSR対応）をVercelにデプロイ
- **課題**: SSRの機能をほとんど使用していないにも関わらず、SSRインフラのコストと複雑さが発生
- **目標**: TanStack StartのSPAモードを使い、静的ホスティング（Firebase Hosting）で配信

### 移行方針

| 項目 | 現状 | 移行後 |
|------|------|--------|
| フレームワーク | TanStack Start (SSR mode) | **TanStack Start (SPA mode)** |
| ルーティング | TanStack Router (SSR対応) | TanStack Router (client-only) |
| デプロイ先 | Vercel | Firebase Hosting |
| OGP画像 | サーバーサイドレンダリング | 静的なOGP画像 |
| ビルド出力 | `dist/client/` + `dist/server/` | `dist/client/` のみ |

### なぜ TanStack Start SPA Mode を選択するか

TanStack Startを完全に削除してVite + React Routerに移行する方法もありますが、**SPAモードを使う方が圧倒的にメリットが大きい**です：

| 項目 | SPA Mode | 完全移行（Vite + RR） |
|------|----------|---------------------|
| 実装時間 | **< 1時間** | 数日 |
| コード変更量 | **設定ファイルのみ** | 大規模リファクタリング |
| リスク | **極小** | 中〜高 |
| 型安全性 | **維持** | 再構築が必要 |
| ファイルベースルーティング | **維持** | 失われる |
| 将来のSSR/SSG | **簡単に有効化** | 大規模な作り直し |

---

## TanStack Start SPA Mode とは

### 公式ドキュメント

https://tanstack.com/start/latest/docs/framework/react/guide/spa-mode

### 仕組み

1. **ビルド時**: 静的HTMLシェル（`/index.html` または `/_shell.html`）を生成
2. **実行時**: すべてのルートがこのHTMLシェルから起動
3. **サーバー不要**: CDNや静的ホスティングのみで動作
4. **クライアント専用**: `loader` や `beforeLoad` のサーバー実行が無効化

### 設定方法

`vite.config.ts` に数行追加するだけ：

```typescript
export default defineConfig({
  plugins: [
    tanstackStart({
      spa: {
        enabled: true,
      },
    }),
  ],
})
```

---

## 現在のアーキテクチャ分析

### SSR使用状況の確認

LGTMonkアプリケーションは**既にSPAモードと完全に互換性がある**状態です：

✅ **互換性がある理由**:
- サーバー関数（`createServerFn`）を使用していない
- ルートの `loader` や `beforeLoad` フックを使用していない
- すべてのデータフェッチングはクライアント側（Firebase SDK）
- ルート定義は `createFileRoute` + `component` のみ

❌ **現在のSSR使用箇所**:
- メタタグ（OGP、Twitter Card）のサーバーレンダリング
- `__root.tsx` の `head()` 関数

### 影響を受けるファイル

| ファイル | 変更内容 |
|---------|---------|
| `vite.config.ts` | SPA mode を有効化 |
| `src/routes/__root.tsx` | `head()` を削除し、静的HTMLに移行 |
| `index.html` | 新規作成（静的メタタグを含む） |
| `firebase.json` | hosting設定を追加 |
| `vercel.json` | 削除 |
| `api/server.js` | 削除（不要になる） |

**その他のファイルは変更不要！**

---

## 移行手順

### ステップ1: Vite設定の変更

#### ファイル: `apps/web/vite.config.ts`

**変更前**:
```typescript
import { defineConfig } from 'vite'
import tsconfigPaths from 'vite-tsconfig-paths'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const config = defineConfig({
  plugins: [
    tsconfigPaths({ projects: ['./tsconfig.json'] }),
    tailwindcss(),
    tanstackStart(),  // ← ここを変更
    viteReact(),
  ],
  preview: {
    port: process.env.PORT ? parseInt(process.env.PORT) : 8080,
    host: true,
    allowedHosts: true,
  },
  server: {
    host: true,
    allowedHosts: true,
  },
})

export default config
```

**変更後**:
```typescript
import { defineConfig } from 'vite'
import tsconfigPaths from 'vite-tsconfig-paths'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const config = defineConfig({
  plugins: [
    tsconfigPaths({ projects: ['./tsconfig.json'] }),
    tailwindcss(),
    tanstackStart({
      spa: {
        enabled: true,
        prerender: {
          outputPath: '/index.html',  // Firebase Hosting / Cloudflare Pages互換
          crawlLinks: true,
          retryCount: 3,
        },
      },
    }),
    viteReact(),
  ],
  preview: {
    port: process.env.PORT ? parseInt(process.env.PORT) : 8080,
    host: true,
    allowedHosts: true,
  },
  server: {
    host: true,
    allowedHosts: true,
  },
})

export default config
```

**変更点**:
- `tanstackStart()` → `tanstackStart({ spa: { enabled: true } })`
- `prerender.outputPath: '/index.html'` を指定（Firebase Hosting対応）

---

### ステップ2: HTMLテンプレートの作成

#### ファイル: `apps/web/index.html` (新規作成)

現在の `src/routes/__root.tsx` の `head()` 関数を静的HTMLに変換します。

```html
<!DOCTYPE html>
<html lang="ja">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />

    <!-- Primary Meta Tags -->
    <title>LGTMonk - GitHubのLGTM画像ジェネレーター</title>
    <meta name="title" content="LGTMonk - GitHubのLGTM画像ジェネレーター" />
    <meta name="description" content="GitHubのプルリクエストに貼るLGTM画像を、手軽に生成・検索・コピーできるWebアプリケーション。広告なし・完全無料。" />

    <!-- Open Graph / Facebook -->
    <meta property="og:type" content="website" />
    <meta property="og:url" content="https://lgtmonk.web.app/" />
    <meta property="og:title" content="LGTMonk - GitHubのLGTM画像ジェネレーター" />
    <meta property="og:description" content="GitHubのプルリクエストに貼るLGTM画像を、手軽に生成・検索・コピーできるWebアプリケーション。広告なし・完全無料。" />
    <meta property="og:image" content="https://lgtmonk.web.app/ogp.png" />

    <!-- Twitter -->
    <meta property="twitter:card" content="summary_large_image" />
    <meta property="twitter:url" content="https://lgtmonk.web.app/" />
    <meta property="twitter:title" content="LGTMonk - GitHubのLGTM画像ジェネレーター" />
    <meta property="twitter:description" content="GitHubのプルリクエストに貼るLGTM画像を、手軽に生成・検索・コピーできるWebアプリケーション。広告なし・完全無料。" />
    <meta property="twitter:image" content="https://lgtmonk.web.app/ogp.png" />

    <!-- Favicon -->
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />

    <!-- Google Fonts (Noto Sans JP) -->
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500;700&display=swap" rel="stylesheet" />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/entry.client.tsx"></script>
  </body>
</html>
```

**注意事項**:
- OGP画像のURL (`https://lgtmonk.web.app/ogp.png`) は実際のデプロイ先URLに合わせて変更してください
- OGP画像ファイル (`public/ogp.png`) を作成する必要があります

---

### ステップ3: ルートレイアウトの変更

#### ファイル: `apps/web/src/routes/__root.tsx`

`head()` 関数とSSRシェル構造を削除し、シンプルなレイアウトコンポーネントに変更します。

**変更前** (抜粋):
```typescript
export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: 'LGTMonk - GitHubのLGTM画像ジェネレーター' },
      // ... 大量のメタタグ
    ],
    links: [
      // ... フォント読み込み
    ],
  }),
  component: RootComponent,
})

function RootComponent() {
  return (
    <RootDocument>
      <Outlet />
    </RootDocument>
  )
}

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <head>
        <HeadContent />
      </head>
      <body className={notoSansJP.className}>
        {children}
        <Scripts />
      </body>
    </html>
  )
}
```

**変更後**:
```typescript
import { createRootRoute, Outlet } from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/router-devtools'

export const Route = createRootRoute({
  component: RootComponent,
})

function RootComponent() {
  return (
    <>
      <Outlet />
      {import.meta.env.DEV && <TanStackRouterDevtools />}
    </>
  )
}
```

**変更点**:
1. `head()` 関数を削除（`index.html` に移行済み）
2. `RootDocument` を削除（SPAモードでは不要）
3. シンプルなレイアウトのみ残す
4. 開発環境でのみDevtoolsを表示

---

### ステップ4: OGP画像の準備

静的なOGP画像を作成します。

1. **画像の作成**:
   - サイズ: 1200 x 630 px（OGP推奨サイズ）
   - 内容: LGTMonkのロゴ、キャッチコピーなど

2. **配置**:
   ```bash
   # publicディレクトリに配置
   apps/web/public/ogp.png
   ```

3. **Faviconの確認**:
   ```bash
   # 既存のfaviconも確認
   apps/web/public/vite.svg
   apps/web/public/favicon.ico
   ```

---

### ステップ5: Firebase Hosting設定

#### ファイル: `firebase.json`

**変更前**:
```json
{
  "functions": [
    {
      "source": "apps/functions",
      "codebase": "default",
      "ignore": ["node_modules", ".git", "firebase-debug.log", "firebase-debug.*.log"]
    }
  ]
}
```

**変更後**:
```json
{
  "hosting": {
    "public": "apps/web/dist/client",
    "ignore": [
      "firebase.json",
      "**/.*",
      "**/node_modules/**"
    ],
    "rewrites": [
      {
        "source": "**",
        "destination": "/index.html"
      }
    ],
    "headers": [
      {
        "source": "**/*.@(jpg|jpeg|gif|png|webp|svg)",
        "headers": [
          {
            "key": "Cache-Control",
            "value": "max-age=31536000"
          }
        ]
      },
      {
        "source": "**/*.@(js|css)",
        "headers": [
          {
            "key": "Cache-Control",
            "value": "max-age=31536000"
          }
        ]
      }
    ]
  },
  "functions": [
    {
      "source": "apps/functions",
      "codebase": "default",
      "ignore": ["node_modules", ".git", "firebase-debug.log", "firebase-debug.*.log"]
    }
  ]
}
```

設定のポイント:
1. `public`: ビルド出力ディレクトリ（TanStack Startは `dist/client` に出力）
2. `rewrites`: すべてのルートを `index.html` にリダイレクト（SPA用）
3. `headers`: 静的アセットのキャッシュ設定

---

### ステップ6: 不要なファイルの削除

以下のファイルを削除します：

```bash
# Vercel設定
rm apps/web/vercel.json

# SSRサーバーエントリーポイント（不要になる）
rm apps/web/api/server.js

# SSRビルド出力（.gitignoreに含まれているはず）
rm -rf apps/web/dist/server
```

---

### ステップ7: ビルドとテスト

#### 1. 開発サーバーの起動

```bash
cd apps/web
pnpm dev
```

ブラウザで `http://localhost:5173` を開いて動作確認。

**注意**: 開発モードではまだSSRが動いているように見えますが、本番ビルド後は完全なSPAになります。

#### 2. プロダクションビルド

```bash
cd apps/web
pnpm build
```

ビルド出力: `apps/web/dist/client/`

**確認ポイント**:
- `dist/client/index.html` が生成されている
- `dist/server/` ディレクトリが存在しない（または空）

#### 3. ビルドのプレビュー

```bash
cd apps/web
pnpm preview
```

ブラウザで `http://localhost:4173` を開いて確認。

---

## Firebase Hostingへのデプロイ

### 1. Firebase CLIのインストール（未インストールの場合）

```bash
npm install -g firebase-tools
```

### 2. Firebaseにログイン

```bash
firebase login
```

### 3. Hostingのエミュレータでテスト

```bash
# プロジェクトルートで実行
firebase emulators:start --only hosting
```

ブラウザで `http://localhost:5000` を開いて確認。

### 4. 本番デプロイ

```bash
# プロジェクトルートで実行
firebase deploy --only hosting
```

デプロイ完了後、以下のURLで確認:
- `https://lgtmonk.web.app`
- `https://lgtmonk.firebaseapp.com`

---

## 検証チェックリスト

移行後、以下の項目を確認してください：

### 機能面

- [ ] トップページ（`/`）が正しく表示される
- [ ] 画像一覧が表示される（最新、ランダム、お気に入りタブ）
- [ ] 画像生成ページ（`/generate`）が正しく表示される
- [ ] 画像のアップロード・生成が動作する
- [ ] 画像検索機能が動作する
- [ ] お気に入り機能が動作する（localStorage）
- [ ] 画像コピー機能が動作する
- [ ] ルーティングが正しく動作する（ブラウザバック/フォワード）
- [ ] リロード時にルートが保持される（`/generate` でリロードしても `/generate` のまま）

### パフォーマンス

- [ ] 初回読み込みが速い（2秒以内）
- [ ] ページ遷移がスムーズ
- [ ] 画像の読み込みが適切にキャッシュされる

### SEO・OGP

- [ ] `<title>` タグが正しく表示される
- [ ] OGP画像が表示される（Twitter Card Validator、Facebook Sharing Debuggerで確認）
- [ ] メタタグが正しく設定されている

### その他

- [ ] Firebase Analyticsが動作する
- [ ] Firebase Remote Configが動作する
- [ ] エラーハンドリングが正しく動作する
- [ ] 開発者ツールでエラーが出ていない
- [ ] TanStack Router DevToolsが開発環境で動作する

---

## トラブルシューティング

### 問題: ビルド後にサーバーディレクトリが残っている

**症状**:
```
dist/
├── client/
└── server/  ← これが残っている
```

**解決策**:
`vite.config.ts` の設定を確認してください。`spa.enabled: true` が正しく設定されていれば、サーバービルドは生成されません（または空になります）。

```bash
# ビルドをクリーンアップして再実行
rm -rf dist
pnpm build
```

### 問題: ルーティングが動作しない

**症状**:
- `/generate` に直接アクセスすると404エラー

**解決策**:
1. Firebase Hostingの `rewrites` 設定を確認
2. ローカルで `pnpm preview` を実行して確認
3. Firebase Hostingエミュレータでテスト

### 問題: OGP画像が表示されない

**症状**:
- SNSでシェアしても画像が表示されない

**解決策**:
1. `public/ogp.png` が存在するか確認
2. `index.html` のOGP URLが正しいか確認（HTTPSで始まる完全なURL）
3. キャッシュをクリアして再度シェア
4. [Twitter Card Validator](https://cards-dev.twitter.com/validator) でテスト

### 問題: Firebase Analyticsが動作しない

**症状**:
- イベントが記録されない

**解決策**:
1. Firebase Consoleでデバッグモードを有効化
2. ブラウザの開発者ツールでネットワークタブを確認
3. 環境変数 `VITE_FIREBASE_*` が正しく設定されているか確認

### 問題: dev環境でSSRの挙動が残っている

**症状**:
- `pnpm dev` で起動すると、まだSSRのように見える

**原因**:
TanStack Startは開発モードではホットリロードのためにSSRを使用しますが、**本番ビルドでは完全なSPAになります**。

**確認方法**:
```bash
pnpm build
pnpm preview
```

プレビューモードで確認してください。

---

## 移行後の効果

### メリット

1. **インフラコストの削減**
   - Vercelの有料プラン不要
   - Firebase Hostingは静的ホスティングで従量課金
   - サーバー実行コストなし

2. **デプロイの簡素化**
   - Firebase Functionsと同じプロジェクトで管理
   - `firebase deploy --only hosting` 一発でデプロイ完了

3. **パフォーマンス向上**
   - CDNから配信されるため高速
   - SSRのオーバーヘッドがない

4. **メンテナンス性向上**
   - SSRの複雑さがなくなりシンプルに
   - デバッグが容易

5. **開発者体験の維持**
   - TanStack Routerの型安全性を維持
   - ファイルベースルーティングを維持
   - DevToolsを継続使用可能
   - 将来的にSSR/SSGを有効化することも可能

### デメリット

1. **SEO**
   - 動的なメタタグ生成ができない
   - ただし、LGTMonkはSEOよりも機能重視のアプリなので影響は小さい

2. **初回表示**
   - SSRよりわずかに遅くなる可能性
   - ただし、Firebase Hostingの高速CDNでカバー可能

3. **バンドルサイズ**
   - Vite + React Router と比べるとわずかに大きい
   - ただし、その差は数KB程度で体感差はほぼなし

---

## 将来の拡張性

### SSR/SSGへの移行が簡単

将来的にSEOが重要になった場合、SPAモードを無効化するだけで簡単にSSR/SSGに戻せます：

```typescript
// vite.config.ts
tanstackStart({
  spa: {
    enabled: false,  // ← これだけ
  },
})
```

その後、必要なルートに `loader` を追加すれば、段階的にSSR化できます。

### プリレンダリング

特定のページだけ静的生成したい場合、プリレンダリング機能も使えます：

```typescript
tanstackStart({
  spa: {
    enabled: true,
    prerender: {
      routes: ['/'],  // トップページだけプリレンダリング
    },
  },
})
```

---

## 参考資料

### TanStack Start

- [公式ドキュメント](https://tanstack.com/start)
- [SPA Mode Guide](https://tanstack.com/start/latest/docs/framework/react/guide/spa-mode)
- [GitHub Discussion: SPA Mode](https://github.com/TanStack/router/discussions)

### TanStack Router

- [公式ドキュメント](https://tanstack.com/router)
- [File-based Routing](https://tanstack.com/router/latest/docs/framework/react/guide/file-based-routing)

### Firebase Hosting

- [公式ドキュメント](https://firebase.google.com/docs/hosting)
- [SPA設定](https://firebase.google.com/docs/hosting/full-config#rewrites)

### Vite

- [公式ドキュメント](https://vitejs.dev/)
- [Build for Production](https://vitejs.dev/guide/build.html)

---

## まとめ

TanStack Start SPAモードを使用することで、**最小限の変更**でLGTMonkを静的ホスティングに移行できます。

### 変更が必要なファイル（わずか4ファイル！）

1. `vite.config.ts` - SPA mode を有効化
2. `index.html` - 新規作成（静的メタタグ）
3. `src/routes/__root.tsx` - head関数を削除
4. `firebase.json` - hosting設定を追加

### 変更不要なファイル

- すべてのルートファイル（`src/routes/*.tsx`）
- すべてのコンポーネント（`src/components/`）
- すべてのフック（`src/hooks/`）
- Firebase設定（`src/lib/firebase.ts`）
- その他のロジック

### アーキテクチャ図

```
┌──────────────┐     ┌──────────────────────────────────────┐
│   Browser    │     │          Firebase                     │
│              │     │                                      │
│ TanStack     │◄───►│  Firebase Hosting (静的配信)          │
│ Router SPA   │     │  ├─ index.html (shell)               │
│              │     │  └─ /assets/* (JS/CSS)               │
│  localStorage│     │       │                              │
│  (favorites) │     │       ▼                              │
│              │     │  Cloud Functions                     │
│              │     │   ├─ 画像生成 API                     │
│              │     │   └─ 画像検索 API                     │
│              │     │       │                              │
│              │◄───►│  Firestore        Firebase Storage   │
│              │     │  (メタデータ)      (画像ファイル)      │
│              │     │                                      │
│              │◄───►│  Firebase Auth                       │
└──────────────┘     └──────────────────────────────────────┘
```

**結論**: TanStack Start SPAモードは、現在の開発者体験を維持しつつ、静的ホスティングのメリットを享受できる最適なソリューションです。
