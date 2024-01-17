import { Ketch } from './Ketch'
import { KetchWebAPI } from '@ketch-sdk/ketch-web-api'
import { Configuration, ExperienceDisplayType } from '@ketch-sdk/ketch-types'

describe('WillChangeExperience', () => {
  describe('WillChangeExperience', () => {
    it('resolves to undefined', () => {
      const ketch = new Ketch(new KetchWebAPI(''), {
        organization: { code: 'axonic' },
        property: { code: 'axonic' },
        language: 'en',
      } as Configuration)

      const testExperienceType = ExperienceDisplayType.Banner

      return expect(ketch.willChangeExperience(testExperienceType)).resolves.toStrictEqual(undefined)
    })
  })
})
