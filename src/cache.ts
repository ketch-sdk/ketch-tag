import { GetConsentRequest, GetConsentResponse, SetConsentRequest } from '@ketch-sdk/ketch-types'
import { getDefaultCacher } from '@ketch-com/ketch-cache'

export const CACHED_CONSENT_KEY = '_swb_consent_'
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
