import { EventEmitter } from 'events'
import { KetchWebAPI } from '@ketch-sdk/ketch-web-api'
import Future from '@ketch-com/future'
import {
  AppDiv,
  Callback,
  Configuration,
  Consent,
  Environment,
  GetLocationResponse,
  Identities,
  InvokeRightRequest,
  InvokeRightEvent,
  IPInfo,
  Plugin,
  ShowPreferenceOptions,
  SetConsentRequest,
  ShowConsentExperience,
  ShowPreferenceExperience,
  DataSubject,
  GetConsentRequest,
} from '@ketch-sdk/ketch-types'
import dataLayer, { tealiumKetchPermitData } from './datalayer'
import isEmpty from './isEmpty'
import log from './logging'
import errors from './errors'
import parameters from './parameters'
import { getCookie, setCookie } from './cookie'
import { v4 as uuidv4 } from 'uuid'
import getApiUrl from './getApiUrl'

/**
 * ExperienceType is the type of experience that will be shown
 */
export enum ExperienceType {
  Consent = 'experiences.consent',
  Preference = 'experiences.preference',
}

/**
 * ConsentExperienceType is the type of consent experience that will be shown
 */
export enum ConsentExperienceType {
  Banner = 'experiences.consent.banner',
  Modal = 'experiences.consent.modal',
  JIT = 'experiences.consent.jit',
}

/**
 * ExperienceHidden is the reason for which the experience is hidden
 *
 * A plugin that displays an experience will indicate whether an experience
 * is closed after a user sets consent, invokes a right, or closes the experience
 * without taking an explicit action
 *
 * ketch-tag will determine if an experience will not be shown
 */
export enum ExperienceHidden {
  SetConsent = 'setConsent',
  InvokeRight = 'invokeRight',
  Close = 'close',
  WillNotShow = 'willNotShow',
}

declare global {
  type AndroidListeners = {
    [name: string]: AndroidListener
  }

  type AndroidListener = {
    (args?: any): void
  }

  type WKHandler = {
    postMessage(args?: any): void
  }

  type WebKit = {
    messageHandlers: { [name: string]: WKHandler }
  }

  interface Window {
    androidListener: AndroidListeners
    webkit: WebKit
  }
}

/**
 * Ketch class is the public interface to the Ketch web infrastructure services.
 */
export class Ketch extends EventEmitter {
  /**
   * @internal
   */
  private readonly _config: Configuration

  /**
   * @internal
   */
  private readonly _consent: Future<Consent>

  /**
   * @internal
   */
  private readonly _environment: Future<Environment>

  /**
   * @internal
   */
  private readonly _geoip: Future<IPInfo>

  /**
   * @internal
   */
  private readonly _identities: Future<Identities>

  /**
   * @internal
   */
  private readonly _jurisdiction: Future<string>

  /**
   * @internal
   */
  private readonly _regionInfo: Future<string>

  /**
   * @internal
   */
  private _shouldConsentExperienceShow: boolean

  /**
   * @internal
   */
  private _provisionalConsent?: Consent

  /**
   * appDivs is a list of hidden popup div ids and zIndexes as defined in AppDiv
   *
   * @internal
   */
  private _appDivs: AppDiv[]

  /**
   * isExperienceDisplayed is a bool representing whether an experience is currently showing
   *
   * @internal
   */
  private _isExperienceDisplayed?: boolean

  /**
   * hasExperienceBeenDisplayed is a bool representing whether an experience has been shown in a session
   *
   * @internal
   */
  private _hasExperienceBeenDisplayed?: boolean

  /**
   * @internal
   */
  private _api: KetchWebAPI

  /**
   * Constructor for Ketch takes the configuration object. All other operations are driven by the configuration
   * provided.
   *
   * @param config Ketch configuration
   */
  constructor(config: Configuration) {
    super()
    this._config = config
    this._consent = new Future<Consent>({ name: 'consent', emitter: this })
    this._environment = new Future<Environment>({ name: 'environment', emitter: this })
    this._geoip = new Future({ name: 'geoip', emitter: this })
    this._identities = new Future<Identities>({ name: 'identities', emitter: this })
    this._jurisdiction = new Future<string>({ name: 'jurisdiction', emitter: this })
    this._regionInfo = new Future<string>({ name: 'regionInfo', emitter: this })
    this._appDivs = []
    this._shouldConsentExperienceShow = false
    this._provisionalConsent = undefined
    this._api = new KetchWebAPI(getApiUrl(config))
  }

  /**
   * Registers a plugin
   *
   * @param plugin The plugin to register
   * @param config The plugin config
   */
  async registerPlugin(plugin: Plugin, config?: any): Promise<void> {
    return plugin(this, config)
  }

  /**
   * Returns the configuration.
   */
  async getConfig(): Promise<Configuration> {
    return Promise.resolve(this._config)
  }

  /**
   * Determines if we should show the consent dialog.
   *
   * @param c Consent to be used
   */
  shouldShowConsent(c: Consent): boolean {
    if (this._shouldConsentExperienceShow) {
      log.debug('shouldShowConsent', true)
      this._shouldConsentExperienceShow = false
      return true
    }
    if (this._config.purposes) {
      for (const p of this._config.purposes) {
        if (c.purposes[p.code] === undefined) {
          log.debug('shouldShowConsent', true)
          return true
        }
      }
    }

    // check if experience has not displayed and show parameter override set
    if (parameters.has(parameters.SHOW, window.location.search) && !this._hasExperienceBeenDisplayed) {
      log.debug('shouldShowConsent', true)
      return true
    }

    log.debug('shouldShowConsent', false)
    return false
  }

  /**
   * Selects the correct experience.
   *
   */
  selectExperience(): ConsentExperienceType {
    if (this._config.purposes) {
      for (const pa of this._config.purposes) {
        if (pa.requiresOptIn) {
          if (this._config.experiences?.consent?.experienceDefault == 2) {
            log.debug('selectExperience', 'experiences.consent.modal')
            return ConsentExperienceType.Modal
          }
        }
      }
    }

    log.debug('selectExperience', 'experiences.consent.banner')
    return ConsentExperienceType.Banner
  }

  /**
   * Signals that an experience will be shown
   *
   * @param type The type of experience to be shown
   */
  willShowExperience(type: string): void {
    if (this._config.options?.appDivs) {
      const appDivList = this._config.options.appDivs.split(',')
      for (const divID of appDivList) {
        const div = document.getElementById(divID)
        if (div) {
          this._appDivs.push({ id: divID, zIndex: div.style.zIndex })
          div.style.zIndex = '-1'
        }
      }
    }

    // Call functions registered using onWillShowExperience
    this.emit('willShowExperience', type)

    // update isExperienceDisplayed flag when experience displayed
    this._isExperienceDisplayed = true
  }

  /**
   * Shows the consent manager.
   */
  async showConsentExperience(): Promise<Consent> {
    log.info('showConsentExperience')

    const consent = this._consent.isFulfilled() ? this._consent.value : ({ purposes: {}, vendors: [] } as Consent)

    if (this.listenerCount('showConsentExperience') > 0) {
      this.willShowExperience(ExperienceType.Consent)
      this.emit('showConsentExperience', this, this._config, consent, { displayHint: this.selectExperience() })
    }

    return consent
  }

  /**
   * Returns true if the consent is available.
   */
  hasConsent(): boolean {
    return this._consent.isFulfilled()
  }

  /**
   * Trigger ketchPermitChanged event by pushing updated permit values to dataLayer
   *
   * @param c Consent
   */
  triggerPermitChangedEvent(c: Consent): void {
    log.info('triggerPermitChangedEvent')

    const permitChangedEvent: { [key: string]: any } = {
      event: 'ketchPermitChanged',
    }

    const swbPermitChangedEvent: { [key: string]: any } = {
      event: 'switchbitPermitChanged',
    }

    let tealiumKetchDataLayer: any = tealiumKetchPermitData()

    for (const purposeCode in c.purposes) {
      permitChangedEvent[purposeCode] = c.purposes[purposeCode]
      swbPermitChangedEvent[purposeCode] = c.purposes[purposeCode]
      tealiumKetchDataLayer[purposeCode] = c.purposes[purposeCode] ? '1' : '0'
    }

    dataLayer().push(permitChangedEvent)
    dataLayer().push(swbPermitChangedEvent)
  }

  /**
   * Called when experience renderer tells us the user has updated consent.
   *
   * @param consent Consent to change
   */
  async changeConsent(consent: Consent): Promise<any> {
    // check for new identifiers for tags that may fire after consent collected
    this.pollIdentity([4000, 8000])

    return this.setConsent(consent)
  }

  /**
   * Updates the client _consent value.
   *
   * @param c Consent to update
   */
  async updateClientConsent(c: Consent): Promise<Consent> {
    log.info('updateClientConsent', c)

    if (!c || isEmpty(c)) {
      this._consent.reset()
      return {} as Consent
    }

    // Merge new consent into existing consent
    if (this.hasConsent()) {
      const existingConsent = this._consent.value
      if (existingConsent) {
        for (const key in existingConsent) {
          if (
            Object.prototype.hasOwnProperty.call(existingConsent, key) &&
            !Object.prototype.hasOwnProperty.call(c, key)
          ) {
            c.purposes[key] = existingConsent.purposes[key]
          }
        }
      }
    }

    // trigger ketchPermitChanged event by pushing updated permit values to dataLayer
    this.triggerPermitChangedEvent(c)

    // TODO server side signing
    sessionStorage.setItem('consent', JSON.stringify(c))

    this._consent.value = c
    return c
  }

  /**
   * Sets the consent.
   *
   * @param c Consent to set
   */
  async setConsent(c: Consent): Promise<Consent> {
    log.info('setConsent', c)

    await this.updateClientConsent(c)

    const identities = await this.getIdentities()

    await this.updateConsent(identities, c)

    return c
  }

  /**
   * Set to show consent experience
   *
   */
  async setShowConsentExperience(): Promise<void> {
    this._shouldConsentExperienceShow = true
  }

  /**
   * Set to provisional consent.
   *
   * @param c Consent to set
   */
  async setProvisionalConsent(c: Consent): Promise<void> {
    this._provisionalConsent = c
  }

  /**
   * override provisional consent on retrieved consent from the server.
   *
   * @param c current consent
   * @param provisionalConsent the provisional consent
   */
  async overrideWithProvisionalConsent(c: Consent, provisionalConsent: Consent): Promise<Consent> {
    return new Promise(resolve => {
      if (!provisionalConsent) {
        resolve(c)
      }
      for (const key in provisionalConsent.purposes) {
        c.purposes[key] = provisionalConsent.purposes[key]
      }
      resolve(c)
    })
  }

  /**
   * Merge session consent.
   *
   * This will merge consent retrieved from the server with consent stored in the client side session
   * to ensure that consent is consistent within a client session. If the session consent has consent
   * values that the server consent does not contain, setConsent will be called to update the server.
   *
   * Otherwise, the client consent object and the session consent will be updated by calling
   * updateClientConsent.
   *
   * @param c current consent
   * @param sessionConsent sessionConsent
   */
  async mergeSessionConsent(c: Consent, sessionConsent: Consent): Promise<Consent> {
    log.info('mergeSessionConsent', c, sessionConsent)

    if (!sessionConsent || !c) {
      return this.updateClientConsent(c)
    }

    // get possible config purposes as a set
    const configPurposes: { [key: string]: boolean } = {}
    if (this._config.purposes) {
      for (const p of this._config.purposes) {
        configPurposes[p.code] = true
      }
    }

    let shouldCreatePermits = false
    for (const key in sessionConsent.purposes) {
      // check if sessionConsent has additional values
      if (
        Object.prototype.hasOwnProperty.call(sessionConsent.purposes, key) &&
        !Object.prototype.hasOwnProperty.call(c.purposes, key)
      ) {
        // confirm purpose code in config
        if (configPurposes[key]) {
          c.purposes[key] = sessionConsent.purposes[key]
          shouldCreatePermits = true
        }
      }
    }

    if (shouldCreatePermits) {
      return this.setConsent(c)
    }

    return this.updateClientConsent(c)
  }

  /**
   * Gets the consent.
   */
  async getConsent(): Promise<Consent> {
    log.info('getConsent')

    if (this.hasConsent()) {
      return this._consent.fulfilled
    }

    // get session consent
    // TODO server side signing
    const sessionConsentString = sessionStorage.getItem('consent')
    const sessionConsent = sessionConsentString ? JSON.parse(sessionConsentString) : undefined

    const identities = await this.getIdentities()

    let c = await this.fetchConsent(identities)
    c = await this.overrideWithProvisionalConsent(c, this._provisionalConsent!)
    if (sessionConsent) {
      c = await this.mergeSessionConsent(c, sessionConsent)
    }

    this._provisionalConsent = undefined
    let shouldCreatePermits = false

    // check if shouldShowConsent before populating permits
    const displayConsent = this.shouldShowConsent(c)

    // populate disclosure permits that are undefined
    if (this._config.purposes) {
      for (const p of this._config.purposes) {
        if (c.purposes[p.code] === undefined && !p.requiresOptIn) {
          c.purposes[p.code] = true
          shouldCreatePermits = true
        }
      }
    }

    shouldCreatePermits ? await this.setConsent(c) : await this.updateClientConsent(c)

    // first set consent value then proceed to show experience and/or create permits
    if (displayConsent) {
      return this.showConsentExperience()
    }

    // experience will not show - call functions registered using onHideExperience
    this.emit('hideExperience', ExperienceHidden.WillNotShow)

    return this._consent.value
  }

  /**
   * Retrieve the consent for subsequent calls.
   */
  async retrieveConsent(): Promise<Consent> {
    log.info('retrieveConsent')

    if (this._consent.isFulfilled()) {
      return this._consent.fulfilled
    }

    return { purposes: {}, vendors: [] }
  }

  /**
   * Registers a callback for consent change notifications.
   *
   * @param callback The consent callback to register
   */
  async onConsent(callback: Callback): Promise<void> {
    this.on('consent', callback)
  }

  /**
   * Registers a callback for right invocations.
   *
   * @param callback The right callback to register
   */
  async onInvokeRight(callback: Callback): Promise<void> {
    this.on('rightInvoked', callback)
  }

  /**
   * Get the consent.
   *
   * @param identities Identities to fetch consent for
   */
  async fetchConsent(identities: Identities): Promise<Consent> {
    log.debug('getConsent', identities)

    // If no identities or purposes defined, skip the call.
    if (!identities || Object.keys(identities).length === 0) {
      throw errors.noIdentitiesError
    }

    if (
      !this._config ||
      !this._config.property ||
      !this._config.organization ||
      !this._config.environment ||
      !this._config.purposes ||
      !this._config.jurisdiction ||
      this._config.purposes.length === 0
    ) {
      throw errors.noPurposesError
    }

    const request: GetConsentRequest = {
      organizationCode: this._config.organization.code || '',
      propertyCode: this._config.property.code || '',
      environmentCode: this._config.environment.code,
      jurisdictionCode: this._config.jurisdiction.code || '',
      controllerCode: '',
      identities: identities,
      purposes: {},
    }

    // Add the purposes by ID with the legal basis
    for (const pa of this._config.purposes) {
      request.purposes[pa.code] = {
        legalBasisCode: pa.legalBasisCode,
      }
    }

    const consent = await this._api.getConsent(request)
    const newConsent: Consent = { purposes: {} }

    if (this._config.purposes && consent.purposes) {
      for (const p of this._config.purposes) {
        if (consent.purposes[p.code]) {
          const x = consent.purposes[p.code]
          if (typeof x === 'string') {
            newConsent.purposes[p.code] = x === 'true'
          } else if (x.allowed) {
            newConsent.purposes[p.code] = x.allowed === 'true'
          }
        }
      }
    }

    if (consent.vendors) {
      newConsent.vendors = consent.vendors
    }

    return newConsent
  }

  /**
   * Update consent.
   *
   * @param identities Identities to update consent for
   * @param consent Consent to update
   */
  async updateConsent(identities: Identities, consent: Consent): Promise<void> {
    log.debug('updateConsent', identities, consent)

    // If no identities or purposes defined, skip the call.
    if (!identities || Object.keys(identities).length === 0) {
      log.debug('updateConsent', 'skipping')
      return Promise.resolve()
    }

    if (
      !this._config ||
      !this._config.organization ||
      !this._config.property ||
      !this._config.environment ||
      !this._config.jurisdiction ||
      !this._config.purposes ||
      this._config.purposes.length === 0
    ) {
      log.debug('updateConsent', 'skipping')
      return Promise.resolve()
    }

    if (isEmpty(consent)) {
      log.debug('updateConsent', 'skipping')
      return Promise.resolve()
    }

    const request: SetConsentRequest = {
      organizationCode: this._config.organization.code || '',
      propertyCode: this._config.property.code || '',
      environmentCode: this._config.environment.code,
      controllerCode: '',
      identities: identities,
      jurisdictionCode: this._config.jurisdiction.code || '',
      purposes: {},
      migrationOption: 0,
      vendors: consent.vendors,
    }

    if (this._config.options) {
      request.migrationOption = parseInt(String(this._config.options.migration))
    }

    if (this._config.purposes && consent) {
      for (const p of this._config.purposes) {
        if (consent.purposes[p.code] !== undefined) {
          request.purposes[p.code] = {
            allowed: consent.purposes[p.code].toString(),
            legalBasisCode: p.legalBasisCode,
          }
        }
      }
    }

    // Make sure we actually got purposes to update
    if (isEmpty(request.purposes)) {
      log.debug('updateConsent', 'calculated consents empty')
      return Promise.resolve()
    }

    return this._api.setConsent(request)
  }

  /**
   * Set the environment.
   *
   * @param env Environment to set
   */
  async setEnvironment(env: Environment): Promise<Environment> {
    log.info('setEnvironment', env)
    this._environment.value = env
    return this._environment.fulfilled
  }

  /**
   * Detect the current environment. It will first look at the query string for any specified environment,
   * then it will iterate through the environment specifications to match based on the environment pattern.
   */
  async detectEnvironment(): Promise<Environment> {
    log.info('detectEnvironment')

    // We have to have environments
    if (!this._config.environments) {
      log.debug('detectEnvironment', 'no environments')
      throw errors.noEnvironmentError
    }

    // Try to locate the specifiedEnv
    const specifiedEnv = parameters.get(parameters.ENV, window.location.search)
    if (specifiedEnv) {
      for (let i = 0; i < this._config.environments.length; i++) {
        const e = this._config.environments[i]

        if (e && specifiedEnv && e.code === specifiedEnv) {
          log.debug('found', e)
          return this.setEnvironment(e)
        }
      }

      log.error('not found', specifiedEnv)
      throw errors.noEnvironmentError
    }

    // Try to locate based on pattern
    let environment = {} as Environment
    for (let i = 0; i < this._config.environments.length; i++) {
      const e = this._config.environments[i]
      const pattern = atob(e.pattern || '')

      if (
        pattern &&
        new RegExp(pattern).test(window.document.location.href) &&
        (!environment.pattern || pattern.length > atob(environment.pattern).length)
      ) {
        environment = e
      }
    }

    // match pattern
    if (environment.pattern) {
      log.debug('matched', environment)
      return this.setEnvironment(environment)
    }

    // Finally, try to locate production
    for (let i = 0; i < this._config.environments.length; i++) {
      const e = this._config.environments[i]

      if (e.code === 'production') {
        log.debug(e.code, e)
        return this.setEnvironment(e)
      }
    }

    throw errors.noEnvironmentError
  }

  /**
   * Get the environment.
   */
  async getEnvironment(): Promise<Environment> {
    log.info('getEnvironment')

    if (this._environment.isFulfilled()) {
      return this._environment.fulfilled
    } else {
      const env = await this.detectEnvironment()
      return this.setEnvironment(env)
    }
  }

  /**
   * Registers a callback for environment change notifications.
   *
   * @param callback Environment callback to register
   */
  async onEnvironment(callback: Callback): Promise<void> {
    this.on('environment', callback)
  }

  /**
   * Push the IPInfo to data layer.
   *
   * @param g IPInfo
   */
  pushGeoIP(g: IPInfo): number {
    log.info('pushGeoIP', g)

    const GeoipEvent = {
      event: 'ketchGeoip',
      ip: g.ip,
      countryCode: g.countryCode,
      regionCode: g.regionCode,
    }

    return dataLayer().push(GeoipEvent)
  }

  /**
   * Set the IPInfo.
   *
   * @param g IPInfo
   */
  async setGeoIP(g: IPInfo): Promise<IPInfo> {
    log.info('setGeoIP', g)
    this.pushGeoIP(g)
    return this._geoip.fulfilled
  }

  /**
   * Loads the IPInfo.
   */
  async loadGeoIP(): Promise<GetLocationResponse> {
    log.info('loadGeoIP')

    return this._api.getLocation()
  }

  /**
   * Gets the IPInfo.
   */
  async getGeoIP(): Promise<IPInfo> {
    log.info('getGeoIP')

    if (this._geoip.isFulfilled()) {
      return this._geoip.fulfilled
    } else {
      const r = await this.loadGeoIP()
      return this.setGeoIP(r.location)
    }
  }

  /**
   * Registers a callback for GeoIP change notifications.
   *
   * @param callback GeoIP callback to register
   */
  async onGeoIP(callback: Callback): Promise<void> {
    this.on('geoip', callback)
  }

  /**
   * Sets the identities.
   *
   * @param id Identities to set
   */
  async setIdentities(id: Identities): Promise<Identities> {
    log.info('setIdentities', id)

    this._identities.value = id
    return this._identities.fulfilled
  }

  /**
   * Get a window property.
   *
   * @param p Property name
   */
  getProperty(p: string): string | null {
    const parts: string[] = p.split('.')
    let context: any = window
    let previousContext: any = null

    while (parts.length > 0) {
      if (parts[0] === 'window') {
        parts.shift()
      } else if (typeof context === 'object') {
        if (parts[0].slice(-2) === '()') {
          previousContext = context
          context = context[(parts[0] as string).slice(0, -2)]
        } else {
          previousContext = context
          context = context[parts.shift() as string]
        }
      } else if (typeof context === 'function') {
        const newContext = context.call(previousContext)
        previousContext = context
        context = newContext
        parts.shift()
      } else {
        return null
      }
    }

    if (context && typeof context === 'number') {
      context = context.toString()
    }

    return context
  }

  /**
   * Collect identities.
   */
  async collectIdentities(): Promise<Identities> {
    log.info('collectIdentities')

    const configIDs = this._config.identities

    if (!this._config || !this._config.organization || configIDs === undefined || isEmpty(configIDs)) {
      return Promise.resolve({})
    }

    const windowProperties: any[] = []
    const dataLayerProperties: any[] = []
    const cookieProperties: any[] = []
    const managedCookieProperties: any[] = []
    const promises: Promise<string[]>[] = []

    for (const id in configIDs) {
      if (Object.prototype.hasOwnProperty.call(configIDs, id)) {
        switch (configIDs[id].type) {
          case 'window':
            windowProperties.push([id, configIDs[id].variable])
            break

          case 'cookie':
            cookieProperties.push([id, configIDs[id].variable])
            break

          case 'managedCookie':
            managedCookieProperties.push([id, configIDs[id].variable])
            break

          default:
            dataLayerProperties.push([id, configIDs[id].variable])
            break
        }
      }
    }

    if (windowProperties.length > 0) {
      for (const p of windowProperties) {
        const pv = this.getProperty(p[1])
        if (!pv) continue

        promises.push(Promise.resolve([p[0], pv]))
      }
    }

    if (dataLayerProperties.length > 0) {
      for (const dl of dataLayer()) {
        for (const p of dataLayerProperties) {
          if (Object.prototype.hasOwnProperty.call(dl, p[1])) {
            const pv = dl[p[1]]
            if (!pv) continue

            promises.push(Promise.resolve([p[0], pv]))
          }
        }
      }
    }

    if (cookieProperties.length > 0) {
      for (const p of cookieProperties) {
        promises.push(
          getCookie(p[1]).then(
            pv => {
              return [p[0], pv]
            },
            error => {
              log.trace(error)
              return []
            },
          ),
        )
      }
    }

    if (managedCookieProperties.length > 0) {
      for (const p of managedCookieProperties) {
        promises.push(
          getCookie(p[1]).then(
            pv => {
              return [p[0], pv]
            },
            () => {
              return setCookie(p[1], uuidv4(), 730).then(
                pv => {
                  return [p[0], pv]
                },
                error => {
                  log.trace(error)
                  return []
                },
              )
            },
          ),
        )
      }
    }

    const identities = {} as Identities
    return Promise.all(promises).then(items => {
      for (const item of items) {
        if (item.length === 2) {
          if (!!item[1] && item[1] !== '0') {
            identities[item[0]] = item[1]
          }
        }
      }
      return identities
    })
  }

  /**
   * Get the identities.
   */
  async getIdentities(): Promise<Identities> {
    log.info('getIdentities')

    if (this._identities.isFulfilled()) {
      return this._identities.fulfilled
    } else {
      const id = await this.collectIdentities()
      return this.setIdentities(id)
    }
  }

  /**
   * Registers a callback for identity change notifications.
   *
   * @param callback Identities callback to register
   */
  async onIdentities(callback: Callback): Promise<void> {
    this.on('identities', callback)
  }

  /**
   * Push the JurisdictionInfo to data layer.
   *
   * @param ps Jurisdiction to push
   */
  pushJurisdiction(ps: string): void {
    log.info('pushJurisdiction', ps)

    const JurisdictionEvent = {
      event: 'ketchJurisdiction',
      jurisdictionCode: ps,
    }

    dataLayer().push(JurisdictionEvent)
  }

  /**
   * Set the policy scope.
   *
   * @param ps Jurisdiction to set
   */
  async setJurisdiction(ps: string): Promise<string> {
    log.info('setJurisdiction', ps)

    this.pushJurisdiction(ps)
    this._jurisdiction.value = ps
    return this._jurisdiction.fulfilled
  }

  /**
   * Get the policy scope.
   */
  async getJurisdiction(): Promise<string> {
    log.info('getJurisdiction')

    if (this._jurisdiction.isFulfilled()) {
      return this._jurisdiction.fulfilled
    } else {
      const ps = await this.loadJurisdiction()
      return this.setJurisdiction(ps)
    }
  }

  /**
   * Registers a callback for policy scope change notifications.
   *
   * @param callback Callback to register
   */
  async onJurisdiction(callback: Callback): Promise<void> {
    this.on('jurisdiction', callback)
  }

  /**
   * Get the policy scope from query, page or config.
   */
  async loadJurisdiction(): Promise<string> {
    log.info('loadJurisdiction', this._config.jurisdiction)

    const jurisdictionOverride = parameters.get(parameters.POLICY_SCOPE, window.location.search)
    if (jurisdictionOverride) {
      return this.setJurisdiction(jurisdictionOverride)
    }

    const ps = this._config.jurisdiction
    if (!ps) {
      throw errors.noJurisdictionError
    }

    const v = ps.variable

    if (v) {
      for (const dl of dataLayer()) {
        const scope = dl[v]
        if (scope) {
          return this.setJurisdiction(scope)
        }
      }
    }

    try {
      const region = await this.loadRegionInfo()
      const jurisdiction = ps.scopes && ps.scopes[region] ? ps.scopes[region] : ps.defaultScopeCode || ''
      if (!jurisdiction) {
        return Promise.reject(errors.noJurisdictionError)
      }

      return this.setJurisdiction(jurisdiction)
    } catch (e) {
      return ps.defaultScopeCode || ''
    }
  }

  /**
   * Set the region.
   *
   * @param info Region information
   */
  async setRegionInfo(info: string): Promise<string> {
    log.info('setRegionInfo', info)
    this._regionInfo.value = info
    return this._regionInfo.fulfilled
  }

  /**
   * Load the region info.
   */
  async loadRegionInfo(): Promise<string> {
    log.info('loadRegionInfo')

    const specifiedRegion = parameters.get(parameters.REGION, window.location.search)
    if (specifiedRegion) {
      return this.setRegionInfo(specifiedRegion)
    }

    const r = await this.loadGeoIP()
    if (!r || !r.location) {
      throw errors.unrecognizedLocationError
    }

    const g = await this.setGeoIP(r.location)
    if (!g) {
      throw errors.unrecognizedLocationError
    }

    const cc = g.countryCode
    if (!cc) {
      throw errors.unrecognizedLocationError
    }

    let region = cc
    if (cc === 'US') {
      region = `${cc}-${g.regionCode}`
    }

    return this.setRegionInfo(region)
  }

  /**
   * Gets the region.
   */
  async getRegionInfo(): Promise<string> {
    log.info('getRegionInfo')
    if (this._regionInfo.isFulfilled()) {
      return this._regionInfo.fulfilled
    } else {
      const info = await this.loadRegionInfo()
      return this.setRegionInfo(info)
    }
  }

  /**
   * Registers a callback for region info change notifications.
   *
   * @param callback Callback to register
   */
  async onRegionInfo(callback: Callback): Promise<void> {
    this.on('regionInfo', callback)
  }

  /**
   * Shows the Preferences Manager.
   *
   * @param params Preferences Manager preferences
   */
  async showPreferenceExperience(params?: ShowPreferenceOptions): Promise<Consent> {
    log.info('showPreference')

    const config = await this.getConfig()
    const consent = await this.getConsent()

    // if no preference experience configured do not show
    if (!config.experiences?.preference) {
      return consent
    }

    if (this.listenerCount('showPreferenceExperience') > 0) {
      const modifiedConfig: Configuration = config
      // if showRightsTab false then do not send rights. If undefined or true, functionality is unaffected
      if (params && params.showRightsTab === false) {
        modifiedConfig.rights = []
      }
      this.willShowExperience(ExperienceType.Preference)
      this.emit('showPreferenceExperience', this, modifiedConfig, consent)
    }

    return consent
  }

  /**
   * Invoke rights.
   *
   * @param eventData Event data to invoke right with
   */
  async invokeRight(eventData: InvokeRightEvent): Promise<void> {
    log.debug('invokeRights', eventData)

    // If no identities or rights defined, skip the call.
    if (
      !eventData.subject ||
      !eventData.subject.email ||
      eventData.subject.email === '' ||
      !eventData.right ||
      eventData.right === ''
    ) {
      return Promise.resolve()
    }

    let identities: Identities = {}
    if (this._identities.isFulfilled()) {
      identities = this._identities.value
    }
    // add email identity from rights form
    identities['email'] = eventData.subject.email

    if (
      !this._config ||
      !this._config.organization ||
      !this._config.property ||
      !this._config.environment ||
      !this._config.jurisdiction ||
      !this._config.rights ||
      this._config.rights.length === 0
    ) {
      return Promise.resolve()
    }

    const user: DataSubject = eventData.subject

    const request: InvokeRightRequest = {
      organizationCode: this._config.organization.code || '',
      propertyCode: this._config.property.code || '',
      environmentCode: this._config.environment.code,
      controllerCode: '',
      identities: identities,
      jurisdictionCode: this._config.jurisdiction.code || '',
      rightCode: eventData.right,
      user: user,
    }

    this.emit('rightInvoked', request)

    return this._api.invokeRight(request)
  }

  /**
   * Signals that an experience has been hidden
   *
   * @param reason is a string representing the reason the experience was closed
   * Values: setConsent, invokeRight, close
   */
  async experienceClosed(reason: string): Promise<Consent> {
    for (const appDiv of this._appDivs) {
      const div = document.getElementById(appDiv.id)
      if (div) {
        div.style.zIndex = appDiv.zIndex
      }
    }
    this._appDivs = []

    // update isExperienceDisplayed flag when experience no longer displayed
    // update hasExperienceBeenDisplayed flag after experience has been displayed
    this._isExperienceDisplayed = false
    this._hasExperienceBeenDisplayed = true

    // Call functions registered using onHideExperience
    this.emit('hideExperience', reason)

    if (reason !== 'setConsent') {
      const consent = await this.retrieveConsent()

      if (this._config.purposes) {
        for (const p of this._config.purposes) {
          if (consent.purposes[p.code] === undefined && p.requiresOptIn) {
            consent.purposes[p.code] = false
          }
        }
      }

      return this.setConsent(consent)
    }

    return Promise.resolve({ purposes: {}, vendors: [] } as Consent)
  }

  /**
   * onWillShowExperience called before an experience is shown
   * Used to trigger external dependencies
   *
   * @param callback Callback to register
   */
  async onWillShowExperience(callback: Callback): Promise<void> {
    this.on('willShowExperience', callback)
  }

  /**
   * onHideExperience called after experience hidden
   * Used to trigger external dependencies
   *
   * @param callback Callback to register
   */
  async onHideExperience(callback: Callback): Promise<void> {
    this.on('hideExperience', callback)
  }

  /**
   * onShowPreferenceExperience registers a function to handle showing preferences
   *
   * @param callback Callback to register
   */
  async onShowPreferenceExperience(callback: ShowPreferenceExperience): Promise<void> {
    this.removeAllListeners('showPreferenceExperience')
    this.on('showPreferenceExperience', callback)
  }

  /**
   * onShowConsentExperience registers a function to handle showing consent
   *
   * @param callback Callback to register
   */
  async onShowConsentExperience(callback: ShowConsentExperience): Promise<void> {
    this.removeAllListeners('showConsentExperience')
    this.on('showConsentExperience', callback)
  }

  /**
   * Synchronously calls each of the listeners registered for the event named`eventName`, in the order they
   * were registered, passing the supplied arguments to each.
   *
   * Returns `true` if the event had listeners, `false` otherwise.
   *
   * ```js
   * const EventEmitter = require('events');
   * const myEmitter = new EventEmitter();
   *
   * // First listener
   * myEmitter.on('event', function firstListener() {
   *   console.log('Helloooo! first listener');
   * });
   * // Second listener
   * myEmitter.on('event', function secondListener(arg1, arg2) {
   *   console.log(`event with parameters ${arg1}, ${arg2} in second listener`);
   * });
   * // Third listener
   * myEmitter.on('event', function thirdListener(...args) {
   *   const parameters = args.join(', ');
   *   console.log(`event with parameters ${parameters} in third listener`);
   * });
   *
   * console.log(myEmitter.listeners('event'));
   *
   * myEmitter.emit('event', 1, 2, 3, 4, 5);
   *
   * // Prints:
   * // [
   * //   [Function: firstListener],
   * //   [Function: secondListener],
   * //   [Function: thirdListener]
   * // ]
   * // Helloooo! first listener
   * // event with parameters 1, 2 in second listener
   * // event with parameters 1, 2, 3, 4, 5 in third listener
   * ```
   */
  emit(eventName: string | symbol, ...args: any[]): boolean {
    if (window.androidListener) {
      const listener = window.androidListener[eventName.toString()]
      if (listener) {
        listener(JSON.stringify(args))
      } else {
        console.error(`Can't pass message to native code because ${eventName.toString()} handler is not registered`)
      }
    } else if (window.webkit?.messageHandlers) {
      const listener = window.webkit.messageHandlers[eventName.toString()]
      if (listener) {
        listener.postMessage(JSON.stringify(args))
      } else {
        console.error(`Can't pass message to native code because ${eventName.toString()} handler is not registered`)
      }
    }

    return super.emit(eventName, ...args)
  }

  /**
   * Retrieves the current identities on the page.
   * If previously collected values for identity and consent are different,
   * show the experience or if experience already shown, update permits
   */
  private async refreshIdentityConsent(): Promise<void> {
    log.debug('refreshIdentityConsent')

    const pageIdentities = await this.collectIdentities()
    const previousIdentities = await this.getIdentities()

    // compare identities currently on page with those previously retrieved
    // check if identity value the same
    if (pageIdentities.size === previousIdentities.size) {
      let identityMatch = true
      Object.keys(pageIdentities).forEach(key => {
        if (pageIdentities[key] !== previousIdentities[key]) {
          // different identities
          identityMatch = false
        }
      })
      if (identityMatch) {
        // no change in identities so no action needed
        return
      }
    }

    const identities = await this.setIdentities(pageIdentities)

    // change in identities found so set new identities found on page and check for consent
    // if experience is currently displayed only update identities, and they return to wait for user input
    if (this._isExperienceDisplayed) {
      return
    }

    const permitConsent = await this.fetchConsent(identities)
    const localConsent = await this.retrieveConsent()

    // check if consent value the same
    if (Object.keys(permitConsent).length === Object.keys(localConsent).length) {
      let newConsent = false
      for (const key in permitConsent) {
        if (permitConsent.purposes[key] !== localConsent.purposes[key]) {
          // different consent values
          newConsent = true
          break
        }
      }
      if (!newConsent) {
        // no change in consent so no further action necessary
        return
      }
    }

    // if experience has been displayed in session, update permits with already collected consent
    if (this._hasExperienceBeenDisplayed) {
      return this.updateConsent(identities, localConsent)
    }

    // show experience for first time in session
    await this.showConsentExperience()
  }

  /**
   * Calls refreshIdentityConsent at an interval specified in the param.
   *
   * @param interval - array of intervals in milliseconds from first call that refreshIdentityConsent
   */
  pollIdentity(interval: number[]): void {
    log.info('pollIdentity')
    for (const t of interval) {
      setTimeout(this.refreshIdentityConsent.bind(this), t)
    }
  }
}
