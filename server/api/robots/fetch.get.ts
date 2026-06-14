export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const urlParam = query.url

  if (typeof urlParam !== 'string' || !urlParam.trim()) {
    throw createError({ statusCode: 400, message: 'Missing url query parameter' })
  }

  const robotsUrl = normalizeRobotsUrl(urlParam)
  await assertPublicHost(robotsUrl)

  const result = await fetchRobotsFromUrl(robotsUrl)

  return {
    text: result.text,
    finalUrl: result.finalUrl,
    status: result.status,
    contentType: result.contentType,
    source: 'server' as const
  }
})
