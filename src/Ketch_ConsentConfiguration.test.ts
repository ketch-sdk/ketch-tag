import { Ketch } from './Ketch'
import { KetchWebAPI } from '@ketch-sdk/ketch-web-api'
import fetchMock from 'jest-fetch-mock'
import { Configuration, ConfigurationV2 } from '@ketch-sdk/ketch-types'

describe('consentConfiguration', () => {
  describe('getConsentConfiguration', () => {
    it('returns configuration', () => {
      const ketch = new Ketch(new KetchWebAPI(''), {
        organization: { code: 'axonic' },
        property: { code: 'axonic' },
        language: 'en',
      } as Configuration)

      const config: ConfigurationV2 = {
        organization: { code: 'axonic' },
        formTemplates: [],
      }

      fetchMock.mockResponse(async (): Promise<string> => {
        return JSON.stringify(config)
      })

      return expect(ketch.getConsentConfiguration()).resolves.toStrictEqual(config)
    })
  })
})
