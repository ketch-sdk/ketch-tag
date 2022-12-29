import { GetConsentRequest, GetConsentResponse, SetConsentRequest } from '@ketch-sdk/ketch-types'
import { getCookie, setCookie } from '@ketch-sdk/ketch-data-layer'

export const CACHED_CONSENT_KEY = '_swb_consent_'
export const CACHED_CONSENT_TTL = 1

export async function getCachedConsent(request: GetConsentRequest): Promise<GetConsentResponse> {
  // First attempt to get from localStorage
  let cachedConsent: string | null
  try {
    cachedConsent = window.localStorage.getItem(CACHED_CONSENT_KEY)
  } catch (e) {
    cachedConsent = null
  }

  // Next attempt to get from sessionStorage
  if (!cachedConsent) {
    try {
      cachedConsent = window.sessionStorage.getItem(CACHED_CONSENT_KEY)
    } catch (e) {
      cachedConsent = null
    }
  }

  // Finally attempt to get from cookie
  if (!cachedConsent) {
    cachedConsent = getCookie(window, CACHED_CONSENT_KEY)
  }

  if (!cachedConsent) {
    return {
      organizationCode: request.organizationCode,
      propertyCode: request.propertyCode,
      environmentCode: request.environmentCode,
      jurisdictionCode: request.jurisdictionCode,
      identities: request.identities,
      purposes: {},
    }
  }

  const consent = JSON.parse(cachedConsent)
  if (Object.keys(consent).length === 0) {
    return {
      organizationCode: request.organizationCode,
      propertyCode: request.propertyCode,
      environmentCode: request.environmentCode,
      jurisdictionCode: request.jurisdictionCode,
      identities: request.identities,
      purposes: {},
    }
  }

  // If collectedAt was too long ago
  const earliestCollectedAt = Math.floor((Date.now() - CACHED_CONSENT_TTL * 864e5) / 1000)

  const consentRequest = consent as GetConsentRequest
  if (!consentRequest.collectedAt || consentRequest.collectedAt < earliestCollectedAt) {
    return {
      organizationCode: request.organizationCode,
      propertyCode: request.propertyCode,
      environmentCode: request.environmentCode,
      jurisdictionCode: request.jurisdictionCode,
      identities: request.identities,
      purposes: {},
    }
  }

  return consent as GetConsentResponse
}

export async function setCachedConsent(input: SetConsentRequest): Promise<void> {
  const cachedConsent: string = JSON.stringify(input)

  // first attempt to save in localStorage
  try {
    window.localStorage.setItem(CACHED_CONSENT_KEY, cachedConsent)
    if (cachedConsent === window.localStorage.getItem(CACHED_CONSENT_KEY)) {
      return
    }
  } catch (e) {
    //
  }

  // next attempt to save in localStorage
  try {
    window.sessionStorage.setItem(CACHED_CONSENT_KEY, cachedConsent)
    if (cachedConsent === window.sessionStorage.getItem(CACHED_CONSENT_KEY)) {
      return
    }
  } catch (e) {
    //
  }

  // finally attempt to save to cookie
  setCookie(window, CACHED_CONSENT_KEY, cachedConsent, CACHED_CONSENT_TTL)
}
