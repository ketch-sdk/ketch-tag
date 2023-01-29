import { EventEmitter } from 'events'
import { KetchWebAPI } from '@ketch-sdk/ketch-web-api'
import Future from '@ketch-com/future'
import {
  Callback,
  Configuration,
  Consent,
  Environment,
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
import isEmpty from './isEmpty'
import log from './logging'
import errors from './errors'
import parameters from './parameters'
import Watcher from '@ketch-sdk/ketch-data-layer'
import { CACHED_CONSENT_TTL, getCachedConsent, setCachedConsent } from './cache'
import deepEqual from 'nano-equal'
import constants from './constants'

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
  private _provisionalConsent?: Consent

  /**
   * @internal
   */
  private _shouldConsentExperienceShow: boolean

  /**
   * isExperienceDisplayed is a bool representing whether an experience is currently showing
   *
   * @internal
   */
  private _isExperienceDisplayed: boolean

  /**
   * hasExperienceBeenDisplayed is a bool representing whether an experience has been shown in a session
   *
   * @internal
   */
  private _hasExperienceBeenDisplayed: boolean

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
   * @param api Ketch Web API instance
   * @param config Ketch configuration
   */
  constructor(api: KetchWebAPI, config: Configuration) {
    super()
    const maxListeners = parseInt(config.options?.maxListeners || '20')
    this._api = api
    this._config = config
    this._consent = new Future<Consent>({ name: constants.CONSENT_EVENT, emitter: this, maxListeners })
    this._environment = new Future<Environment>({ name: constants.ENVIRONMENT_EVENT, emitter: this, maxListeners })
    this._geoip = new Future({ name: constants.GEOIP_EVENT, emitter: this, maxListeners })
    this._identities = new Future<Identities>({ name: constants.IDENTITIES_EVENT, emitter: this, maxListeners })
    this._jurisdiction = new Future<string>({ name: constants.JURISDICTION_EVENT, emitter: this, maxListeners })
    this._regionInfo = new Future<string>({ name: constants.REGION_INFO_EVENT, emitter: this, maxListeners })
    this._shouldConsentExperienceShow = false
    this._isExperienceDisplayed = false
    this._hasExperienceBeenDisplayed = false
    this._provisionalConsent = undefined
    this._watcher = new Watcher(window, {
      interval: parseInt(config.options?.watcherInterval || '2000'),
      timeout: parseInt(config.options?.watcherTimeout || '10000'),
    })
    this._watcher.on(constants.IDENTITY_EVENT, this.setIdentities.bind(this))
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
      this.on(constants.WILL_SHOW_EXPERIENCE_EVENT, expType => {
        if (plugin.willShowExperience !== undefined) {
          plugin.willShowExperience(this, this._config, expType)
        }
      })
    }
    if (plugin.showConsentExperience !== undefined) {
      this.on(constants.SHOW_CONSENT_EXPERIENCE_EVENT, (consents, options) => {
        if (plugin.showConsentExperience !== undefined) {
          plugin.showConsentExperience(this, this._config, consents, options)
        }
      })
    }
    if (plugin.showPreferenceExperience !== undefined) {
      this.on(constants.SHOW_PREFERENCE_EXPERIENCE_EVENT, (consents, options) => {
        if (plugin.showPreferenceExperience !== undefined) {
          plugin.showPreferenceExperience(this, this._config, consents, options)
        }
      })
    }
    if (plugin.consentChanged !== undefined) {
      this.on(constants.CONSENT_EVENT, consent => {
        if (plugin.consentChanged !== undefined) {
          plugin.consentChanged(this, this._config, consent)
        }
      })
    }
    if (plugin.environmentLoaded !== undefined) {
      this.on(constants.ENVIRONMENT_EVENT, env => {
        if (plugin.environmentLoaded !== undefined) {
          plugin.environmentLoaded(this, this._config, env)
        }
      })
    }
    if (plugin.experienceHidden !== undefined) {
      this.on(constants.HIDE_EXPERIENCE_EVENT, reason => {
        if (plugin.experienceHidden !== undefined) {
          plugin.experienceHidden(this, this._config, reason)
        }
      })
    }
    if (plugin.geoIPLoaded !== undefined) {
      this.on(constants.GEOIP_EVENT, geoip => {
        if (plugin.geoIPLoaded !== undefined) {
          plugin.geoIPLoaded(this, this._config, geoip)
        }
      })
    }
    if (plugin.identitiesLoaded !== undefined) {
      this.on(constants.IDENTITIES_EVENT, identities => {
        if (plugin.identitiesLoaded !== undefined) {
          plugin.identitiesLoaded(this, this._config, identities)
        }
      })
    }
    if (plugin.jurisdictionLoaded !== undefined) {
      this.on(constants.JURISDICTION_EVENT, jurisdiction => {
        if (plugin.jurisdictionLoaded !== undefined) {
          plugin.jurisdictionLoaded(this, this._config, jurisdiction)
        }
      })
    }
    if (plugin.regionInfoLoaded !== undefined) {
      this.on(constants.REGION_INFO_EVENT, regionInfo => {
        if (plugin.regionInfoLoaded !== undefined) {
          plugin.regionInfoLoaded(this, this._config, regionInfo)
        }
      })
    }
    if (plugin.rightInvoked !== undefined) {
      this.on(constants.RIGHT_INVOKED_EVENT, request => {
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
   * @param name The name of the identity
   * @param provider The provider to register
   */
  async registerIdentityProvider(name: string, provider: IdentityProvider): Promise<void> {
    this._watcher.add(name, provider)
  }

  /**
   * Registers a storage provider
   *
   * @param _ The provider to register
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
      log.debug(constants.SELECT_EXPERIENCE, constants.NONE)
      return
    }

    // check if experience show parameter override set
    const show = parameters.get(constants.SHOW)
    if (show === constants.PREFERENCES) {
      log.debug(constants.SELECT_EXPERIENCE, ExperienceType.Preference)
      return ExperienceType.Preference
    } else if (show) {
      log.debug(constants.SELECT_EXPERIENCE, ExperienceType.Consent)
      return ExperienceType.Consent
    }

    if (this._shouldConsentExperienceShow) {
      log.debug(constants.SELECT_EXPERIENCE, ExperienceType.Consent)
      this._shouldConsentExperienceShow = false
      return ExperienceType.Consent
    }

    if (this._config.purposes) {
      for (const p of this._config.purposes) {
        if (c.purposes[p.code] === undefined) {
          log.debug(constants.SELECT_EXPERIENCE, ExperienceType.Consent)
          return ExperienceType.Consent
        }
      }
    }

    log.debug(constants.SELECT_EXPERIENCE, constants.NONE)
    return
  }

  /**
   * Selects the correct experience.
   */
  selectConsentExperience(): ConsentExperienceType {
    if (this._config.purposes) {
      for (const pa of this._config.purposes) {
        if (pa.requiresOptIn) {
          if (this._config.experiences?.consent?.experienceDefault === 2) {
            log.debug(constants.SELECT_CONSENT_EXPERIENCE, ConsentExperienceType.Modal)
            return ConsentExperienceType.Modal
          }
        }
      }
    }

    log.debug(constants.SELECT_CONSENT_EXPERIENCE, ConsentExperienceType.Banner)
    return ConsentExperienceType.Banner
  }

  /**
   * Signals that an experience will be shown
   *
   * @param type The type of experience to be shown
   */
  willShowExperience(type: string): void {
    // Call functions registered using onWillShowExperience
    this.emit(constants.WILL_SHOW_EXPERIENCE_EVENT, type)

    // update isExperienceDisplayed flag when experience displayed
    this._isExperienceDisplayed = true
  }

  /**
   * Shows the consent manager.
   */
  async showConsentExperience(): Promise<Consent> {
    log.info(constants.SHOW_CONSENT_EXPERIENCE_EVENT)

    const consent = await this.retrieveConsent()

    if (this.listenerCount(constants.SHOW_CONSENT_EXPERIENCE_EVENT) > 0) {
      this.willShowExperience(ExperienceType.Consent)
      this.emit(constants.SHOW_CONSENT_EXPERIENCE_EVENT, consent, { displayHint: this.selectConsentExperience() })
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
    this.emit(constants.HIDE_EXPERIENCE_EVENT, ExperienceClosedReason.WILL_NOT_SHOW)

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
    this.on(constants.CONSENT_EVENT, callback)
  }

  /**
   * Registers a callback for right invocations.
   *
   * @param callback The right callback to register
   */
  async onInvokeRight(callback: Callback): Promise<void> {
    this.on(constants.RIGHT_INVOKED_EVENT, callback)
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
    log.debug(constants.UPDATE_CONSENT, identities, consent)

    // If no identities or purposes defined, skip the call.
    if (!identities || Object.keys(identities).length === 0) {
      log.debug(constants.UPDATE_CONSENT, constants.SKIPPING)
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
      log.debug(constants.UPDATE_CONSENT, constants.SKIPPING)
      return
    }

    if (isEmpty(consent)) {
      log.debug(constants.UPDATE_CONSENT, constants.SKIPPING)
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
      log.debug(constants.UPDATE_CONSENT, 'calculated consents empty')
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
   * Get the environment.
   */
  async getEnvironment(): Promise<Environment> {
    log.info('getEnvironment')

    return this._environment.fulfilled
  }

  /**
   * Registers a callback for environment change notifications.
   *
   * @param callback Environment callback to register
   */
  async onEnvironment(callback: Callback): Promise<void> {
    this.on(constants.ENVIRONMENT_EVENT, callback)
  }

  /**
   * Set the IPInfo.
   *
   * @param g IPInfo
   */
  async setGeoIP(g: IPInfo): Promise<IPInfo> {
    log.info('setGeoIP', g)
    this._geoip.value = g
    return this._geoip.fulfilled
  }

  /**
   * Gets the IPInfo.
   */
  async getGeoIP(): Promise<IPInfo> {
    log.info('getGeoIP')

    return this._geoip.fulfilled
  }

  /**
   * Registers a callback for GeoIP change notifications.
   *
   * @param callback GeoIP callback to register
   */
  async onGeoIP(callback: Callback): Promise<void> {
    this.on(constants.GEOIP_EVENT, callback)
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
    this.on(constants.IDENTITIES_EVENT, callback)
  }

  /**
   * Set the policy scope.
   *
   * @param ps Jurisdiction to set
   */
  async setJurisdiction(ps: string): Promise<string> {
    log.info('setJurisdiction', ps)

    this._jurisdiction.value = ps
    return this._jurisdiction.fulfilled
  }

  /**
   * Get the policy scope.
   */
  async getJurisdiction(): Promise<string> {
    log.info('getJurisdiction')

    return this._jurisdiction.fulfilled
  }

  /**
   * Registers a callback for policy scope change notifications.
   *
   * @param callback Callback to register
   */
  async onJurisdiction(callback: Callback): Promise<void> {
    this.on(constants.JURISDICTION_EVENT, callback)
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
   * Gets the region.
   */
  async getRegionInfo(): Promise<string> {
    log.info('getRegionInfo')
    return this._regionInfo.fulfilled
  }

  /**
   * Registers a callback for region info change notifications.
   *
   * @param callback Callback to register
   */
  async onRegionInfo(callback: Callback): Promise<void> {
    this.on(constants.REGION_INFO_EVENT, callback)
  }

  /**
   * Shows the Preferences Manager.
   *
   * @param params Preferences Manager preferences
   */
  async showPreferenceExperience(params?: ShowPreferenceOptions): Promise<Consent> {
    log.info(constants.SHOW_PREFERENCE_EXPERIENCE_EVENT)

    const consent = await this.getConsent()

    // if no preference experience configured do not show
    if (!this._config.experiences?.preference) {
      return consent
    }

    if (this.listenerCount(constants.SHOW_PREFERENCE_EXPERIENCE_EVENT) > 0) {
      // check if experience show parameter override set
      const tab = parameters.get(constants.PREFERENCES_TAB)
      // override with url param
      if (tab && isTab(tab)) {
        if (!params) {
          params = {}
        }
        params.tab = tab
      }
      this.willShowExperience(ExperienceType.Preference)
      this.emit(constants.SHOW_PREFERENCE_EXPERIENCE_EVENT, consent, params)
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

    this.emit(constants.RIGHT_INVOKED_EVENT, request)

    return this._api.invokeRight(request)
  }

  /**
   * Signals that an experience has been hidden
   *
   * @param reason is a string representing the reason the experience was closed
   * Values: setConsent, invokeRight, close
   */
  async experienceClosed(reason: string): Promise<Consent> {
    // update isExperienceDisplayed flag when experience no longer displayed
    // update hasExperienceBeenDisplayed flag after experience has been displayed
    this._isExperienceDisplayed = false
    this._hasExperienceBeenDisplayed = true

    if (reason !== ExperienceClosedReason.SET_CONSENT) {
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
        this.emit(constants.HIDE_EXPERIENCE_EVENT, reason)
      }, 0)
      return res
    }

    // Call functions registered using onHideExperience
    // In setTimeout to push to bottom of event queue
    setTimeout(() => {
      this.emit(constants.HIDE_EXPERIENCE_EVENT, reason)
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
    this.on(constants.WILL_SHOW_EXPERIENCE_EVENT, callback)
  }

  /**
   * onHideExperience called after experience hidden
   * Used to trigger external dependencies
   *
   * @param callback Callback to register
   */
  async onHideExperience(callback: Callback): Promise<void> {
    this.on(constants.HIDE_EXPERIENCE_EVENT, callback)
  }

  /**
   * onShowPreferenceExperience registers a function to handle showing preferences
   *
   * @param callback Callback to register
   */
  async onShowPreferenceExperience(
    callback: (consents: Consent, options?: ShowPreferenceOptions) => void,
  ): Promise<void> {
    this.removeAllListeners(constants.SHOW_PREFERENCE_EXPERIENCE_EVENT)
    this.on(constants.SHOW_PREFERENCE_EXPERIENCE_EVENT, callback)
  }

  /**
   * onShowConsentExperience registers a function to handle showing consent
   *
   * @param callback Callback to register
   */
  async onShowConsentExperience(callback: (consents: Consent, options?: ShowConsentOptions) => void): Promise<void> {
    this.removeAllListeners(constants.SHOW_CONSENT_EXPERIENCE_EVENT)
    this.on(constants.SHOW_CONSENT_EXPERIENCE_EVENT, callback)
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
    const future = this.mapEvent(eventName)
    if (future !== undefined) {
      future.on(constants.FULFILLED_EVENT, listener)
      return this
    }

    return super.on(eventName, listener)
  }

  once(eventName: string | symbol, listener: (...args: any[]) => void): this {
    const future = this.mapEvent(eventName)
    if (future !== undefined) {
      future.once(constants.FULFILLED_EVENT, listener)
      return this
    }

    return super.once(eventName, listener)
  }

  removeListener(eventName: string | symbol, listener: (...args: any[]) => void): this {
    const future = this.mapEvent(eventName)
    if (future !== undefined) {
      future.removeListener(constants.FULFILLED_EVENT, listener)
      return this
    }

    return super.removeListener(eventName, listener)
  }

  off(eventName: string | symbol, listener: (...args: any[]) => void): this {
    return this.removeListener(eventName, listener)
  }

  private mapEvent(eventName: string | symbol): EventEmitter | undefined {
    switch (eventName) {
      case constants.CONSENT_EVENT:
        return this._consent

      case constants.ENVIRONMENT_EVENT:
        return this._environment

      case constants.GEOIP_EVENT:
        return this._geoip

      case constants.IDENTITIES_EVENT:
        return this._identities

      case constants.JURISDICTION_EVENT:
        return this._jurisdiction

      case constants.REGION_INFO_EVENT:
        return this._regionInfo
    }

    return
  }
}
