import { KetchWebAPI } from '@ketch-sdk/ketch-web-api'
import { Configuration, Consent, GetConsentRequest, GetConsentResponse } from '@ketch-sdk/ketch-types'
import log from './log'
import errors from './errors'
import { setCachedConsent, setPublicConsent } from './cache'
import { wrapLogger } from '@ketch-sdk/ketch-logging'
import { Ketch } from './Ketch'
import getApiUrl from './getApiUrl'

export default class Trackers {
  constructor(ketch: Ketch, config: Configuration) {
    this._ketch = ketch
    this._config = config
    this._api = new KetchWebAPI(getApiUrl(this._config))
  }

  normalizeConsent(input: GetConsentResponse, request: GetConsentRequest): GetConsentResponse {
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

  async enableAllConsent(): Promise<Consent> {
    const l = wrapLogger(log, 'trackers: enableAllConsent')

    if (this._ketch.hasConsent()) {
      l.trace('trackers: has consent')
      return this._ketch.getConsent()
    }

    l.debug('trackers: obtaining and setting consent')

    const identities = await this._ketch.getIdentities()
    l.debug('trackers: identities', identities)

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

    l.debug('trackers: calling getConsent', request)
    const consent = this.normalizeConsent(await this._api.getConsent(request), request)
    l.debug('trackers: getConsent returned', consent)

    await setCachedConsent(consent)
    await setPublicConsent(consent, this._config)

    const newConsent: Consent = { purposes: {} }

    // enable all consent
    if (consent?.purposes) {
      for (const [code] of Object.entries(consent.purposes)) {
        newConsent.purposes[code] = true
      }
    }

    if (consent.vendors) {
      newConsent.vendors = consent.vendors
    }

    if (consent.protocols) {
      newConsent.protocols = consent.protocols
    }

    l.debug('trackers: newConsent', newConsent)

    await this._ketch.setConsent(newConsent)
    return newConsent
  }

  protected readonly _ketch: Ketch
  private readonly _api: KetchWebAPI
  private readonly _config: Configuration
}
