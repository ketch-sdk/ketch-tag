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
  const l = wrapLogger(log, 'decodeDataNav')
  let decodedStr = ''
  try {
    decodedStr = window.atob(str)
  } catch (e) {
    l.debug(`Invalid encoding: ${str}`, e)
  }
  return safeJsonParse(decodedStr)
}
