import { Configuration, Environment, GetFullConfigurationRequest, IPInfo } from '@ketch-sdk/ketch-types'
import log from './logging'
import errors from './errors'
import { KetchWebAPI } from '@ketch-sdk/ketch-web-api'
import constants from './constants'
import parameters from './parameters'
import { Ketch } from './ketch'
import dataLayer from './datalayer'
import getApiUrl from './getApiUrl'

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
    log.info('build', this._config)

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
      log.debug('full configuration')
      const k = new Ketch(this._api, this._config)
      await k.setEnvironment(this._config.environment)
      await k.setJurisdiction(this._config.jurisdiction.code)
      return k
    }

    const env = await this.buildEnvironment()
    const ipInfo = await this.buildGeoIP()
    const region = await this.buildRegionInfo(ipInfo)
    const jurisdiction = await this.buildJurisdiction(region)

    log.info('loadConfig', env, jurisdiction, language)

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
    await k.setGeoIP(ipInfo)
    await k.setRegionInfo(region)
    await k.setJurisdiction(jurisdiction)

    return k
  }

  /**
   * Build the current environment. It will first look at the query string for any specified environment,
   * then it will iterate through the environment specifications to match based on the environment pattern.
   */
  async buildEnvironment(): Promise<Environment> {
    log.info(constants.DETECT_ENVIRONMENT)

    // We already have an environment
    if (this._config.environment) {
      return this._config.environment
    }

    // We have to have environments
    if (!this._config.environments || this._config.environments.length === 0) {
      throw errors.noEnvironmentError
    }

    // Try to locate the specifiedEnv
    const specifiedEnv = parameters.get(constants.ENV)
    if (specifiedEnv) {
      for (let i = 0; i < this._config.environments.length; i++) {
        const e = this._config.environments[i]

        if (e && specifiedEnv && e.code === specifiedEnv) {
          log.debug(constants.DETECT_ENVIRONMENT, 'found', e)
          return e
        }
      }

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
      log.debug(constants.DETECT_ENVIRONMENT, 'matched', environment)
      return environment
    }

    // Finally, try to locate production
    for (let i = 0; i < this._config.environments.length; i++) {
      const e = this._config.environments[i]

      if (e.code === 'production') {
        log.debug(constants.DETECT_ENVIRONMENT, e.code, e)
        return e
      }
    }

    throw errors.noEnvironmentError
  }

  /**
   * Build the jurisdiction from query, page or config.
   */
  async buildJurisdiction(region: string): Promise<string> {
    log.info('loadJurisdiction', this._config.jurisdiction)

    const jurisdictionOverride = parameters.get(constants.JURISDICTION)
    if (jurisdictionOverride) {
      return jurisdictionOverride
    }

    const jurisdictionInfo = this._config.jurisdiction
    if (!jurisdictionInfo) {
      throw errors.noJurisdictionError
    }

    if (jurisdictionInfo.code) {
      return jurisdictionInfo.code
    }

    const docJurisdiction = document.documentElement.getAttribute('jurisdiction')
    if (docJurisdiction) {
      return docJurisdiction
    }

    const v = jurisdictionInfo.variable

    if (v) {
      for (const dl of dataLayer()) {
        const jurisdiction = dl[v]
        if (jurisdiction) {
          return jurisdiction
        }
      }
    }

    if (jurisdictionInfo.jurisdictions) {
      const jurisdiction = jurisdictionInfo.jurisdictions[region]
      if (jurisdiction) {
        return jurisdiction
      }
    }

    if (jurisdictionInfo.defaultJurisdictionCode) {
      return jurisdictionInfo.defaultJurisdictionCode
    }

    throw errors.noJurisdictionError
  }

  /**
   * Build the region info.
   */
  async buildRegionInfo(g: IPInfo): Promise<string> {
    log.info('loadRegionInfo')

    const specifiedRegion = parameters.get(constants.REGION)
    if (specifiedRegion) {
      return specifiedRegion
    }

    if (g.countryCode === 'US' && g.regionCode) {
      return `${g.countryCode}-${g.regionCode}`
    }

    return g.countryCode ?? 'US'
  }

  /**
   * Build the IPInfo.
   */
  async buildGeoIP(): Promise<IPInfo> {
    log.info('loadGeoIP')

    const r = await this._api.getLocation()
    if (!r || !r.location) {
      throw errors.unrecognizedLocationError
    }

    return r.location
  }

  private readonly _api: KetchWebAPI
  private readonly _config: Configuration
}
