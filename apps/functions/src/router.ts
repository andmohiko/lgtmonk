import { check } from 'express-validator'

const cors = require('cors')({ origin: true })
const express = require('express')
const app = express()

app.use(cors)
app.use(express.json())

const router = require('express-promise-router')()

router.post(
  '/health',
  [check('message').exists()],
  require('./api/health/test').handle,
)

router.get(
  '/searchImages',
  [check('keyword').exists().isString()],
  require('./api/searchImages/searchImages').handle,
)

router.post(
  '/generateLgtmImage',
  [check('keyword').exists().isString()],
  require('./api/generateLgtmImage/generateLgtmImage').handle,
)

app.use(router)

export default app
