import { wrapLogger } from '@ketch-sdk/ketch-logging'
import log from './log'
import { DataNav } from './keyboardHandler.types'
import { getLanyardRoot } from './cache'

export function safeJsonParse(str?: string | null) {
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

export function decodeDataNav(str: string): DataNav | null {
  const l = wrapLogger(log, 'decodeDataNav')
  let decodedStr = ''
  try {
    // eg. data-nav="eyJleHBlcmllbmNlIjoia2V0Y2gtY29uc2VudC1iYW5uZXIiLCJuYXYtaW5kZXgiOjJ9"
    decodedStr = window.atob(str)
  } catch (e) {
    l.debug(`Invalid encoding: ${str}`, e)
    return null
  }
  const o = safeJsonParse(decodedStr)
  if (Object.prototype.toString.call(o) !== '[object Object]') {
    /**
     * Weed out any non {} values
     * Optimization - confirm if o is DataNav
     */
    return null
  }
  o.src = str
  return o
}

export function getDomNode(ctxNav: DataNav | null): HTMLElement | null {
  const l = wrapLogger(log, 'convertToKetchHTMLElement')
  if (!ctxNav || !ctxNav.src) {
    l.debug('node missing src', ctxNav)
    return null
  }
  const selector = `[data-nav="${ctxNav.src}"]`
  const parentNode = getLanyardRoot()
  if (!parentNode) {
    l.debug('missing lanyard root')
    return null
  }
  return parentNode.querySelector(selector)
}

export function santizePaths(o: string): string {
  const l = wrapLogger(log, 'santizePaths')
  l.debug(`is path ${o} sane: `, /[^a-zA-Z0-9_#]/.test(o))
  return o.replace(/[^a-zA-Z0-9_#]/g, '')
}
