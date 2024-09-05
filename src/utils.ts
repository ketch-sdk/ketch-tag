import { wrapLogger } from '@ketch-sdk/ketch-logging'
import log from './log'


export function safeJsonParse(str?: string) {
  const l = wrapLogger(log, 'safeJsonParse');
  if(!str || str === '') { return null }
  try {
    return JSON.parse(str);
  }
  catch(e) {
    l.error(`Could not parse JSON for ${str} - ${e}`)
    return null
  }
}

export function decodeDataNav(str: string) {
  // @ts-ignore
  const s = str.replaceAll('&quot;', '').replaceAll('"', '')
  const s1 = decodeURI(s)
  return safeJsonParse(s1)
}
