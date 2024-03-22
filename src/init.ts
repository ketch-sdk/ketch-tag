import log from './log'
import Builder from './Builder'
import Router from './Router'
import Trackers from './Trackers'

/**
 * This is the entry point when this package is first loaded.
 */
export default async function init(): Promise<void> {
  const actions = (window.semaphore as any as any[]) || []

  // Shift out the first action, which must be an ['init', {config}] action
  const initRequest = actions.shift()

  if (!Array.isArray(initRequest) || initRequest.length != 2 || initRequest[0] != 'init') {
    throw Error('ketch tag command queue is not configured correctly')
  }

  // The configuration will be the second element in the array
  const cfg = initRequest[1]

  log.debug('init', cfg)

  // Create a new Ketch object
  const builder = new Builder(cfg)
  const ketch = await builder.build()

  // Wrap a router around that Ketch object
  const router = new Router(ketch)

  // Process all the queued actions
  while (actions.length > 0) {
    router.push(actions.shift())
  }

  // Replace the `push` function on the semaphore queue with the router
  window.semaphore.push = router.push.bind(router)

  // Note that the tag has loaded
  window.semaphore.loaded = true

  const shouldOverrideConsent = window.localStorage.getItem('overrideConsent')

  if (shouldOverrideConsent) {
    const ketchFullConfig = await ketch.getConfig()
    const trackers = new Trackers(ketch, ketchFullConfig)
    await trackers.enableAllConsent()
  } else {
    // Ensure consent has been loaded
    await ketch.getConsent()
  }
}
