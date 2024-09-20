import { wrapLogger } from '@ketch-sdk/ketch-logging'
import log from './log'
import { DataNav, KetchHTMLElement } from './keyboardHandler.types'

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

export function convertToKetchHTMLElement(node: HTMLElement): KetchHTMLElement {
  const i = node as KetchHTMLElement
  if (!i.ketch) {
    i.ketch = {}
  }
  // eg. data-nav="eyJleHBlcmllbmNlIjoia2V0Y2gtY29uc2VudC1iYW5uZXIiLCJuYXYtaW5kZXgiOjJ9"
  i.ketch.navParsed = decodeDataNav(i.dataset.nav || '') as DataNav
  return i
}
