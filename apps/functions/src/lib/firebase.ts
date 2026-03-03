import * as admin from 'firebase-admin'

// エミュレーター環境ではSTORAGE_EMULATOR_HOSTを使用
if (process.env.FUNCTIONS_EMULATOR === 'true') {
  process.env.FIREBASE_STORAGE_EMULATOR_HOST = 'localhost:9199'
}

admin.initializeApp({
  credential: admin.credential.applicationDefault(),
})
export const db = admin.firestore()
export const serverTimestamp = admin.firestore.FieldValue.serverTimestamp()

export const auth = admin.auth()

export const storageBucket = admin
  .storage()
  .bucket('lgtmonk.firebasestorage.app')
