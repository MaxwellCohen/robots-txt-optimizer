import { useDebounceFn } from '@vueuse/core'
import { compressTextForUrl, decompressTextFromUrl } from '#shared/robots/url-text'

export const ROBOTS_TEXT_QUERY_KEY = 'r'

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

  const debouncedSyncTextToUrl = useDebounceFn(async (text: string) => {
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
