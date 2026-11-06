import type { LocationQuery } from 'vue-router'

/** Returns a copy of `query` without the given keys. */
export function omitQueryKeys(query: LocationQuery, ...keys: string[]): LocationQuery {
  return Object.fromEntries(Object.entries(query).filter(([key]) => !keys.includes(key)))
}

/** Shared helpers for syncing a single compressed value in the URL query. */
export function useQueryParam(key: string) {
  const route = useRoute()
  const router = useRouter()

  const value = computed(() => {
    const raw = route.query[key]
    return typeof raw === 'string' ? raw : ''
  })

  async function replace(query: LocationQuery) {
    await router.replace({ query })
  }

  /** Removes `key` (and any extra keys) from the query. */
  async function clear(...extraKeys: string[]) {
    await replace(omitQueryKeys(route.query, key, ...extraKeys))
  }

  /** Writes `encoded` under `key`, dropping `extraKeys`. */
  async function write(encoded: string, ...extraKeys: string[]) {
    await replace({ ...omitQueryKeys(route.query, ...extraKeys), [key]: encoded })
  }

  return { route, value, replace, clear, write }
}
