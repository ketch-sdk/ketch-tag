import { wrapLogger } from '@ketch-sdk/ketch-logging'
import log from './log'

export function safeJsonParse(str?: string) {
  const l = wrapLogger(log, 'safeJsonParse')
  if (!str || str.trim() === '') {
    return {}
  }
  try {
    return JSON.parse(str)
  } catch (e) {
    l.error(`Could not parse JSON for ${str} - ${e}`)
    return null
  }
}

export function decodeDataNav(str: string) {
  const decodedStr = window.atob(str)
  return safeJsonParse(decodedStr)
}
