// Firebase の初期化
import { db } from '../shared/firebase'

console.log('LGTMonk Extension Service Worker started')

// Service Worker がアクティブになったときに Firebase 接続を確認
self.addEventListener('activate', (event) => {
  console.log('Service Worker activated')
  // Firestore接続確認（dbをインポートするだけで初期化される）
  if (db) {
    console.log('Firestore initialized successfully')
  }
})
