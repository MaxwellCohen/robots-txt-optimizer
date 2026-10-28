import { useLocalStorage } from '@vueuse/core'

export interface RobotsSnapshot {
  text: string
  savedAt: string
}

const STORAGE_KEY = 'robots-txt-optimizer:snapshots'
const MAX_SNAPSHOTS = 50
const MAX_SNAPSHOT_CHARS = 200_000

function snapshotKey(url: string): string {
  try {
    const parsed = new URL(url)
    return `${parsed.host}${parsed.pathname}`
  } catch {
    return url
  }
}

/** Remembers the last robots.txt seen per URL (in this browser) to detect changes. */
export function useRobotsSnapshots() {
  const snapshots = useLocalStorage<Record<string, RobotsSnapshot>>(STORAGE_KEY, {})

  /**
   * Saves `text` as the latest snapshot for `url` and returns the previous
   * snapshot when its content differs.
   */
  function recordSnapshot(url: string, text: string): RobotsSnapshot | null {
    const key = snapshotKey(url)
    const previous = snapshots.value[key] ?? null
    if (text.length > MAX_SNAPSHOT_CHARS) {
      return null
    }

    const entries = Object.entries({
      ...snapshots.value,
      [key]: { text, savedAt: new Date().toISOString() }
    })
    // Keep only the most recently saved snapshots.
    const next = Object.fromEntries(
      entries
        .sort(([, a], [, b]) => b.savedAt.localeCompare(a.savedAt))
        .slice(0, MAX_SNAPSHOTS)
    )
    snapshots.value = next

    return previous && previous.text !== text ? previous : null
  }

  return { recordSnapshot }
}
