# LGTMonk Chrome Extension

GitHubのプルリクエストに貼るLGTM画像を手軽にコピーできるChrome拡張機能です。

## 機能

- ランダムに6枚のLGTM画像を表示
- ワンクリックでMarkdown形式コピー
- リロードボタンで新しい画像セットを取得

## インストール方法

### 開発版のインストール

1. このリポジトリをクローン
2. 依存関係をインストール:
   ```bash
   pnpm install
   ```
3. ビルド:
   ```bash
   cd apps/extension
   pnpm build
   ```
4. Chromeで `chrome://extensions/` を開く
5. 「デベロッパーモード」を有効化
6. 「パッケージ化されていない拡張機能を読み込む」をクリック
7. `apps/extension/dist` を選択

## 使い方

1. ツールバーのLGTMonkアイコンをクリック
2. 6枚のランダム画像から好きなものをクリック
3. Markdown形式がクリップボードにコピーされます
4. GitHubのプルリクエストのコメント欄に貼り付け

## 開発

### 開発サーバー起動

```bash
pnpm dev
```

### ビルド

```bash
pnpm build
```

### ディレクトリ構成

```
apps/extension/
├── manifest.json
├── src/
│   ├── background/       # Service Worker
│   ├── popup/            # ポップアップ UI
│   ├── shared/           # Firebase・型定義
│   └── utils/            # ユーティリティ
└── dist/                 # ビルド出力
```

## ライセンス

MIT
