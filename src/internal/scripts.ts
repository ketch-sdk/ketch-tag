import loglevel from './logging'
const log = loglevel.getLogger('scripts')

/**
 * Load the script specified by the given src.
 *
 * @param src
 */
export async function load(src: string): Promise<any> {
  log.trace('load', src)

  return new Promise((resolve, reject) => {
    log.trace('loaded', src)

    const head = document.getElementsByTagName('head')[0]

    const elem: HTMLScriptElement = document.createElement('script')
    elem.src = src
    elem.onerror = reject
    elem.addEventListener('load', resolve, false)
    head.appendChild(elem)
  })
}
