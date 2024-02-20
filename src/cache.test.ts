import { Configuration, GetConsentRequest, GetConsentResponse, SetConsentRequest } from '@ketch-sdk/ketch-types'
import {
  CACHED_CONSENT_KEY,
  getCachedConsent,
  PUBLIC_CONSENT_KEY_V1,
  setCachedConsent,
  setPublicConsent,
} from './cache'
import { getDefaultCacher } from '@ketch-com/ketch-cache'
import constants from './constants'
import { getCookie } from '@ketch-sdk/ketch-data-layer'

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
        allowed: 'true',
        legalBasisCode: 'consent_opt_in',
      },
      bar: {
        allowed: 'false',
        legalBasisCode: 'consent_opt_in',
      },
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
        allowed: 'true',
        legalBasisCode: 'consent_opt_in',
      },
      bar: {
        allowed: 'false',
        legalBasisCode: 'consent_opt_in',
      },
    },
  } as SetConsentRequest

  const config = {
    purposes: [
      {
        code: 'foo',
        canonicalPurposeCodes: ['analytics', 'personalization'],
      },
      {
        code: 'bar',
      },
      {
        code: 'baz',
      },
    ],
  } as Configuration

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
    const input = { ...request } as GetConsentResponse
    input.vendors = ['a', 'b']
    input.protocols = {
      tcf: 'abc',
      gpp: 'def',
    }

    await setCachedConsent(input)
    const response = await getCachedConsent(request)
    expect(response).toEqual(input)
  })

  it('public cookie not set if no consent', async () => {
    await setPublicConsent(request as GetConsentRequest, config)

    expect(getCookie(window, PUBLIC_CONSENT_KEY_V1)).toBeFalsy()
    expect(localStorage.getItem(PUBLIC_CONSENT_KEY_V1)).toBeFalsy()
  })

  it('public cookie set from GetConsentResponse', async () => {
    await setPublicConsent(getResponseWithConsent as GetConsentResponse, config)

    const publicCookie = getCookie(window, PUBLIC_CONSENT_KEY_V1)
    const publicLocalStorage: string = localStorage.getItem(PUBLIC_CONSENT_KEY_V1) || ''
    expect(JSON.parse(Buffer.from(decodeURIComponent(publicCookie), 'base64').toString())).toEqual({
      foo: { status: 'denied', canonicalPurposes: ['analytics', 'personalization'] },
      bar: { status: 'granted' },
    })
    expect(JSON.parse(Buffer.from(decodeURIComponent(publicLocalStorage), 'base64').toString())).toEqual({
      foo: { status: 'denied', canonicalPurposes: ['analytics', 'personalization'] },
      bar: { status: 'granted' },
    })
  })

  it('public cookie set from GetConsentRequest', async () => {
    await setPublicConsent(getRequestWithConsent as GetConsentRequest, config)

    const publicCookie = getCookie(window, PUBLIC_CONSENT_KEY_V1)
    const publicLocalStorage: string = localStorage.getItem(PUBLIC_CONSENT_KEY_V1) || ''
    expect(JSON.parse(Buffer.from(decodeURIComponent(publicCookie), 'base64').toString())).toEqual({
      foo: { status: 'granted', canonicalPurposes: ['analytics', 'personalization'] },
      bar: { status: 'denied' },
    })
    expect(JSON.parse(Buffer.from(decodeURIComponent(publicLocalStorage), 'base64').toString())).toEqual({
      foo: { status: 'granted', canonicalPurposes: ['analytics', 'personalization'] },
      bar: { status: 'denied' },
    })
  })

  it('public cookie set from SetConsentRequest', async () => {
    await setPublicConsent(setRequestWithConsent as SetConsentRequest, config)

    const publicCookie = getCookie(window, PUBLIC_CONSENT_KEY_V1)
    const publicLocalStorage: string = localStorage.getItem(PUBLIC_CONSENT_KEY_V1) || ''
    expect(JSON.parse(Buffer.from(publicCookie, 'base64').toString())).toEqual({
      foo: { status: 'granted', canonicalPurposes: ['analytics', 'personalization'] },
      bar: { status: 'denied' },
    })
    expect(JSON.parse(Buffer.from(publicLocalStorage, 'base64').toString())).toEqual({
      foo: { status: 'granted', canonicalPurposes: ['analytics', 'personalization'] },
      bar: { status: 'denied' },
    })
  })
})
