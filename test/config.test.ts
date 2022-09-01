import { Configuration } from '@ketch-sdk/ketch-web-api'
import { Ketch } from '../src/pure'

jest.mock('../src/internal/parameters')

describe('config', () => {
  describe('getConfig', () => {
    it('returns the existing config', () => {
      const config = {
        language: 'en',
      }
      const ketch = new Ketch(config as any as Configuration)

      return expect(ketch.getConfig()).resolves.toBe(config)
    })
  })
})
