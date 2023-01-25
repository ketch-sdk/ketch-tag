import getGlobal from './getGlobal'
import log from './logging'
import newFromBootstrap from './newFromBootstrap'
import push from './push'
import { Ketch } from './ketch'

export let ketch: Ketch | undefined

/**
 * This is the entry point when this package is first loaded.
 */
export default async function init(): Promise<any> {
  const initRequest = getGlobal().shift()

  if (!Array.isArray(initRequest) || initRequest[0] != 'init') {
    log.error('ketch tag command queue is not configured correctly')
    return
  }

  const cfg = initRequest[1]

  ketch = await newFromBootstrap(cfg)

  log.trace('init')

  const g = getGlobal(push)
  while (g.length > 0) {
    push(g.shift())
  }

  return ketch.getConsent()
}
