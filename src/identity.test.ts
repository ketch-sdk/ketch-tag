import { getCookie } from '@ketch-sdk/ketch-data-layer'
import { Ketch } from './'
import { Configuration, IdentityType } from '@ketch-sdk/ketch-types'

describe('identity', () => {
  describe('getIdentities', () => {
    const organization = {
      ID: 'orgID1',
      code: 'org1',
    }

    it('returns one item list', () => {
      const ketch = new Ketch({} as Configuration)

      return ketch.setIdentities({ space1: 'id1' }).then(() => {
        return expect(ketch.getIdentities()).resolves.toEqual({ space1: 'id1' })
      })
    })

    it('returns two item list', () => {
      const ketch = new Ketch({} as Configuration)

      return ketch.setIdentities({ space1: 'id1', space2: 'id2' }).then(() => {
        return expect(ketch.getIdentities()).resolves.toEqual({ space1: 'id1', space2: 'id2' })
      })
    })

    jest.setTimeout(100000)

    // config.identities
    it('handles no identities defined', () => {
      const ketch = new Ketch({} as Configuration)

      return ketch.getIdentities().then(ids => {
        expect(ids).toEqual({})
      })
    })

    it('handles window properties', () => {
      const config = {
        organization,
        identities: {
          f1: {
            type: 'window',
            variable: 'window.foo1',
          },
          f2: {
            type: 'window',
            variable: 'window.foo2()',
          },
          f3: {
            type: 'window',
            variable: 'window.foo3',
          },
          f4: {
            type: 'window',
            variable: 'window.foo4',
          },
          f5: {
            type: 'window',
            variable: 'foo5.bar',
          },
          f6: {
            type: 'window',
            variable: 'foo6.bar',
          },
        },
      }
      const ketch = new Ketch(config as any as Configuration)

      // @ts-ignore
      window['foo1'] = 'wfv1'
      // @ts-ignore
      window['foo3'] = '0'
      // @ts-ignore
      window['foo4'] = ''
      // @ts-ignore
      window['foo5'] = { bar: 123 }
      // @ts-ignore
      window['foo6'] = { bar: null }

      return ketch.getIdentities().then(ids => {
        return expect(ids).toEqual({ f1: 'wfv1', f5: '123' })
      })
    })

    it('handles dataLayer properties', () => {
      const config = {
        organization,
        identities: {
          f1: {
            type: 'dataLayer',
            variable: 'bar1',
          },
          f2: {
            type: 'dataLayer',
            variable: 'bar2',
          },
          f3: {
            type: 'dataLayer',
            variable: 'window.bar3',
          },
          f4: {
            type: 'dataLayer',
            variable: 'bar4',
          },
        },
      }
      const ketch = new Ketch(config as any as Configuration)

      // @ts-ignore
      window['dataLayer'] = [
        {
          bar1: 'dlfv1',
          bar2: 'dlfv2',
        },
        {
          bar3: 'dlfv3',
        },
        {
          bar4: 'dlfv4',
        },
      ]

      return ketch.getIdentities().then(ids => {
        return expect(ids).toEqual({
          f1: 'dlfv1',
          f2: 'dlfv2',
          f4: 'dlfv4',
        })
      })
    })

    it('handles cookie properties', async () => {
      const config = {
        organization,
        identities: {
          f1: {
            type: 'cookie',
            variable: 'cookie1',
          },
          f2: {
            type: 'cookie',
            variable: 'cookie2',
          },
        },
      }
      const ketch = new Ketch(config as any as Configuration)

      document.cookie = 'cookie1=cfv1'
      return expect(ketch.getIdentities()).resolves.toEqual({ f1: 'cfv1' })
    })

    it('handles managed cookie properties', () => {
      const config = {
        organization,
        identities: {
          f1: {
            type: IdentityType.IDENTITY_TYPE_MANAGED,
            variable: 'mc1',
          },
        },
      }
      const ketch = new Ketch(config as any as Configuration)

      return ketch.getIdentities().then(ids => {
        const mc2 = getCookie(window, '_swb')

        return expect(ids).toEqual({
          f1: mc2,
        })
      })
    })

    it('contains unique ids', () => {
      const config = {
        organization,
        identities: {
          f1: {
            type: IdentityType.IDENTITY_TYPE_MANAGED,
            variable: 'uuid',
          },
        },
      }
      const ketch = new Ketch(config as any as Configuration)

      return ketch.getIdentities().then(() => {
        const uuid = getCookie(window, '_swb')

        expect(uuid).toBeDefined()
        expect(uuid).toMatch(/[a-z0-9-]/g)
      })
    })
  })
})
