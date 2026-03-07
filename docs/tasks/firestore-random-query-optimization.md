# Firestore ランダム画像取得の最適化

## 現状の問題点

### 現在の実装

**ファイル:** `apps/extension/src/shared/imageOperations.ts`

```typescript
export const fetchRandomImagesOperation = async (
  pageSize: number = 6,
): Promise<Array<Image>> => {
  // ページサイズの2倍取得してシャッフル
  const snapshot = await getDocs(
    query(collection(db, imageCollection), limit(pageSize * 2)),
  )

  const images = snapshot.docs.map((doc) => ({
    imageId: doc.id,
    ...convertDate(doc.data(), dateColumns),
  })) as Array<Image>

  // Fisher-Yates アルゴリズムでシャッフル
  for (let i = images.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[images[i], images[j]] = [images[j], images[i]]
  }

  return images.slice(0, pageSize)
}
```

### 問題点

1. **ランダム性の偏り**
   - Firestoreのデフォルト順序（ドキュメントID順）で最初の12件のみを取得
   - コレクション全体からランダムに選択されているわけではない
   - ドキュメントIDが若い（古い）画像に偏る

2. **スケーラビリティの問題**
   - 画像が増えても常に最初の12件から選択
   - 新しく追加された画像が選ばれにくい

3. **ランダム性スコア: 70/100**
   - クライアント側のシャッフルは正しいが、元データが偏っている

---

## 基本方針

`random`フィールド（0〜1の一様乱数）を活用し、独立した6つの起点から1件ずつ取得することで、均一なランダムサンプリングを実現する。

---

## 1. ドキュメント作成時

ドキュメント作成時に `random` フィールドを付与する。

```js
await addDoc(collection(db, "items"), {
  // ...その他のフィールド
  random: Math.random(), // 0〜1の一様乱数
});
```

---

## 2. ランダム6件取得のフロー

```
① Math.random() で起点を6つ生成（互いに独立）
② 各起点に対して「random >= pivot, limit(1)」でクエリを発行
③ null だった場合（pivot がすべての値を超えた）は pivot=0 で再クエリ（ラップアラウンド）
④ 6件の結果に重複があった場合は再クエリして補完
⑤ 6件揃ったら返却
```

---

## 3. 実装コード（Firebase v9 モジュラー）

```js
import {
  collection, query, where, orderBy, limit, getDocs, getFirestore
} from "firebase/firestore";

const db = getFirestore();

/**
 * pivotの直後のドキュメントを1件取得する
 * 終端を超えた場合はpivot=0でラップアラウンドする
 */
const fetchOneAfterPivot = async (pivot) => {
  const q = query(
    collection(db, "items"),
    orderBy("random"),
    where("random", ">=", pivot),
    limit(1)
  );
  const snap = await getDocs(q);

  if (!snap.empty) return snap.docs[0];

  // ラップアラウンド
  const q2 = query(
    collection(db, "items"),
    orderBy("random"),
    limit(1)
  );
  const snap2 = await getDocs(q2);
  return snap2.empty ? null : snap2.docs[0];
};

/**
 * ランダムに6件取得する（重複排除・補完あり）
 */
const fetchRandom6 = async () => {
  const fetchedIds = new Set();
  const results = [];

  // 最大試行回数（無限ループ防止）
  const maxAttempts = 20;
  let attempts = 0;

  while (results.length < 6 && attempts < maxAttempts) {
    const pivot = Math.random();
    const doc = await fetchOneAfterPivot(pivot);

    if (doc && !fetchedIds.has(doc.id)) {
      fetchedIds.add(doc.id);
      results.push(doc);
    }

    attempts++;
  }

  return results;
};
```

---

## 4. エッジケースと対処

| ケース | 対処 |
|---|---|
| pivot がすべての random 値を超えた | pivot=0 でラップアラウンドして再クエリ |
| 6件中に重複がある | `Set` で重複排除し、不足分を再クエリで補完 |
| コレクションが6件未満 | 取得できた件数をそのまま返す（maxAttempts で無限ループを防止） |
| コレクションが空 | null を除いて空配列を返す |

---

## 5. インデックス

`random` フィールドへの**単一フィールドインデックス**が必要。

- 単独で `orderBy("random")` を使う場合 → Firestore が自動作成
- 他のフィールドと組み合わせる場合（例：`where("category", "==", "x")` と併用）→ Firebase Console または `firestore.indexes.json` で**複合インデックスを手動設定**

```json
{
  "indexes": [
    {
      "collectionGroup": "items",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "category", "order": "ASCENDING" },
        { "fieldPath": "random", "order": "ASCENDING" }
      ]
    }
  ]
}
```

---

## 6. パフォーマンス特性

| 項目 | 内容 |
|---|---|
| クエリ回数 | 通常6回、重複・終端があれば最大 `maxAttempts` 回 |
| 読み取りコスト | 1回のクエリで1件のみ読み取るため低コスト |
| レイテンシ | 6クエリを `Promise.all` で並列化することで最小化可能 |

### Promise.all による並列化（重複チェックが不要な場合）

```js
const fetchRandom6Parallel = async () => {
  const pivots = Array.from({ length: 6 }, () => Math.random());
  const docs = await Promise.all(pivots.map(fetchOneAfterPivot));
  return docs.filter(Boolean);
  // ※重複が許容できる場合のみ使用
};
```