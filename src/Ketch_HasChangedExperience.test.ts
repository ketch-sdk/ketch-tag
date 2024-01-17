import { Ketch } from './Ketch'
import { KetchWebAPI } from '@ketch-sdk/ketch-web-api'
import { Configuration, ExperienceDisplayType } from '@ketch-sdk/ketch-types'

describe('HasChangedExperience', () => {
  // TODO:JA - Review that this is testing the proper thing
  describe('HasChangedExperience', () => {
    it('resolves to undefined', () => {
      const ketch = new Ketch(new KetchWebAPI(''), {
        organization: { code: 'axonic' },
        property: { code: 'axonic' },
        language: 'en',
      } as Configuration)

      const testExperienceType = ExperienceDisplayType.Banner

      return expect(ketch.hasChangedExperience(testExperienceType)).resolves.toStrictEqual(undefined)
    })
  })
})
