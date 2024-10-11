import { Configuration, GetConsentRequest, GetConsentResponse, SetConsentRequest } from '@ketch-sdk/ketch-types'
import LocalStorageMock from './__mocks__/localStorage'
import * as utils from './utils'

import {
  CACHED_CONSENT_KEY,
  clearCacheEntry,
  getCachedConsent,
  getCachedNavNode,
  PUBLIC_CONSENT_KEY_V1,
  setCachedConsent,
  setCachedNavNode,
  setPublicConsent,
} from './cache'
import { getDefaultCacher } from '@ketch-com/ketch-cache'
import constants from './constants'
import { getCookie } from '@ketch-sdk/ketch-data-layer'
import log from './log'
import { DataNav } from './keyboardHandler.types'

jest.mock('./log')

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

  const configNoCache: Configuration = {
    organization: {
      code: 'foo',
    },
    purposes: [
      {
        code: 'foo',
        canonicalPurposeCodes: ['analytics', 'personalization'],
        legalBasisCode: 'consent_optin',
      },
      {
        code: 'bar',
      },
      {
        code: 'baz',
      },
    ],
    options: {
      'Cache-Control': 'no-cache',
    },
    formTemplates: [],
  } as Configuration

  const cacher = getDefaultCacher<SetConsentRequest | GetConsentRequest | GetConsentResponse>()

  it('returns synthetic response for missing item', async () => {
    await cacher.removeItem(CACHED_CONSENT_KEY)
    await setCachedConsent({} as SetConsentRequest)
    expect(await getCachedConsent(request, config)).toEqual(request)
  })

  it('returns synthetic response for empty item', async () => {
    await cacher.setItem(CACHED_CONSENT_KEY, {} as SetConsentRequest)

    expect(await getCachedConsent(request, config)).toEqual(request)
  })

  it('returns synthetic response for collectedAt === 0', async () => {
    await cacher.setItem(CACHED_CONSENT_KEY, {
      collectedAt: 0,
    } as SetConsentRequest)

    expect(await getCachedConsent(request, config)).toEqual(request)
  })

  it('returns synthetic response for no cache option', async () => {
    await cacher.setItem(CACHED_CONSENT_KEY, {
      collectedAt: Date.now() / 1000,
    } as SetConsentRequest)

    expect(await getCachedConsent(request, configNoCache)).toEqual(request)
  })

  it('returns cached response when set', async () => {
    const input = { ...request } as GetConsentResponse
    input.vendors = ['a', 'b']
    input.protocols = {
      tcf: 'abc',
      gpp: 'def',
    }

    await setCachedConsent(input)
    const response = await getCachedConsent(request, config)
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

describe('getCachedDomNode', () => {
  const loggerName = '[getCachedDomNode]'

  beforeEach(() => {
    Object.defineProperty(global, 'localStorage', { value: new LocalStorageMock(), writable: true })
    Object.defineProperty(global, 'window', { value: {}, writable: true })
  })

  it('should log error and return null if window AND localstorage are missing', () => {
    const dummyKey = 'dummy'
    Object.defineProperty(global, 'window', { value: undefined })
    Object.defineProperty(global, 'localStorage', { value: undefined })
    expect(localStorage).toBeUndefined()

    getCachedNavNode(dummyKey)
    expect(log.debug).toHaveBeenCalledWith(loggerName, 'missing storage options')

    Object.defineProperty(global, 'window', { value: window })
    Object.defineProperty(global, 'localStorage', { value: localStorage })
  })

  it('should return cached node from window', () => {
    const dummyKey = 'dummy'
    Object.defineProperty(global, 'window', {
      value: { [dummyKey]: dummyKey },
    })
    jest.spyOn(utils, 'decodeDataNav').mockReturnValue({ src: dummyKey } as DataNav)

    const result = getCachedNavNode(dummyKey) as DataNav
    expect(result.src).toEqual(dummyKey)
  })

  it.skip('should populate the window when ifNull is passed', () => {
    const dummyKey = 'dummy'
    const dummyValue = 'dummyValue'

    Object.defineProperty(global, 'window', { value: {}, writable: true })

    const result = getCachedNavNode(dummyKey, { ifNull: dummyValue })
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    expect(window.dummyKey).toEqual(dummyValue)
    expect(result).toEqual(dummyValue)
  })

  it('should return null if value is missing in window and localStorage', () => {
    const dummyKey = 'dummy'

    const result = getCachedNavNode(dummyKey)

    expect(result).toBeNull()
  })
  it('should return null if key is missing and localStorage is undefined', () => {
    const dummyKey = 'dummy'
    const ls = global.localStorage
    Object.defineProperty(global, 'localStorage', { value: undefined, writable: true })

    const result = getCachedNavNode(dummyKey)
    expect(result).toBeNull()
    Object.defineProperty(global, 'localStorage', { value: ls, writable: true })
  })
})

describe('setCachedDomNode', () => {
  it('should set localStorage to query selector based on DataNav', () => {
    const dummyKey = 'dummy'
    const dummyValue = { src: 'dummyValue' } as DataNav
    expect(localStorage.getItem(dummyKey)).toBeNull()

    setCachedNavNode(dummyKey, dummyValue)
    expect(localStorage.getItem(dummyKey)).toBe(dummyValue.src)
  })
})

describe('clearCachedDomNode', () => {
  beforeEach(() => {
    Object.defineProperty(global, 'localStorage', { value: new LocalStorageMock(), writable: true })
    Object.defineProperty(global, 'window', { value: {}, writable: true })
  })

  it('should set window[key] to undefined', () => {
    const key = 'testKey'
    // @ts-ignore
    window[key] = 'someValue'

    clearCacheEntry(key)

    // @ts-ignore
    expect(window[key]).toBeUndefined()
  })

  it('should call localStorage.removeItem with the correct key', () => {
    const key = 'testKey'
    localStorage.setItem(key, 'someValue')
    const spy = jest.spyOn(localStorage, 'removeItem')

    clearCacheEntry(key)

    expect(spy).toHaveBeenCalledWith(key)
  })

  it('should not modify window[key] when window is undefined', () => {
    const key = 'testKey'

    const og = global.window

    Object.defineProperty(global, 'window', { value: undefined })

    clearCacheEntry(key)

    global.window = og
    // @ts-ignore
    expect(window[key]).toBeUndefined()
  })

  it('should not call localStorage.removeItem when localStorage is undefined', () => {
    const key = 'testKey'
    const originalLocalStorage = global.localStorage
    const spy = jest.spyOn(localStorage, 'removeItem')
    Object.defineProperty(global, 'localStorage', { value: undefined })

    clearCacheEntry(key)

    global.localStorage = originalLocalStorage
    expect(spy).not.toHaveBeenCalled()
  })
})
