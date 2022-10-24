import errors from './errors'
import log from './logging'

/**
 * Get a value from a cookie by the key.
 *
 * @param key
 */
export function getCookie(key: string): Promise<string> {
  log.trace('getItem', key)

  return new Promise((resolve, reject) => {
    try {
      const v = window.document.cookie.split('; ').reduce((r, v) => {
        const parts = v.split('=')
        return parts[0] === key ? decodeURIComponent(parts[1]) : r
      }, '')

      if (v) {
        resolve(v)
      } else {
        reject(errors.itemNotFoundError)
      }
    } catch (e) {
      reject(e)
    }
  })
}

/**
 * Set the value against the given key
 *
 * @param key
 * @param value
 * @param ttl
 */
export function setCookie(key: string, value: any, ttl?: number): Promise<string> {
  log.trace('setItem', key, value)

  const days = ttl || 1
  const expires = new Date(Date.now() + days * 864e5).toUTCString()
  const hostnameParts = window.document.location.hostname.split('.')

  return new Promise((resolve, reject) => {
    try {
      // try to set cookie for last i parts of the domain
      // if cookie not found (likely because domain in public suffix list), retry with an additional part on the domain
      for (let i = 2; i <= hostnameParts.length; i++) {
        // set cookie
        window.document.cookie =
          key +
          '=' +
          encodeURIComponent(value) +
          '; expires=' +
          expires +
          '; path=/; domain=' +
          hostnameParts.slice(-1 * i).join('.')

        // get cookie
        const v = window.document.cookie.split('; ').reduce((r, v) => {
          const parts = v.split('=')
          return parts[0] === key ? decodeURIComponent(parts[1]) : r
        }, '')

        // resolve if set, otherwise retry with an additional part on the domain
        if (v) {
          return resolve(value)
        }
      }

      // set cookie without domain if hostnameParts.length < 2 or other error
      window.document.cookie = key + '=' + encodeURIComponent(value) + '; expires=' + expires + '; path=/'

      resolve(value)
    } catch (e) {
      reject(e)
    }
  })
}
