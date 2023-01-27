import { Configuration } from '@ketch-sdk/ketch-types'
import { Ketch } from './'
import { KetchWebAPI } from '@ketch-sdk/ketch-web-api'

describe('preferences', () => {
  describe('showPreferences', () => {
    it('shows experience', () => {
      const ketch = new Ketch(new KetchWebAPI(''), {
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
      const ketch = new Ketch(new KetchWebAPI(''), {} as Configuration)

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
