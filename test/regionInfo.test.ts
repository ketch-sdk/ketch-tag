jest.mock('@ketch-sdk/ketch-web-api')
jest.mock('../src/internal/parameters')

import errors from '../src/internal/errors'
import parameters from '../src/internal/parameters'
import { Ketch } from '../src/pure'
import { Configuration, getLocation, GetLocationResponse } from '@ketch-sdk/ketch-web-api'

const mockGetLocation = jest.mocked(getLocation)

describe('regionInfo', () => {
  const mockParametersGet = jest.mocked(parameters.get)

  describe('getRegionInfo', () => {
    it('returns the existing region info', () => {
      const ketch = new Ketch({} as Configuration)

      const ri = 'US-CA'
      return ketch.setRegionInfo(ri).then(() => {
        return expect(ketch.getRegionInfo()).resolves.toEqual(ri)
      })
    })
  })

  describe('loadRegionInfo', () => {
    it('handles an invalid IPInfo', () => {
      const ketch = new Ketch({} as Configuration)

      mockGetLocation.mockResolvedValue({
        location: {},
      } as GetLocationResponse)

      return expect(ketch.loadRegionInfo()).rejects.toBe(errors.unrecognizedLocationError)
    })

    it('handles a missing country_code', () => {
      const ketch = new Ketch({} as Configuration)

      mockGetLocation.mockResolvedValue({
        // @ts-ignore
        location: {
          ip: '10.11.12.13',
        },
      } as GetLocationResponse)

      return expect(ketch.loadRegionInfo()).rejects.toBe(errors.unrecognizedLocationError)
    })

    it('handles a non-US country_code with a region', () => {
      const ketch = new Ketch({} as Configuration)

      mockGetLocation.mockResolvedValue({
        // @ts-ignore
        location: {
          ip: '10.11.12.13',
          countryCode: 'UK',
          regionCode: 'CA',
        },
      } as GetLocationResponse)

      return expect(ketch.loadRegionInfo()).resolves.toEqual('UK')
    })

    it('handles no region', () => {
      const ketch = new Ketch({} as Configuration)

      mockGetLocation.mockResolvedValue({
        // @ts-ignore
        location: {
          ip: '10.11.12.13',
          countryCode: 'AU',
        },
      } as GetLocationResponse)

      return expect(ketch.loadRegionInfo()).resolves.toEqual('AU')
    })

    it('handles sub region', () => {
      const ketch = new Ketch({} as Configuration)

      mockGetLocation.mockResolvedValue({
        // @ts-ignore
        location: {
          ip: '10.11.12.13',
          countryCode: 'US',
          regionCode: 'CA',
        },
      } as GetLocationResponse)

      return expect(ketch.loadRegionInfo()).resolves.toEqual('US-CA')
    })

    it('handles region on the query', () => {
      const ketch = new Ketch({} as Configuration)

      mockGetLocation.mockResolvedValue({
        // @ts-ignore
        location: {
          ip: '10.11.12.13',
          countryCode: 'AU',
        },
      } as GetLocationResponse)

      mockParametersGet.mockImplementationOnce(key => {
        if (key === parameters.REGION) return 'FOO'
        return ''
      })

      return expect(ketch.loadRegionInfo()).resolves.toEqual('FOO')
    })
  })
})
