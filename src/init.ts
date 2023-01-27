import getGlobal from './getGlobal'
import log from './logging'
import newFromBootstrap from './newFromBootstrap'
import pusher from './push'
import { Ketch } from './ketch'
import entrypoint from './entrypoint'

export let ketch: Ketch | undefined

/**
 * This is the entry point when this package is first loaded.
 */
export default async function init(): Promise<any> {
  const push = pusher(entrypoint)

  const g = getGlobal(push)

  const initRequest = g.shift()

  if (!Array.isArray(initRequest) || initRequest[0] != 'init') {
    log.error('ketch tag command queue is not configured correctly')
    return
  }

  const cfg = initRequest[1]

  log.trace('init', cfg)

  ketch = await newFromBootstrap(cfg)

  while (g.length > 0) {
    push(g.shift())
  }

  return ketch.getConsent()
}
