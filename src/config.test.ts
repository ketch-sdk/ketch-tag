import { Configuration } from '@ketch-sdk/ketch-types'
import { Ketch } from './'

jest.mock('./parameters')

describe('config', () => {
  describe('getConfig', () => {
    it('returns the existing config', () => {
      const config = {
        language: 'en',
      } as Configuration
      const ketch = new Ketch(config)

      return expect(ketch.getConfig()).resolves.toBe(config)
    })
  })
})
