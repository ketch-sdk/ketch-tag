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
  DataSubject,
  GetConsentRequest,
  ExperienceType,
  ConsentExperienceType,
  isTab,
  ExperienceClosedReason,
  ShowConsentOptions,
  GetConsentResponse,
  IdentityType,
  IdentityProvider,
  StorageProvider,
} from '@ketch-sdk/ketch-types'
import dataLayer from './datalayer'
import isEmpty from './isEmpty'
import log from './logging'
import errors from './errors'
import parameters from './parameters'
import getApiUrl from './getApiUrl'
import Watcher from '@ketch-sdk/ketch-data-layer'
import { CACHED_CONSENT_TTL, getCachedConsent, setCachedConsent } from './consent'
import deepEqual from 'nano-equal'

declare global {
  type AndroidListener = {
    (args?: any): void
  }

  type AndroidListeners = {
    [name: string]: AndroidListener
  }

  type WKHandler = {
    (args?: any): void
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

const FULFILLED_EVENT = 'fulfilled'
const CONSENT_EVENT = 'consent'
const ENVIRONMENT_EVENT = 'environment'
const GEOIP_EVENT = 'geoip'
const IDENTITIES_EVENT = 'identities'
const JURISDICTION_EVENT = 'jurisdiction'
const REGION_INFO_EVENT = 'regionInfo'

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
   * Identity watcher
   *
   * @internal
   */
  private _watcher: Watcher

  /**
   * Constructor for Ketch takes the configuration object. All other operations are driven by the configuration
   * provided.
   *
   * @param config Ketch configuration
   */
  constructor(config: Configuration) {
    super()
    const maxListeners = parseInt(config.options?.maxListeners || '20')
    this._config = config
    this._consent = new Future<Consent>({ name: CONSENT_EVENT, emitter: this, maxListeners })
    this._environment = new Future<Environment>({ name: ENVIRONMENT_EVENT, emitter: this, maxListeners })
    this._geoip = new Future({ name: GEOIP_EVENT, emitter: this, maxListeners })
    this._identities = new Future<Identities>({ name: IDENTITIES_EVENT, emitter: this, maxListeners })
    this._jurisdiction = new Future<string>({ name: JURISDICTION_EVENT, emitter: this, maxListeners })
    this._regionInfo = new Future<string>({ name: REGION_INFO_EVENT, emitter: this, maxListeners })
    this._appDivs = []
    this._shouldConsentExperienceShow = false
    this._provisionalConsent = undefined
    this._api = new KetchWebAPI(getApiUrl(config))
    this._watcher = new Watcher(window, {
      interval: parseInt(config.options?.watcherInterval || '2000'),
      timeout: parseInt(config.options?.watcherTimeout || '10000'),
    })
    this._watcher.on('identity', this.setIdentities.bind(this))
    this.setMaxListeners(maxListeners)
  }

  /**
   * Registers a plugin
   *
   * @param plugin The plugin to register
   * @param config The plugin config
   */
  async registerPlugin(plugin: Plugin, config?: any): Promise<void> {
    if (!config) {
      config = await this.getConfig()
    }

    if (plugin instanceof Function) {
      return plugin(this, config)
    }

    if (plugin.willShowExperience !== undefined) {
      this.on('willShowExperience', expType => {
        if (plugin.willShowExperience !== undefined) {
          plugin.willShowExperience(this, this._config, expType)
        }
      })
    }
    if (plugin.showConsentExperience !== undefined) {
      this.on('showConsentExperience', (consents, options) => {
        if (plugin.showConsentExperience !== undefined) {
          plugin.showConsentExperience(this, this._config, consents, options)
        }
      })
    }
    if (plugin.showPreferenceExperience !== undefined) {
      this.on('showPreferenceExperience', (consents, options) => {
        if (plugin.showPreferenceExperience !== undefined) {
          plugin.showPreferenceExperience(this, this._config, consents, options)
        }
      })
    }
    if (plugin.consentChanged !== undefined) {
      this.on(CONSENT_EVENT, consent => {
        if (plugin.consentChanged !== undefined) {
          plugin.consentChanged(this, this._config, consent)
        }
      })
    }
    if (plugin.environmentLoaded !== undefined) {
      this.on(ENVIRONMENT_EVENT, env => {
        if (plugin.environmentLoaded !== undefined) {
          plugin.environmentLoaded(this, this._config, env)
        }
      })
    }
    if (plugin.experienceHidden !== undefined) {
      this.on('hideExperience', reason => {
        if (plugin.experienceHidden !== undefined) {
          plugin.experienceHidden(this, this._config, reason)
        }
      })
    }
    if (plugin.geoIPLoaded !== undefined) {
      this.on(GEOIP_EVENT, geoip => {
        if (plugin.geoIPLoaded !== undefined) {
          plugin.geoIPLoaded(this, this._config, geoip)
        }
      })
    }
    if (plugin.identitiesLoaded !== undefined) {
      this.on(IDENTITIES_EVENT, identities => {
        if (plugin.identitiesLoaded !== undefined) {
          plugin.identitiesLoaded(this, this._config, identities)
        }
      })
    }
    if (plugin.jurisdictionLoaded !== undefined) {
      this.on(JURISDICTION_EVENT, jurisdiction => {
        if (plugin.jurisdictionLoaded !== undefined) {
          plugin.jurisdictionLoaded(this, this._config, jurisdiction)
        }
      })
    }
    if (plugin.regionInfoLoaded !== undefined) {
      this.on(REGION_INFO_EVENT, regionInfo => {
        if (plugin.regionInfoLoaded !== undefined) {
          plugin.regionInfoLoaded(this, this._config, regionInfo)
        }
      })
    }
    if (plugin.rightInvoked !== undefined) {
      this.on('rightInvoked', request => {
        if (plugin.rightInvoked !== undefined) {
          plugin.rightInvoked(this, this._config, request)
        }
      })
    }
    if (plugin.init !== undefined) {
      return plugin.init(this, config)
    }
  }

  /**
   * Registers an identity provider
   *
   * @param provider The provider to register
   */
  async registerIdentityProvider(name: string, provider: IdentityProvider): Promise<void> {
    this._watcher.add(name, provider)
  }

  /**
   * Registers a storage provider
   *
   * @param provider The provider to register
   */
  async registerStorageProvider(_: StorageProvider): Promise<void> {}

  /**
   * Returns the configuration.
   */
  async getConfig(): Promise<Configuration> {
    return this._config
  }

  /**
   * Determines which experience type to show if we should show an experience.
   *
   * @param c Consent to be used
   */
  selectExperience(c: Consent): ExperienceType | undefined {
    // if experience has already shown, do not show again
    if (this._hasExperienceBeenDisplayed) {
      log.debug('selectExperience', 'none')
      return
    }

    // check if experience show parameter override set
    const show = parameters.get(parameters.SWB_SHOW, window.location.search)
    if (
      parameters.has(parameters.SWB_SHOW, window.location.search) &&
      (show.length === 0 || show === parameters.CONSENT)
    ) {
      log.debug('selectExperience', ExperienceType.Consent)
      return ExperienceType.Consent
    } else if (show === parameters.PREFERENCES) {
      log.debug('selectExperience', ExperienceType.Preference)
      return ExperienceType.Preference
    }

    if (this._shouldConsentExperienceShow) {
      log.debug('selectExperience', ExperienceType.Consent)
      this._shouldConsentExperienceShow = false
      return ExperienceType.Consent
    }

    if (this._config.purposes) {
      for (const p of this._config.purposes) {
        if (c.purposes[p.code] === undefined) {
          log.debug('selectExperience', ExperienceType.Consent)
          return ExperienceType.Consent
        }
      }
    }

    log.debug('selectExperience', 'none')
    return
  }

  /**
   * Selects the correct experience.
   *
   */
  selectConsentExperience(): ConsentExperienceType {
    if (this._config.purposes) {
      for (const pa of this._config.purposes) {
        if (pa.requiresOptIn) {
          if (this._config.experiences?.consent?.experienceDefault === 2) {
            log.debug('selectConsentExperience', 'experiences.consent.modal')
            return ConsentExperienceType.Modal
          }
        }
      }
    }

    log.debug('selectConsentExperience', 'experiences.consent.banner')
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

    const consent = await this.retrieveConsent()

    if (this.listenerCount('showConsentExperience') > 0) {
      this.willShowExperience(ExperienceType.Consent)
      this.emit('showConsentExperience', consent, { displayHint: this.selectConsentExperience() })
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
   * Called when experience renderer tells us the user has updated consent.
   *
   * @param consent Consent to change
   */
  async changeConsent(consent: Consent): Promise<any> {
    // check for new identifiers for tags that may fire after consent collected
    this._watcher.stop()
    await this._watcher.start()

    return this.setConsent(consent)
  }

  /**
   * Sets the consent.
   *
   * @param c Consent to set
   */
  async setConsent(c: Consent): Promise<Consent> {
    log.info('setConsent', c)

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

    this._consent.value = c

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
    if (this._consent.isFulfilled()) {
      if (this.overrideWithProvisionalConsent(this._consent.value)) {
        await this.setConsent(this._consent.value)
      }
    }
  }

  /**
   * override provisional consent on retrieved consent from the server.
   *
   * @param c current consent
   */
  overrideWithProvisionalConsent(c: Consent): boolean {
    let shouldUpdateConsent = false
    if (!this._provisionalConsent) {
      return shouldUpdateConsent
    }
    for (const key in this._provisionalConsent.purposes) {
      if (c.purposes[key] !== this._provisionalConsent.purposes[key]) {
        c.purposes[key] = this._provisionalConsent.purposes[key]
        shouldUpdateConsent = true
      }
    }
    this._provisionalConsent = undefined
    return shouldUpdateConsent
  }

  /**
   * Gets the consent.
   */
  async getConsent(): Promise<Consent> {
    log.info('getConsent')

    if (this.hasConsent()) {
      return this._consent.fulfilled
    }

    const identities = await this.getIdentities()

    const c = await this.fetchConsent(identities)
    let shouldCreatePermits = this.overrideWithProvisionalConsent(c)

    // selectExperience before populating permits
    const experience = this.selectExperience(c)

    // populate disclosure permits that are undefined
    if (this._config.purposes) {
      for (const p of this._config.purposes) {
        if (c.purposes[p.code] === undefined && !p.requiresOptIn) {
          c.purposes[p.code] = true
          shouldCreatePermits = true
        }
      }
    }

    // first set consent value then proceed to show experience and/or create permits
    if (shouldCreatePermits) {
      await this.setConsent(c)
    } else {
      this._consent.value = c
    }

    switch (experience) {
      case ExperienceType.Consent:
        return this.showConsentExperience()
      case ExperienceType.Preference:
        return this.showPreferenceExperience()
    }

    // experience will not show - call functions registered using onHideExperience
    this.emit('hideExperience', ExperienceClosedReason.WILL_NOT_SHOW)

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
    this.on(CONSENT_EVENT, callback)
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
    log.debug('fetchConsent', identities)

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
      identities: identities,
      purposes: {},
    }

    // Add the purposes by ID with the legal basis
    for (const pa of this._config.purposes) {
      request.purposes[pa.code] = {
        legalBasisCode: pa.legalBasisCode,
      }
    }

    let consent = await getCachedConsent(request)

    const earliestCollectedAt = Math.floor(Date.now() / 1000 - CACHED_CONSENT_TTL)

    const normalizeConsent = (input: GetConsentResponse): GetConsentResponse => {
      if (!input.purposes) {
        input.purposes = {}
        return input
      }

      for (const purpose of Object.keys(input.purposes)) {
        const x = input.purposes[purpose]
        if (typeof x === 'string') {
          input.purposes[purpose] = {
            allowed: x,
            legalBasisCode: request.purposes[purpose]?.legalBasisCode,
          }
        }
      }

      return input
    }

    // Determine whether we should use cached consent
    let useCachedConsent = false
    if (Object.keys(consent.purposes).length === 0) {
      log.debug('cached consent is empty')
    } else if (consent?.collectedAt && consent.collectedAt < earliestCollectedAt) {
      log.debug('revalidating cached consent')
    } else if (!deepEqual(identities, consent.identities)) {
      log.debug('cached consent discarded due to identity mismatch')
    } else {
      log.debug('using cached consent')
      useCachedConsent = true
    }

    if (!useCachedConsent) {
      consent = normalizeConsent(await this._api.getConsent(request))
      await setCachedConsent(consent)
    }

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
      return
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
      return
    }

    if (isEmpty(consent)) {
      log.debug('updateConsent', 'skipping')
      return
    }

    const request: SetConsentRequest = {
      organizationCode: this._config.organization.code || '',
      propertyCode: this._config.property.code || '',
      environmentCode: this._config.environment.code,
      identities: identities,
      jurisdictionCode: this._config.jurisdiction.code || '',
      purposes: {},
      vendors: consent.vendors,
      collectedAt: Math.floor(Date.now() / 1000),
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
      return
    }

    // Save a locally cached consent
    await setCachedConsent(request)

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
      log.warn('detectEnvironment', 'no environments')
      throw errors.noEnvironmentError
    }

    // Try to locate the specifiedEnv
    const specifiedEnv = parameters.get(parameters.SWB_ENV, window.location.search)
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
    this.on(ENVIRONMENT_EVENT, callback)
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
    this._geoip.value = g
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
    this.on(GEOIP_EVENT, callback)
  }

  /**
   * Sets the identities.
   *
   * @param newIdentities Identities to set
   */
  async setIdentities(newIdentities: Identities): Promise<Identities> {
    log.info('setIdentities', newIdentities)

    // update current identities with new identities but do not overwrite previously found identities
    let identities: Identities = {}
    if (this._identities.isFulfilled()) {
      identities = this._identities.value
    }
    for (const key in newIdentities) {
      identities[key] = newIdentities[key]
    }
    this._identities.value = identities

    // change in identities found so set new identities found on page and check for consent
    // if experience is currently displayed only update identities, and then return to wait for user input
    if (this._isExperienceDisplayed) {
      return identities
    }

    const localConsent = await this.retrieveConsent()

    // if there is not yet local consent then return identities
    // no reprompting of the user is applicable until local consent is set
    if (Object.keys(localConsent.purposes).length == 0) {
      return identities
    }

    const permitConsent = await this.fetchConsent(identities)

    // check if consent value the same
    if (Object.keys(permitConsent.purposes).length === Object.keys(localConsent.purposes).length) {
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
        return identities
      }
    }

    // if experience has been displayed in session, update permits with already collected consent
    if (this._hasExperienceBeenDisplayed) {
      await this.updateConsent(identities, localConsent)
      return identities
    }

    // show experience for first time in session
    await this.showConsentExperience()
    return identities
  }

  /**
   * Collect identities.
   */
  async collectIdentities(): Promise<void> {
    log.info('collectIdentities', this._config.identities)

    const configIDs = this._config.identities

    if (!this._config || !this._config.organization || configIDs === undefined || isEmpty(configIDs)) {
      this._identities.value = {}
      return
    }

    for (const name of Object.keys(configIDs)) {
      // if no proxy add all, otherwise add if not local storage or if same origin
      if (!this._config.property?.proxy) {
        this._watcher.add(name, configIDs[name])
      } else {
        try {
          const proxyPage = new URL(this._config.property?.proxy)
          const currentPage = new URL(window.location.href)
          if (
            configIDs[name].type !== IdentityType.IDENTITY_TYPE_LOCAL_STORAGE ||
            proxyPage.origin === currentPage.origin
          ) {
            this._watcher.add(name, configIDs[name])
          }
        } catch (e) {
          log.error(`error checking proxy '${this._config.property?.proxy}'`, e)
        }
      }
    }

    log.info('starting watcher')
    await this._watcher.start()
  }

  /**
   * Get the identities.
   */
  async getIdentities(): Promise<Identities> {
    log.info('getIdentities')

    if (!this._identities.isFulfilled()) {
      await this.collectIdentities()
    }

    return this._identities.fulfilled
  }

  /**
   * Registers a callback for identity change notifications.
   *
   * @param callback Identities callback to register
   */
  async onIdentities(callback: Callback): Promise<void> {
    this.on(IDENTITIES_EVENT, callback)
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
    this.on(JURISDICTION_EVENT, callback)
  }

  /**
   * Get the policy scope from query, page or config.
   */
  async loadJurisdiction(): Promise<string> {
    log.info('loadJurisdiction', this._config.jurisdiction)

    const jurisdictionOverride = parameters.get(parameters.SWB_JURISDICTION, window.location.search)
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
      log.info('ps', ps, region)
      const jurisdiction = (ps.jurisdictions || {})[region] ?? ps.defaultJurisdictionCode ?? ''
      if (!jurisdiction) {
        return Promise.reject(errors.noJurisdictionError)
      }

      return this.setJurisdiction(jurisdiction)
    } catch (e) {
      return ps.defaultJurisdictionCode ?? ''
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

    const specifiedRegion = parameters.get(parameters.SWB_REGION, window.location.search)
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
    this.on(REGION_INFO_EVENT, callback)
  }

  /**
   * Shows the Preferences Manager.
   *
   * @param params Preferences Manager preferences
   */
  async showPreferenceExperience(params?: ShowPreferenceOptions): Promise<Consent> {
    log.info('showPreferenceExperience')

    const consent = await this.getConsent()

    // if no preference experience configured do not show
    if (!this._config.experiences?.preference) {
      return consent
    }

    if (this.listenerCount('showPreferenceExperience') > 0) {
      // check if experience show parameter override set
      const tab = parameters.get(parameters.SWB_PREFERENCES_TAB, window.location.search)
      // override with url param
      if (isTab(tab)) {
        if (!params) {
          params = {}
        }
        params.tab = tab
      }
      this.willShowExperience(ExperienceType.Preference)
      this.emit('showPreferenceExperience', consent, params)
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
      return
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
      return
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
      recaptchaToken: eventData.recaptchaToken,
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

    if (reason !== 'setConsent') {
      const consent = await this.retrieveConsent()

      if (this._config.purposes) {
        for (const p of this._config.purposes) {
          if (consent.purposes[p.code] === undefined && p.requiresOptIn) {
            consent.purposes[p.code] = false
          }
        }
      }

      const res = await this.setConsent(consent)
      // Call functions registered using onHideExperience
      // In setTimeout to push to bottom of event queue
      setTimeout(() => {
        this.emit('hideExperience', reason)
      }, 0)
      return res
    }

    // Call functions registered using onHideExperience
    // In setTimeout to push to bottom of event queue
    setTimeout(() => {
      this.emit('hideExperience', reason)
    }, 0)

    return this.retrieveConsent()
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
  async onShowPreferenceExperience(
    callback: (consents: Consent, options?: ShowPreferenceOptions) => void,
  ): Promise<void> {
    this.removeAllListeners('showPreferenceExperience')
    this.on('showPreferenceExperience', callback)
  }

  /**
   * onShowConsentExperience registers a function to handle showing consent
   *
   * @param callback Callback to register
   */
  async onShowConsentExperience(callback: (consents: Consent, options?: ShowConsentOptions) => void): Promise<void> {
    this.removeAllListeners('showConsentExperience')
    this.on('showConsentExperience', callback)
  }

  /**
   * Synchronously calls each of the listeners registered for the event named `eventName`, in the order they
   * were registered, passing the supplied arguments to each.
   */
  emit(event: string | symbol, ...args: any[]): boolean {
    if (window.androidListener || window.webkit?.messageHandlers) {
      const eventName = event.toString()

      const filteredArgs: any[] = []
      for (const arg of args) {
        if (arg !== this) {
          filteredArgs.push(arg)
        }
      }

      let argument
      if (filteredArgs.length === 1 && typeof filteredArgs[0] === 'string') {
        argument = filteredArgs[0]
      } else if (filteredArgs.length === 1) {
        argument = JSON.stringify(filteredArgs[0])
      } else if (filteredArgs.length > 1) {
        argument = JSON.stringify(filteredArgs)
      }

      if (window.androidListener && eventName in window.androidListener) {
        if (filteredArgs.length === 0) {
          window.androidListener[eventName]()
        } else {
          window.androidListener[eventName](argument)
        }
      } else if (window.webkit?.messageHandlers && eventName in window.webkit.messageHandlers) {
        window.webkit.messageHandlers[eventName].postMessage(argument)
      } else {
        log.warn(`Can't pass message to native code because "${eventName}" handler is not registered`)
      }
    }
    return super.emit(event, ...args)
  }

  addListener(eventName: string | symbol, listener: (...args: any[]) => void): this {
    return this.on(eventName, listener)
  }

  on(eventName: string | symbol, listener: (...args: any[]) => void): this {
    const f = this.mapEvent(eventName)
    if (f !== undefined) {
      f.on(FULFILLED_EVENT, listener)
      return this
    }

    return super.on(eventName, listener)
  }

  once(eventName: string | symbol, listener: (...args: any[]) => void): this {
    const f = this.mapEvent(eventName)
    if (f !== undefined) {
      f.once(FULFILLED_EVENT, listener)
      return this
    }

    return super.once(eventName, listener)
  }

  removeListener(eventName: string | symbol, listener: (...args: any[]) => void): this {
    const f = this.mapEvent(eventName)
    if (f !== undefined) {
      f.removeListener(FULFILLED_EVENT, listener)
      return this
    }

    return super.removeListener(eventName, listener)
  }

  off(eventName: string | symbol, listener: (...args: any[]) => void): this {
    return this.removeListener(eventName, listener)
  }

  private mapEvent(eventName: string | symbol): EventEmitter | undefined {
    switch (eventName) {
      case CONSENT_EVENT:
        return this._consent

      case ENVIRONMENT_EVENT:
        return this._environment

      case GEOIP_EVENT:
        return this._geoip

      case IDENTITIES_EVENT:
        return this._identities

      case JURISDICTION_EVENT:
        return this._jurisdiction

      case REGION_INFO_EVENT:
        return this._regionInfo
    }

    return undefined
  }
}
