import { GetConsentRequest, GetConsentResponse, SetConsentRequest } from '@ketch-sdk/ketch-types'
import { getCookie, setCookie } from '@ketch-sdk/ketch-data-layer'

export const CACHED_CONSENT_KEY = '_swb_consent_'
export const CACHED_CONSENT_TTL = 300 // 5 min in s

export async function getCachedConsent(request: GetConsentRequest): Promise<GetConsentResponse> {
  const syntheticResponse = {
    organizationCode: request.organizationCode,
    propertyCode: request.propertyCode,
    environmentCode: request.environmentCode,
    jurisdictionCode: request.jurisdictionCode,
    identities: request.identities,
    purposes: {},
    collectedAt: 0,
  }

  let cachedConsent: string | null = null

  // // First attempt to get from sessionStorage
  // if (!cachedConsent) {
  //   try {
  //     cachedConsent = window.sessionStorage.getItem(CACHED_CONSENT_KEY)
  //   } catch (e) {
  //     cachedConsent = null
  //   }
  // }
  //
  // // Next attempt to get from localStorage
  // try {
  //   cachedConsent = window.localStorage.getItem(CACHED_CONSENT_KEY)
  // } catch (e) {
  //   cachedConsent = null
  // }
  //

  // Finally attempt to get from cookie
  if (!cachedConsent) {
    cachedConsent = getCookie(window, CACHED_CONSENT_KEY)
    if (cachedConsent) {
      cachedConsent = atob(cachedConsent)
    }
  }

  if (!cachedConsent) {
    return syntheticResponse
  }

  const consent = JSON.parse(cachedConsent)
  if (Object.keys(consent).length === 0) {
    return syntheticResponse
  }

  const consentRequest = consent as GetConsentRequest
  if (!consentRequest.collectedAt) {
    return syntheticResponse
  }

  return consent as GetConsentResponse
}

export async function setCachedConsent(
  input: SetConsentRequest | GetConsentRequest | GetConsentResponse,
): Promise<void> {
  if (Object.keys(input).length === 0) {
    return
  }

  input.collectedAt = Math.floor(Date.now() / 1000)

  const cachedConsent: string = JSON.stringify(input)

  // first attempt to save to cookie
  setCookie(window, CACHED_CONSENT_KEY, btoa(cachedConsent), 730)

  // // next attempt to save in localStorage
  // try {
  //   window.localStorage.setItem(CACHED_CONSENT_KEY, cachedConsent)
  //   if (cachedConsent === window.localStorage.getItem(CACHED_CONSENT_KEY)) {
  //     return
  //   }
  // } catch (e) {
  //   //
  // }
  //
  // // final attempt to save in sessionStorage
  // try {
  //   window.sessionStorage.setItem(CACHED_CONSENT_KEY, cachedConsent)
  //   if (cachedConsent === window.sessionStorage.getItem(CACHED_CONSENT_KEY)) {
  //     return
  //   }
  // } catch (e) {
  //   //
  // }
}
