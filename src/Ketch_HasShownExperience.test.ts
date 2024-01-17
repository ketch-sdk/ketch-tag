import { Ketch } from './Ketch'
import { KetchWebAPI } from '@ketch-sdk/ketch-web-api'
import { Configuration } from '@ketch-sdk/ketch-types'

describe('hasShownExperience', () => {
  // TODO:JA - Review that this is testing the proper thing
  describe('hasShownExperience', () => {
    it('resolves to undefined', () => {
      const ketch = new Ketch(new KetchWebAPI(''), {
        organization: { code: 'axonic' },
        property: { code: 'axonic' },
        language: 'en',
      } as Configuration)

      return expect(ketch.hasShownExperience()).resolves.toStrictEqual(undefined)
    })
  })
})
