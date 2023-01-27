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

  const api = new KetchWebAPI(getApiUrl(boot))

  const k = new Ketch(api, boot)

  const language =
    new URLSearchParams(window.location.search).get(parameters.LANGUAGE) || // ?lang
    parameters.get(parameters.LANGUAGE) || // ? ketch_lang
    document.documentElement.lang || // <html lang
    document.documentElement.getAttribute('xml:lang') || // <html xml:lang
    window.navigator.language || // browser setting
    boot.language || // language set in boot
    'en' // default language

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
    organizationCode: boot.organization.code,
    propertyCode: boot.property?.code || '',
    environmentCode: env.code,
    hash: env.hash || '',
    languageCode: language,
    jurisdictionCode: jurisdiction,
  }

  const cfg = await api.getFullConfiguration(request)

  return new Ketch(api, cfg)
}
