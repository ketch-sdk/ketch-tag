import { wrapLogger } from '@ketch-sdk/ketch-logging'
import log from './log'


export function safeJsonParse(str?: string) {
  const l = wrapLogger(log, 'safeJsonParse');
  if(!str || str === '') { return null }
  try {
    return JSON.parse(str);
  }
  catch(e) {
    l.error(`Could not parse JSON: ${e}`)
    return null
  }
}
