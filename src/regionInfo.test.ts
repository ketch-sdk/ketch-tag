import { Configuration } from '@ketch-sdk/ketch-types'
import errors from './errors'
import parameters from './parameters'
import { Ketch } from './'
import fetchMock from 'jest-fetch-mock'

jest.mock('./parameters')

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

      fetchMock.mockResponse(
        JSON.stringify({
          location: {},
        }),
      )

      return expect(ketch.loadRegionInfo()).rejects.toBe(errors.unrecognizedLocationError)
    })

    it('handles a missing country_code', () => {
      const ketch = new Ketch({} as Configuration)

      fetchMock.mockResponse(
        JSON.stringify({
          location: {
            ip: '10.11.12.13',
          },
        }),
      )

      return expect(ketch.loadRegionInfo()).rejects.toBe(errors.unrecognizedLocationError)
    })

    it('handles a non-US country_code with a region', () => {
      const ketch = new Ketch({} as Configuration)

      fetchMock.mockResponse(
        JSON.stringify({
          location: {
            ip: '10.11.12.13',
            countryCode: 'UK',
            regionCode: 'CA',
          },
        }),
      )

      return expect(ketch.loadRegionInfo()).resolves.toEqual('UK')
    })

    it('handles no region', () => {
      const ketch = new Ketch({} as Configuration)

      fetchMock.mockResponse(
        JSON.stringify({
          location: {
            ip: '10.11.12.13',
            countryCode: 'AU',
          },
        }),
      )

      return expect(ketch.loadRegionInfo()).resolves.toEqual('AU')
    })

    it('handles sub region', () => {
      const ketch = new Ketch({} as Configuration)

      fetchMock.mockResponse(
        JSON.stringify({
          location: {
            ip: '10.11.12.13',
            countryCode: 'US',
            regionCode: 'CA',
          },
        }),
      )

      return expect(ketch.loadRegionInfo()).resolves.toEqual('US-CA')
    })

    it('handles region on the query', () => {
      const ketch = new Ketch({} as Configuration)

      fetchMock.mockResponse(
        JSON.stringify({
          location: {
            ip: '10.11.12.13',
            countryCode: 'AU',
          },
        }),
      )

      mockParametersGet.mockImplementationOnce(key => {
        if (key === parameters.REGION) return 'FOO'
        return ''
      })

      return expect(ketch.loadRegionInfo()).resolves.toEqual('FOO')
    })
  })
})
