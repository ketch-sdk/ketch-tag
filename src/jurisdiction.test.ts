import errors from './errors'
import parameters from './parameters'
import { Ketch } from './'
import { Configuration } from '@ketch-sdk/ketch-types'
import fetchMock from 'jest-fetch-mock'

jest.mock('./parameters')

describe('jurisdiction', () => {
  const mockParametersGet = jest.mocked(parameters.get)

  describe('getJurisdiction', () => {
    it('returns the existing policy scope', () => {
      const ketch = new Ketch({} as Configuration)

      const ps = 'gdpr'
      return ketch.setJurisdiction(ps).then(() => {
        return expect(ketch.getJurisdiction()).resolves.toEqual(ps)
      })
    })
  })

  describe('loadJurisdiction', () => {
    it('allows setting policy scope on query', () => {
      const ketch = new Ketch({} as Configuration)

      mockParametersGet.mockImplementationOnce(key => {
        if (key === parameters.SWB_JURISDICTION) return 'FOO'
        return ''
      })

      return expect(ketch.loadJurisdiction()).resolves.toBe('FOO')
    })

    it('handles null regionInfo', () => {
      const ketch = new Ketch({} as Configuration)

      fetchMock.mockResponse(JSON.stringify({}))

      return expect(ketch.loadJurisdiction()).rejects.toBe(errors.noJurisdictionError)
    })

    it('loads from dataLayer', () => {
      const ketch = new Ketch({
        jurisdiction: {
          variable: 'foobar',
        },
      } as Configuration)

      fetchMock.mockResponse(
        JSON.stringify({
          location: {
            countryCode: 'GB',
          },
        }),
      )

      window.dataLayer = []
      window.dataLayer.push({
        foobar: 'ccpa',
      })

      return expect(ketch.loadJurisdiction()).resolves.toBe('ccpa')
    })

    it('locates specified policy scope', () => {
      const ketch = new Ketch({
        jurisdiction: {
          defaultScopeCode: 'default',
          scopes: {
            'US-CA': 'ccpa',
            UK: 'gdpr',
          },
        },
      } as any as Configuration)

      fetchMock.mockResponse(
        JSON.stringify({
          location: {
            countryCode: 'US',
            regionCode: 'CA',
          },
        }),
      )

      return expect(ketch.loadJurisdiction()).resolves.toBe('ccpa')
    })

    it('defaults policy scope if not found', () => {
      const ketch = new Ketch({
        jurisdiction: {
          defaultScopeCode: 'default',
          scopes: {
            'US-CA': 'ccpa',
            UK: 'gdpr',
          },
        },
      } as any as Configuration)

      fetchMock.mockResponse(
        async (): Promise<string> =>
          JSON.stringify({
            location: {
              countryCode: 'NA',
            },
          }),
      )

      return expect(ketch.loadJurisdiction()).resolves.toBe('default')
    })

    it('defaults policy scope on reject', () => {
      const ketch = new Ketch({
        jurisdiction: {
          defaultScopeCode: 'default',
          scopes: {
            'US-CA': 'ccpa',
            UK: 'gdpr',
          },
        },
      } as any as Configuration)

      fetchMock.mockResponse(async (): Promise<string> => JSON.stringify({}))

      return expect(ketch.loadJurisdiction()).resolves.toBe('default')
    })
  })

  describe('pushJurisdiction', () => {
    it('pushes jurisdiction to dataLayer', () => {
      const ps = 'US-CA'

      const ketch = new Ketch({} as Configuration)

      ketch.pushJurisdiction(ps)
      let dataLayerPS = ''

      // @ts-ignore
      for (const dl of window.dataLayer) {
        if (dl['event'] === 'ketchJurisdiction') {
          dataLayerPS = dl['jurisdictionCode']
        }
      }
      return expect(dataLayerPS).toEqual(ps)
    })
  })
})
