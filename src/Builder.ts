import {
  Configuration,
  Environment,
  GetConsentRequest,
  GetFullConfigurationRequest,
  IPInfo,
} from '@ketch-sdk/ketch-types'
import log from './log'
import errors from './errors'
import { KetchWebAPI } from '@ketch-sdk/ketch-web-api'
import constants from './constants'
import parameters from './parameters'
import { Ketch } from './Ketch'
import dataLayer from './dataLayer'
import getApiUrl from './getApiUrl'
import { wrapLogger } from '@ketch-sdk/ketch-logging'
import { getCachedConsent } from './cache'

/**
 * Builder for building a Ketch object
 */
export default class Builder {
  /**
   * Constructor that takes a configuration object
   *
   * @param config Configuration
   */
  constructor(config: Configuration) {
    this._config = config
    this._api = new KetchWebAPI(getApiUrl(this._config))
  }

  async build(): Promise<Ketch> {
    const l = wrapLogger(log, 'build')
    l.info(this._config)

    if (!this._config || !this._config.organization) {
      throw errors.invalidConfigurationError
    }

    const language =
      new URLSearchParams(window.location.search).get(constants.LANGUAGE) || // ?lang
      parameters.get(constants.LANGUAGE) || // ? ketch_lang
      document.documentElement.lang || // <html lang
      document.documentElement.getAttribute('xml:lang') || // <html xml:lang
      window.navigator.language || // browser setting
      this._config.language || // language set in this._boot
      'en' // default language

    // Check if we have been given an already resolved Configuration
    if (
      this._config.property?.code &&
      this._config.environment?.code &&
      this._config.jurisdiction?.code &&
      this._config.language === language
    ) {
      l.debug('full configuration')
      const k = new Ketch(this._api, this._config)
      await k.setEnvironment(this._config.environment)
      await k.setJurisdiction(this._config.jurisdiction.code)
      return k
    }

    const env = await this.buildEnvironment()

    // check region parameter
    let region = parameters.get(constants.REGION)
    let ipInfo: IPInfo | undefined

    // if no override get ipInfo normally, otherwise skip get ipInfo and use region parameter
    if (!region) {
      ipInfo = await this.buildGeoIP()
      region = await this.buildRegionInfo(ipInfo)
    }
    const jurisdiction = await this.buildJurisdiction(region)

    l.info('loadConfig', env, jurisdiction, language)

    const request: GetFullConfigurationRequest = {
      organizationCode: this._config.organization.code,
      propertyCode: this._config.property?.code || '',
      environmentCode: env.code,
      hash: env.hash || '',
      languageCode: language,
      jurisdictionCode: jurisdiction,
    }

    const cfg = await this._api.getFullConfiguration(request)

    const k = new Ketch(this._api, cfg)

    await k.setEnvironment(env)
    if (ipInfo) await k.setGeoIP(ipInfo)
    await k.setRegionInfo(region)
    await k.setJurisdiction(jurisdiction)

    await this.setupTelemetry(k, cfg)

    return k
  }

  async setupTelemetry(k: Ketch, cfg: Configuration): Promise<void> {
    if (!cfg.services || !cfg.services.telemetry || cfg.services.telemetry === '') {
      return
    }

    const telemetryURL = new URL(cfg.services.telemetry)

    const request: GetConsentRequest = {
      organizationCode: cfg.organization.code ?? '',
      propertyCode: cfg.property?.code ?? '',
      environmentCode: cfg.environment?.code ?? '',
      jurisdictionCode: cfg.jurisdiction?.code ?? '',
      purposes: {},
      identities: {},
    }

    const consent = await getCachedConsent(request)
    let hasConsent = false
    if (consent.collectedAt && consent.collectedAt > 0) {
      hasConsent = true
    }

    let shouldSendBeacon = true
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden' && shouldSendBeacon) {
        shouldSendBeacon = false
        this.collectAndSendTelemetry(telemetryURL, hasConsent, k, cfg)
      }
    })
  }

  async collectAndSendTelemetry(url: URL, hasConsent: boolean, k: Ketch, cfg: Configuration): Promise<void> {
    const data = new FormData()

    const region = await k.getRegionInfo()

    const currentURL = window.location.protocol + '//' + window.location.host + window.location.pathname

    data.append('hasConsent', `${hasConsent}`)
    data.append('url', currentURL)
    data.append('propertyCode', `${cfg.property?.code}`)
    data.append('environment', `${cfg.environment?.code}`)
    data.append('region', region)
    data.append('jurisdiction', `${cfg.jurisdiction?.code}`)
    data.append("tenant", `${cfg.organization.code}`)

    navigator.sendBeacon(url, data)
  }

  /**
   * Build the current environment. It will first look at the query string for any specified environment,
   * then it will iterate through the environment specifications to match based on the environment pattern.
   */
  async buildEnvironment(): Promise<Environment> {
    const l = wrapLogger(log, 'buildEnvironment')

    // We already have an environment
    if (this._config.environment) {
      l.trace(this._config.environment)
      return this._config.environment
    }

    // We have to have environments
    if (!this._config.environments || this._config.environments.length === 0) {
      l.trace('no environments')
      throw errors.noEnvironmentError
    }

    // Try to locate the specifiedEnv
    const specifiedEnv = parameters.get(constants.ENV)
    if (specifiedEnv) {
      for (let i = 0; i < this._config.environments.length; i++) {
        const e = this._config.environments[i]

        if (e && specifiedEnv && e.code === specifiedEnv) {
          l.debug('found', e)
          return e
        }
      }

      l.trace('unknown environment')
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
      l.debug('matched', environment)
      return environment
    }

    // Finally, try to locate production
    for (let i = 0; i < this._config.environments.length; i++) {
      const e = this._config.environments[i]

      if (e.code === constants.PRODUCTION) {
        l.debug(e.code, e)
        return e
      }
    }

    throw errors.noEnvironmentError
  }

  /**
   * Build the jurisdiction from query, page or config.
   */
  async buildJurisdiction(region: string): Promise<string> {
    const l = wrapLogger(log, 'buildJurisdiction')
    l.debug(this._config.jurisdiction)

    const jurisdictionOverride = parameters.get(constants.JURISDICTION)
    if (jurisdictionOverride) {
      l.trace('override', jurisdictionOverride)
      return jurisdictionOverride
    }

    const jurisdictionInfo = this._config.jurisdiction
    if (!jurisdictionInfo) {
      l.trace('no jurisdiction config')
      throw errors.noJurisdictionError
    }

    if (jurisdictionInfo.code) {
      l.trace(jurisdictionInfo.code)
      return jurisdictionInfo.code
    }

    const docJurisdiction = document.documentElement.getAttribute('jurisdiction')
    if (docJurisdiction) {
      l.trace('document jurisdiction', docJurisdiction)
      return docJurisdiction
    }

    const v = jurisdictionInfo.variable

    if (v) {
      for (const dl of dataLayer()) {
        const jurisdiction = dl[v]
        if (jurisdiction) {
          l.trace('dataLayer jurisdiction', jurisdiction)
          return jurisdiction
        }
      }
    }

    if (jurisdictionInfo.jurisdictions) {
      const jurisdiction = jurisdictionInfo.jurisdictions[region]
      if (jurisdiction) {
        l.trace('region jurisdiction', jurisdiction)
        return jurisdiction
      }
    }

    if (jurisdictionInfo.defaultJurisdictionCode) {
      l.trace('default jurisdiction', jurisdictionInfo.defaultJurisdictionCode)
      return jurisdictionInfo.defaultJurisdictionCode
    }

    throw errors.noJurisdictionError
  }

  /**
   * Build the region info.
   */
  async buildRegionInfo(g: IPInfo): Promise<string> {
    const l = wrapLogger(log, 'buildRegionInfo')
    if ((g.countryCode === 'US' || g.countryCode === 'CA') && g.regionCode) {
      const region = `${g.countryCode}-${g.regionCode}`
      l.trace(region)
      return region
    }

    const region = g.countryCode ?? 'US'
    l.trace(region)
    return region
  }

  /**
   * Build the IPInfo.
   */
  async buildGeoIP(): Promise<IPInfo> {
    log.debug('buildGeoIP')

    const r = await this._api.getLocation()
    if (!r || !r.location) {
      throw errors.unrecognizedLocationError
    }

    return r.location
  }

  private readonly _api: KetchWebAPI
  private readonly _config: Configuration
}
