import { Configuration, GetFullConfigurationRequest } from '@ketch-sdk/ketch-types'
import { Ketch } from './ketch'
import log from './logging'
import errors from './errors'
import parameters from './parameters'
import { KetchWebAPI } from '@ketch-sdk/ketch-web-api'
import getApiUrl from './getApiUrl'
import constants from './constants'
import { load } from './scripts'

/**
 * Loads the config.
 *
 * @internal
 * @param boot The bootstrap configuration.
 */
export default async function newFromBootstrap(boot: Configuration): Promise<Ketch> {
  log.info('loadConfig')

  const k = new Ketch(boot)

  // Check if we have been given an already resolved Configuration
  if (boot.property && boot.environment) {
    return k
  }

  const env = await k.detectEnvironment()
  const jurisdiction = await k.loadJurisdiction()

  if (!env.hash) {
    return Promise.reject(errors.noEnvironmentError)
  }

  log.info('loadConfig', env, jurisdiction)

  const config = await k.getConfig()

  if (!config || !config.organization || !config.property || !jurisdiction) {
    throw errors.noJurisdictionError
  }

  const language = parameters.get(parameters.LANGUAGE, window.location.search) || config.language

  log.info('language', language)

  const request: GetFullConfigurationRequest = {
    organizationCode: config.organization.code || '',
    propertyCode: config.property.code || '',
    environmentCode: env.code,
    hash: env.hash || '',
    languageCode: language || 'en',
    jurisdictionCode: jurisdiction,
  }

  const api = new KetchWebAPI(getApiUrl(boot))

  const cfg = await api.getFullConfiguration(request)

  return new Ketch(cfg)
}
