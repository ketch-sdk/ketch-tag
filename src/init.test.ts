import init from './init'
import { Configuration, IdentityFormat, IdentityType } from '@ketch-sdk/ketch-types'
import fetchMock from 'jest-fetch-mock'
import constants from './constants'

describe('init', () => {
  it('throws if semaphore empty', async () => {
    window.semaphore = undefined as any
    return expect(init()).rejects.toThrow('ketch tag command queue is not configured correctly')
  })

  it('throws if semaphore doesnt start with init', () => {
    window.semaphore = [['start']] as any
    return expect(init()).rejects.toThrow('ketch tag command queue is not configured correctly')
  })

  it('calls getConsent', async () => {
    const onConsentMock = jest.fn()
    const onEnvironmentMock = jest.fn()
    const onGeoipMock = jest.fn()
    const onIdentitiesMock = jest.fn()
    const onJurisdictionMock = jest.fn()
    const onRegionInfoMock = jest.fn()
    const onUnknownEventMock = jest.fn()

    window.dataLayer = [{ foo: 'bar' }]
    window.semaphore = [
      [
        'init',
        {
          organization: {
            code: 'axonic',
          },
          property: {
            code: 'axonic',
          },
          environment: {
            code: constants.PRODUCTION,
          },
          jurisdiction: {
            code: 'gdpr',
          },
        } as Configuration,
      ],
      ['on', constants.CONSENT_EVENT, onConsentMock],
      ['on', constants.ENVIRONMENT_EVENT, onEnvironmentMock],
      ['on', constants.GEOIP_EVENT, onGeoipMock],
      ['on', constants.IDENTITIES_EVENT, onIdentitiesMock],
      ['on', constants.JURISDICTION_EVENT, onJurisdictionMock],
      ['on', constants.REGION_INFO_EVENT, onRegionInfoMock],
      ['on', 'unknown', onUnknownEventMock],
    ] as any
    fetchMock.mockImplementation(async (request: string | Request | undefined): Promise<Response> => {
      if (request === 'https://global.ketchcdn.com/web/v2/config/axonic/axonic/config.json') {
        return new Response(
          JSON.stringify({
            organization: {
              code: 'axonic',
            },
            environment: {
              code: 'production',
            },
            jurisdiction: {
              code: 'gdpr',
            },
            property: {
              code: 'axonic',
            },
            identities: {
              account_id: {
                type: IdentityType.IDENTITY_TYPE_DATA_LAYER,
                format: IdentityFormat.IDENTITY_FORMAT_STRING,
                variable: 'foo',
              },
            },
            purposes: [
              {
                code: 'analytics',
                legalBasisCode: 'consent_optin',
              },
            ],
            formTemplates: [],
          } as Configuration),
        )
      }

      if (request === 'https://global.ketchcdn.com/web/v2/ip') {
        return new Response(
          JSON.stringify({
            // @ts-ignore
            location: {
              ip: '1.2.3.5',
              countryCode: 'US',
            },
          }),
        )
      }

      return new Response('{}')
    })
    expect(window.semaphore.loaded).toBeFalsy()
    await expect(init()).resolves.toBeUndefined()
    expect(window.semaphore.loaded).toBeTruthy()
    window.semaphore.push(['on', constants.CONSENT_EVENT, onConsentMock])
    window.semaphore.push(['on', constants.ENVIRONMENT_EVENT, onEnvironmentMock])
    window.semaphore.push(['on', constants.GEOIP_EVENT, onGeoipMock])
    window.semaphore.push(['on', constants.IDENTITIES_EVENT, onIdentitiesMock])
    window.semaphore.push(['on', constants.JURISDICTION_EVENT, onJurisdictionMock])
    window.semaphore.push(['on', constants.REGION_INFO_EVENT, onRegionInfoMock])
    window.semaphore.push(['on', 'unknown', onUnknownEventMock])
    expect(onConsentMock).toHaveBeenCalledTimes(2)
    expect(onConsentMock).toHaveBeenCalledWith({ purposes: { analytics: true } })
    expect(onEnvironmentMock).toHaveBeenCalledTimes(2)
    expect(onEnvironmentMock).toHaveBeenCalledWith({ code: constants.PRODUCTION })
    expect(onGeoipMock).toHaveBeenCalledTimes(2)
    expect(onGeoipMock).toHaveBeenCalledWith({ countryCode: 'US', ip: '1.2.3.5' })
    expect(onIdentitiesMock).toHaveBeenCalledTimes(2)
    expect(onIdentitiesMock).toHaveBeenCalledWith({ account_id: 'bar' })
    expect(onJurisdictionMock).toHaveBeenCalledTimes(2)
    expect(onJurisdictionMock).toHaveBeenCalledWith('gdpr')
    expect(onRegionInfoMock).toHaveBeenCalledTimes(2)
    expect(onRegionInfoMock).toHaveBeenCalledWith('US')
    expect(onUnknownEventMock).not.toHaveBeenCalled()
  })
})
