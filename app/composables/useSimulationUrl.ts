import { useDebounceFn } from '@vueuse/core'
import {
  decodeSimulationConfig,
  encodeSimulationConfig,
  isDefaultSimulationConfig,
  type SimulationConfig
} from '@robots-txt-optimizer/core/simulation-config'

export const SIMULATION_QUERY_KEY = 's'

export function useSimulationUrl() {
  const { value: simulationFromQuery, clear, write } = useQueryParam(SIMULATION_QUERY_KEY)

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
        await clear()
      }
      return
    }

    const encoded = await compressTextForUrl(encodeSimulationConfig(config))
    if (simulationFromQuery.value === encoded) {
      return
    }

    await write(encoded)
  }, 500)

  return {
    simulationFromQuery,
    decodeSimulationFromQuery,
    debouncedSyncSimulationToUrl
  }
}
