import { Configuration, GetLocationResponse, IPInfo } from '@ketch-sdk/ketch-types'
import { Ketch } from '../src/'
import fetchMock from 'jest-fetch-mock'

describe('geoip', () => {
  describe('getGeoIP', () => {
    it('returns the existing geoip', () => {
      const ketch = new Ketch({} as Configuration)

      // @ts-ignore
      const ip: IPInfo = {
        ip: '1.2.3.4',
      }

      return ketch.setGeoIP(ip).then(() => {
        return expect(ketch.getGeoIP()).resolves.toEqual(ip)
      })
    })
  })

  describe('loadGeoIP', () => {
    it('loads the location information', () => {
      const ip: GetLocationResponse = {
        // @ts-ignore
        location: {
          ip: '1.2.3.5',
        },
      } as GetLocationResponse
      fetchMock.mockResponse(async (): Promise<string> => JSON.stringify(ip))

      const ketch = new Ketch({} as Configuration)

      return ketch
        .loadGeoIP()
        .then((r: GetLocationResponse) => r.location)
        .then(p => ketch.setGeoIP(p))
        .then(() => {
          return expect(ketch.getGeoIP()).resolves.toEqual(ip.location)
        })
    })
  })

  describe('pushGeoIP', () => {
    it('pushes geoIP to dataLayer', () => {
      const ketch = new Ketch({} as Configuration)

      // @ts-ignore
      const g: IPInfo = {
        ip: '1.2.3.5',
        countryCode: 'US',
        regionCode: 'CA',
      }
      ketch.pushGeoIP(g)

      // @ts-ignore
      const r: IPInfo = {}

      // @ts-ignore
      for (const dl of window['dataLayer']) {
        if (dl['event'] === 'ketchGeoip') {
          r.ip = dl['ip']
          r.countryCode = dl['countryCode']
          r.regionCode = dl['regionCode']
        }
      }
      return expect(r).toEqual(g)
    })
  })
})
