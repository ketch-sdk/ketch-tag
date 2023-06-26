import { GetConsentRequest, GetConsentResponse, SetConsentRequest } from '@ketch-sdk/ketch-types'
import {CACHED_CONSENT_KEY, getCachedConsent, PUBLIC_CONSENT_KEY_V1, setCachedConsent, setPublicConsent} from './cache'
import { getDefaultCacher } from '@ketch-com/ketch-cache'
import constants from './constants'
import {getCookie} from "@ketch-sdk/ketch-data-layer";

describe('cache', () => {
  const request = {
    collectedAt: 0,
    environmentCode: constants.PRODUCTION,
    identities: {
      account_id: '123',
    },
    jurisdictionCode: 'gdpr',
    organizationCode: 'axonic',
    propertyCode: 'axonic',
    purposes: {},
  } as GetConsentRequest

  const getResponseWithConsent = {
    collectedAt: 0,
    environmentCode: constants.PRODUCTION,
    identities: {
      account_id: '123',
    },
    jurisdictionCode: 'gdpr',
    organizationCode: 'axonic',
    propertyCode: 'axonic',
    purposes: {
      foo: 'false',
      bar: 'true',
    },
  } as GetConsentResponse

  const getRequestWithConsent = {
    collectedAt: 0,
    environmentCode: constants.PRODUCTION,
    identities: {
      account_id: '123',
    },
    jurisdictionCode: 'gdpr',
    organizationCode: 'axonic',
    propertyCode: 'axonic',
    purposes: {
      foo: {
        allowed: "true",
        legalBasisCode: "consent_opt_in"
      },
      bar: {
        allowed: "false",
        legalBasisCode: "consent_opt_in"
      }
    },
  } as GetConsentRequest

  const setRequestWithConsent = {
    collectedAt: 0,
    environmentCode: constants.PRODUCTION,
    identities: {
      account_id: '123',
    },
    jurisdictionCode: 'gdpr',
    organizationCode: 'axonic',
    propertyCode: 'axonic',
    purposes: {
      foo: {
        allowed: "true",
        legalBasisCode: "consent_opt_in"
      },
      bar: {
        allowed: "false",
        legalBasisCode: "consent_opt_in"
      }
    },
  } as SetConsentRequest

  const cacher = getDefaultCacher<SetConsentRequest | GetConsentRequest | GetConsentResponse>()

  it('returns synthetic response for missing item', async () => {
    await cacher.removeItem(CACHED_CONSENT_KEY)
    await setCachedConsent({} as SetConsentRequest)
    expect(await getCachedConsent(request)).toEqual(request)
  })

  it('returns synthetic response for empty item', async () => {
    await cacher.setItem(CACHED_CONSENT_KEY, {} as SetConsentRequest)

    expect(await getCachedConsent(request)).toEqual(request)
  })

  it('returns synthetic response for collectedAt === 0', async () => {
    await cacher.setItem(CACHED_CONSENT_KEY, {
      collectedAt: 0,
    } as SetConsentRequest)

    expect(await getCachedConsent(request)).toEqual(request)
  })

  it('returns cached response when set', async () => {
    await setCachedConsent(request as SetConsentRequest)
    expect(await getCachedConsent(request)).toEqual(request)
  })

  it('public cookie not set if no consent', async () => {
    await setPublicConsent(request as GetConsentRequest)

    expect(getCookie(window, PUBLIC_CONSENT_KEY_V1)).toBeFalsy()
    expect(localStorage.getItem(PUBLIC_CONSENT_KEY_V1)).toBeFalsy()
  })

  it('public cookie set from GetConsentResponse', async () => {
    await setPublicConsent(getResponseWithConsent as GetConsentResponse)

    const publicCookie = getCookie(window, PUBLIC_CONSENT_KEY_V1)
    const publicLocalStorage: string = localStorage.getItem(PUBLIC_CONSENT_KEY_V1) || ''
    expect(JSON.parse(Buffer.from(publicCookie, 'base64').toString()))
      .toEqual({'foo': 'denied', 'bar': 'granted'})
    expect(JSON.parse(Buffer.from(publicLocalStorage, 'base64').toString()))
      .toEqual({'foo': 'denied', 'bar': 'granted'})
  })

  it('public cookie set from GetConsentRequest', async () => {
    await setPublicConsent(getRequestWithConsent as GetConsentRequest)

    const publicCookie = getCookie(window, PUBLIC_CONSENT_KEY_V1)
    const publicLocalStorage: string = localStorage.getItem(PUBLIC_CONSENT_KEY_V1) || ''
    expect(JSON.parse(Buffer.from(publicCookie, 'base64').toString()))
      .toEqual({'foo': 'granted', 'bar': 'denied'})
    expect(JSON.parse(Buffer.from(publicLocalStorage, 'base64').toString()))
      .toEqual({'foo': 'granted', 'bar': 'denied'})
  })

  it( 'public cookie set from SetConsentRequest', async () => {
    await setPublicConsent(setRequestWithConsent as SetConsentRequest)

    const publicCookie = getCookie(window, PUBLIC_CONSENT_KEY_V1)
    const publicLocalStorage: string = localStorage.getItem(PUBLIC_CONSENT_KEY_V1) || ''
    expect(JSON.parse(Buffer.from(publicCookie, 'base64').toString()))
      .toEqual({'foo': 'granted', 'bar': 'denied'})
    expect(JSON.parse(Buffer.from(publicLocalStorage, 'base64').toString()))
      .toEqual({'foo': 'granted', 'bar': 'denied'})
  })
})
