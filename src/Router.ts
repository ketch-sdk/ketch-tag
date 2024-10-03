import {
  Configuration,
  Consent,
  Environment,
  Identities,
  IdentityProvider,
  IPInfo,
  Plugin,
  ShowPreferenceOptions,
  ExperienceOptions,
  ExperienceServer,
  StorageOriginPolicy,
  StorageProvider,
  ConfigurationV2,
  SetConsentReason,
  ShowConsentOptions,
} from '@ketch-sdk/ketch-types'
import log from './log'
import errors from './errors'
import isFunction from './isFunction'
import constants from './constants'
import { Ketch } from './Ketch'
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

  getConfig(): Promise<Configuration> {
    return this._ketch.getConfig()
  }

  getFullConfig(): Promise<ConfigurationV2> {
    return this._ketch.getFullConfig()
  }

  getConsent(): Promise<Consent> {
    return this._ketch.getConsent()
  }

  getEnvironment(): Promise<Environment> {
    return this._ketch.getEnvironment()
  }

  getGeoIP(): Promise<IPInfo> {
    return this._ketch.getGeoIP()
  }

  getIdentities(): Promise<Identities> {
    return this._ketch.getIdentities()
  }

  getJurisdiction(): Promise<string> {
    return this._ketch.getJurisdiction()
  }

  getRegionInfo(): Promise<string> {
    return this._ketch.getRegionInfo()
  }

  onConsent(listener: (...args: any[]) => void): Promise<void> {
    log.debug(`onConsent is deprecated - use ketch("on", "${constants.CONSENT_EVENT}", listener) instead`)
    this._ketch.on(constants.CONSENT_EVENT, listener)
    return Promise.resolve()
  }

  onEnvironment(listener: (...args: any[]) => void): Promise<void> {
    log.debug(`onEnvironment is deprecated - use ketch("on", "${constants.ENVIRONMENT_EVENT}", listener) instead`)
    this._ketch.on(constants.ENVIRONMENT_EVENT, listener)
    return Promise.resolve()
  }

  onGeoIP(listener: (...args: any[]) => void): Promise<void> {
    log.debug(`onGeoIP is deprecated - use ketch("on", "${constants.GEOIP_EVENT}", listener) instead`)
    this._ketch.on(constants.GEOIP_EVENT, listener)
    return Promise.resolve()
  }

  onHideExperience(listener: (...args: any[]) => void): Promise<void> {
    log.debug(
      `onHideExperience is deprecated - use ketch("on", "${constants.HIDE_EXPERIENCE_EVENT}", listener) instead`,
    )
    this._ketch.on(constants.HIDE_EXPERIENCE_EVENT, listener)
    return Promise.resolve()
  }

  onWillShowExperience(listener: (...args: any[]) => void): Promise<void> {
    log.debug(
      'onWillShowExperience is deprecated - use ketch("on", "' +
        constants.WILL_SHOW_EXPERIENCE_EVENT +
        '", listener) instead',
    )
    this._ketch.on(constants.WILL_SHOW_EXPERIENCE_EVENT, listener)
    return Promise.resolve()
  }

  onIdentities(listener: (...args: any[]) => void): Promise<void> {
    log.debug(`onIdentities is deprecated - use ketch("on", "${constants.IDENTITIES_EVENT}", listener) instead`)
    this._ketch.on(constants.IDENTITIES_EVENT, listener)
    return Promise.resolve()
  }

  onJurisdiction(listener: (...args: any[]) => void): Promise<void> {
    log.debug(`onJurisdiction is deprecated - use ketch("on", "${constants.JURISDICTION_EVENT}", listener) instead`)
    this._ketch.on(constants.JURISDICTION_EVENT, listener)
    return Promise.resolve()
  }

  onRegionInfo(listener: (...args: any[]) => void): Promise<void> {
    log.debug(`onRegionInfo is deprecated - use ketch("on", "${constants.REGION_INFO_EVENT}", listener) instead`)
    this._ketch.on(constants.REGION_INFO_EVENT, listener)
    return Promise.resolve()
  }

  setEnvironment(env: Environment): Promise<void> {
    log.warn('setEnvironment is deprecated')
    return this._ketch.setEnvironment(env).then(() => {})
  }

  setGeoIP(g: IPInfo): Promise<void> {
    log.warn('setGeoIP is deprecated')
    return this._ketch.setGeoIP(g).then(() => {})
  }

  setIdentities(id: Identities): Promise<void> {
    log.warn('setIdentities is deprecated')
    return this._ketch.setIdentities(id).then(() => {})
  }

  setJurisdiction(jurisdiction: string): Promise<void> {
    log.warn('setJurisdiction is deprecated')
    return this._ketch.setJurisdiction(jurisdiction).then(() => {})
  }

  setRegionInfo(info: string): Promise<void> {
    log.warn('setRegionInfo is deprecated')
    return this._ketch.setRegionInfo(info).then(() => {})
  }

  showConsent(params: ShowConsentOptions): Promise<void> {
    return this._ketch.showConsentExperience(params).then(() => {})
  }

  showPreferences(params: ShowPreferenceOptions): Promise<void> {
    return this._ketch.showPreferenceExperience(params).then(() => {})
  }

  reinit(): Promise<void> {
    return this._ketch.getConsent().then(() => {})
  }

  handleKeyboardEvent(e: KeyboardEvent): void {
    return this._ketch.handleKeyboardEvent(e)
  }

  returnKeyboardControl() {
    return this._ketch.returnKeyboardControl()
  }

  registerPlugin(plugin: Plugin, config?: any): Promise<void> {
    return this._ketch.registerPlugin(plugin, config)
  }

  registerIdentityProvider(name: string, provider: IdentityProvider): Promise<void> {
    return this._ketch.registerIdentityProvider(name, provider)
  }

  registerExperienceServer(server: ExperienceServer): Promise<void> {
    return this._ketch.registerExperienceServer(server)
  }

  registerStorageProvider(policy: StorageOriginPolicy, provider: StorageProvider): Promise<void> {
    return this._ketch.registerStorageProvider(policy, provider)
  }

  setConsent(consent: Consent, reason?: SetConsentReason): Promise<void> {
    return this._ketch.setConsent(consent, reason).then(() => {})
  }

  showExperience(options: ExperienceOptions): Promise<void> {
    return this._ketch.showExperience(options)
  }

  emit(eventName: string | symbol, ...args: any[]): Promise<void> {
    this._ketch.emit(eventName, ...args)
    return Promise.resolve()
  }

  on(eventName: string | symbol, listener: (...args: any[]) => void): Promise<void> {
    this._ketch.on(eventName, listener)
    return Promise.resolve()
  }

  once(eventName: string | symbol, listener: (...args: any[]) => void): Promise<void> {
    this._ketch.once(eventName, listener)
    return Promise.resolve()
  }

  addListener(eventName: string | symbol, listener: (...args: any[]) => void): Promise<void> {
    this._ketch.addListener(eventName, listener)
    return Promise.resolve()
  }

  removeListener(eventName: string | symbol, listener: (...args: any[]) => void): Promise<void> {
    this._ketch.removeListener(eventName, listener)
    return Promise.resolve()
  }

  off(eventName: string | symbol, listener: (...args: any[]) => void): Promise<void> {
    this._ketch.off(eventName, listener)
    return Promise.resolve()
  }

  removeAllListeners(eventName: string | symbol): Promise<void> {
    this._ketch.removeAllListeners(eventName)
    return Promise.resolve()
  }

  protected readonly _ketch: Ketch
}
