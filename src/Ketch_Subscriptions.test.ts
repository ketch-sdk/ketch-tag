import { Ketch } from './Ketch'
import { KetchWebAPI } from '@ketch-sdk/ketch-web-api'
import fetchMock from 'jest-fetch-mock'
import { Configuration, SubscriptionConfiguration } from '@ketch-sdk/ketch-types'

describe('subscriptions', () => {
  describe('getSubscriptionConfiguration', () => {
    it('returns configuration', () => {
      const ketch = new Ketch(new KetchWebAPI(''), {
        organization: { code: 'axonic' },
        property: { code: 'axonic' },
        language: 'en',
      } as Configuration)

      const config: SubscriptionConfiguration = {
        organization: { code: 'axonic' },
        property: { code: 'axonic' },
        language: 'en',
        identities: {},
        contactMethods: {},
        topics: [],
        controls: [],
      }

      fetchMock.mockResponse(async (): Promise<string> => {
        return JSON.stringify(config)
      })

      return expect(ketch.getSubscriptionConfiguration()).resolves.toStrictEqual(config)
    })
  })

  describe('getSubscriptions', () => {
    it('calls api', () => {
      const ketch = new Ketch(new KetchWebAPI(''), {
        organization: { code: 'axonic' },
        property: { code: 'axonic' },
        language: 'en',
        identities: {},
      } as Configuration)

      const subs = {}

      fetchMock.mockResponse(async (): Promise<string> => {
        return JSON.stringify(subs)
      })

      return expect(ketch.getSubscriptions()).resolves.toStrictEqual(subs)
    })
  })

  describe('setSubscriptions', () => {
    it('calls api', () => {
      const ketch = new Ketch(new KetchWebAPI(''), {
        organization: { code: 'axonic' },
        property: { code: 'axonic' },
        language: 'en',
        identities: {},
      } as Configuration)

      const subs = {}

      fetchMock.mockResponse(async (): Promise<string> => {
        return JSON.stringify(subs)
      })

      return expect(ketch.setSubscriptions({})).resolves.toBeUndefined()
    })
  })
})
