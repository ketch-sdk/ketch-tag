import * as ketchapi from '@ketch-sdk/ketch-web-api'
import Future from './internal/future'
import {
  AppDiv,
  Callback,
  Consent,
  Identities,
  InvokeRightsEvent,
  Plugin,
  ShowConsentExperience,
  ShowPreferenceExperience,
  ShowPreferenceOptions,
  isTab
} from '@ketch-sdk/ketch-plugin'
import dataLayer from './internal/datalayer'
import isEmpty from './internal/isEmpty'
import loglevel from './internal/logging'
import errors from './internal/errors'
import parameters from './internal/parameters'
import { getCookie, setCookie } from './internal/cookie'
import { v4 as uuidv4 } from 'uuid'
import { load } from './internal/scripts'
import constants from './internal/constants'

const log = loglevel.getLogger('ketch')

const DEFAULT_MIGRATION_OPTION = 0

/**
 * ExperienceType is the type of experience that will be shown
 */
export enum ExperienceType {
  Consent = 'experiences.consent',
  Preference = 'experiences.preference',
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
enum ExperienceHidden {
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
 * Service url
 *
 * @param config The configuration
 */
function getApiUrl(config: ketchapi.Configuration): string {
  if (config.services) {
    let url = config.services[constants.SHORELINE]
    // url must not end in '/'
    if (url.endsWith('/')) {
      url = url.slice(0, -1)
    }
    // url must end in /web/v2 if not set
    if (!url.endsWith('/web/v2')) {
      url = url + '/web/v2'
    }
    return url
  }

  // default case
  return 'https://global.ketchcdn.com/web/v2'
}

/**
 * Loads the config.
 *
 * @internal
 * @param boot The bootstrap configuration.
 */
export function newFromBootstrap(boot: ketchapi.Configuration): Promise<Ketch> {
  log.info('loadConfig')
  const promises: Promise<any>[] = []

  const k = new Ketch(boot)

  promises.push(k.detectEnvironment())
  promises.push(k.loadJurisdiction())

  return Promise.all(promises).then(([env, jurisdiction]) => {
    if (!env.hash) {
      return Promise.reject(errors.noEnvironmentError)
    }

    log.info('loadConfig', env, jurisdiction)

    if (!k._config || !k._config.organization || !k._config.property || !jurisdiction) {
      throw errors.noJurisdictionError
    }

    const language = parameters.get(parameters.LANGUAGE, window.location.search) || k._config.language

    log.info('language', language)

    const request: ketchapi.GetFullConfigurationRequest = {
      organizationCode: k._config.organization.code || '',
      propertyCode: k._config.property.code || '',
      environmentCode: env.code,
      hash: env.hash || '',
      languageCode: language || 'en',
      jurisdictionCode: jurisdiction,
    }

    return ketchapi.getFullConfiguration(getApiUrl(boot), request).then(cfg => {
      if (boot && boot.services) {
        let lanyardPath = boot.services[constants.LANYARD]
        if (lanyardPath) {
          if (lanyardPath.slice(-1) === '/') {
            lanyardPath = lanyardPath + `lanyard.${cfg.language}.js`
          } else if (lanyardPath.slice(-3) === '.js') {
            lanyardPath = lanyardPath.slice(0, -3) + `.${cfg.language}.js`
          }
          return load(lanyardPath).then(() => new Ketch(cfg))
        }
      }

      return new Ketch(cfg)
    })
  })
}

/**
 * Ketch class is the public interface to the Ketch web infrastructure services.
 */
export class Ketch {
  /**
   * @internal
   */
  _config: ketchapi.Configuration

  /**
   * @internal
   */
  _consent: Future<Consent>

  /**
   * @internal
   */
  _environment: Future<ketchapi.Environment>

  /**
   * @internal
   */
  _geoip: Future<ketchapi.IPInfo>

  /**
   * @internal
   */
  _identities: Future<Identities>

  /**
   * @internal
   */
  _jurisdiction: Future<string>

  /**
   * @internal
   */
  _regionInfo: Future<string>

  /**
   * @internal
   */
  _origin: string

  /**
   * @internal
   */
  _shouldConsentExperienceShow: boolean

  /**
   * @internal
   */
  _provisionalConsent?: Consent

  /**
   * appDivs is a list of hidden popup div ids and zIndexes as defined in AppDiv
   *
   * @internal
   */
  _appDivs: AppDiv[]

  /**
   * hideExperience is the list of functions registered with onHideExperience
   *
   * @internal
   */
  _hideExperience: Callback[]

  /**
   * willShowExperience is the list of functions registered with onWillShowExperience
   *
   * @internal
   */
  _willShowExperience: Callback[]

  /**
   * invokeRights is the list of functions registered with onInvokeRight
   *
   * @internal
   */
  _invokeRights: Callback[]

  /**
   * showPreferenceExperience is the function registered with onShowPreferenceExperience
   *
   * @internal
   */
  _showPreferenceExperience?: ShowPreferenceExperience

  /**
   * showConsentExperience is the function registered with onShowConsentExperience
   *
   * @internal
   */
  _showConsentExperience?: ShowConsentExperience

  /**
   * isExperienceDisplayed is a bool representing whether an experience is currently showing
   *
   * @internal
   */
  _isExperienceDisplayed?: boolean

  /**
   * hasExperienceBeenDisplayed is a bool representing whether an experience has been shown in a session
   *
   * @internal
   */
  _hasExperienceBeenDisplayed?: boolean

  /**
   * Constructor for Ketch takes the configuration object. All other operations are driven by the configuration
   * provided.
   *
   * @param config Ketch configuration
   */
  constructor(config: ketchapi.Configuration) {
    this._config = config
    this._consent = new Future<Consent>('consent')
    this._environment = new Future<ketchapi.Environment>('environment')
    this._geoip = new Future('geoip')
    this._identities = new Future<Identities>('identities')
    this._jurisdiction = new Future<string>('jurisdiction')
    this._regionInfo = new Future<string>('regionInfo')
    this._origin = window.location.protocol + '//' + window.location.host
    this._appDivs = []
    this._hideExperience = []
    this._willShowExperience = []
    this._invokeRights = []
    this._showPreferenceExperience = undefined
    this._showConsentExperience = undefined
    this._shouldConsentExperienceShow = false
    this._provisionalConsent = undefined
  }

  /**
   * Registers a plugin
   *
   * @param plugin The plugin to register
   */
  async registerPlugin(plugin: Plugin): Promise<void> {
    if (plugin.init) {
      plugin.init(this, this._config)
    }

    if (plugin.environmentLoaded) {
      await this.onEnvironment(env => {
        if (plugin.environmentLoaded) {
          return plugin.environmentLoaded(this, this._config, env)
        }
      })
    }

    if (plugin.geoIPLoaded) {
      await this.onGeoIP(ipInfo => {
        if (plugin.geoIPLoaded) {
          return plugin.geoIPLoaded(this, this._config, ipInfo)
        }
      })
    }

    if (plugin.identitiesLoaded) {
      await this.onIdentities(identities => {
        if (plugin.identitiesLoaded) {
          return plugin.identitiesLoaded(this, this._config, identities)
        }
      })
    }

    if (plugin.jurisdictionLoaded) {
      await this.onJurisdiction(jurisdiction => {
        if (plugin.jurisdictionLoaded) {
          return plugin.jurisdictionLoaded(this, this._config, jurisdiction)
        }
      })
    }

    if (plugin.regionInfoLoaded) {
      await this.onRegionInfo(region => {
        if (plugin.regionInfoLoaded) {
          return plugin.regionInfoLoaded(this, this._config, region)
        }
      })
    }

    if (plugin.showConsentExperience) {
      await this.onShowConsentExperience(plugin.showConsentExperience)
    }

    if (plugin.showPreferenceExperience) {
      await this.onShowPreferenceExperience(plugin.showPreferenceExperience)
    }

    if (plugin.willShowExperience) {
      await this.onWillShowExperience(() => {
        if (plugin.willShowExperience) {
          return plugin.willShowExperience(this, this._config)
        }
      })
    }

    if (plugin.experienceHidden) {
      await this.onHideExperience(reason => {
        if (plugin.experienceHidden) {
          return plugin.experienceHidden(this, this._config, reason)
        }
      })
    }

    if (plugin.consentChanged) {
      await this.onConsent(consent => {
        if (plugin.consentChanged) {
          return plugin.consentChanged(this, this._config, consent)
        }
      })
    }

    if (plugin.rightInvoked) {
      await this.onInvokeRight(request => {
        if (plugin.rightInvoked) {
          return plugin.rightInvoked(this, this._config, request)
        }
      })
    }
  }

  /**
   * Returns the configuration.
   */
  async getConfig(): Promise<ketchapi.Configuration> {
    return this._config
  }

  /**
   * Determines which experience type to show if we should show an experience.
   *
   * @param c Consent to be used
   */
  selectExperience(c: Consent): ExperienceType | undefined {
    // if experience has already showed, do not show again
    if (this._hasExperienceBeenDisplayed) {
      log.debug('selectExperience', 'none')
      return
    }

    // check if experience show parameter override set
    const show = parameters.get(parameters.SHOW, window.location.search)
    if (parameters.has(parameters.SHOW, window.location.search) && (show.length === 0 || show === parameters.CONSENT)) {
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
  selectConsentExperience(): 'experiences.consent.jit' | 'experiences.consent.modal' | 'experiences.consent.banner' {
    if (this._config.purposes) {
      for (const pa of this._config.purposes) {
        if (pa.requiresOptIn) {
          if (this._config.experiences?.consent?.experienceDefault == 2) {
            log.debug('selectExperience', 'experiences.consent.modal')
            return 'experiences.consent.modal'
          }
        }
      }
    }

    log.debug('selectExperience', 'experiences.consent.banner')
    return 'experiences.consent.banner'
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
    this._willShowExperience.forEach(func => func(type))

    // update isExperienceDisplayed flag when experience displayed
    this._isExperienceDisplayed = true
  }

  /**
   * Shows the consent manager.
   */
  async showConsentExperience(): Promise<Consent> {
    log.info('showConsentExperience')

    let c: Promise<Consent | undefined>
    if (this._consent.hasValue()) {
      c = this._consent.getValue()
    } else {
      c = Promise.resolve({ purposes: {}, vendors: [] } as Consent)
    }

    return c.then(consent => {
      if (consent === undefined) {
        return { purposes: {}, vendors: [] } as Consent
      }

      if (this._showConsentExperience) {
        this.willShowExperience(ExperienceType.Consent)
        this._showConsentExperience(this, this._config, consent, { displayHint: this.selectConsentExperience() })
      }

      return consent
    })
  }

  /**
   * Returns true if the consent is available.
   */
  hasConsent(): boolean {
    return this._consent.hasValue()
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

    for (const purposeCode in c.purposes) {
      permitChangedEvent[purposeCode] = c.purposes[purposeCode]
      swbPermitChangedEvent[purposeCode] = c.purposes[purposeCode]
    }

    dataLayer().push(permitChangedEvent)
    dataLayer().push(swbPermitChangedEvent)
  }

  /**
   * Called when experience renderer tells us the user has updated consent.
   *
   * @param consent Consent to change
   */
  async changeConsent(consent: Consent): Promise<void> {
    // check for new identifiers for tags that may fire after consent collected
    this.pollIdentity([4000, 8000])

    await this.setConsent(consent)
  }

  /**
   * Updates the client _consent value.
   *
   * @param c Consent to update
   */
  async updateClientConsent(c: Consent): Promise<Consent> {
    log.info('updateClientConsent', c)

    if (!c || isEmpty(c)) {
      return (await this._consent.setValue(undefined)) as Consent
    }

    // Merge new consent into existing consent
    if (this.hasConsent()) {
      const existingConsent = this._consent.getRawValue()
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

    return (await this._consent.setValue(c)) as Consent
  }

  /**
   * Sets the consent.
   *
   * @param c Consent to set
   */
  async setConsent(c: Consent): Promise<Consent> {
    log.info('setConsent', c)

    return this.updateClientConsent(c).then(() => {
      return this.getIdentities()
        .then(identities => this.updateConsent(identities, c))
        .then(() => c)
    })
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
      return (await this._consent.getValue()) as Consent
    }

    // get session consent
    // TODO server side signing
    const sessionConsentString = sessionStorage.getItem('consent')
    let sessionConsent: Consent

    if (sessionConsentString) {
      sessionConsent = JSON.parse(sessionConsentString)
    }

    return this.getIdentities()
      .then(identities => {
        return this.fetchConsent(identities)
          .then(c => this.overrideWithProvisionalConsent(c, this._provisionalConsent!))
          .then(c => this.mergeSessionConsent(c, sessionConsent))
          .then(c => {
            this._provisionalConsent = undefined
            let shouldCreatePermits = false

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

            let consentPromise: Promise<any>
            if (shouldCreatePermits) {
              consentPromise = this.setConsent(c)
            } else {
              consentPromise = this.updateClientConsent(c)
            }

            // first set consent value then proceed to show experience and/or create permits
            return consentPromise.then(() => {
              switch (experience) {
                case ExperienceType.Consent:
                  return this.showConsentExperience()
                case ExperienceType.Preference:
                  return this.showPreferenceExperience()
              }

              // experience will not show - call functions registered using onHideExperience
              this._hideExperience.forEach(func => {
                func(ExperienceHidden.WillNotShow)
              })

              return
            })
          })
      })
      .then(() => this._consent.getValue()) as Promise<Consent>
  }

  /**
   * Retrieve the consent for subsequent calls.
   */
  async retrieveConsent(): Promise<Consent> {
    log.info('retrieveConsent')

    if (this._consent.hasValue()) {
      return (await this._consent.getValue()) as Consent
    }

    return Promise.resolve({ purposes: {}, vendors: [] } as Consent)
  }

  /**
   * Registers a callback for the given event.
   *
   * @param event The event to register a callback for
   * @param callback The callback to register
   */
  async on(_event: string, _callback: Callback): Promise<void> {

  }

  /**
   * Registers a callback for consent change notifications.
   *
   * @param callback The consent callback to register
   */
  async onConsent(callback: Callback): Promise<void> {
    this._consent.subscribe(callback)
  }

  /**
   * Registers a callback for right invocations.

   * @param callback The right callback to register
   */
  async onInvokeRight(callback: Callback): Promise<void> {
    this._invokeRights.push(callback)
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
      return Promise.reject(errors.noIdentitiesError)
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
      return Promise.reject(errors.noPurposesError)
    }

    const request: ketchapi.GetConsentRequest = {
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

    return ketchapi.getConsent(getApiUrl(this._config), request).then((consent: ketchapi.GetConsentResponse) => {
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
    })
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

    const request: ketchapi.SetConsentRequest = {
      organizationCode: this._config.organization.code || '',
      propertyCode: this._config.property.code || '',
      environmentCode: this._config.environment.code,
      controllerCode: '',
      identities: identities,
      jurisdictionCode: this._config.jurisdiction.code || '',
      purposes: {},
      migrationOption: DEFAULT_MIGRATION_OPTION,
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

    return ketchapi.setConsent(getApiUrl(this._config), request)
  }

  /**
   * Set the environment.
   *
   * @param env Environment to set
   */
  async setEnvironment(env: ketchapi.Environment): Promise<ketchapi.Environment> {
    log.info('setEnvironment', env)
    return (await this._environment.setValue(env)) as ketchapi.Environment
  }

  /**
   * Detect the current environment. It will first look at the query string for any specified environment,
   * then it will iterate through the environment specifications to match based on the environment pattern.
   */
  async detectEnvironment(): Promise<ketchapi.Environment> {
    log.info('detectEnvironment')

    // We have to have environments
    if (!this._config.environments) {
      log.debug('detectEnvironment', 'no environments')
      return Promise.reject(errors.noEnvironmentError)
    }

    // Try to locate the specifiedEnv
    const specifiedEnv = parameters.get(parameters.ENV, window.location.search)
    if (specifiedEnv) {
      for (let i = 0; i < this._config.environments.length; i++) {
        const e = this._config.environments[i]

        if (specifiedEnv && e.code === specifiedEnv) {
          log.debug('found', e)
          return this.setEnvironment(e)
        }
      }

      log.error('not found', specifiedEnv)
      return Promise.reject(errors.noEnvironmentError)
    }

    // Try to locate based on pattern
    let environment = {} as ketchapi.Environment
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

    return Promise.reject(errors.noEnvironmentError)
  }

  /**
   * Get the environment.
   */
  async getEnvironment(): Promise<ketchapi.Environment> {
    log.info('getEnvironment')

    if (this._environment.hasValue()) {
      return (await this._environment.getValue()) as ketchapi.Environment
    } else {
      return this.detectEnvironment().then(env => this.setEnvironment(env))
    }
  }

  /**
   * Registers a callback for environment change notifications.
   *
   * @param callback Environment callback to register
   */
  async onEnvironment(callback: Callback): Promise<void> {
    this._environment.subscribe(callback)
  }

  /**
   * Push the IPInfo to data layer.
   *
   * @param g IPInfo
   */
  pushGeoIP(g: ketchapi.IPInfo): number {
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
  async setGeoIP(g: ketchapi.IPInfo): Promise<ketchapi.IPInfo> {
    log.info('setGeoIP', g)
    this.pushGeoIP(g)
    return (await this._geoip.setValue(g)) as ketchapi.IPInfo
  }

  /**
   * Loads the IPInfo.
   */
  async loadGeoIP(): Promise<ketchapi.GetLocationResponse> {
    log.info('loadGeoIP')

    return ketchapi.getLocation(getApiUrl(this._config))
  }

  /**
   * Gets the IPInfo.
   */
  async getGeoIP(): Promise<ketchapi.IPInfo> {
    log.info('getGeoIP')

    if (this._geoip.hasValue()) {
      return (await this._geoip.getValue()) as ketchapi.IPInfo
    } else {
      return this.loadGeoIP()
        .then(r => r.location)
        .then(ip => this.setGeoIP(ip))
    }
  }

  /**
   * Registers a callback for GeoIP change notifications.
   *
   * @param callback GeoIP callback to register
   */
  async onGeoIP(callback: Callback): Promise<void> {
    this._geoip.subscribe(callback)
  }

  /**
   * Sets the identities.
   *
   * @param id Identities to set
   */
  async setIdentities(id: Identities): Promise<Identities> {
    log.info('setIdentities', id)

    return (await this._identities.setValue(id)) as Identities
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

    if (!this._config || !this._config.organization || configIDs == null || isEmpty(configIDs)) {
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

    if (this._identities.hasValue()) {
      return (await this._identities.getValue()) as Identities
    } else {
      return this.collectIdentities().then(id => this.setIdentities(id))
    }
  }

  /**
   * Registers a callback for identity change notifications.
   *
   * @param callback Identities callback to register
   */
  async onIdentities(callback: Callback): Promise<void> {
    this._identities.subscribe(callback)
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
    return (await this._jurisdiction.setValue(ps)) as string
  }

  /**
   * Get the policy scope.
   */
  async getJurisdiction(): Promise<string> {
    log.info('getJurisdiction')

    if (this._jurisdiction.hasValue()) {
      return (await this._jurisdiction.getValue()) as string
    } else {
      return this.loadJurisdiction().then(ps => this.setJurisdiction(ps))
    }
  }

  /**
   * Registers a callback for policy scope change notifications.
   *
   * @param callback Callback to register
   */
  async onJurisdiction(callback: Callback): Promise<void> {
    this._jurisdiction.subscribe(callback)
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

    const ps: ketchapi.JurisdictionInfo | undefined = this._config.jurisdiction
    if (!ps) {
      return Promise.reject(errors.noJurisdictionError)
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

    return this.loadRegionInfo()
      .then(region => {
        if (ps.scopes && ps.scopes[region]) {
          return ps.scopes[region]
        }

        return ps.defaultScopeCode || ''
      })
      .then(x => {
        if (x) {
          return this.setJurisdiction(x)
        }

        return Promise.reject(errors.noJurisdictionError)
      })
      .catch(() => {
        if (ps.defaultScopeCode) {
          return this.setJurisdiction(ps.defaultScopeCode)
        }

        return Promise.reject(errors.noJurisdictionError)
      })
  }

  /**
   * Set the region.
   *
   * @param info Region information
   */
  async setRegionInfo(info: string): Promise<string> {
    log.info('setRegionInfo', info)
    return (await this._regionInfo.setValue(info)) as string
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

    return this.loadGeoIP()
      .then(r => r.location)
      .then(d => this.setGeoIP(d))
      .then(g => {
        if (g == null) {
          return Promise.reject(errors.unrecognizedLocationError)
        }

        const cc = g.countryCode
        if (!cc) {
          return Promise.reject(errors.unrecognizedLocationError)
        }

        let region = cc
        if (cc === 'US') {
          region = `${cc}-${g.regionCode}`
        }

        return region
      })
      .then(info => this.setRegionInfo(info))
  }

  /**
   * Gets the region.
   */
  async getRegionInfo(): Promise<string> {
    log.info('getRegionInfo')
    if (this._regionInfo.hasValue()) {
      return (await this._regionInfo.getValue()) as string
    } else {
      return this.loadRegionInfo().then(info => this.setRegionInfo(info))
    }
  }

  /**
   * Registers a callback for region info change notifications.
   *
   * @param callback Callback to register
   */
  async onRegionInfo(callback: Callback): Promise<void> {
    this._regionInfo.subscribe(callback)
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

    // check if experience show parameter override set
    const tab = parameters.get(parameters.PREFERENCES_TAB, window.location.search)
    // override with url param
    if ( isTab(tab) ) {
      if ( !params ) {
        params = {}
      }
      params.tab = tab
    }

    if (this._showPreferenceExperience) {
      this.willShowExperience(ExperienceType.Preference)
      this._showPreferenceExperience(this, config, consent, params)
    }

    return consent
  }

  /**
   * Invoke rights.
   *
   * @param eventData Event data to invoke right with
   */
  async invokeRight(eventData: InvokeRightsEvent): Promise<void> {
    log.debug('invokeRights', eventData)

    // If no identities or rights defined, skip the call.
    if (!eventData.rightsEmail || eventData.rightsEmail === '' || !eventData.right || eventData.right === '') {
      return Promise.resolve()
    }

    let identities = this._identities._value
    if (identities === undefined) {
      identities = {} as Identities
    }
    // add email identity from rights form
    identities['email'] = eventData.rightsEmail

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

    const user: ketchapi.User = {
      email: eventData.rightsEmail,
      first: eventData.firstName,
      last: eventData.lastName,
      country: eventData.country,
      stateRegion: eventData.stateRegion,
      description: eventData.details,
      phone: eventData.phoneNumber,
      postalCode: eventData.postalCode,
      addressLine1: eventData.addressLine1,
      addressLine2: eventData.addressLine2,
    }

    const request: ketchapi.InvokeRightRequest = {
      organizationCode: this._config.organization.code || '',
      propertyCode: this._config.property.code || '',
      environmentCode: this._config.environment.code,
      controllerCode: '',
      identities: identities,
      jurisdictionCode: this._config.jurisdiction.code || '',
      rightCode: eventData.right,
      user: user,
    }

    for (const callback of this._invokeRights) {
      callback(request)
    }

    return ketchapi.invokeRight(getApiUrl(this._config), request)
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
    this._hideExperience.forEach(function (func) {
      func(reason)
    })

    if (reason !== 'setConsent') {
      return this.retrieveConsent().then(consent => {
        if (this._config.purposes) {
          for (const p of this._config.purposes) {
            if (consent.purposes[p.code] === undefined && p.requiresOptIn) {
              consent.purposes[p.code] = false
            }
          }
        }
        return this.setConsent(consent)
      })
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
    this._willShowExperience.push(callback)
  }

  /**
   * onHideExperience called after experience hidden
   * Used to trigger external dependencies
   *
   * @param callback Callback to register
   */
  async onHideExperience(callback: Callback): Promise<void> {
    this._hideExperience.push(callback)
  }

  /**
   * onShowPreferenceExperience registers a function to handle showing preferences
   *
   * @param callback Callback to register
   */
  async onShowPreferenceExperience(callback: ShowPreferenceExperience): Promise<void> {
    this._showPreferenceExperience = callback
  }

  /**
   * onShowConsentExperience registers a function to handle showing consent
   *
   * @param callback Callback to register
   */
  async onShowConsentExperience(callback: ShowConsentExperience): Promise<void> {
    this._showConsentExperience = callback
  }

  /**
   * Retrieves the current identities on the page.
   * If previously collected values for identity and consent are different,
   * show the experience or if experience already shown, update permits
   */
  async refreshIdentityConsent(): Promise<void> {
    log.debug('refreshIdentityConsent')

    // compare identities currently on page with those previously retrieved
    return Promise.all([this.collectIdentities(), this.getIdentities()]).then(
      ([pageIdentities, previousIdentities]) => {
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

        // change in identities found so set new identities found on page and check for consent
        return this.setIdentities(pageIdentities).then(identities => {
          // if experience is currently displayed only update identities and they return to wait for user input
          if (this._isExperienceDisplayed) {
            return
          }
          // compare consent stored in permits for identities to last known consent
          return Promise.all([this.fetchConsent(identities), this.retrieveConsent()]).then(
            ([permitConsent, localConsent]) => {
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
                return this.updateConsent(identities, localConsent) as Promise<undefined>
              }

              // show experience for first time in session
              return this.showConsentExperience()
            },
          ) as Promise<void>
        })
      },
    )
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

  /**
   * Fires an event to the native listeners
   *
   * @param name Name of the event
   * @param args Arguments to pass to the event
   */
  async fireNativeEvent(name: string, args?: any): Promise<void> {
    if (window.androidListener) {
      const listener = window.androidListener[name]
      if (listener) {
        listener(JSON.stringify(args))
      } else {
        console.error(`Can't pass message to native code because ${name} handler is not registered`)
      }
    } else if (window.webkit?.messageHandlers) {
      const listener = window.webkit.messageHandlers[name]
      if (listener) {
        listener.postMessage(JSON.stringify(args))
      } else {
        console.error(`Can't pass message to native code because ${name} handler is not registered`)
      }
    }
  }
}
