/**
 * Structured error class for YouTube scraper failures.
 * Provides contextual data for logging and alerting without leaking sensitive details.
 */
export class ScraperError extends Error {
  constructor (message, context = {}) {
    super(message)
    this.name = 'ScraperError'
    this.context = context // structured error data for logging/alerting
  }
}
