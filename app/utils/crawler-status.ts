import type { CrawlerAccessStatus } from '@robots-txt-optimizer/core'

export const crawlerStatusStyle: Record<CrawlerAccessStatus, { label: string, color: 'primary' | 'warning' | 'error' }> = {
  allowed: { label: 'Allowed', color: 'primary' },
  partial: { label: 'Partly blocked', color: 'warning' },
  blocked: { label: 'Blocked', color: 'error' }
}
