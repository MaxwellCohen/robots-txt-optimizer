import { useDebounceFn } from '@vueuse/core'
import { compressTextForUrl, decompressTextFromUrl } from '~/utils/url-text'

export const ROBOTS_TEXT_QUERY_KEY = 'r'

type ShareContext = {
  shareUrl?: string | null
  fetchedText?: string | null
}

export function useRobotsTextUrl() {
  const route = useRoute()
  const router = useRouter()

  const textFromQuery = computed(() => {
    const value = route.query[ROBOTS_TEXT_QUERY_KEY]
    return typeof value === 'string' ? value : ''
  })

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
      const { [ROBOTS_TEXT_QUERY_KEY]: _, ...rest } = route.query
      if (route.query.url === shareUrl && !textFromQuery.value) {
        return
      }
      await router.replace({ query: { ...rest, url: shareUrl } })
      return
    }

    // Priority 2 & 3: pasted text or edited loaded text — share compressed
    if (!text.trim()) {
      if (textFromQuery.value) {
        const { [ROBOTS_TEXT_QUERY_KEY]: _, ...rest } = route.query
        await router.replace({ query: rest })
      }
      return
    }

    const encoded = await compressTextForUrl(text)
    if (textFromQuery.value === encoded && !route.query.url) {
      return
    }

    const { url: _, ...rest } = route.query
    await router.replace({
      query: {
        ...rest,
        [ROBOTS_TEXT_QUERY_KEY]: encoded
      }
    })
  }, 500)

  return {
    textFromQuery,
    decodeTextFromQuery,
    debouncedSyncTextToUrl
  }
}
