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

export function encodeSimulationConfig(config: SimulationConfig): string {
  return JSON.stringify({
    userAgents: config.userAgents,
    paths: config.paths.map(normalizeSimulationPath).filter(Boolean)
  })
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

    const normalizedAgents = userAgents.map(agent => agent.trim()).filter(Boolean)
    const normalizedPaths = paths.map(path => normalizeSimulationPath(path)).filter(Boolean)
    if (normalizedAgents.length === 0 || normalizedPaths.length === 0) {
      return null
    }

    return {
      userAgents: normalizedAgents,
      paths: normalizedPaths
    }
  } catch {
    return null
  }
}

export function collectUserAgentOptions(document: RobotsDocument): string[] {
  const agents = new Set<string>(DEFAULT_USER_AGENTS)
  for (const group of document.groups) {
    for (const agent of group.userAgents) {
      agents.add(agent)
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

function arraysEqual(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((value, index) => value === b[index])
}

export function isDefaultSimulationConfig(config: SimulationConfig): boolean {
  return arraysEqual(config.userAgents, DEFAULT_USER_AGENTS)
    && arraysEqual(config.paths, DEFAULT_PATHS)
}
