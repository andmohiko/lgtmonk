import 'source-map-support/register'
import { onRequest } from 'firebase-functions/v2/https'
import app from './router'

const timezone = 'Asia/Tokyo'
process.env.TZ = timezone

// triggers

// API
export const api = onRequest(
  {
    region: 'asia-northeast1',
    memory: '1GiB',
  },
  app,
)
