import type { RobotsDocument } from './types'
import { DEFAULT_PATHS, DEFAULT_USER_AGENTS } from './paths'

export interface SimulationConfig {
  userAgents: string[]
  paths: string[]
}

export function defaultSimulationConfig(): SimulationConfig {
  return {
    userAgents: [...DEFAULT_USER_AGENTS],
    paths: [...DEFAULT_PATHS]
  }
}

export function normalizeSimulationPath(path: string): string {
  const trimmed = path.trim()
  if (!trimmed) {
    return ''
  }
  return trimmed.startsWith('/') ? trimmed : `/${trimmed}`
}

/** Splits pasted or typed multi-path input on whitespace, commas, or semicolons. */
export const SIMULATION_PATH_DELIMITER = /[\s,;]+/

export function parseSimulationPaths(text: string): string[] {
  const seen = new Set<string>()
  const paths: string[] = []

  for (const part of text.split(SIMULATION_PATH_DELIMITER)) {
    const normalized = normalizeSimulationPath(part)
    if (normalized && !seen.has(normalized)) {
      seen.add(normalized)
      paths.push(normalized)
    }
  }

  return paths
}

function normalizeSimulationConfig(userAgents: readonly string[], paths: readonly string[]): SimulationConfig {
  return {
    userAgents: userAgents.map(agent => agent.trim()).filter(Boolean),
    paths: paths.map(normalizeSimulationPath).filter(Boolean)
  }
}

export function encodeSimulationConfig(config: SimulationConfig): string {
  return JSON.stringify(normalizeSimulationConfig(config.userAgents, config.paths))
}

export function decodeSimulationConfig(json: string): SimulationConfig | null {
  try {
    const parsed = JSON.parse(json) as unknown
    if (!parsed || typeof parsed !== 'object') {
      return null
    }

    const { userAgents, paths } = parsed as { userAgents?: unknown, paths?: unknown }
    if (!Array.isArray(userAgents) || !Array.isArray(paths)) {
      return null
    }
    if (!userAgents.every(agent => typeof agent === 'string')) {
      return null
    }
    if (!paths.every(path => typeof path === 'string')) {
      return null
    }

    const normalized = normalizeSimulationConfig(userAgents, paths)
    if (normalized.userAgents.length === 0 || normalized.paths.length === 0) {
      return null
    }

    return normalized
  } catch {
    return null
  }
}

export function collectUserAgentOptions(
  document: RobotsDocument,
  extraAgents: readonly string[] = []
): string[] {
  const agents = new Set<string>(DEFAULT_USER_AGENTS)
  for (const group of document.groups) {
    for (const agent of group.userAgents) {
      agents.add(agent)
    }
  }
  for (const agent of extraAgents) {
    const trimmed = agent.trim()
    if (trimmed) {
      agents.add(trimmed)
    }
  }

  return [...agents].sort((a, b) => {
    if (a === '*') {
      return 1
    }
    if (b === '*') {
      return -1
    }
    return a.localeCompare(b)
  })
}

export function isDefaultSimulationConfig(config: SimulationConfig): boolean {
  return JSON.stringify(config.userAgents) === JSON.stringify(DEFAULT_USER_AGENTS)
    && JSON.stringify(config.paths) === JSON.stringify(DEFAULT_PATHS)
}
