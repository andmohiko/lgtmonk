# LGTM画像アプリ - 画像検索機能 実装ガイド

## 概要

LGTM画像生成アプリの画像検索部分を **Brave Search API** の Image Search エンドポイントで実装する。
ユーザーがキーワードを入力するとウェブ全体から画像を検索し、結果の画像一覧を返す。

## なぜ Brave Search API か（2026年3月時点）

| API | 状態 |
|-----|------|
| Google Custom Search JSON API | 新規顧客の受付終了（2027年1月サービス終了予定） |
| Bing Image Search API v7 | 2025年8月11日に廃止済み |
| **Brave Search API** | **現在利用可能。独自のウェブインデックス（350億ページ以上）を持つ唯一の独立系検索API** |

## 事前準備（人間が行う手順）

### 1. Brave Search API のアカウント作成とAPIキー取得

1. https://brave.com/search/api/ にアクセス
2. 「Get Started」からアカウントを作成
3. Searchプラン（$5/1,000リクエスト、毎月$5の無料クレジット付き）を選択
   - クレジットカードの登録が必要（毎月$5分は無料）
   - 月1,000クエリ以内なら実質無料
4. ダッシュボード（https://api-dashboard.search.brave.com）からAPIキーを取得
5. 取得したAPIキーを環境変数 `BRAVE_API_KEY` に設定

```bash
export BRAVE_API_KEY="your-api-key-here"
```

## API仕様

### エンドポイント

```
GET https://api.search.brave.com/res/v1/images/search
```

### 認証

リクエストヘッダーに `X-Subscription-Token` としてAPIキーを含める。

```
X-Subscription-Token: <BRAVE_API_KEY>
```

### 主要クエリパラメータ

| パラメータ | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| `q` | string | ✅ | 検索クエリ（URLエンコード済み） |
| `count` | int | | 返す画像数（最大200、デフォルト: API依存） |
| `country` | string | | 画像の出所国コード（例: `JP`, `US`, `ALL`） |
| `search_lang` | string | | コンテンツの言語（例: `ja`, `en`） |
| `safesearch` | string | | `strict`（デフォルト）/ `off` |
| `spellcheck` | boolean | | スペルチェックの有無（デフォルト: true） |

### レスポンス構造（主要フィールド）

```json
{
  "type": "images",
  "results": [
    {
      "type": "image_result",
      "title": "画像のタイトル",
      "url": "画像が掲載されているページのURL",
      "source": "ドメイン名",
      "thumbnail": {
        "src": "https://imgs.search.brave.com/...（プロキシ経由のサムネイルURL、幅500px）"
      },
      "properties": {
        "url": "画像ファイルの直接URL（オリジナル）",
        "format": "jpeg"
      },
      "meta_url": {
        "hostname": "example.com"
      }
    }
  ]
}
```

**重要**: `thumbnail.src` はBraveのプロキシ経由のURLで、幅500pxにリサイズ済み。LGTM画像のプレビュー表示にはこれを使い、ダウンロードや加工には `properties.url`（オリジナル画像URL）を使うこと。

## 実装例

### Python

```python
import os
import requests

BRAVE_API_KEY = os.environ["BRAVE_API_KEY"]
BRAVE_IMAGE_SEARCH_URL = "https://api.search.brave.com/res/v1/images/search"


def search_images(query: str, count: int = 20) -> list[dict]:
    """
    Brave Search APIで画像を検索し、結果のリストを返す。

    Args:
        query: 検索キーワード
        count: 取得する画像数（最大200）

    Returns:
        画像結果のリスト。各要素は以下のキーを持つ dict:
        - title: 画像タイトル
        - thumbnail_url: サムネイルURL（プロキシ経由、幅500px）
        - image_url: オリジナル画像の直接URL
        - source_url: 画像が掲載されているページURL
        - source_domain: ソースドメイン名
    """
    response = requests.get(
        BRAVE_IMAGE_SEARCH_URL,
        headers={
            "X-Subscription-Token": BRAVE_API_KEY,
            "Accept": "application/json",
        },
        params={
            "q": query,
            "count": count,
            "safesearch": "strict",
            "spellcheck": True,
        },
    )
    response.raise_for_status()
    data = response.json()

    results = []
    for item in data.get("results", []):
        results.append({
            "title": item.get("title", ""),
            "thumbnail_url": item.get("thumbnail", {}).get("src", ""),
            "image_url": item.get("properties", {}).get("url", ""),
            "source_url": item.get("url", ""),
            "source_domain": item.get("meta_url", {}).get("hostname", ""),
        })
    return results


# 使用例
if __name__ == "__main__":
    images = search_images("cute cat", count=10)
    for img in images:
        print(f"Title: {img['title']}")
        print(f"Thumbnail: {img['thumbnail_url']}")
        print(f"Original: {img['image_url']}")
        print("---")
```

### TypeScript / Node.js

```typescript
const BRAVE_API_KEY = process.env.BRAVE_API_KEY!;
const BRAVE_IMAGE_SEARCH_URL =
  "https://api.search.brave.com/res/v1/images/search";

interface ImageResult {
  title: string;
  thumbnailUrl: string;
  imageUrl: string;
  sourceUrl: string;
  sourceDomain: string;
}

async function searchImages(
  query: string,
  count: number = 20
): Promise<ImageResult[]> {
  const params = new URLSearchParams({
    q: query,
    count: count.toString(),
    safesearch: "strict",
    spellcheck: "1",
  });

  const response = await fetch(
    `${BRAVE_IMAGE_SEARCH_URL}?${params}`,
    {
      headers: {
        "X-Subscription-Token": BRAVE_API_KEY,
        Accept: "application/json",
      },
    }
  );

  if (!response.ok) {
    throw new Error(
      `Brave API error: ${response.status} ${response.statusText}`
    );
  }

  const data = await response.json();

  return (data.results ?? []).map((item: any) => ({
    title: item.title ?? "",
    thumbnailUrl: item.thumbnail?.src ?? "",
    imageUrl: item.properties?.url ?? "",
    sourceUrl: item.url ?? "",
    sourceDomain: item.meta_url?.hostname ?? "",
  }));
}

// 使用例
async function main() {
  const images = await searchImages("cute cat", 10);
  images.forEach((img) => {
    console.log(`Title: ${img.title}`);
    console.log(`Thumbnail: ${img.thumbnailUrl}`);
    console.log(`Original: ${img.imageUrl}`);
    console.log("---");
  });
}

main();
```

### cURL（動作確認用）

```bash
curl -s "https://api.search.brave.com/res/v1/images/search?q=cute+cat&count=5&safesearch=strict" \
  -H "Accept: application/json" \
  -H "X-Subscription-Token: $BRAVE_API_KEY" | jq '.results[:2]'
```

## エラーハンドリング

| ステータスコード | 原因 | 対処 |
|-----------------|------|------|
| 401 | APIキーが無効またはmissing | `BRAVE_API_KEY` 環境変数を確認 |
| 403 | プランにImage Searchが含まれていない | ダッシュボードでSearchプランを有効化 |
| 422 | パラメータが不正 | クエリパラメータを確認 |
| 429 | レートリミット超過 | Free: 1 req/sec、Base: 5 req/sec。リトライロジックを実装 |

## レートリミットと料金

- **料金**: $5 / 1,000リクエスト
- **無料クレジット**: 毎月$5（= 月1,000リクエストまで実質無料）
- **レートリミット**: Freeプラン 1 req/sec
- **無料クレジットの条件**: プロジェクトのウェブサイト / aboutページにBrave Search APIの帰属表示（attribution）が必要

## LGTM画像アプリへの組み込み方針

1. **検索フロー**: ユーザーがキーワード入力 → `searchImages()` を呼び出し → サムネイル一覧をグリッド表示
2. **画像選択**: ユーザーがサムネイルをクリック → `imageUrl`（オリジナル画像URL）を次の処理へ渡す
3. **LGTM加工**: 選択された画像のオリジナルURLを使って、別途画像加工処理（テキストオーバーレイ等）を行う
4. **帰属表示**: アプリのフッターやAboutページに「Powered by Brave Search」を記載する（無料クレジット利用の条件）

## 公式ドキュメントリンク

- APIダッシュボード: https://api-dashboard.search.brave.com
- Image Search ドキュメント: https://api-dashboard.search.brave.com/app/documentation/image-search
- APIリファレンス: https://api-dashboard.search.brave.com/app/documentation/image-search/query
- 料金プラン: https://api-dashboard.search.brave.com/app/plans
