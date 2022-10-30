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
}
