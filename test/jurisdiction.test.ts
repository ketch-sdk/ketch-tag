jest.mock('@ketch-sdk/ketch-web-api')
jest.mock('../src/internal/parameters')

import errors from '../src/internal/errors'
import parameters from '../src/internal/parameters'
import { Ketch } from '../src/pure'
import { Configuration, getLocation, GetLocationResponse } from '@ketch-sdk/ketch-web-api'

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
        if (key === parameters.POLICY_SCOPE) return 'FOO'
        return ''
      })

      return expect(ketch.loadJurisdiction()).resolves.toEqual('FOO')
    })

    it('handles null regionInfo', () => {
      const ketch = new Ketch({} as Configuration)

      const mockLoadRegionInfo = jest.mocked(getLocation)

      mockLoadRegionInfo.mockRejectedValue(errors.unrecognizedLocationError)

      return expect(ketch.loadJurisdiction()).rejects.toBe(errors.noJurisdictionError)
    })

    it('loads from dataLayer', () => {
      const ketch = new Ketch({
        jurisdiction: {
          variable: 'foobar',
        },
      } as Configuration)

      const mockLoadRegionInfo = jest.mocked(getLocation)
      mockLoadRegionInfo.mockResolvedValue({
        location: {
          countryCode: 'GB',
        },
      } as GetLocationResponse)

      // @ts-ignore
      window['dataLayer'] = []
      // @ts-ignore
      window['dataLayer'].push({
        foobar: 'ccpa',
      })

      return expect(ketch.loadJurisdiction()).resolves.toEqual('ccpa')
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

      const mockLoadRegionInfo = jest.mocked(getLocation)
      mockLoadRegionInfo.mockResolvedValue({
        location: {
          countryCode: 'US',
          regionCode: 'CA',
        },
      } as GetLocationResponse)

      return expect(ketch.loadJurisdiction()).resolves.toEqual('ccpa')
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

      const mockLoadRegionInfo = jest.mocked(getLocation)
      mockLoadRegionInfo.mockResolvedValue({
        location: {
          countryCode: 'NA',
        },
      } as GetLocationResponse)

      return expect(ketch.loadJurisdiction()).resolves.toEqual('default')
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

      const mockLoadRegionInfo = jest.mocked(getLocation)
      mockLoadRegionInfo.mockRejectedValue(errors.unrecognizedLocationError)

      return expect(ketch.loadJurisdiction()).resolves.toEqual('default')
    })
  })

  describe('pushJurisdiction', () => {
    it('pushes jurisdiction to dataLayer', () => {
      const ps = 'US-CA'

      const ketch = new Ketch({} as Configuration)

      ketch.pushJurisdiction(ps)
      let dataLayerPS = ''

      // @ts-ignore
      for (const dl of window['dataLayer']) {
        if (dl['event'] === 'ketchJurisdiction') {
          dataLayerPS = dl['jurisdictionCode']
        }
      }
      return expect(dataLayerPS).toEqual(ps)
    })
  })
})
