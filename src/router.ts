import {
  Configuration,
  Consent,
  Environment,
  Identities,
  IdentityProvider,
  IPInfo,
  Plugin,
  ShowPreferenceOptions,
} from '@ketch-sdk/ketch-types'
import log from './logging'
import errors from './errors'
import isFunction from './isFunction'
import constants from './constants'
import { Ketch } from './ketch'
import { wrapLogger } from '@ketch-sdk/ketch-logging'

/**
 * Router routes calls from the `ketch()` / `semaphore.push` interface to the internal Ketch interface
 */
export default class Router {
  constructor(ketch: Ketch) {
    this._ketch = ketch
  }

  /**
   * This is the entrypoint that is called by the `ketch()` function. This routes to the appropriate
   * method on the Ketch tag implementation.
   *
   * @param args
   */
  push(args: any[] | string | IArguments | undefined): void {
    if (args === undefined) {
      return
    }

    let fnName: string
    if (typeof args === 'string') {
      fnName = args
      args = []
    } else {
      args = Array.from(args)
      fnName = args.shift()
    }

    log.trace(fnName)

    this.route(fnName, ...args)
      .then(() => {
        log.trace(`${fnName} completed`)
      })
      .catch((reason: any) => {
        log.warn(`${fnName} failed: ${reason}`)
      })
  }

  /**
   * This is the entrypoint for all calls into the platform calling actions from outside.
   */
  async route(fnName: string, ...args: any[]): Promise<void> {
    const l = wrapLogger(wrapLogger(log, 'route'), fnName)

    if (fnName === 'push' || fnName === 'route') {
      throw errors.actionNotFoundError(fnName)
    }

    const fn = (this as any)[fnName]
    if (fn === undefined) {
      throw errors.actionNotFoundError(fnName)
    }

    l.debug(args, args.length, fn.length)

    if (args.length <= fn.length) {
      return fn.apply(this, args)
    }

    if (args.length == fn.length + 1) {
      const resolve = args.pop()
      if (!isFunction(resolve)) {
        throw errors.expectedFunctionError(fnName)
      }

      return fn.apply(this, args).then(resolve)
    }

    const reject = args.pop()
    if (!isFunction(reject)) {
      throw errors.expectedFunctionError(fnName)
    }

    const resolve = args.pop()
    if (!isFunction(resolve)) {
      throw errors.expectedFunctionError(fnName)
    }

    return fn.apply(this, args).then(resolve).catch(reject)
  }

  async getConfig(): Promise<Configuration> {
    return this._ketch.getConfig()
  }

  async getConsent(): Promise<Consent> {
    return this._ketch.getConsent()
  }

  async getEnvironment(): Promise<Environment> {
    return this._ketch.getEnvironment()
  }

  async getGeoIP(): Promise<IPInfo> {
    return this._ketch.getGeoIP()
  }

  async getIdentities(): Promise<Identities> {
    return this._ketch.getIdentities()
  }

  async getJurisdiction(): Promise<string> {
    return this._ketch.getJurisdiction()
  }

  async getRegionInfo(): Promise<string> {
    return this._ketch.getRegionInfo()
  }

  async onConsent(listener: (...args: any[]) => void): Promise<void> {
    this._ketch.on(constants.CONSENT_EVENT, listener)
  }

  async onEnvironment(listener: (...args: any[]) => void): Promise<void> {
    this._ketch.on(constants.ENVIRONMENT_EVENT, listener)
  }

  async onGeoIP(listener: (...args: any[]) => void): Promise<void> {
    this._ketch.on(constants.GEOIP_EVENT, listener)
  }

  async onHideExperience(listener: (...args: any[]) => void): Promise<void> {
    this._ketch.on(constants.HIDE_EXPERIENCE_EVENT, listener)
  }

  async onWillShowExperience(listener: (...args: any[]) => void): Promise<void> {
    this._ketch.on(constants.WILL_SHOW_EXPERIENCE_EVENT, listener)
  }

  async onIdentities(listener: (...args: any[]) => void): Promise<void> {
    this._ketch.on(constants.IDENTITIES_EVENT, listener)
  }

  async onJurisdiction(listener: (...args: any[]) => void): Promise<void> {
    this._ketch.on(constants.JURISDICTION_EVENT, listener)
  }

  async onRegionInfo(listener: (...args: any[]) => void): Promise<void> {
    this._ketch.on(constants.REGION_INFO_EVENT, listener)
  }

  async setEnvironment(env: Environment): Promise<void> {
    return this._ketch.setEnvironment(env).then(() => {})
  }

  async setGeoIP(g: IPInfo): Promise<void> {
    return this._ketch.setGeoIP(g).then(() => {})
  }

  async setIdentities(id: Identities): Promise<void> {
    return this._ketch.setIdentities(id).then(() => {})
  }

  async setJurisdiction(jurisdiction: string): Promise<void> {
    return this._ketch.setJurisdiction(jurisdiction).then(() => {})
  }

  async setRegionInfo(info: string): Promise<void> {
    return this._ketch.setRegionInfo(info).then(() => {})
  }

  async showConsentExperience(): Promise<Consent> {
    return this._ketch.showConsentExperience()
  }

  async showPreferenceExperience(params: ShowPreferenceOptions): Promise<Consent> {
    return this._ketch.showPreferenceExperience(params)
  }

  async registerPlugin(plugin: Plugin, config?: any): Promise<void> {
    return this._ketch.registerPlugin(plugin, config).then(() => {})
  }

  async registerIdentityProvider(name: string, provider: IdentityProvider): Promise<void> {
    return this._ketch.registerIdentityProvider(name, provider).then(() => {})
  }

  async emit(eventName: string | symbol, ...args: any[]): Promise<void> {
    this._ketch.emit(eventName, ...args)
  }

  async on(eventName: string | symbol, listener: (...args: any[]) => void): Promise<void> {
    this._ketch.on(eventName, listener)
  }

  async once(eventName: string | symbol, listener: (...args: any[]) => void): Promise<void> {
    this._ketch.once(eventName, listener)
  }

  private readonly _ketch: Ketch
}
