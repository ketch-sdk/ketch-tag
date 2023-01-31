import init from './init'
import log from './logging'
import ketch from './ketchfn'

declare global {
  interface Window {
    ketch: () => void
  }
}

export async function boot() {
  window.semaphore = window.semaphore || []
  window.ketch = window.ketch || ketch

  const loaded = async () => {
    try {
      await init()
    } catch (e) {
      log.error(e)
    }
  }

  if (document.readyState === 'loading') {
    // Document hasn't finished loading yet, so add an event to init when content is loaded
    document.addEventListener('DOMContentLoaded', loaded, {
      once: true,
    })
  } else {
    // `DOMContentLoaded` has already fired, so just run init now (since an event handler will never be called)
    await loaded()
  }
}
