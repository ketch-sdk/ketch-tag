import { GetConsentRequest, GetConsentResponse, SetConsentRequest } from '@ketch-sdk/ketch-types'
import { CACHED_CONSENT_KEY, getCachedConsent, setCachedConsent } from './cache'
import { getDefaultCacher } from '@ketch-com/ketch-cache'
import constants from './constants'

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
})
