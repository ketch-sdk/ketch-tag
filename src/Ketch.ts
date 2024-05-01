import { EventEmitter } from 'events'
import { KetchWebAPI } from '@ketch-sdk/ketch-web-api'
import Future from '@ketch-com/future'
import {
  Configuration,
  ConfigurationV2,
  Consent,
  ConsentExperienceType,
  DataSubject,
  Environment,
  ExperienceClosedReason,
  ExperienceDefault,
  ExperienceDisplayType,
  ExperienceOptions,
  ExperienceServer,
  ExperienceType,
  GetConsentRequest,
  GetConsentResponse,
  GetSubscriptionsRequest,
  Identities,
  Identity,
  IdentityProvider,
  IdentityType,
  InvokeRightEvent,
  InvokeRightRequest,
  IPInfo,
  isTab,
  Plugin,
  Protocols,
  PurposeLegalBasis,
  SetConsentReason,
  SetConsentRequest,
  SetConsentResponse,
  SetSubscriptionsRequest,
  ShowConsentOptions,
  ShowPreferenceOptions,
  StorageOriginPolicy,
  StorageProvider,
  SubscriptionConfiguration,
  Subscriptions,
  Tab,
} from '@ketch-sdk/ketch-types'
import isEmpty from './isEmpty'
import log from './log'
import errors from './errors'
import parameters from './parameters'
import Watcher from '@ketch-sdk/ketch-data-layer'
import { CACHED_CONSENT_TTL, getCachedConsent, setCachedConsent, setPublicConsent } from './cache'
import deepEqual from 'nano-equal'
import constants, { EMPTY_CONSENT } from './constants'
import { wrapLogger } from '@ketch-sdk/ketch-logging'
import InternalRouter from './InternalRouter'

declare global {
  type AndroidListener = {
    (args?: any): void
  }

  type AndroidListeners = {
    [name: string]: AndroidListener
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
    [name: string]: any
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
  private readonly _protocols: Future<Protocols>

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
  private readonly _subscriptionConfig: Future<SubscriptionConfiguration>

  /**
   * @internal
   */
  private readonly _consentConfig: Future<ConfigurationV2>

  /**
   * @internal
   */
  private readonly _preferenceConfig: Future<ConfigurationV2>

  /**
   * @internal
   */
  private readonly _subscriptions: Future<Subscriptions>

  /**
   * @internal
   */
  private _provisionalConsent?: Consent

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
  private readonly _api: KetchWebAPI

  /**
   * Identity watcher
   *
   * @internal
   */
  private readonly _watcher: Watcher

  /**
   * Constructor for Ketch takes the configuration object. All other operations are driven by the configuration
   * provided.
   *
   * @param api Ketch Web API instance
   * @param config Ketch configuration
   */
  constructor(api: KetchWebAPI, config: Configuration) {
    super()
    const maxListeners = parseInt(config.options?.maxListeners ?? '20')
    this._api = api
    this._config = config
    this._consent = new Future<Consent>({ name: constants.CONSENT_EVENT, emitter: this, maxListeners })
    this._protocols = new Future<Protocols>({ name: constants.PROTOCOLS_EVENT, emitter: this, maxListeners })
    this._environment = new Future<Environment>({ name: constants.ENVIRONMENT_EVENT, emitter: this, maxListeners })
    this._geoip = new Future({ name: constants.GEOIP_EVENT, emitter: this, maxListeners })
    this._identities = new Future<Identities>({ name: constants.IDENTITIES_EVENT, emitter: this, maxListeners })
    this._jurisdiction = new Future<string>({ name: constants.JURISDICTION_EVENT, emitter: this, maxListeners })
    this._regionInfo = new Future<string>({ name: constants.REGION_INFO_EVENT, emitter: this, maxListeners })
    this._subscriptionConfig = new Future<SubscriptionConfiguration>({
      name: constants.SUBSCRIPTIONS_EVENT,
      emitter: this,
      maxListeners,
    })
    this._subscriptions = new Future<Subscriptions>({
      name: constants.SUBSCRIPTION_CONFIG_EVENT,
      emitter: this,
      maxListeners,
    })
    this._consentConfig = new Future<ConfigurationV2>()
    this._preferenceConfig = new Future<ConfigurationV2>()
    this._isExperienceDisplayed = false
    this._hasExperienceBeenDisplayed = false
    this._provisionalConsent = undefined
    this._watcher = new Watcher(window, {
      interval: parseInt(config.options?.watcherInterval ?? '2000'),
      timeout: parseInt(config.options?.watcherTimeout ?? '10000'),
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
    const router = new InternalRouter(this)

    if (!config) {
      config = await this.getConfig()
    }

    if (plugin instanceof Function) {
      return plugin(router, config)
    }

    if (plugin.willShowExperience !== undefined) {
      this.on(constants.WILL_SHOW_EXPERIENCE_EVENT, expType => {
        if (plugin.willShowExperience !== undefined) {
          plugin.willShowExperience(router, this._config, expType)
        }
      })
    }
    if (plugin.showConsentExperience !== undefined) {
      this.on(constants.SHOW_CONSENT_EXPERIENCE_EVENT, (consents, options) => {
        if (plugin.showConsentExperience !== undefined) {
          plugin.showConsentExperience(router, this._config, consents, options)
        }
      })
    }
    if (plugin.showPreferenceExperience !== undefined) {
      this.on(constants.SHOW_PREFERENCE_EXPERIENCE_EVENT, (consents, options) => {
        if (plugin.showPreferenceExperience !== undefined) {
          plugin.showPreferenceExperience(router, this._config, consents, options)
        }
      })
    }
    if (plugin.consentChanged !== undefined) {
      this.on(constants.CONSENT_EVENT, consent => {
        if (plugin.consentChanged !== undefined) {
          plugin.consentChanged(router, this._config, consent)
        }
      })
    }
    if (plugin.environmentLoaded !== undefined) {
      this.on(constants.ENVIRONMENT_EVENT, env => {
        if (plugin.environmentLoaded !== undefined) {
          plugin.environmentLoaded(router, this._config, env)
        }
      })
    }
    if (plugin.experienceHidden !== undefined) {
      this.on(constants.HIDE_EXPERIENCE_EVENT, reason => {
        if (plugin.experienceHidden !== undefined) {
          plugin.experienceHidden(router, this._config, reason)
        }
      })
    }
    if (plugin.geoIPLoaded !== undefined) {
      this.on(constants.GEOIP_EVENT, geoip => {
        if (plugin.geoIPLoaded !== undefined) {
          plugin.geoIPLoaded(router, this._config, geoip)
        }
      })
    }
    if (plugin.identitiesLoaded !== undefined) {
      this.on(constants.IDENTITIES_EVENT, identities => {
        if (plugin.identitiesLoaded !== undefined) {
          plugin.identitiesLoaded(router, this._config, identities)
        }
      })
    }
    if (plugin.jurisdictionLoaded !== undefined) {
      this.on(constants.JURISDICTION_EVENT, jurisdiction => {
        if (plugin.jurisdictionLoaded !== undefined) {
          plugin.jurisdictionLoaded(router, this._config, jurisdiction)
        }
      })
    }
    if (plugin.regionInfoLoaded !== undefined) {
      this.on(constants.REGION_INFO_EVENT, regionInfo => {
        if (plugin.regionInfoLoaded !== undefined) {
          plugin.regionInfoLoaded(router, this._config, regionInfo)
        }
      })
    }
    if (plugin.rightInvoked !== undefined) {
      this.on(constants.RIGHT_INVOKED_EVENT, request => {
        if (plugin.rightInvoked !== undefined) {
          plugin.rightInvoked(router, this._config, request)
        }
      })
    }
    if (plugin.init !== undefined) {
      return plugin.init(router, config)
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
   * @param _policy The storage policy
   * @param _provider The provider to register
   */
  async registerStorageProvider(_policy: StorageOriginPolicy, _provider: StorageProvider): Promise<void> {}

  async registerExperienceServer(_server: ExperienceServer): Promise<void> {}

  /**
   * Returns the configuration.
   */
  async getConfig(): Promise<Configuration> {
    return this._config
  }

  /**
   * Returns the full configuration.
   */
  async getFullConfig(): Promise<ConfigurationV2> {
    // Get consent config
    const consentConfiguration = await this.getConsentConfiguration()
    const preferenceConfiguration = await this.getPreferenceConfiguration()
    const baseConfig = this._config

    return {
      ...baseConfig,
      theme: {
        banner: consentConfiguration.theme?.banner,
        modal: consentConfiguration.theme?.modal,
        preference: preferenceConfiguration.theme?.preference,
      },
      experiences: {
        content: {
          banner: consentConfiguration.experiences?.content?.banner,
          modal: consentConfiguration.experiences?.content?.modal,
          display: consentConfiguration.experiences?.content?.display,
          preference: preferenceConfiguration.experiences?.content?.preference,
          static: consentConfiguration.experiences?.content?.static,
        },
        layout: {
          banner: consentConfiguration.experiences?.layout?.banner,
          modal: consentConfiguration.experiences?.layout?.modal,
          preference: preferenceConfiguration.experiences?.layout?.preference,
        },
      },
    }
  }

  /**
   * Determines which experience type to show if we should show an experience.
   *
   * @param c Consent to be used
   */
  selectExperience(c: Consent): ExperienceType | undefined {
    const l = wrapLogger(log, 'selectExperience')

    // if experience has already shown, do not show again
    if (this._hasExperienceBeenDisplayed) {
      l.debug(constants.NONE)
      return
    }

    // check if experience show parameter override set
    const show = parameters.get(constants.SHOW)
    if (show === constants.PREFERENCES) {
      l.debug(ExperienceType.Preference)
      return ExperienceType.Preference
    } else if (parameters.has(constants.SHOW)) {
      l.debug(ExperienceType.Consent)
      return ExperienceType.Consent
    }

    if (this._config.purposes) {
      for (const p of this._config.purposes) {
        if (c.purposes[p.code] === undefined) {
          l.debug(ExperienceType.Consent)
          return ExperienceType.Consent
        }
      }
    }

    l.debug(constants.NONE)
    return
  }

  /**
   * Selects the correct experience. If the default experience is modal, but there are no purposes requiring opt in
   * then the experience is changed to banner.
   */
  selectConsentExperience(): ConsentExperienceType {
    const l = wrapLogger(log, 'selectConsentExperience')
    if (
      this._config.purposes &&
      this._config.purposes.length &&
      this._config.experiences?.consent &&
      this._config.experiences?.consent?.experienceDefault === ExperienceDefault.MODAL
    ) {
      for (const pa of this._config.purposes) {
        if (pa.requiresOptIn) {
          l.debug(ConsentExperienceType.Modal)
          return ConsentExperienceType.Modal
        }
      }
    }

    l.debug(ConsentExperienceType.Banner)
    return ConsentExperienceType.Banner
  }

  /**
   * Signals that an experience will be shown
   *
   * @param type The type of experience to be shown
   */
  willShowExperience(type: string): void {
    log.debug('willShowExperience', type)

    // Call functions registered using onWillShowExperience
    this.emit(constants.WILL_SHOW_EXPERIENCE_EVENT, type)

    // update isExperienceDisplayed flag when experience displayed
    this._isExperienceDisplayed = true
  }

  /**
   * Signals that an experience has been hidden
   *
   * @param reason is a string representing the reason the experience was closed
   * Values: setConsent, invokeRight, close
   */
  async experienceClosed(reason: ExperienceClosedReason): Promise<Consent> {
    log.debug('experienceClosed', reason)

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

      await this.setConsent(consent, SetConsentReason.USER_EXPERIENCE_DISMISSAL)
    }

    // Call functions registered using onHideExperience
    // In setTimeout to push to bottom of event queue
    setTimeout(() => {
      this.emit(constants.HIDE_EXPERIENCE_EVENT, reason)
    }, 0)

    return this.retrieveConsent()
  }

  async willChangeExperience(type: ExperienceDisplayType): Promise<void> {
    log.debug('willChangeExperience', type)
    this.emit(constants.WILL_CHANGE_EXPERIENCE_EVENT, type)
  }

  async hasChangedExperience(type: ExperienceDisplayType): Promise<void> {
    log.debug('hasChangedExperience', type)
    this.emit(constants.HAS_CHANGED_EXPERIENCE_EVENT, type)
  }

  async hasShownExperience(): Promise<void> {
    log.debug('hasShownExperience')
    this.emit(constants.HAS_SHOWN_EXPERIENCE_EVENT)
  }

  async showExperience(_options: ExperienceOptions): Promise<void> {}

  /**
   * Shows the consent manager.
   */
  async showConsentExperience(): Promise<Consent> {
    if (this._config.deployment?.isOrchestrationOnly) return {} as Consent
    log.debug('showConsentExperience')

    const consent = await this.retrieveConsent()

    if (this.listenerCount(constants.SHOW_CONSENT_EXPERIENCE_EVENT) > 0) {
      this.willShowExperience(ExperienceType.Consent)
      this.emit(constants.SHOW_CONSENT_EXPERIENCE_EVENT, consent, { displayHint: this.selectConsentExperience() })
    }

    return consent
  }

  /**
   * Shows the Preferences Manager.
   *
   * @param params Preferences Manager preferences
   */
  async showPreferenceExperience(params?: ShowPreferenceOptions): Promise<Consent> {
    if (this._config.deployment?.isOrchestrationOnly) return {} as Consent

    const l = wrapLogger(log, 'showPreferenceExperience')
    l.debug(params)

    let consent: Consent
    let showConsentsTab = true

    try {
      consent = await this.getConsent()
    } catch (e: any) {
      // "No Purposes" errors shouldn't block showing a preferences experience
      // In this case, continue on w/ empty consent, and hide the consents tab
      if (e === errors.noPurposesError) {
        l.debug('No purposes detected, experience will not display consents tab')
        consent = EMPTY_CONSENT
        showConsentsTab = false
      } else {
        throw e
      }
    }

    params = params ?? {}

    // check if experience show parameter override set
    const tab = parameters.get(constants.PREFERENCES_TAB)

    // override with url param
    if (tab && isTab(tab)) {
      params.tab = tab
      l.info('tab', tab)
    }

    const selectedTabs = parameters
      .get(constants.PREFERENCES_TABS)
      ?.split(',')
      ?.filter(tab => tab && isTab(tab)) as Tab[]

    if (selectedTabs?.length) {
      params.showOverviewTab = selectedTabs.includes(Tab.Overview)
      params.showConsentsTab = showConsentsTab && selectedTabs.includes(Tab.Consents)
      params.showSubscriptionsTab = selectedTabs.includes(Tab.Subscriptions)
      params.showRightsTab = selectedTabs.includes(Tab.Rights)
      params.tab = selectedTabs.includes(params.tab || ('' as Tab)) ? params.tab : selectedTabs[0]
    }

    try {
      const subConfig = await this.getSubscriptionConfiguration()
      if (subConfig !== undefined) {
        if (params.showSubscriptionsTab === undefined) {
          params.showSubscriptionsTab = true
        }

        if (
          subConfig.topics === undefined ||
          subConfig.topics.length === 0 ||
          Object.keys(subConfig.identities).length === 0
        ) {
          params.showSubscriptionsTab = false
          l.trace('not showing subscriptions because invalid subscription config')
        }

        if (params.showSubscriptionsTab) {
          let haveAuthIdentities = false

          const identities = await this.getIdentities()
          for (const key of Object.keys(subConfig.identities)) {
            if (identities[key]) {
              haveAuthIdentities = true
              break
            }
          }

          if (!haveAuthIdentities) {
            l.trace('not showing subscriptions because no auth identities')
            params.showSubscriptionsTab = false
          }
        }
      } else {
        l.trace('invalid subscription config')
        params.showSubscriptionsTab = false
      }
    } catch (e: any) {
      l.trace('invalid subscription config')
      params.showSubscriptionsTab = false
    }

    if (!params.showSubscriptionsTab && params.tab === Tab.Subscriptions) {
      params.tab = undefined
    }

    // if listener subscribed, trigger event, else wait for listener
    if (this.listenerCount(constants.SHOW_PREFERENCE_EXPERIENCE_EVENT) > 0) {
      await this.showPreferenceExperienceTrigger(params, consent)
    } else {
      this.on('addedListener', event => {
        if (event === constants.SHOW_PREFERENCE_EXPERIENCE_EVENT) {
          this.showPreferenceExperienceTrigger(params, consent)
        }
      })
    }

    return consent
  }

  async showPreferenceExperienceTrigger(params?: ShowPreferenceOptions, consent?: Consent): Promise<void> {
    const l = wrapLogger(log, 'showPreferenceExperienceTrigger')
    l.debug(params)

    this.willShowExperience(ExperienceType.Preference)
    this.emit(constants.SHOW_PREFERENCE_EXPERIENCE_EVENT, consent, params)
  }

  /**
   * onShowConsentExperience registers a function to handle showing consent
   *
   * @param callback Callback to register
   */
  async onShowConsentExperience(callback: (consents: Consent, options?: ShowConsentOptions) => void): Promise<void> {
    log.debug('onShowConsentExperience')
    this.removeAllListeners(constants.SHOW_CONSENT_EXPERIENCE_EVENT)
    this.on(constants.SHOW_CONSENT_EXPERIENCE_EVENT, callback)
  }

  /**
   * onShowPreferenceExperience registers a function to handle showing preferences
   *
   * @param callback Callback to register
   */
  async onShowPreferenceExperience(
    callback: (consents: Consent, options?: ShowPreferenceOptions) => void,
  ): Promise<void> {
    log.debug('onShowPreferenceExperience')
    this.removeAllListeners(constants.SHOW_PREFERENCE_EXPERIENCE_EVENT)
    this.on(constants.SHOW_PREFERENCE_EXPERIENCE_EVENT, callback)
  }

  /**
   * Returns true if the consent is available.
   */
  hasConsent(): boolean {
    return this._consent.isFulfilled()
  }

  /**
   * Sets the consent.
   *
   * @param c Consent to set
   * @param reason set consent reason
   */
  async setConsent(c: Consent, reason?: SetConsentReason): Promise<Consent> {
    const l = wrapLogger(log, 'setConsent')
    l.debug(c)

    if (!c || isEmpty(c)) {
      l.trace('reset')
      this._consent.reset()
      return {} as Consent
    }

    // Merge new consent into existing consent
    let consentEqual = false
    if (this.hasConsent()) {
      l.trace('has consent')
      const existingConsent = this._consent.value
      consentEqual = deepEqual(existingConsent.purposes, c.purposes)
      for (const key in existingConsent.purposes) {
        if (
          Object.prototype.hasOwnProperty.call(existingConsent.purposes, key) &&
          !Object.prototype.hasOwnProperty.call(c.purposes, key)
        ) {
          c.purposes[key] = existingConsent.purposes[key]
        }
      }
      c.protocols = existingConsent.protocols
    }

    this._consent.value = c
    const identities = await this.getIdentities()

    try {
      const consent = await this.updateConsent(identities, c)

      if (consent && consent.protocols !== undefined) {
        this._protocols.value = consent.protocols
      }
      if (reason === SetConsentReason.USER_UPDATE) {
        // check for new identifiers for tags that may fire after consent collected
        this._watcher.stop()
        await this._watcher.start()

        // check if consent updated to conditionally fire event
        if (!consentEqual) {
          // fire the 'userConsentUpdated' event when all the following conditions are true
          // 1) if the consent is updated by a user (SetConsentReason.USER_UPDATE)
          // 2) if the consent purpose values have changed (!consentEqual)
          // 3) once the server responds confirming that consent has been saved (await this.updateConsent)
          this.emit(constants.USER_CONSENT_UPDATED_EVENT, c)
        }
      }
    } catch (error) {
      let errorMessage = ''
      if (error instanceof Error) {
        errorMessage = error.message
      }
      l.warn('unable to update consent', errorMessage)
    }

    return c
  }

  /**
   * Set to provisional consent.
   *
   * @param c Consent to set
   */
  async setProvisionalConsent(c: Consent): Promise<void> {
    log.debug('setProvisionalConsent', c)
    this._provisionalConsent = c
  }

  /**
   * override provisional consent on retrieved consent from the server.
   *
   * @param c current consent
   */
  async overrideWithProvisionalConsent(c: Consent): Promise<[Consent, boolean]> {
    const l = wrapLogger(log, 'overrideWithProvisionalConsent')
    l.debug(c)

    let shouldUpdateConsent = false
    if (!this._provisionalConsent) {
      l.trace('no provisional consent')
      return [c, shouldUpdateConsent]
    }
    for (const key in this._provisionalConsent.purposes) {
      if (c.purposes[key] !== this._provisionalConsent.purposes[key]) {
        c.purposes[key] = this._provisionalConsent.purposes[key]
        shouldUpdateConsent = true
      }
    }
    this._provisionalConsent = undefined
    l.trace('merged', c)
    return [c, shouldUpdateConsent]
  }

  /**
   * Gets the consent.
   */
  async getConsent(): Promise<Consent> {
    const l = wrapLogger(log, 'getConsent')

    if (this.hasConsent()) {
      l.trace('has consent')
      return this._consent.fulfilled
    }

    l.debug('obtaining consent')

    const identities = await this.getIdentities()

    const consent = await this.fetchConsent(identities)
    const [c, shouldUpdateConsent] = await this.overrideWithProvisionalConsent(consent)
    let shouldCreatePermits = shouldUpdateConsent

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

    if (this._config.deployment?.isOrchestrationOnly) return {} as Consent

    l.debug('shouldCreatePermits', shouldCreatePermits)

    // first set consent value then proceed to show experience and/or create permits
    if (shouldCreatePermits) {
      await this.setConsent(c, SetConsentReason.DEFAULT_STATE)
    } else {
      this._consent.value = c
      if (consent.protocols !== undefined) {
        this._protocols.value = consent.protocols
      }
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
    log.debug('retrieveConsent')

    if (this._consent.isFulfilled()) {
      return this._consent.fulfilled
    }

    return { purposes: {}, vendors: [] }
  }

  /**
   * Get the consent.
   *
   * @param identities Identities to fetch consent for
   */
  async fetchConsent(identities: Identities): Promise<Consent> {
    const l = wrapLogger(log, 'fetchConsent')
    l.debug('identities', identities)

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
      organizationCode: this._config.organization.code ?? '',
      propertyCode: this._config.property.code ?? '',
      environmentCode: this._config.environment.code,
      jurisdictionCode: this._config.jurisdiction.code ?? '',
      identities: identities,
      purposes: {},
    }

    // Add the purposes by ID with the legal basis
    for (const pa of this._config.purposes) {
      request.purposes[pa.code] = {
        legalBasisCode: pa.legalBasisCode,
      }
    }

    l.debug('request', request)

    let consent = await getCachedConsent(request)

    const earliestCollectedAt = Math.floor(Date.now() / 1000 - CACHED_CONSENT_TTL)

    const normalizeConsent = (input: GetConsentResponse): GetConsentResponse => {
      l.trace('normalizeConsent', input)

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

      l.trace('normalized', input)

      return input
    }

    // Determine whether we should use cached consent
    let useCachedConsent = false
    let invalidIdentities = false
    if (Object.keys(consent.purposes).length === 0) {
      l.debug('cached consent is empty', consent)
    } else if (consent?.collectedAt && consent.collectedAt < earliestCollectedAt) {
      l.debug('revalidating cached consent', consent)
    } else if (!deepEqual(identities, consent.identities)) {
      invalidIdentities = true
      l.debug('cached consent discarded due to identity mismatch', identities, consent.identities)
    } else {
      l.debug('using cached consent', consent)
      useCachedConsent = true
    }

    if (!useCachedConsent) {
      /*
          When identities change and the new identity has no consent, below code populates consent of previous identity to request
          The same request is returned if the response of this._api.getConsent(request) has no purposes
          This request with new identity will eventually be resolved to old consent
          !invalidIdentities check enforces event is not populated with previous identity consent
      */
      if (this._config.purposes && consent.purposes && !invalidIdentities) {
        for (const p of this._config.purposes) {
          const cachedPurposeConsent = consent.purposes[p.code]
          if (cachedPurposeConsent) {
            if (!request.purposes[p.code]) {
              request.purposes[p.code] = {} as PurposeLegalBasis
            }
            if (typeof cachedPurposeConsent === 'string') {
              request.purposes[p.code].allowed = cachedPurposeConsent
            } else {
              request.purposes[p.code].allowed = cachedPurposeConsent.allowed
            }
          }
        }
      }

      l.debug('calling getConsent', request)
      consent = normalizeConsent(await this._api.getConsent(request))
      l.debug('getConsent returned', consent)

      await setCachedConsent(consent)
    }

    // always set on every fetch consent
    await setPublicConsent(consent, this._config)

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

    if (consent.protocols) {
      newConsent.protocols = consent.protocols
    }

    l.debug('returning', newConsent)

    return newConsent
  }

  /**
   * Update consent.
   *
   * @param identities Identities to update consent for
   * @param consent Consent to update
   */
  async updateConsent(identities: Identities, consent: Consent): Promise<SetConsentResponse> {
    const l = wrapLogger(log, 'updateConsent')
    l.debug(identities, consent)

    // If no identities or purposes defined, skip the call.
    if (!identities || Object.keys(identities).length === 0) {
      l.debug('no identities')
      throw errors.noIdentitiesError
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
      l.debug('invalid configuration')
      throw errors.invalidConfigurationError
    }

    if (isEmpty(consent) || isEmpty(consent.purposes)) {
      l.debug('empty consent')
      throw errors.emptyConsentError
    }

    const request: SetConsentRequest = {
      organizationCode: this._config.organization.code ?? '',
      propertyCode: this._config.property.code ?? '',
      environmentCode: this._config.environment.code,
      identities: identities,
      jurisdictionCode: this._config.jurisdiction.code ?? '',
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
      l.debug('calculated consents empty')
      return request
    }

    // Save a locally cached consent
    await setCachedConsent(request)
    await setPublicConsent(request, this._config)

    const resp = await this._api.setConsent(request)
    await setCachedConsent(resp)

    return resp
  }

  /**
   * Get subscriptions
   */
  async getSubscriptions(): Promise<Subscriptions> {
    const l = wrapLogger(log, 'getSubscriptions')

    if (
      this._config.organization === undefined ||
      this._config.property === undefined ||
      this._config.environment === undefined
    ) {
      l.trace('exiting because invalid config', this._config)
      this._subscriptions.value = {}
      return {}
    }

    if (this._subscriptions.isFulfilled()) {
      l.trace('cached', this._subscriptions.value)
      return this._subscriptions
    }

    const config = await this.getSubscriptionConfiguration()
    if (config.topics.length === 0 || config.identities === undefined || Object.keys(config.identities).length === 0) {
      l.trace(
        'exiting because invalid subscription config',
        config,
        config.topics.length,
        config.identities,
        Object.keys(config.identities),
      )
      this._subscriptions.value = {}
      return {}
    }

    const request: GetSubscriptionsRequest = {
      organizationCode: this._config?.organization?.code ?? '',
      controllerCode: '',
      propertyCode: this._config?.property?.code ?? '',
      environmentCode: this._config?.environment?.code,
      collectedAt: Math.floor(Date.now() / 1000),
    }

    request.identities = {}

    const identities = await this.getIdentities()
    for (const key of Object.keys(config.identities)) {
      if (identities[key]) {
        request.identities[key] = identities[key]
      }
    }

    if (Object.keys(request.identities).length === 0) {
      l.trace('exiting because no identities')
      this._subscriptions.value = {}
      return {}
    }

    const subscriptions = await this._api.getSubscriptions(request)

    this._subscriptions.value = subscriptions

    l.trace('loaded', subscriptions)

    return subscriptions
  }

  /**
   * Set subscriptions
   *
   * @param subscriptions
   */
  async setSubscriptions(subscriptions: Subscriptions): Promise<void> {
    const l = wrapLogger(log, 'setSubscriptions')
    l.trace('subscriptions', subscriptions, this._config)

    if (
      this._config.organization === undefined ||
      this._config.property === undefined ||
      this._config.environment === undefined
    ) {
      l.trace('exiting because of invalid config')
      return
    }

    const config = await this.getSubscriptionConfiguration()
    if (config.topics.length === 0 || config.identities === undefined || Object.keys(config.identities).length === 0) {
      l.trace(
        'exiting because of invalid subscription config',
        config,
        config.topics.length === 0,
        config.identities,
        Object.keys(config.identities),
      )
      return
    }

    const request: SetSubscriptionsRequest = {
      organizationCode: this._config?.organization?.code ?? '',
      controllerCode: '',
      propertyCode: this._config?.property?.code ?? '',
      environmentCode: this._config?.environment?.code,
      topics: subscriptions.topics,
      controls: subscriptions.controls,
      collectedAt: Math.floor(Date.now() / 1000),
    }

    request.identities = {}

    const identities = await this.getIdentities()
    for (const key of Object.keys(config.identities)) {
      if (identities[key]) {
        request.identities[key] = identities[key]
      }
    }

    if (Object.keys(request.identities).length === 0) {
      l.trace('exiting because no identities')
      this._subscriptions.value = {}
      return
    }

    this._subscriptions.value = subscriptions

    return this._api.setSubscriptions(request)
  }

  /**
   * Get Subscription configuration
   */
  async getSubscriptionConfiguration(): Promise<SubscriptionConfiguration> {
    const l = wrapLogger(log, 'getSubscriptionConfiguration')
    l.trace('config', this._config)

    if (this._subscriptionConfig.isFulfilled()) {
      l.trace('cached', this._subscriptionConfig.value)
      return this._subscriptionConfig
    }

    // empty subscriptions if parameters not present or if v3 config
    if (!this._config?.experiences?.preference?.code || this._config?.services?.shoreline?.includes('v3')) {
      // if no experience check if subscription in experiencev2 preference configuration
      const preferenceConfig = await this.getPreferenceConfiguration()
      if (preferenceConfig.subscription) {
        return preferenceConfig.subscription
      }

      this._subscriptionConfig.value = {
        contactMethods: {},
        controls: [],
        identities: {},
        language: this._config?.language ?? '',
        organization: {
          code: this._config?.organization?.code ?? '',
        },
        property: {
          code: this._config?.property?.code ?? '',
        },
        topics: [],
      }
      return this._subscriptionConfig.value
    }

    const config = await this._api.getSubscriptionsConfiguration({
      organizationCode: this._config?.organization?.code ?? '',
      propertyCode: this._config?.property?.code ?? '',
      languageCode: this._config?.language ?? '',
      experienceCode: this._config?.experiences?.preference?.code ?? '',
    })

    l.trace('loaded', config)

    this._subscriptionConfig.value = config

    return config
  }

  /**
   * Get ConfigurationV2 object with consent experience information
   */
  async getConsentConfiguration(): Promise<ConfigurationV2> {
    const l = wrapLogger(log, 'getConsentConfiguration')
    l.trace('config', this._config)

    if (this._consentConfig.isFulfilled()) {
      l.trace('cached', this._consentConfig.value)
      return this._consentConfig
    }

    const consentConfig = await this._api.getConsentConfiguration({
      organizationCode: this._config.organization.code,
      propertyCode: this._config.property?.code ?? '',
      envCode: this._config.environment?.code ?? '',
      jurisdictionCode: this._config.jurisdiction?.code ?? '',
      langCode: this._config.language ?? '',
      hash: this._config.environment?.hash,
    })

    l.trace('loaded', consentConfig)

    this._consentConfig.value = consentConfig

    return consentConfig
  }

  /**
   * Get ConfigurationV2 object with preference experience information
   */
  async getPreferenceConfiguration(): Promise<ConfigurationV2> {
    const l = wrapLogger(log, 'getPreferenceConfiguration')
    l.trace('config', this._config)

    if (this._preferenceConfig.isFulfilled()) {
      l.trace('cached', this._preferenceConfig.value)
      return this._preferenceConfig
    }

    const preferenceConfig = await this._api.getPreferenceConfiguration({
      organizationCode: this._config.organization.code,
      propertyCode: this._config.property?.code ?? '',
      envCode: this._config.environment?.code ?? '',
      jurisdictionCode: this._config.jurisdiction?.code ?? '',
      langCode: this._config.language ?? '',
      hash: this._config.environment?.hash,
    })

    l.trace('loaded', preferenceConfig)

    this._preferenceConfig.value = preferenceConfig

    return preferenceConfig
  }

  /**
   * Set the environment.
   *
   * @param env Environment to set
   */
  async setEnvironment(env: Environment): Promise<Environment> {
    log.debug('setEnvironment', env)
    this._environment.value = env
    return this._environment.fulfilled
  }

  /**
   * Get the environment.
   */
  async getEnvironment(): Promise<Environment> {
    log.debug('getEnvironment')

    return this._environment.fulfilled
  }

  /**
   * Set the IPInfo.
   *
   * @param g IPInfo
   */
  async setGeoIP(g: IPInfo): Promise<IPInfo> {
    log.debug('setGeoIP', g)
    this._geoip.value = g
    return this._geoip.fulfilled
  }

  /**
   * Gets the IPInfo.
   */
  async getGeoIP(): Promise<IPInfo> {
    log.debug('getGeoIP')

    return this._geoip.fulfilled
  }

  /**
   * This is a customer use case for extracting the identity from a Google Analytics cookie
   * The cookie is formatted as GA1.2.123.123 or GA1.1.123.123 where the first version is set by universal analytics
   * and the second version is set by GA4. Some customers have both tags on the page leading to inconsistent identity.
   *
   * @param input GA cookie value
   */
  extractGAID(input: string): string {
    const pattern = /^GA\d\.\d\.(\d+\.\d+)$/
    const match = pattern.exec(input)

    if (match) {
      // If a match is found, convert to GA4 identity GA1.1.X
      return 'GA1.1.' + match[1]
    }

    return input
  }

  /**
   * Sets the identities.
   *
   * @param newIdentities Identities to set
   */
  async setIdentities(newIdentities: Identities): Promise<Identities> {
    const l = wrapLogger(log, 'setIdentities')
    l.debug(newIdentities)

    // update current identities with new identities but do not overwrite previously found identities
    let identities: Identities = {}
    if (this._identities.isFulfilled()) {
      identities = this._identities.value
    }
    for (const key in newIdentities) {
      // this is a solution for customers who use the Google Analytics identifier as their primary identity space
      // with the identity space code google_analytics_cookie
      if (
        key === 'google_analytics_cookie' &&
        (this._config.organization.code === 'utc' || this._config.organization.code === 'vara_labs')
      ) {
        l.debug('altering google_analytics_cookie to get id with GA1.1. prefix')
        newIdentities[key] = this.extractGAID(newIdentities[key])
      }

      identities[key] = newIdentities[key]
    }
    this._identities.value = identities

    // change in identities found so set new identities found on page and check for consent
    // if experience is currently displayed only update identities, and then return to wait for user input
    if (this._isExperienceDisplayed) {
      l.trace('experience displayed')
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
    if (deepEqual(permitConsent.purposes, localConsent.purposes)) {
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
      l.trace('updating consent because experience displayed')
      try {
        await this.updateConsent(identities, localConsent)
      } catch (error) {
        let errorMessage = ''
        if (error instanceof Error) {
          errorMessage = error.message
        }
        l.warn('unable to update consent', errorMessage)
      }
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
    const l = wrapLogger(log, 'collectIdentities')
    l.debug(this._config.identities)

    const configIDs = this._config.identities

    if (!this._config || !this._config.organization || configIDs === undefined || isEmpty(configIDs)) {
      l.trace('invalid configuration')
      this._identities.value = {}
      return
    }

    const watcher = this._watcher

    let adder = (name: string, identity: Identity) => {
      watcher.add(name, identity)
    }

    if (this._config.property?.proxy) {
      try {
        const proxyPage = new URL(this._config.property?.proxy)
        const currentPage = new URL(window.location.href)

        if (proxyPage.origin !== currentPage.origin) {
          adder = (name: string, identity: Identity) => {
            if (configIDs[name].type !== IdentityType.IDENTITY_TYPE_LOCAL_STORAGE) {
              watcher.add(name, identity)
            }
          }
        }
      } catch (e) {
        l.error(`error checking proxy '${this._config.property?.proxy}'`, e)
      }
    }

    for (const name of Object.keys(configIDs)) {
      adder(name, configIDs[name])
    }

    l.info('starting watcher')
    await this._watcher.start()
  }

  /**
   * Get the identities.
   */
  async getIdentities(): Promise<Identities> {
    log.debug('getIdentities')

    if (!this._identities.isFulfilled()) {
      await this.collectIdentities()
    }

    return this._identities.fulfilled
  }

  /**
   * Set the policy scope.
   *
   * @param ps Jurisdiction to set
   */
  async setJurisdiction(ps: string): Promise<string> {
    log.debug('setJurisdiction', ps)

    this._jurisdiction.value = ps
    return this._jurisdiction.fulfilled
  }

  /**
   * Get the policy scope.
   */
  async getJurisdiction(): Promise<string> {
    log.debug('getJurisdiction')

    return this._jurisdiction.fulfilled
  }

  /**
   * Set the region.
   *
   * @param info Region information
   */
  async setRegionInfo(info: string): Promise<string> {
    log.debug('setRegionInfo', info)
    this._regionInfo.value = info
    return this._regionInfo.fulfilled
  }

  /**
   * Gets the region.
   */
  async getRegionInfo(): Promise<string> {
    log.debug('getRegionInfo')
    return this._regionInfo.fulfilled
  }

  /**
   * Invoke rights.
   *
   * @param eventData Event data to invoke right with
   */
  async invokeRight(eventData: InvokeRightEvent): Promise<void> {
    const l = wrapLogger(log, 'invokeRight')
    l.debug(eventData)

    // If no identities or rights defined, skip the call.
    if (
      !eventData.subject ||
      !eventData.subject.email ||
      eventData.subject.email === '' ||
      !eventData.right ||
      eventData.right === ''
    ) {
      l.warn('invalid right invocation request')
      return
    }

    const rightInvocationIdentities: Identities = {}
    if (this._identities.isFulfilled()) {
      Object.entries(this._identities.value).forEach(([key, value]) => {
        rightInvocationIdentities[key] = value
      })
    }

    // add email identity from rights form
    rightInvocationIdentities['email'] = eventData.subject.email

    if (
      !this._config ||
      !this._config.organization ||
      !this._config.property ||
      !this._config.environment ||
      !this._config.jurisdiction ||
      !this._config.rights ||
      this._config.rights.length === 0
    ) {
      l.warn('invalid configuration')
      return
    }

    const user: DataSubject = eventData.subject

    const request: InvokeRightRequest = {
      organizationCode: this._config.organization.code ?? '',
      propertyCode: this._config.property.code ?? '',
      environmentCode: this._config.environment.code,
      controllerCode: '',
      identities: rightInvocationIdentities,
      jurisdictionCode: this._config.jurisdiction.code ?? '',
      rightCode: eventData.right,
      user: user,
      recaptchaToken: eventData.recaptchaToken,
    }

    this.emit(constants.RIGHT_INVOKED_EVENT, request)

    return this._api.invokeRight(request)
  }

  /**
   * Synchronously calls each of the listeners registered for the event named `eventName`, in the order they
   * were registered, passing the supplied arguments to each.
   */
  emit(event: string | symbol, ...args: any[]): boolean {
    const l = wrapLogger(log, 'emit')
    l.trace(event, args)

    if (window.androidListener || window.webkit?.messageHandlers || window.ReactNativeWebView?.postMessage) {
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
        l.trace('androidListener', window.androidListener, argument)
        if (filteredArgs.length === 0) {
          window.androidListener[eventName]()
        } else {
          window.androidListener[eventName](argument)
        }
      } else if (window.webkit?.messageHandlers && eventName in window.webkit.messageHandlers) {
        l.trace('webkitMessageHandlers', window.webkit?.messageHandlers, argument)
        window.webkit.messageHandlers[eventName].postMessage(argument)
      } else if (window.ReactNativeWebView?.postMessage) {
        window.ReactNativeWebView.postMessage(JSON.stringify({ event, data: argument }))
      } else {
        l.warn(`Can't pass message to native code because "${eventName}" handler is not registered`)
      }
    }

    if (
      this._config &&
      this._config.options &&
      this._config.options.externalListener &&
      window[this._config.options.externalListener]
    ) {
      const externalListener = window[this._config.options.externalListener]

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
        argument = filteredArgs[0]
      } else if (filteredArgs.length > 1) {
        argument = filteredArgs
      }

      let eventData: { [key: string]: any } | string = {
        event: eventName,
        data: argument,
      }

      // TODO: option to determine if we pass stringify data or not
      eventData = JSON.stringify(eventData)

      if (typeof externalListener === 'function') {
        externalListener(eventData)
      } else if ('postMessage' in externalListener && typeof externalListener['postMessage'] === 'function') {
        externalListener.postMessage(eventData)
      } else if (typeof externalListener === 'object' && eventName in externalListener) {
        if (externalListener[eventName] === 'function') {
          externalListener[eventName](argument)
        } else if ('postMessage' in externalListener[eventName]) {
          externalListener[eventName].postMessage(argument)
        }
      }
    }

    return super.emit(event, ...args)
  }

  addListener(eventName: string | symbol, listener: (...args: any[]) => void): this {
    this.on(eventName, listener)

    // Emit an event after the listener is added
    this.emit('addedListener', eventName, listener)

    return this
  }

  on(eventName: string | symbol, listener: (...args: any[]) => void): this {
    log.trace('on', eventName, listener)
    const future = this.mapEvent(eventName)
    if (future !== undefined) {
      future.on(constants.FULFILLED_EVENT, listener)
      return this
    } else if (this.isSingletonEvent(eventName)) {
      super.removeAllListeners(eventName)
    }

    return super.on(eventName, listener)
  }

  once(eventName: string | symbol, listener: (...args: any[]) => void): this {
    log.trace('once', eventName, listener)
    const future = this.mapEvent(eventName)
    if (future !== undefined) {
      future.once(constants.FULFILLED_EVENT, listener)
      return this
    } else if (this.isSingletonEvent(eventName)) {
      super.removeAllListeners(eventName)
    }

    return super.once(eventName, listener)
  }

  removeListener(eventName: string | symbol, listener: (...args: any[]) => void): this {
    log.trace('off', eventName, listener)
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

  private isSingletonEvent(_eventName: string | symbol): boolean {
    return (
      _eventName === constants.SHOW_CONSENT_EXPERIENCE_EVENT ||
      _eventName === constants.SHOW_PREFERENCE_EXPERIENCE_EVENT
    )
  }

  /**
   * @internal
   * @private
   */
  private mapEvent(eventName: string | symbol): Emitter | undefined {
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

      case constants.SUBSCRIPTIONS_EVENT:
        return this._subscriptions

      case constants.SUBSCRIPTION_CONFIG_EVENT:
        return this._subscriptionConfig
    }

    return
  }
}

declare interface Emitter {
  on(eventName: string | symbol, listener: (...args: any[]) => void): this
  once(eventName: string | symbol, listener: (...args: any[]) => void): this
  removeListener(eventName: string | symbol, listener: (...args: any[]) => void): this
}
