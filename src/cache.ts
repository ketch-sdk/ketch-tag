import { getDefaultCacher, WebStorageCacher } from '@ketch-com/ketch-cache'
import { setCookie } from '@ketch-com/ketch-cookie'
import { wrapLogger } from '@ketch-sdk/ketch-logging'
import {
  Configuration,
  GetConsentRequest,
  GetConsentResponse,
  SetConsentRequest,
  SetConsentResponse,
} from '@ketch-sdk/ketch-types'
import log from './log'
import { DataNav } from './keyboardHandler.types'
import { LANYARD_ID } from './constants'
import { decodeDataNav } from './utils'

export const CACHED_CONSENT_KEY = '_swb_consent_'
export const PUBLIC_CONSENT_KEY_V1 = '_ketch_consent_v1_'
export const CACHED_PROTOCOLS_KEY = '_swb_consent_'
export const CACHED_CONSENT_TTL = 300 // 5 min in s
export const PUBLIC_CONSENT_TTL = 34560000 // 4OO days in s

export const KEYBOARD_HANDLER_CACHE_KEYS = {
  CTX_KEY: '_ketch_currentKeyboardCtx',
  LANYARD_DOM: '_ketch_lanyardRootDom',
  FOCUSABLE_ELEMS: '_ketch_focusableElems',
  // TODO scratch code - delete
  // TOP_LEVEL_STACK: '_ketch_topLevelStack',
  // EXPAND_STACK: '_ketch_expandStack',
  // SWITCH_STACK: '_ketch_switchStack',
  // SUB_EXPERIENCE_STACK: '_ketch_subExperienceStack',
}

const consentCacher = getDefaultCacher<SetConsentRequest | GetConsentRequest | GetConsentResponse>()
const consentWebCacher = new WebStorageCacher<GetConsentResponse>(window.localStorage, 86400)

export async function getCachedConsent(request: GetConsentRequest, config: Configuration): Promise<GetConsentResponse> {
  const syntheticResponse: GetConsentResponse = {
    organizationCode: request.organizationCode,
    propertyCode: request.propertyCode,
    environmentCode: request.environmentCode,
    jurisdictionCode: request.jurisdictionCode,
    identities: request.identities,
    purposes: {},
    collectedAt: 0,
  }

  if (config.options && config.options['Cache-Control'] === 'no-cache') {
    return syntheticResponse
  }

  const cachedConsent = await consentCacher.getItem(CACHED_CONSENT_KEY)
  if (!cachedConsent) {
    return syntheticResponse
  }

  if (Object.keys(cachedConsent).length === 0) {
    return syntheticResponse
  }

  const consentRequest = cachedConsent as GetConsentRequest
  if (!consentRequest.collectedAt) {
    return syntheticResponse
  }

  const out = cachedConsent as GetConsentResponse
  const webCachedConsent = await consentWebCacher.getItem(CACHED_PROTOCOLS_KEY)
  out.vendors = webCachedConsent?.vendors
  out.protocols = webCachedConsent?.protocols

  return out
}

export async function setCachedConsent(
  input: SetConsentRequest | SetConsentResponse | GetConsentRequest | GetConsentResponse,
): Promise<void> {
  if (!input || Object.keys(input).length === 0) {
    return
  }

  input.collectedAt = Math.floor(Date.now() / 1000)

  const obj = { ...input }
  await consentWebCacher.setItem(CACHED_PROTOCOLS_KEY, obj as GetConsentResponse)

  // do not write protocols
  obj.vendors = undefined
  if ('protocols' in obj) {
    obj.protocols = undefined
  }

  await consentCacher.setItem(CACHED_CONSENT_KEY, obj)
}

export async function setPublicConsent(
  input: SetConsentRequest | GetConsentRequest | GetConsentResponse,
  config: Configuration,
): Promise<void> {
  if (Object.keys(input).length === 0) {
    return
  }

  // create public consent object
  const consent: { [key: string]: { status: string; canonicalPurposes?: string[] } } = {}
  if (!config.purposes) {
    return
  }

  for (const purpose of config.purposes) {
    if (!Object.prototype.hasOwnProperty.call(input.purposes, purpose.code)) {
      continue
    }

    const value = input.purposes[purpose.code]
    let status = ''
    if (typeof value === 'string') {
      status = value === 'true' ? 'granted' : 'denied'
    } else {
      if (value.allowed) {
        status = value.allowed === 'true' ? 'granted' : 'denied'
      }
    }

    if (status.length == 0) {
      continue
    }
    consent[purpose.code] = { status: status }

    if (purpose.canonicalPurposeCodes) {
      consent[purpose.code].canonicalPurposes = purpose.canonicalPurposeCodes
    } else if (purpose.canonicalPurposeCode && purpose.canonicalPurposeCode.length > 0) {
      // TODO remove after all configurations update with purpose.canonicalPurposeCodes
      consent[purpose.code].canonicalPurposes = [purpose.canonicalPurposeCode]
    }
  }

  // set public cookie and localStorage if consent
  if (Object.keys(consent).length > 0) {
    const consentString = btoa(JSON.stringify(consent))
    localStorage?.setItem(PUBLIC_CONSENT_KEY_V1, consentString)
    setCookie(window, PUBLIC_CONSENT_KEY_V1, consentString, PUBLIC_CONSENT_TTL)
  }
}

export function getLanyardRoot(): HTMLElement | null {
  if (window && window[KEYBOARD_HANDLER_CACHE_KEYS.LANYARD_DOM]) {
    return window[KEYBOARD_HANDLER_CACHE_KEYS.LANYARD_DOM]
  } else {
    const node = document.getElementById(LANYARD_ID)
    if (window) {
      window[KEYBOARD_HANDLER_CACHE_KEYS.LANYARD_DOM] = node
    }
    return node
  }
}

type Options = {
  parentNode?: HTMLElement | Document
  ifNull?: string
}
export function getCachedNavNode(key: string, opts: Options = {}): DataNav | null {
  const l = wrapLogger(log, 'getCachedDomNode')
  if (!window && !localStorage) {
    l.error('missing storage options')
    return null
  }

  const selector: string = (window && window[key]) || (localStorage && localStorage.getItem(key))

  if (selector) {
    return decodeDataNav(selector)
  } else {
    l.debug('cache missing key: ', key)
    if (opts.ifNull) {
      l.debug('populating cache')
      if (window) {
        window[key] = opts.ifNull
      }
      if (localStorage) {
        localStorage.setItem(key, opts.ifNull)
      }
      return decodeDataNav(opts.ifNull)
    }
    return null
  }
}

export function setCachedNavNode(key: string, parsedNav: DataNav) {
  const l = wrapLogger(log, 'setCachedNavNode')
  const selector = parsedNav.src
  if (!selector) {
    l.debug(`Missing data nav encoding. Cannot cache ${key}`)
    return
  }
  if (localStorage) {
    localStorage.setItem(key, selector)
  }
  if (window) {
    window[key] = selector
  }
}

export function clearCacheEntry(key: string) {
  if (window) {
    window[key] = undefined
  }
  if (localStorage) {
    localStorage.removeItem(key)
  }
}
