import { Configuration, ConfigurationV2 } from '@ketch-sdk/ketch-types'
import { Ketch } from './Ketch'
import log from './log'
import { wrapLogger } from '@ketch-sdk/ketch-logging'
import { addToKetchLog } from './Console'
import constants from './constants'

export default class CookieBlocker {
  private readonly _ketch: Ketch
  private readonly _config: ConfigurationV2
  private _blockedCookies: Set<string> = new Set<string>()

  constructor(ketch: Ketch, config: Configuration | ConfigurationV2) {
    this._ketch = ketch
    this._config = config as ConfigurationV2

    // Add a listener to retry whenever consent is updated
    this._ketch.on(constants.CONSENT_EVENT, () => this.execute())
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

    // Get all cookies
    const cookies = document.cookie.split(';')
    if (!cookies.length) {
      l.debug('no browser cookies')
      return Array.from(this._blockedCookies)
    }

    // Get set of purposes codes which we have consent for
    const grantedPurposes = await this.getGrantedPurposes()
    l.debug('granted purposes', grantedPurposes)

    // Loop over each blocked cookie from the config
    Object.entries(this._config.blockedCookies || {}).forEach(([cookieKey, { purposeCodes, regex }]) => {
      // Skip cookies which we have consent for
      if (purposeCodes.some(purposeCode => grantedPurposes.has(purposeCode))) {
        l.debug(`not blocking ${cookieKey} as consent is granted for one of its purposes`)
        return
      }

      // Get RegExp from string
      const regexPattern = new RegExp(regex || '') // Convert regex to regular expression type

      // Delete all cookies that match the pattern
      cookies.forEach(cookie => {
        const [name, _] = cookie.trim().split('=')
        /**
         * Delete cookie if not already deleted AND either:
         *   - We have a regex pattern and the cookie name matches that pattern, or
         *   - We don't have a regex pattern and the cookie name matches the cookie key exactly
         */
        if (!this._blockedCookies.has(name) && ((regex && regexPattern.test(name)) || (!regex && name === cookieKey))) {
          // Delete the cookie by setting its expiration date to the past, 01 Jan 1970 is convention for deleting cookies
          document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`
          this._blockedCookies.add(name)
          l.debug(`Deleted cookie: ${name}`)
        }
      })
    })

    // Add window.KetchLog.getBlockedCookies utility function
    addToKetchLog('getBlockedCookies', () => {
      // Log results
      console.group(`Blocked Cookies (${this._blockedCookies.size}) 🍪`)
      if (!this._blockedCookies.size) console.log('No blocked cookies')
      this._blockedCookies.forEach(cookie => console.log(cookie))
      console.groupEnd()
    })

    return Array.from(this._blockedCookies)
  }
}
