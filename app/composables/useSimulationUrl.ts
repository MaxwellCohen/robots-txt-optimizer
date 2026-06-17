import { useDebounceFn } from '@vueuse/core'
import {
  decodeSimulationConfig,
  encodeSimulationConfig,
  isDefaultSimulationConfig,
  type SimulationConfig
} from '@robots-txt-optimizer/core'
import { compressTextForUrl, decompressTextFromUrl } from '~/utils/url-text'

export const SIMULATION_QUERY_KEY = 's'

export function useSimulationUrl() {
  const route = useRoute()
  const router = useRouter()

  const simulationFromQuery = computed(() => {
    const value = route.query[SIMULATION_QUERY_KEY]
    return typeof value === 'string' ? value : ''
  })

  async function decodeSimulationFromQuery(encoded: string): Promise<SimulationConfig | null> {
    if (!encoded) {
      return null
    }

    try {
      const json = await decompressTextFromUrl(encoded)
      return decodeSimulationConfig(json)
    } catch {
      return null
    }
  }

  const debouncedSyncSimulationToUrl = useDebounceFn(async (config: SimulationConfig) => {
    if (isDefaultSimulationConfig(config)) {
      if (simulationFromQuery.value) {
        const { [SIMULATION_QUERY_KEY]: _, ...rest } = route.query
        await router.replace({ query: rest })
      }
      return
    }

    const encoded = await compressTextForUrl(encodeSimulationConfig(config))
    if (simulationFromQuery.value === encoded) {
      return
    }

    await router.replace({
      query: {
        ...route.query,
        [SIMULATION_QUERY_KEY]: encoded
      }
    })
  }, 500)

  return {
    simulationFromQuery,
    decodeSimulationFromQuery,
    debouncedSyncSimulationToUrl
  }
}
