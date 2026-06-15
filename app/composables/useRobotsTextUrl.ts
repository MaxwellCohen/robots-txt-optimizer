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
      if (textFromQuery.value || route.query.url) {
        await router.replace({ query: {} })
      }
      return
    }

    const encoded = await compressTextForUrl(text)
    if (textFromQuery.value === encoded && !route.query.url) {
      return
    }

    await router.replace({ query: { [ROBOTS_TEXT_QUERY_KEY]: encoded } })
  }, 500)

  return {
    textFromQuery,
    decodeTextFromQuery,
    debouncedSyncTextToUrl
  }
}
