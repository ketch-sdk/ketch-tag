import { Configuration } from '@ketch-sdk/ketch-types'
import { Ketch } from '../src/'

describe('preferences', () => {
  describe('showPreferences', () => {
    it('shows experience', () => {
      const ketch = new Ketch({
        experiences: {
          preference: {
            code: 'test',
          },
        },
      } as any as Configuration)

      const c = {
        purposes: {},
        vendors: [],
      }

      return ketch.setConsent(c).then(() => {
        return expect(ketch.showPreferenceExperience()).resolves.toStrictEqual({ purposes: {}, vendors: [] })
      })
    })

    it('does not show experience', () => {
      const ketch = new Ketch({} as Configuration)

      const c = {
        purposes: {},
        vendors: [],
      }

      return ketch.setConsent(c).then(() => {
        return expect(ketch.showPreferenceExperience()).resolves.toStrictEqual({ purposes: {}, vendors: [] })
      })
    })
  })
})
