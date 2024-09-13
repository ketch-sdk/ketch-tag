import { Configuration, ConfigurationV2 } from '@ketch-sdk/ketch-types'
import { Ketch } from './Ketch'
import log from './log'
import { wrapLogger } from '@ketch-sdk/ketch-logging'
import { addToKetchLog } from './Console'

export default class CookieBlocker {
  private readonly _ketch: Ketch
  private readonly _config: ConfigurationV2

  constructor(ketch: Ketch, config: Configuration | ConfigurationV2) {
    this._ketch = ketch
    this._config = config as ConfigurationV2
  }

  // Return a promise containing the set of purposes codes for which we have consent
  getGrantedPurposes: () => Promise<Set<string>> = async () => {
    const l = wrapLogger(log, 'CookieBlocker: getGrantedPurposes')
    const consent = await this._ketch.getConsent()
    const purposes = consent?.purposes || {}
    l.debug('got consent purposes', purposes)
    const grantedPurposes = new Set(Object.keys(purposes).filter(key => purposes[key] === true))
    return grantedPurposes
  }

  execute: () => Promise<string[]> = async () => {
    const l = wrapLogger(log, 'CookieBlocker: execute')
    const blockedCookies: string[] = []

    // Get all cookies
    const cookies = document.cookie.split(';')
    if (!cookies.length) {
      l.debug('no browser cookies')
      return blockedCookies
    }

    // Get set of purposes codes which we have consent for
    const grantedPurposes = await this.getGrantedPurposes()
    l.debug('granted purposes', grantedPurposes)

    // Loop over each blocked cookie from the config
    Object.entries(this._config.blockedCookies || {}).forEach(([cookiekey, { purposeCodes, regex }]) => {
      // Skip cookies which we have consent for
      if (purposeCodes.some(purposeCode => grantedPurposes.has(purposeCode))) {
        l.debug(`not blocking ${cookiekey} as consent is granted for one of its purposes`)
        return
      }

      // Get RegExp from string
      const regexPattern = new RegExp(regex) // Convert regex to regular expression type

      // Delete all cookies that match the pattern
      cookies.forEach(cookie => {
        const [name, _] = cookie.split('=')
        if (regexPattern.test(name)) {
          // Delete the cookie by setting its expiration date to the past, 01 Jan 1970 is convention for deleting cookies
          document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`
          blockedCookies.push(name)
          l.debug(`Deleted cookie: ${name}`)
        }
      })
    })

    // Add window.KetchLog.getBlockedCookies utility function
    addToKetchLog('getBlockedCookies', () => {
      // Log results
      console.group(`Blocked Cookies (${blockedCookies.length})`)
      blockedCookies.forEach(cookie => console.log(cookie))
      console.groupEnd()
    })

    return blockedCookies
  }
}
