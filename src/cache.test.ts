import { Configuration, GetConsentRequest, GetConsentResponse, SetConsentRequest } from '@ketch-sdk/ketch-types'
import {
  CACHED_CONSENT_KEY,
  getCachedConsent,
  getCachedDomNode,
  PUBLIC_CONSENT_KEY_V1,
  setCachedConsent,
  setCachedDomNode,
  setPublicConsent,
} from './cache'
import { getDefaultCacher } from '@ketch-com/ketch-cache'
import constants from './constants'
import { getCookie } from '@ketch-sdk/ketch-data-layer'
import log from './log'

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
  it('should log error and return null if window AND localstorage are missing', () => {
    const dummyKey = 'dummy'
    const { window, localStorage } = global
    Object.defineProperty(global, 'window', { value: undefined })
    Object.defineProperty(global, 'localStorage', { value: undefined })

    getCachedDomNode(dummyKey)
    expect(log.error).toHaveBeenCalledWith(loggerName, 'missing storage options')

    Object.defineProperty(global, 'window', { value: window })
    Object.defineProperty(global, 'localStorage', { value: localStorage })
  })

  it('should return cached node from window', () => {
    const dummyKey = 'dummy'
    const parser = new DOMParser()
    const dom = parser.parseFromString('<span aria-label="Sample Node">Sample Node</span>', 'text/html')
    // @ts-ignore
    window[dummyKey] = dom.body.children[0]

    const result = getCachedDomNode(dummyKey) as HTMLElement
    expect(dom.body.children[0].innerHTML).toEqual(result.innerHTML)
  })

  it('should return cached node from localStorage+DOM when absent on window', () => {
    const dummyKey = 'dummy'
    const parser = new DOMParser()
    const dom = parser.parseFromString('<span aria-label="Sample Node">Sample Node</span>', 'text/html')
    jest.spyOn(document, 'querySelector').mockImplementation(selector => dom.querySelector(selector))
    localStorage.setItem(dummyKey, '[aria-label="Sample Node"]')

    const result = getCachedDomNode(dummyKey) as HTMLElement
    expect(dom.body.children[0].innerHTML).toEqual(result.innerHTML)
  })

  it('should populate the window when ifNull is passed', () => {
    const dummyKey = 'dummy'
    const parser = new DOMParser()
    const dom = parser.parseFromString('<span aria-label="Sample Node">Sample Node</span>', 'text/html')

    const result = getCachedDomNode(dummyKey, dom.children[0]) as HTMLElement
    expect(dom.body.children[0].innerHTML).toEqual(result.innerHTML)
    // @ts-ignore
    expect(dom.body.children[0].innerHTML).toEqual(window[dummyKey].innerHTML)
  })
})

describe('setCachedDomNode', () => {
  it('should set localStorage to query selector based on data-nav', () => {
    const dummyKey = 'dummy'
    const parser = new DOMParser()
    const dom = parser.parseFromString(
      `
        <span aria-label="Sample Node" data-nav="test-val">Sample Node</span>
        <span aria-label="Bad Node">Bad Node</span>
      `,
      'text/html',
    )
    expect(localStorage.getItem(dummyKey)).toBeNull()

    setCachedDomNode(dummyKey, dom.body.children[1] as HTMLElement)
    expect(localStorage.getItem(dummyKey)).toBeNull()

    const elementHasNav = dom.body.children[0] as HTMLElement
    setCachedDomNode(dummyKey, elementHasNav)
    expect(localStorage.getItem(dummyKey)).toBe('[data-nav="test-val"]')
  })
  it('should always cache node on window', () => {
    const dummyKey = 'dummy'
    const parser = new DOMParser()
    const dom = parser.parseFromString(
      `
        <span aria-label="Sample Node" data-nav="test-val">Sample Node</span>
        <span aria-label="Bad Node">Bad Node</span>
      `,
      'text/html',
    )
    // @ts-ignore
    expect(window[dummyKey]).toBeUndefined()

    setCachedDomNode(dummyKey, dom.body.children[1] as HTMLElement)
    // @ts-ignore
    expect(window[dummyKey]).toBe(dom.body.children[1])

    setCachedDomNode(dummyKey, dom.body.children[0] as HTMLElement)
    // @ts-ignore
    expect(window[dummyKey]).toBe(dom.body.children[0])
  })
})
