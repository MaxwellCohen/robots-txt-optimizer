import { useDebounceFn } from '@vueuse/core'

export const ROBOTS_TEXT_QUERY_KEY = 'r'

type ShareContext = {
  shareUrl?: string | null
  fetchedText?: string | null
}

export function useRobotsTextUrl() {
  const { route, value: textFromQuery, replace, clear, write } = useQueryParam(ROBOTS_TEXT_QUERY_KEY)
  const textWrittenToQuery = ref<string | null>(null)

  async function decodeTextFromQuery(encoded: string): Promise<string | null> {
    if (!encoded) {
      return null
    }

    try {
      return await decompressTextFromUrl(encoded)
    } catch {
      return null
    }
  }

  const debouncedSyncTextToUrl = useDebounceFn(async (text: string, context?: ShareContext) => {
    const shareUrl = context?.shareUrl
    const fetchedText = context?.fetchedText

    // Priority 1: share via loaded URL when text still matches fetched content
    if (shareUrl && fetchedText != null && text === fetchedText) {
      if (route.query.url === shareUrl && !textFromQuery.value) {
        return
      }
      await replace({ ...omitQueryKeys(route.query, ROBOTS_TEXT_QUERY_KEY), url: shareUrl })
      return
    }

    // Priority 2 & 3: pasted text or edited loaded text — share compressed
    if (!text.trim()) {
      if (textFromQuery.value) {
        await clear()
      }
      return
    }

    const encoded = await compressTextForUrl(text)
    if (textFromQuery.value === encoded && !route.query.url) {
      return
    }

    textWrittenToQuery.value = encoded
    await write(encoded, 'url')
  }, 500)

  return {
    textFromQuery,
    textWrittenToQuery,
    decodeTextFromQuery,
    debouncedSyncTextToUrl
  }
}
