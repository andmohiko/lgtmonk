# Google Custom Search API セットアップガイド

## 概要

LGTMonkのGoogle画像検索機能を使用するには、Google Custom Search APIの設定が必要です。

## エラー: "This project does not have the access to Custom Search JSON API"

このエラーが出る場合は、以下の手順でAPIを有効化してください。

## セットアップ手順

### 1. Google Cloud Consoleにアクセス

1. [Google Cloud Console](https://console.cloud.google.com/) にアクセス
2. プロジェクトを選択（または新規作成）

### 2. Custom Search API を有効化

1. 左側のメニューから「APIとサービス」→「ライブラリ」を選択
2. 検索バーで「Custom Search API」を検索
3. 「Custom Search API」をクリック
4. 「有効にする」ボタンをクリック

**または、直接リンクからアクセス**:
- https://console.cloud.google.com/apis/library/customsearch.googleapis.com

### 3. APIキーを取得（既に取得済みの場合はスキップ）

1. 「APIとサービス」→「認証情報」を選択
2. 「認証情報を作成」→「APIキー」をクリック
3. APIキーが生成されます

### 4. APIキーの制限を設定（推奨）

セキュリティのため、APIキーに制限を設定します：

#### アプリケーションの制限
- 開発環境: 「HTTPリファラー」を選択
  - 許可するリファラー: `http://localhost:3000/*`
  - 許可するリファラー: `http://localhost:*` （任意のポートで開発する場合）
- 本番環境: 実際のドメインを追加
  - 例: `https://your-domain.com/*`

#### API の制限
- 「キーを制限」を選択
- 「Custom Search API」のみにチェック

### 5. Programmable Search Engine の作成

1. [Programmable Search Engine](https://programmablesearchengine.google.com/) にアクセス
2. 「追加」または「新しい検索エンジン」をクリック
3. 設定:
   - **検索するサイト**: 「ウェブ全体を検索」を選択
   - **検索エンジンの名前**: 任意の名前（例: "LGTMonk Image Search"）
   - **言語**: 日本語
4. 「作成」をクリック
5. 作成後、「画像検索」を有効にする:
   - 検索エンジンの編集画面で「画像検索」をONにする
   - 「セーフサーチ」を有効にする（推奨）
6. **検索エンジンID（cx）**をコピー
   - 検索エンジンの編集画面に表示されています

### 6. 環境変数を設定

`apps/web/.env` ファイルに以下を追加:

```bash
VITE_GOOGLE_CUSTOM_SEARCH_API_KEY=your-api-key-here
VITE_GOOGLE_CUSTOM_SEARCH_ENGINE_ID=your-search-engine-id-here
```

### 7. 開発サーバーを再起動

```bash
pnpm dev
```

## API制限について

### 無料枠
- **1日あたり100クエリまで無料**
- それ以上は1000クエリあたり$5

### 推奨事項
- 開発時は少数の検索でテスト
- 検索結果はキャッシュされるため、同じキーワードで何度も検索してもAPI使用量は増えません
- 本番環境では必要に応じて有料プランへ移行

## トラブルシューティング

### エラー: 403 Forbidden
- Custom Search APIが有効になっているか確認
- APIキーの制限設定を確認（HTTPリファラーが正しく設定されているか）
- 課金アカウントが設定されているか確認

### エラー: API credentials are not configured
- `.env`ファイルが正しく設定されているか確認
- 開発サーバーを再起動

### 検索結果が0件
- 検索エンジンで「ウェブ全体を検索」が有効になっているか確認
- 検索エンジンで「画像検索」が有効になっているか確認

## 参考リンク

- [Google Custom Search JSON API Documentation](https://developers.google.com/custom-search/v1/overview)
- [Programmable Search Engine Help](https://support.google.com/programmable-search/)
- [API Key Best Practices](https://cloud.google.com/docs/authentication/api-keys)
