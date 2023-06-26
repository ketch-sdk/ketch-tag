import {GetConsentRequest, GetConsentResponse, SetConsentRequest} from '@ketch-sdk/ketch-types'
import { getDefaultCacher } from '@ketch-com/ketch-cache'
import {setCookie} from "@ketch-sdk/ketch-data-layer";

export const CACHED_CONSENT_KEY = '_swb_consent_'
export const PUBLIC_CONSENT_KEY_V1 = '_ketch_consent_v1_'
export const CACHED_CONSENT_TTL = 300 // 5 min in s

const consentCacher = getDefaultCacher<SetConsentRequest | GetConsentRequest | GetConsentResponse>()

export async function getCachedConsent(request: GetConsentRequest): Promise<GetConsentResponse> {
  const syntheticResponse: GetConsentResponse = {
    organizationCode: request.organizationCode,
    propertyCode: request.propertyCode,
    environmentCode: request.environmentCode,
    jurisdictionCode: request.jurisdictionCode,
    identities: request.identities,
    purposes: {},
    collectedAt: 0,
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

  return cachedConsent as GetConsentResponse
}

export async function setCachedConsent(
  input: SetConsentRequest | GetConsentRequest | GetConsentResponse,
): Promise<void> {
  if (Object.keys(input).length === 0) {
    return
  }

  input.collectedAt = Math.floor(Date.now() / 1000)

  await consentCacher.setItem(CACHED_CONSENT_KEY, input)
}

export async function setPublicConsent(
  input: SetConsentRequest | GetConsentRequest | GetConsentResponse,
): Promise<void> {
  if (Object.keys(input).length === 0) {
    return
  }

  // create public consent object
  const consent: {[key: string]: string} = {};
  for (const key in input.purposes) {
    const value = input.purposes[key];
    if (typeof value === "string") {
      consent[key] = value === "true"? "granted": "denied"
    } else {
      if (value.allowed) {
        consent[key] = value.allowed === "true"? "granted": "denied"
      }
    }
  }

  // set public cookie and localStorage if consent
  if ( Object.keys(consent).length > 0 ) {
    const consentString = Buffer.from(JSON.stringify(consent)).toString("base64")
    localStorage.setItem(PUBLIC_CONSENT_KEY_V1, consentString)
    setCookie(window, PUBLIC_CONSENT_KEY_V1, consentString, CACHED_CONSENT_TTL)
  }
}
