import {
  Configuration,
  IdentityFormat,
  IdentityType,
  ExperienceType,
  GetConsentRequest,
  ConsentExperienceType,
  ExperienceClosedReason,
} from '@ketch-sdk/ketch-types'
import errors from './errors'
import { Ketch } from './'
import constants from './constants'
import fetchMock from 'jest-fetch-mock'
import { CACHED_CONSENT_KEY, getCachedConsent } from './cache'
import { setCookie } from '@ketch-sdk/ketch-data-layer'
import { KetchWebAPI } from '@ketch-sdk/ketch-web-api'

describe('consent', () => {
  // @ts-ignore
  const config2: Configuration = {
    organization: {
      code: 'org',
    },
    property: {
      code: 'axonic',
      name: 'axonic.io',
      platform: 'WEB',
    },
    environments: [
      {
        code: constants.PRODUCTION,
        hash: '1392568836159292875',
      },
    ],
    jurisdiction: {
      code: 'ccpa',
      defaultJurisdictionCode: 'ccpa',
      variable: 'scope_tag',
    },
    identities: {
      axonic_cookie: {
        variable: 'huid',
        type: IdentityType.IDENTITY_TYPE_DATA_LAYER,
        format: IdentityFormat.IDENTITY_FORMAT_STRING,
      },
    },
    environment: {
      code: constants.PRODUCTION,
      hash: '1392568836159292875',
    },
    deployment: {
      code: 'axonic_dep',
      version: 2,
    },
    rights: [
      {
        code: 'portability',
        name: 'Portability',
        description: 'Right to have all data provided to you.',
        canonicalRightCode: 'get',
      },
      {
        code: 'rtbf',
        name: 'Data Deletion',
        description: 'Right to be forgotten.',
        canonicalRightCode: 'delete',
      },
    ],
    purposes: [
      // @ts-ignore
      {
        code: 'productresearch',
        name: 'Product Research',
        description: 'We will use data collected about you to perform critical product enhancements.',
        legalBasisCode: 'disclosure',
        requiresPrivacyPolicy: true,
      },
      // @ts-ignore
      {
        code: 'analytics',
        name: 'Analytics',
        description: 'We perform analytics on your data to get smarter.',
        legalBasisCode: 'consent-optin',
        requiresOptIn: true,
        requiresPrivacyPolicy: true,
      },
      // @ts-ignore
      {
        code: 'datasales',
        name: 'Data Sales',
        description: 'We will sell your personal data to other institutions. ',
        legalBasisCode: 'consent-optout',
        allowsOptOut: true,
        requiresPrivacyPolicy: true,
      },
    ],
    experiences: {
      // @ts-ignore
      consent: {
        experienceDefault: 2,
      },
    },
    options: {
      localStorage: '1',
      migration: '1',
    },
  }

  // @ts-ignore
  const config: Configuration = {
    organization: {
      code: 'org',
    },
    property: {
      code: 'app',
    },
    environment: {
      code: 'env',
    },
    jurisdiction: {
      code: 'ps',
    },
    rights: [
      {
        code: 'portability',
        name: 'Portability',
        description: 'Right to have all data provided to you.',
        canonicalRightCode: 'get',
      },
      {
        code: 'rtbf',
        name: 'Data Deletion',
        description: 'Right to be forgotten.',
        canonicalRightCode: 'delete',
      },
    ],
    purposes: [
      // @ts-ignore
      {
        code: 'pacode1',
        legalBasisCode: 'lb1',
      },
      // @ts-ignore
      {
        code: 'pacode2',
        legalBasisCode: 'lb2',
      },
      // @ts-ignore
      {
        code: 'pacode4',
        legalBasisCode: 'lb4',
      },
    ],
    options: {
      migration: '3',
    },
  }
  const identities = {
    space1: 'id1',
  }

  describe('fetchConsent', () => {
    it('handles a call with full config and no server consent', () => {
      document.cookie = '_swb_consent_=; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=None; Secure'
      const ketch = new Ketch(new KetchWebAPI(''), config)

      fetchMock.mockResponse(async (): Promise<string> => {
        return JSON.stringify({})
      })

      return ketch.fetchConsent(identities).then(x => {
        expect(x).toEqual({
          purposes: {},
        })
      })
    })

    it('handles a call with full config and server consent', () => {
      document.cookie = '_swb_consent_=; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=None; Secure'
      window.localStorage.removeItem('_swb_consent_')
      const ketch = new Ketch(new KetchWebAPI(''), config)

      fetchMock.mockResponse(async (): Promise<string> => {
        return JSON.stringify({
          organizationCode: 'org',
          purposes: {
            pacode1: {
              allowed: 'true',
            },
            pacode2: {
              allowed: 'false',
            },
            pacode3: {
              allowed: 'false',
            },
          },
          vendors: ['1'],
        })
      })

      return ketch.fetchConsent(identities).then(x => {
        expect(x).toEqual({
          purposes: {
            pacode1: true,
            pacode2: false,
          },
          vendors: ['1'],
        })
        const { property, jurisdiction, organization, environment } = config
        expect(property).not.toBeNull()
        expect(jurisdiction).not.toBeNull()
        expect(organization).not.toBeNull()
        expect(environment).not.toBeNull()
      })
    })

    it('skips calling if no identities', () => {
      const ketch = new Ketch(new KetchWebAPI(''), config)

      return expect(ketch.fetchConsent({})).rejects.toBe(errors.noIdentitiesError)
    })

    it('skips calling if no purposes', () => {
      const ketch = new Ketch(new KetchWebAPI(''), {
        organization: {
          code: 'org',
        },
        property: {
          code: 'property',
        },
        environment: {
          code: 'env',
        },
        jurisdiction: {
          code: 'default',
        },
        purposes: [],
      } as any as Configuration)

      return expect(ketch.fetchConsent(identities)).rejects.toBe(errors.noPurposesError)
    })
  })

  describe('updateConsent', () => {
    it('handles a call with full config', () => {
      const ketch = new Ketch(new KetchWebAPI('https://global.ketchcdn.com/web/v2'), config)

      fetchMock.mockResponse(async (): Promise<string> => JSON.stringify({}))

      return ketch
        .updateConsent(identities, {
          purposes: {
            pacode1: true,
            pacode2: false,
          },
          vendors: ['1'],
        })
        .then(() => {
          const { property, jurisdiction, organization, environment } = config
          expect(property).not.toBeNull()
          expect(jurisdiction).not.toBeNull()
          expect(organization).not.toBeNull()
          expect(environment).not.toBeNull()

          if (property && jurisdiction && organization && environment) {
            expect(fetchMock).toHaveBeenCalledWith('https://global.ketchcdn.com/web/v2/consent/org/update', {
              body: `{"organizationCode":"org","propertyCode":"app","environmentCode":"env","identities":{"space1":"id1"},"jurisdictionCode":"ps","purposes":{"pacode1":{"allowed":"true","legalBasisCode":"lb1"},"pacode2":{"allowed":"false","legalBasisCode":"lb2"}},"vendors":["1"],"collectedAt":${Math.floor(
                Date.now() / 1000,
              )}}`,
              credentials: 'omit',
              headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
              },
              method: 'POST',
              mode: 'cors',
            })
          }
        })
    })

    it('skips if no identities', () => {
      const ketch = new Ketch(new KetchWebAPI(''), config)

      return expect(
        ketch.updateConsent(
          {},
          {
            purposes: {
              pacode1: true,
              pacode2: false,
            },
            vendors: ['1'],
          },
        ),
      ).rejects.toBe(errors.noIdentitiesError)
    })

    it('skips if no purposes', () => {
      const ketch = new Ketch(new KetchWebAPI(''), {
        organization: {
          code: 'org',
        },
        property: {
          code: 'property',
        },
        environment: {
          code: 'env',
        },
        jurisdiction: {
          code: 'default',
        },
        purposes: [],
        options: {
          migration: '3',
        },
      } as any as Configuration)

      return expect(
        ketch
          .updateConsent(identities, {
            purposes: {
              pacode1: true,
              pacode2: false,
            },
          })
          .then(x => {
            expect(x).toBeUndefined()
          }),
      ).rejects.toBe(errors.invalidConfigurationError)
    })

    it('skips if no consents', () => {
      const ketch = new Ketch(new KetchWebAPI(''), config)

      return expect(ketch.updateConsent(identities, { purposes: {} })).rejects.toBe(errors.emptyConsentError)
    })
  })

  describe('getConsent', () => {
    it('returns the existing consent', () => {
      const ketch = new Ketch(new KetchWebAPI(''), config)
      const c = {
        purposes: {
          ip: true,
        },
        vendors: ['1'],
      }
      fetchMock.mockResponse(async (): Promise<string> => {
        return '{}'
      })

      expect(ketch.hasConsent()).not.toBeTruthy()
      return ketch
        .setConsent(c)
        .then(x => {
          expect(x).toEqual({
            purposes: {
              ip: true,
            },
            vendors: ['1'],
          })
          expect(ketch.hasConsent()).toBeTruthy()
          return ketch.getConsent()
        })
        .then(y => {
          expect(y).toEqual({
            purposes: {
              ip: true,
            },
            vendors: ['1'],
          })
        })
    })

    it('fetches if no consent', () => {
      const ketch = new Ketch(new KetchWebAPI(''), config)
      ketch.setIdentities(identities)
      fetchMock.mockResponse(async (): Promise<string> => {
        return '{}'
      })

      return ketch.getConsent().then(() => {
        expect(fetchMock).toHaveBeenCalled()
      })
    })
  })

  describe('selectExperience', () => {
    it('returns modal if any purposes requires opt in and defaultExperience is modal', () => {
      const ketch = new Ketch(new KetchWebAPI(''), {
        purposes: [
          {
            code: '',
            name: '',
            description: '',
            legalBasisCode: '',
            requiresOptIn: true,
          },
        ],
        experiences: {
          consent: {
            experienceDefault: 2,
          },
        },
      } as any as Configuration)

      expect(ketch.selectConsentExperience()).toEqual(ConsentExperienceType.Modal)
    })

    it('returns banner if any purposes requires opt in and defaultExperience is not modal', () => {
      const ketch = new Ketch(new KetchWebAPI(''), {
        purposes: [
          {
            code: '',
            name: '',
            description: '',
            legalBasisCode: '',
            requiresOptIn: false,
          },
        ],
      } as any as Configuration)

      expect(ketch.selectConsentExperience()).toEqual(ConsentExperienceType.Banner)
    })

    it('returns banner if none of the purposes requires opt in', () => {
      const ketch = new Ketch(new KetchWebAPI(''), {
        purposes: [
          {
            code: '',
            name: '',
            description: '',
            legalBasisCode: '',
            requiresOptIn: false,
          },
        ],
      } as any as Configuration)

      expect(ketch.selectConsentExperience()).toEqual(ConsentExperienceType.Banner)
    })

    it('returns banner no purposes', () => {
      const ketch = new Ketch(new KetchWebAPI(''), config2)

      expect(ketch.selectConsentExperience()).toEqual(ConsentExperienceType.Modal)
    })
  })

  describe('shouldShowConsent', () => {
    it('shows when missing options', () => {
      const ketch = new Ketch(new KetchWebAPI(''), config2)

      expect(ketch.selectExperience({ purposes: {} })).toEqual(ExperienceType.Consent)
    })

    it('does not show when no purposes', () => {
      const ketch = new Ketch(new KetchWebAPI(''), {
        purposes: [],
        experiences: {
          consent: {
            code: 'test',
          },
        },
      } as any as Configuration)

      expect(ketch.selectExperience({ purposes: { analytics: true } })).toBeUndefined()
    })

    it('still shows when no consent experience', () => {
      const ketch = new Ketch(new KetchWebAPI(''), {
        purposes: [
          {
            code: 'productresearch',
            name: 'Product Research',
            description: 'We will use data collected about you to perform critical product enhancements.',
            legalBasisCode: 'disclosure',
            requiresPrivacyPolicy: true,
          },
        ],
      } as any as Configuration)

      expect(ketch.selectExperience({ purposes: {} })).toEqual(ExperienceType.Consent)
    })

    it('shows when options', () => {
      const ketch = new Ketch(new KetchWebAPI(''), config2)

      expect(
        ketch.selectExperience({
          purposes: {
            datasales: true,
          },
        }),
      ).toEqual(ExperienceType.Consent)
    })
  })

  describe('showConsent', () => {
    it('calls lanyard', () => {
      const ketch = new Ketch(new KetchWebAPI(''), config2)

      const c = { purposes: { datasales: true } }

      expect(ketch.setConsent(c)).resolves.toBe(c)
      expect(ketch.showConsentExperience()).resolves.toBe(c)
    })
  })
})

describe('experience consent', () => {
  const ketch = new Ketch(new KetchWebAPI(''), {
    purposes: [
      {
        code: 'analytics',
      },
      {
        code: 'advertising',
      },
      {
        code: 'data_sales',
      },
    ],
  } as any as Configuration)
  const c = {
    purposes: {
      ip: true,
    },
    vendors: ['1'],
  }

  it('retrieve consent on experience closed', () => {
    return ketch.setConsent(c).then(() => {
      ketch.experienceClosed(ExperienceClosedReason.CLOSE).then(consent => {
        expect(consent).toEqual(c)
      })
    })
  })
})

describe('cached consent', () => {
  const request: GetConsentRequest = {
    organizationCode: 'org',
    propertyCode: 'prop',
    environmentCode: constants.PRODUCTION,
    identities: {},
    jurisdictionCode: 'us_ca',
    purposes: { analytics: { legalBasisCode: 'disclosure' } },
  }

  it('reads empty', async () => {
    setCookie(window, CACHED_CONSENT_KEY, '', -1)
    window.localStorage.removeItem(CACHED_CONSENT_KEY)
    window.sessionStorage.removeItem(CACHED_CONSENT_KEY)
    const consent = await getCachedConsent(request)
    expect(consent).toEqual(expect.objectContaining({ purposes: {} }))
  })

  // it('reads from localStorage', async () => {
  //   const collectedAt = Math.floor(Date.now() / 1000)
  //   window.localStorage.setItem(
  //     CACHED_CONSENT_KEY,
  //     JSON.stringify({ purposes: { analytics: { allowed: true } }, collectedAt: collectedAt }),
  //   )
  //   const consent = await getCachedConsent(request)
  //   window.localStorage.removeItem(CACHED_CONSENT_KEY)
  //   expect(consent).toEqual(
  //     expect.objectContaining({ purposes: { analytics: { allowed: true } }, collectedAt: collectedAt }),
  //   )
  // })
  //
  // it('reads empty object from localStorage', async () => {
  //   window.localStorage.setItem(CACHED_CONSENT_KEY, JSON.stringify({}))
  //   const consent = await getCachedConsent(request)
  //   window.localStorage.removeItem(CACHED_CONSENT_KEY)
  //   expect(consent).toEqual(expect.objectContaining({ purposes: {} }))
  // })
  //
  // it('reads from sessionStorage', async () => {
  //   const collectedAt = Math.floor(Date.now() / 1000)
  //   window.sessionStorage.setItem(
  //     CACHED_CONSENT_KEY,
  //     JSON.stringify({ purposes: { analytics: { allowed: true } }, collectedAt: collectedAt }),
  //   )
  //   const consent = await getCachedConsent(request)
  //   window.sessionStorage.removeItem(CACHED_CONSENT_KEY)
  //   expect(consent).toEqual(
  //     expect.objectContaining({ purposes: { analytics: { allowed: true } }, collectedAt: collectedAt }),
  //   )
  // })

  it('reads from cookie', async () => {
    const collectedAt = Math.floor(Date.now() / 1000)
    setCookie(
      window,
      CACHED_CONSENT_KEY,
      btoa(JSON.stringify({ purposes: { analytics: { allowed: true } }, collectedAt: collectedAt })),
    )
    const consent = await getCachedConsent(request)
    setCookie(window, CACHED_CONSENT_KEY, '', -1)
    expect(consent).toEqual(
      expect.objectContaining({ purposes: { analytics: { allowed: true } }, collectedAt: collectedAt }),
    )
  })
})
