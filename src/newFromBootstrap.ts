import { Configuration, GetFullConfigurationRequest } from '@ketch-sdk/ketch-types'
import { Ketch } from './ketch'
import log from './logging'
import errors from './errors'
import parameters from './parameters'
import { KetchWebAPI } from '@ketch-sdk/ketch-web-api'
import getApiUrl from './getApiUrl'

/**
 * Loads the config.
 *
 * @internal
 * @param boot The bootstrap configuration.
 */
export default async function newFromBootstrap(boot: Configuration): Promise<Ketch> {
  log.info('loadConfig', boot)

  if (!boot || !boot.organization) {
    throw errors.invalidConfigurationError
  }

  const k = new Ketch(boot)
  const language =
    parameters.get(parameters.LANG, window.location.search) ||
    parameters.get(parameters.SWB_LANGUAGE, window.location.search) ||
    document.documentElement.lang ||
    document.documentElement.getAttribute('xml:lang') ||
    boot.language ||
    window.navigator.language ||
    'en'

  // Check if we have been given an already resolved Configuration
  if (boot.property && boot.environment && boot.language === language) {
    log.debug('full configuration')
    return k
  }

  const env = await k.detectEnvironment()

  if (!env.hash) {
    throw errors.noEnvironmentError
  }

  const jurisdiction = await k.loadJurisdiction()

  if (!jurisdiction) {
    throw errors.noJurisdictionError
  }

  log.info('loadConfig', env, jurisdiction, language)

  const request: GetFullConfigurationRequest = {
    organizationCode: boot.organization.code || '',
    propertyCode: boot.property?.code || '',
    environmentCode: env.code,
    hash: env.hash || '',
    languageCode: language,
    jurisdictionCode: jurisdiction,
  }

  const api = new KetchWebAPI(getApiUrl(boot))

  const cfg = await api.getFullConfiguration(request)

  return new Ketch(cfg)
}
