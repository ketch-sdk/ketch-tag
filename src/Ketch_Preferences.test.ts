import { Configuration } from '@ketch-sdk/ketch-types'
import { Ketch } from './'
import { KetchWebAPI } from '@ketch-sdk/ketch-web-api'
import { EMPTY_CONSENT } from './constants'

describe('preferences', () => {
  describe('showPreferences', () => {
    it('shows experience', () => {
      const ketch = new Ketch(new KetchWebAPI(''), {
        organization: { code: 'ketch' },
        property: { code: 'web' },
        environment: { code: 'production' },
        jurisdiction: { code: 'default' },
        purposes: [{ code: 'analytics' }],
        experiences: {
          preference: {
            code: 'test',
          },
        },
      } as any as Configuration)
      ketch.setIdentities({ foo: 'bar' })

      const c = {
        purposes: {},
        vendors: [],
      }

      return ketch.setConsent(c).then(() => {
        return expect(ketch.showPreferenceExperience()).resolves.toStrictEqual({ purposes: {}, vendors: [] })
      })
    })

    it('does not show experience', () => {
      const ketch = new Ketch(new KetchWebAPI(''), {
        organization: { code: 'ketch' },
        property: { code: 'web' },
        environment: { code: 'production' },
        jurisdiction: { code: 'default' },
        purposes: [{ code: 'analytics' }],
      } as Configuration)

      ketch.setIdentities({ foo: 'bar' })
      const c = {
        purposes: {},
        vendors: [],
      }

      return ketch.setConsent(c).then(() => {
        return expect(ketch.showPreferenceExperience()).resolves.toStrictEqual({ purposes: {}, vendors: [] })
      })
    })

    it('shows experience even with no purposes', () => {
      const ketch = new Ketch(new KetchWebAPI(''), {
        organization: { code: 'ketch' },
        property: { code: 'web' },
        environment: { code: 'production' },
        jurisdiction: { code: 'default' },
        formTemplates: [],
        purposes: [],
      } as Configuration)

      ketch.setIdentities({ foo: 'bar' })

      expect(ketch.showPreferenceExperience()).resolves.toStrictEqual(EMPTY_CONSENT)
    })
  })
})
