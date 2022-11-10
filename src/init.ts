import getGlobal from './getGlobal'
import log from './logging'
import newFromBootstrap from './newFromBootstrap'
import push from './push'
import entrypoint from './entrypoint'
import { Ketch } from './ketch'

export let ketch: Ketch | undefined

/**
 * This is the entry point when this package is first loaded.
 */

export default function init(): Promise<any> {
  const initRequest = getGlobal().shift()

  if (!Array.isArray(initRequest) || initRequest[0] != 'init') {
    log.error('ketch tag command queue is not configured correctly')
    return Promise.resolve()
  }

  const cfg = initRequest[1]

  return newFromBootstrap(cfg).then(k => {
    log.trace('init')

    ketch = k

    const p: Promise<any>[] = []

    const g = getGlobal(push)
    while (g.length > 0) {
      const x = g.shift()

      let r
      if (Array.isArray(x)) {
        const fnName = x.shift()
        r = entrypoint(fnName, ...x)
      } else if (x !== undefined) {
        r = entrypoint(x)
      }

      if (r) {
        p.push(r)
      }
    }

    p.push(ketch.getConsent())

    return Promise.all(p)
  })
}
