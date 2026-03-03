import * as admin from 'firebase-admin'

admin.initializeApp({
  credential: admin.credential.applicationDefault(),
})
export const db = admin.firestore()
export const serverTimestamp = admin.firestore.FieldValue.serverTimestamp()

export const auth = admin.auth()

export const storageBucket = admin
  .storage()
  .bucket('lgtmonk.firebasestorage.app')
