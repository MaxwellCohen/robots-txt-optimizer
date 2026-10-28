import { secureFetchRobotsTxt } from '@robots-txt-optimizer/core/node'
import { createError, defineEventHandler, getQuery } from 'nuxt/server'
import { toHttpError } from '../../utils/robots-errors'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const urlParam = query.url

  if (typeof urlParam !== 'string' || !urlParam.trim()) {
    throw createError({ statusCode: 400, message: 'Missing url query parameter' })
  }

  try {
    return await secureFetchRobotsTxt(urlParam)
  } catch (err) {
    toHttpError(err)
  }
})
