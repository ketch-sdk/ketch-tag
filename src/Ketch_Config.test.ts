import type { Configuration } from '@ketch-sdk/ketch-types'
import { Ketch } from './'
import { KetchWebAPI } from '@ketch-sdk/ketch-web-api'

jest.mock('./parameters')

describe('config', () => {
  describe('getConfig', () => {
    it('returns the existing config', () => {
      const config = {
        language: 'en',
      } as Configuration
      const ketch = new Ketch(new KetchWebAPI(''), config)

      return expect(ketch.getConfig()).resolves.toBe(config)
    })
  })
})
