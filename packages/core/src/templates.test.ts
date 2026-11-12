import { describe, expect, it } from 'vitest'
import { analyzeRobotsTxt } from './index'
import { getRobotsTemplates } from './templates'

describe('getRobotsTemplates', () => {
  it('ships templates that validate without errors', () => {
    for (const template of getRobotsTemplates()) {
      const { validation } = analyzeRobotsTxt(template.text)
      const unexpected = validation.issues.filter(issue =>
        issue.severity === 'error' || (template.id !== 'staging' && issue.message.includes('blocked'))
      )
      expect(unexpected, template.id).toEqual([])
    }
  })
})
