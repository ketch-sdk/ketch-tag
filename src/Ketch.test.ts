import { KetchWebAPI } from '@ketch-sdk/ketch-web-api'
import {
  Configuration,
  Consent,
  ConsentExperienceType,
  ExperienceClosedReason,
  ExperienceDefault,
  ExperienceType,
  InvokeRightEvent,
  IPInfo,
  Ketch as KetchAPI,
  StorageOriginPolicy,
  Tab,
} from '@ketch-sdk/ketch-types'
import { Ketch } from './Ketch'
import parameters from './parameters'
import constants from './constants'

describe('Ketch', () => {
  const webAPIMock = {
    getLocation: jest.fn(), // () => Promise<GetLocationResponse>
    getBootstrapConfiguration: jest.fn(), // () => request: GetBootstrapConfigurationRequest): Promise<Configuration>
    getFullConfiguration: jest.fn(), // () => request: GetFullConfigurationRequest): Promise<Configuration>
    getConsent: jest.fn(), // () => request: GetConsentRequest): Promise<GetConsentResponse>
    setConsent: jest.fn(), // () => request: SetConsentRequest): Promise<void>
    invokeRight: jest.fn(), // () => request: InvokeRightRequest): Promise<void>
    preferenceQR: jest.fn(), // () => request: GetPreferenceQRRequest): Promise<string>
    webReport: jest.fn(), // () => channel: string, request: WebReportRequest): Promise<void>
  }
  const webAPI = webAPIMock as unknown as KetchWebAPI
  const emptyConfig = {} as Configuration

  describe('registerPlugin', () => {
    it('accepts a plugin function', () => {
      const ketch = new Ketch(webAPI, emptyConfig)
      expect.assertions(2)

      return ketch.registerPlugin(async (k: KetchAPI, config: Configuration) => {
        expect(k).toBeDefined()
        expect(config).toStrictEqual(emptyConfig)
      })
    })

    it('accepts an old-style plugin class', async () => {
      const config = {
        organization: {
          code: 'axonic',
        },
        experiences: {
          preference: {
            code: 'pref',
            version: 1,
            title: 'My Prefs',
            overview: {
              tabName: 'Overview',
              bodyDescription: 'desc',
              extensions: {},
            },
            extensions: {},
          },
        },
      }
      const ketch = new Ketch(webAPI, config)
      const consent = {
        purposes: {},
        vendors: [],
      } as Consent
      const geoip = {} as IPInfo
      const identities = {}
      const right = {
        right: 'delete',
        subject: {
          firstName: '',
          lastName: '',
        },
      } as InvokeRightEvent
      await ketch.registerPlugin({
        async init(k: KetchAPI, config: Configuration) {
          expect(k).toBeDefined()
          expect(config).toStrictEqual(config)
        },

        willShowExperience(k: KetchAPI, config: Configuration) {
          expect(k).toBeDefined()
          expect(config).toStrictEqual(config)
        },

        showConsentExperience(k: KetchAPI, config: Configuration, consents, options) {
          expect(k).toBeDefined()
          expect(config).toStrictEqual(config)
          expect(consents).toStrictEqual(consent)
          expect(options).toStrictEqual({
            displayHint: ConsentExperienceType.Banner,
          })
        },

        showPreferenceExperience(k: KetchAPI, config: Configuration, consents, options) {
          expect(k).toBeDefined()
          expect(config).toStrictEqual(config)
          expect(consents).toStrictEqual(consent)
          expect(options).toStrictEqual({})
        },

        consentChanged(k: KetchAPI, config: Configuration, consent) {
          expect(k).toBeDefined()
          expect(config).toStrictEqual(config)
          expect(consent).toStrictEqual(consent)
        },

        environmentLoaded(k: KetchAPI, config: Configuration, env) {
          expect(k).toBeDefined()
          expect(config).toStrictEqual(config)
          expect(env).toStrictEqual({ code: constants.PRODUCTION })
        },

        // TODO:
        // experienceHidden(k: KetchAPI, config: Configuration, reason) {
        //   expect(k).toBeDefined()
        //   expect(config).toStrictEqual(config)
        //   expect(reason).toStrictEqual(ExperienceClosedReason.SET_CONSENT)
        // },

        geoIPLoaded(k: KetchAPI, config: Configuration, geoip) {
          expect(k).toBeDefined()
          expect(config).toStrictEqual(config)
          expect(geoip).toStrictEqual({})
        },

        identitiesLoaded(k: KetchAPI, config: Configuration, identities) {
          expect(k).toBeDefined()
          expect(config).toStrictEqual(config)
          expect(identities).toStrictEqual({})
        },

        jurisdictionLoaded(k: KetchAPI, config: Configuration, jurisdiction) {
          expect(k).toBeDefined()
          expect(config).toStrictEqual(config)
          expect(jurisdiction).toBe('gdpr')
        },

        regionInfoLoaded(k: KetchAPI, config: Configuration, regionInfo) {
          expect(k).toBeDefined()
          expect(config).toStrictEqual(config)
          expect(regionInfo).toBe('US-CA')
        },

        // TODO:
        // rightInvoked(k: KetchAPI, config: Configuration, request) {
        //   expect(k).toBeDefined()
        //   expect(config).toStrictEqual(config)
        //   expect(request).toStrictEqual({})
        // },
      })

      expect.assertions(31 + 3) // willShowExperience is twice
      await ketch.setEnvironment({ code: constants.PRODUCTION })
      await ketch.setGeoIP(geoip)
      await ketch.setIdentities(identities)
      await ketch.changeConsent(consent)
      await ketch.setConsent(consent)
      await ketch.setJurisdiction('gdpr')
      await ketch.setRegionInfo('US-CA')
      await ketch.showConsentExperience()
      await ketch.showPreferenceExperience({})
      ketch.willShowExperience(ExperienceType.Consent)
      await ketch.experienceClosed(ExperienceClosedReason.SET_CONSENT)
      await ketch.invokeRight(right)
    })
  })

  describe('registerIdentityProvider', () => {
    it('adds watcher', async () => {
      const providerMock = jest.fn()
      const ketch = new Ketch(webAPI, emptyConfig)
      return expect(ketch.registerIdentityProvider('foo', providerMock)).resolves.toBeUndefined()
    })
  })

  describe('registerStorageProvider', () => {
    it('does nothing right now', async () => {
      const providerMock = {
        getItem: jest.fn(),
        setItem: jest.fn(),
        removeItem: jest.fn(),
      }
      const ketch = new Ketch(webAPI, emptyConfig)
      return expect(
        ketch.registerStorageProvider(StorageOriginPolicy.CrossOrigin, providerMock),
      ).resolves.toBeUndefined()
    })
  })

  describe('getConfig', () => {
    it('returns config', () => {
      const ketch = new Ketch(webAPI, emptyConfig)
      return expect(ketch.getConfig()).resolves.toStrictEqual(emptyConfig)
    })
  })

  describe('selectExperience', () => {
    const emptyConsent = {
      purposes: {},
    }
    const analyticsConsent = {
      purposes: {
        analytics: true,
      },
    } as Consent
    const analyticsConfig = {
      purposes: [
        {
          code: 'analytics',
          legalBasisCode: 'consent_optin',
        },
      ],
    } as Configuration
    const parametersGetMock = jest.spyOn(parameters, 'get')
    const parametersHasMock = jest.spyOn(parameters, 'has')

    beforeEach(() => {
      parametersGetMock.mockReset()
      parametersHasMock.mockReset()
    })

    it('returns undefined if experience has already been displayed', () => {
      const ketch = new Ketch(webAPI, emptyConfig)
      ;(ketch as any)._hasExperienceBeenDisplayed = true
      expect(ketch.selectExperience(emptyConsent)).toBeUndefined()
    })

    it('selects preference if requested in querystring', () => {
      const ketch = new Ketch(webAPI, emptyConfig)
      parametersGetMock.mockReturnValue(constants.PREFERENCES)
      parametersHasMock.mockReturnValue(true)
      expect(ketch.selectExperience(emptyConsent)).toBe(ExperienceType.Preference)
    })

    it('selects consent if show in querystring', () => {
      const ketch = new Ketch(webAPI, emptyConfig)
      parametersGetMock.mockReturnValue('')
      parametersHasMock.mockReturnValue(true)
      expect(ketch.selectExperience(emptyConsent)).toBe(ExperienceType.Consent)
    })

    it('selects consent if a purpose consent is missing', () => {
      const ketch = new Ketch(webAPI, analyticsConfig)
      expect(ketch.selectExperience(emptyConsent)).toBe(ExperienceType.Consent)
    })

    it('returns undefined by purpose has consent', () => {
      const ketch = new Ketch(webAPI, analyticsConfig)
      expect(ketch.selectExperience(analyticsConsent)).toBeUndefined()
    })
  })

  describe('selectConsentExperience', () => {
    it('defaults to banner', () => {
      const ketch = new Ketch(webAPI, emptyConfig)
      expect(ketch.selectConsentExperience()).toBe(ConsentExperienceType.Banner)
    })

    it('returns banner if no purposes', () => {
      const ketch = new Ketch(webAPI, {
        purposes: [],
      } as any as Configuration)
      expect(ketch.selectConsentExperience()).toBe(ConsentExperienceType.Banner)
    })

    it('returns banner if purposes but default === banner', () => {
      const ketch = new Ketch(webAPI, {
        purposes: [
          {
            code: 'analytics',
            requiresOptIn: true,
          },
        ],
        experiences: {
          consent: {
            experienceDefault: ExperienceDefault.BANNER,
          },
        },
      } as Configuration)
      expect(ketch.selectConsentExperience()).toBe(ConsentExperienceType.Banner)
    })

    it('returns banner if purposes and default === modal and no purposes require opt in', () => {
      const ketch = new Ketch(webAPI, {
        purposes: [
          {
            code: 'analytics',
            requiresOptIn: false,
          },
        ],
        experiences: {
          consent: {
            experienceDefault: ExperienceDefault.BANNER,
          },
        },
      } as Configuration)
      expect(ketch.selectConsentExperience()).toBe(ConsentExperienceType.Banner)
    })

    it('returns modal if purposes and default === modal and purposes require opt in', () => {
      const ketch = new Ketch(webAPI, {
        purposes: [
          {
            code: 'analytics',
            requiresOptIn: true,
          },
        ],
        experiences: {
          consent: {
            experienceDefault: ExperienceDefault.MODAL,
          },
        },
      } as Configuration)
      expect(ketch.selectConsentExperience()).toBe(ConsentExperienceType.Modal)
    })
  })

  describe('willShowExperience', () => {
    it('emits willShowExperience event', () => {
      const ketch = new Ketch(webAPI, emptyConfig)
      const listenerSpy = jest.fn()
      ketch.on(constants.WILL_SHOW_EXPERIENCE_EVENT, listenerSpy)
      expect((ketch as any)._isExperienceDisplayed).toBeFalsy()
      ketch.willShowExperience('foo')
      expect(listenerSpy).toHaveBeenCalledWith('foo')
      expect((ketch as any)._isExperienceDisplayed).toBeTruthy()
    })
  })

  describe('experienceClosed', () => {
    it('returns consent if reason is setConsent', async () => {
      const ketch = new Ketch(webAPI, emptyConfig)
      await expect(ketch.experienceClosed(ExperienceClosedReason.SET_CONSENT)).resolves.toStrictEqual({
        purposes: {},
        vendors: [],
      })
      expect((ketch as any)._isExperienceDisplayed).toBeFalsy()
      expect((ketch as any)._hasExperienceBeenDisplayed).toBeTruthy()
    })

    it('returns dissented consent if reason is not setConsent and have optin purposes', async () => {
      const ketch = new Ketch(webAPI, {
        purposes: [
          {
            code: 'analytics',
            legalBasisCode: 'consent_optin',
            requiresOptIn: true,
          },
        ],
      } as Configuration)
      await expect(ketch.experienceClosed(ExperienceClosedReason.CLOSE)).resolves.toStrictEqual({
        purposes: {
          analytics: false,
        },
        vendors: [],
      })
      expect((ketch as any)._isExperienceDisplayed).toBeFalsy()
      expect((ketch as any)._hasExperienceBeenDisplayed).toBeTruthy()
    })

    it('does not override consent if reason is not setConsent and have optin purposes', async () => {
      const ketch = new Ketch(webAPI, {
        purposes: [
          {
            code: 'analytics',
            legalBasisCode: 'consent_optin',
            requiresOptIn: true,
          },
        ],
      } as Configuration)
      jest.spyOn(ketch, 'retrieveConsent').mockResolvedValue({
        purposes: {
          analytics: true,
        },
      })
      await expect(ketch.experienceClosed(ExperienceClosedReason.CLOSE)).resolves.toStrictEqual({
        purposes: {
          analytics: true,
        },
      })
      expect((ketch as any)._isExperienceDisplayed).toBeFalsy()
      expect((ketch as any)._hasExperienceBeenDisplayed).toBeTruthy()
    })
  })

  describe('showConsentExperience', () => {
    it('returns consent if no listener registered', async () => {
      const ketch = new Ketch(webAPI, emptyConfig)
      const retrieveConsentMock = jest.spyOn(ketch, 'retrieveConsent').mockResolvedValue({
        purposes: {
          analytics: true,
        },
      })
      await expect(ketch.showConsentExperience()).resolves.toStrictEqual({
        purposes: {
          analytics: true,
        },
      })
      expect(retrieveConsentMock).toHaveBeenCalled()
    })

    it('emits event if listener registered', async () => {
      const ketch = new Ketch(webAPI, emptyConfig)
      const retrieveConsentMock = jest.spyOn(ketch, 'retrieveConsent').mockResolvedValue({
        purposes: {
          analytics: true,
        },
      })
      const onShowConsentExperienceMock = jest.fn()
      const onWillShowExperienceMock = jest.fn()
      ketch.on(constants.WILL_SHOW_EXPERIENCE_EVENT, onWillShowExperienceMock)
      ketch.on(constants.SHOW_CONSENT_EXPERIENCE_EVENT, onShowConsentExperienceMock)
      ketch.on(constants.SHOW_CONSENT_EXPERIENCE_EVENT, onShowConsentExperienceMock)
      ketch.once(constants.SHOW_CONSENT_EXPERIENCE_EVENT, onShowConsentExperienceMock)
      expect(ketch.listenerCount(constants.SHOW_CONSENT_EXPERIENCE_EVENT)).toBe(1)
      await expect(ketch.showConsentExperience()).resolves.toStrictEqual({
        purposes: {
          analytics: true,
        },
      })
      expect(retrieveConsentMock).toHaveBeenCalled()
      expect(onShowConsentExperienceMock).toHaveBeenCalledWith(
        {
          purposes: {
            analytics: true,
          },
        },
        { displayHint: ketch.selectConsentExperience() },
      )
      expect(onWillShowExperienceMock).toHaveBeenCalled()
    })
  })

  describe('showPreferenceExperience', () => {
    it('returns consent if no preference experience', async () => {
      const ketch = new Ketch(webAPI, emptyConfig)
      jest.spyOn(ketch, 'getConsent').mockResolvedValue({
        purposes: {
          analytics: true,
        },
      } as Consent)
      const showPreferenceExperienceMock = jest.fn()
      const willShowExperienceMock = jest.fn()
      ketch.on(constants.SHOW_PREFERENCE_EXPERIENCE_EVENT, showPreferenceExperienceMock)
      ketch.on(constants.WILL_SHOW_EXPERIENCE_EVENT, willShowExperienceMock)
      await expect(ketch.showPreferenceExperience()).resolves.toStrictEqual({
        purposes: {
          analytics: true,
        },
      })
      expect(showPreferenceExperienceMock).not.toHaveBeenCalled()
      expect(willShowExperienceMock).not.toHaveBeenCalled()
    })

    it('returns consent if preference experience but no listener', async () => {
      const ketch = new Ketch(webAPI, {
        experiences: {
          preference: {
            code: 'prefexp',
            extensions: {},
            title: 'title',
            version: 123,
            overview: {
              tabName: 'overview',
              bodyDescription: 'desc',
            },
          },
        },
      } as Configuration)
      jest.spyOn(ketch, 'getConsent').mockResolvedValue({
        purposes: {
          analytics: true,
        },
      } as Consent)
      await expect(ketch.showPreferenceExperience()).resolves.toStrictEqual({
        purposes: {
          analytics: true,
        },
      })
    })

    it('returns consent if preference experience with listener', async () => {
      const ketch = new Ketch(webAPI, {
        experiences: {
          preference: {
            code: 'prefexp',
            extensions: {},
            title: 'title',
            version: 123,
            overview: {
              tabName: 'overview',
              bodyDescription: 'desc',
            },
          },
        },
      } as Configuration)
      jest.spyOn(ketch, 'getConsent').mockResolvedValue({
        purposes: {
          analytics: true,
        },
      } as Consent)
      const showPreferenceExperienceMock = jest.fn()
      const willShowExperienceMock = jest.fn()
      ketch.on(constants.SHOW_PREFERENCE_EXPERIENCE_EVENT, showPreferenceExperienceMock)
      ketch.on(constants.WILL_SHOW_EXPERIENCE_EVENT, willShowExperienceMock)
      await expect(ketch.showPreferenceExperience({})).resolves.toStrictEqual({
        purposes: {
          analytics: true,
        },
      })
      expect(willShowExperienceMock).toHaveBeenCalledWith(ExperienceType.Preference)
      expect(showPreferenceExperienceMock).toHaveBeenCalledWith(
        {
          purposes: {
            analytics: true,
          },
        },
        {},
      )
    })

    it('returns consent if preference experience with listener with tab override in querystring', async () => {
      const ketch = new Ketch(webAPI, {
        experiences: {
          preference: {
            code: 'prefexp',
            extensions: {},
            title: 'title',
            version: 123,
            overview: {
              tabName: 'overview',
              bodyDescription: 'desc',
            },
          },
        },
      } as Configuration)
      jest.spyOn(ketch, 'getConsent').mockResolvedValue({
        purposes: {
          analytics: true,
        },
      } as Consent)
      jest.spyOn(parameters, 'get').mockReturnValue(Tab.Rights)
      const showPreferenceExperienceMock = jest.fn()
      const willShowExperienceMock = jest.fn()
      ketch.on(constants.SHOW_PREFERENCE_EXPERIENCE_EVENT, showPreferenceExperienceMock)
      ketch.on(constants.WILL_SHOW_EXPERIENCE_EVENT, willShowExperienceMock)
      await expect(
        ketch.showPreferenceExperience({
          tab: Tab.Rights,
        }),
      ).resolves.toStrictEqual({
        purposes: {
          analytics: true,
        },
      })
      expect(willShowExperienceMock).toHaveBeenCalledWith(ExperienceType.Preference)
      expect(showPreferenceExperienceMock).toHaveBeenCalledWith(
        {
          purposes: {
            analytics: true,
          },
        },
        {
          tab: Tab.Rights,
        },
      )
    })
  })

  describe('onShowConsentExperience', () => {
    it('registers a handler', async () => {
      const ketch = new Ketch(webAPI, emptyConfig)
      const listener = jest.fn()
      await expect(ketch.onShowConsentExperience(listener)).resolves.toBeUndefined()
    })

    it('overwrites previous handlers', async () => {
      const ketch = new Ketch(webAPI, emptyConfig)
      const listener1 = jest.fn()
      await expect(ketch.onShowConsentExperience(listener1)).resolves.toBeUndefined()
      const listener2 = jest.fn()
      await expect(ketch.onShowConsentExperience(listener2)).resolves.toBeUndefined()
      expect(ketch.emit(constants.SHOW_CONSENT_EXPERIENCE_EVENT)).toBeTruthy()
      expect(listener1).not.toHaveBeenCalled()
      expect(listener2).toHaveBeenCalled()
    })
  })

  describe('onShowPreferenceExperience', () => {
    it('registers a handler', async () => {
      const ketch = new Ketch(webAPI, emptyConfig)
      const listener = jest.fn()
      await expect(ketch.onShowPreferenceExperience(listener)).resolves.toBeUndefined()
    })

    it('overwrites previous handlers', async () => {
      const ketch = new Ketch(webAPI, emptyConfig)
      const listener1 = jest.fn()
      await expect(ketch.onShowPreferenceExperience(listener1)).resolves.toBeUndefined()
      const listener2 = jest.fn()
      await expect(ketch.onShowPreferenceExperience(listener2)).resolves.toBeUndefined()
      expect(ketch.emit(constants.SHOW_PREFERENCE_EXPERIENCE_EVENT)).toBeTruthy()
      expect(listener1).not.toHaveBeenCalled()
      expect(listener2).toHaveBeenCalled()
    })
  })

  describe('hasConsent', () => {
    it('returns false if no consent', () => {
      const ketch = new Ketch(webAPI, emptyConfig)
      expect(ketch.hasConsent()).toBeFalsy()
    })

    it('returns true if consent', async () => {
      const ketch = new Ketch(webAPI, emptyConfig)
      await ketch.setConsent({
        purposes: {},
      })
      expect(ketch.hasConsent()).toBeTruthy()
    })
  })

  describe('changeConsent', () => {
    it('sets consent', async () => {
      const ketch = new Ketch(webAPI, emptyConfig)
      await ketch.changeConsent({
        purposes: {},
      })
    })
  })

  describe('setConsent', () => {})

  describe('setProvisionalConsent', () => {})

  describe('overrideWithProvisionalConsent', () => {})

  describe('getConsent', () => {})

  describe('retrieveConsent', () => {
    it('returns synthetic if not fulfilled', async () => {
      const ketch = new Ketch(webAPI, emptyConfig)
      return expect(ketch.retrieveConsent()).resolves.toStrictEqual({ purposes: {}, vendors: [] })
    })

    it('returns consent if set', async () => {
      const ketch = new Ketch(webAPI, emptyConfig)
      await ketch.setConsent({
        purposes: {
          analytics: true,
        },
      })
      return expect(ketch.retrieveConsent()).resolves.toStrictEqual({
        purposes: {
          analytics: true,
        },
      })
    })
  })

  describe('fetchConsent', () => {})

  describe('updateConsent', () => {})

  describe('setEnvironment/getEnvironment', () => {
    it('sets environment', async () => {
      const ketch = new Ketch(webAPI, emptyConfig)
      const env = { code: constants.PRODUCTION }
      await expect(ketch.setEnvironment(env)).resolves.toStrictEqual(env)
      return expect(ketch.getEnvironment()).resolves.toStrictEqual(env)
    })
  })

  describe('setGeoIP/getGeoIP', () => {
    it('sets geoip', async () => {
      const ketch = new Ketch(webAPI, emptyConfig)
      const ipInfo = {
        ip: '127.0.0.1',
      } as IPInfo
      await expect(ketch.setGeoIP(ipInfo)).resolves.toStrictEqual(ipInfo)
      return expect(ketch.getGeoIP()).resolves.toStrictEqual(ipInfo)
    })
  })

  describe('setIdentities/getIdentities', () => {
    it('sets identities', () => {})
  })

  describe('collectIdentities', () => {})

  describe('setJurisdiction/getJurisdiction', () => {
    it('sets jurisdiction', async () => {
      const ketch = new Ketch(webAPI, emptyConfig)
      const jurisdiction = 'gdpr'
      await expect(ketch.setJurisdiction(jurisdiction)).resolves.toBe(jurisdiction)
      return expect(ketch.getJurisdiction()).resolves.toBe(jurisdiction)
    })
  })

  describe('setRegionInfo/getRegionInfo', () => {
    it('sets regionInfo', async () => {
      const ketch = new Ketch(webAPI, emptyConfig)
      const regionInfo = 'US-Ca'
      await expect(ketch.setRegionInfo(regionInfo)).resolves.toBe(regionInfo)
      return expect(ketch.getRegionInfo()).resolves.toBe(regionInfo)
    })
  })

  describe('invokeRight', () => {
    it('returns if empty input', async () => {
      const ketch = new Ketch(webAPI, emptyConfig)
      await ketch.invokeRight({
        right: 'delete',
        subject: {
          email: '',
          firstName: '',
          lastName: '',
        },
      })
      expect(webAPIMock.invokeRight).not.toHaveBeenCalled()
    })
  })

  describe('emit', () => {
    afterEach(() => {
      delete (window as any)['webkit']
      delete (window as any)['androidListener']
    })

    it('returns false if no handlers', () => {
      const ketch = new Ketch(webAPI, emptyConfig)
      expect(ketch.emit(constants.CONSENT_EVENT)).toBeFalsy()
    })

    it('returns true if handlers', () => {
      const ketch = new Ketch(webAPI, emptyConfig)
      const listener = jest.fn()
      const eventName = 'unknown'
      ketch.on(eventName, listener)
      expect(ketch.emit(eventName, 'test')).toBeTruthy()
      expect(listener).toHaveBeenCalledWith('test')
    })

    it('calls Android handlers with no argument', () => {
      window.androidListener = {
        unknown: jest.fn(),
      }

      const ketch = new Ketch(webAPI, emptyConfig)
      const listener = jest.fn()
      const eventName = 'unknown'
      ketch.on(eventName, listener)
      expect(ketch.emit(eventName)).toBeTruthy()
      expect(listener).toHaveBeenCalledWith()
      expect(window.androidListener.unknown).toHaveBeenCalledWith()
    })

    it('calls Android handlers with one string argument', () => {
      window.androidListener = {
        unknown: jest.fn(),
      }

      const ketch = new Ketch(webAPI, emptyConfig)
      const listener = jest.fn()
      const eventName = 'unknown'
      ketch.on(eventName, listener)
      expect(ketch.emit(eventName, 'test')).toBeTruthy()
      expect(listener).toHaveBeenCalledWith('test')
      expect(window.androidListener.unknown).toHaveBeenCalledWith('test')
    })

    it('calls Android handlers filtering this', () => {
      window.androidListener = {
        unknown: jest.fn(),
      }

      const ketch = new Ketch(webAPI, emptyConfig)
      const listener = jest.fn()
      const eventName = 'unknown'
      ketch.on(eventName, listener)
      expect(ketch.emit(eventName, ketch, 'test')).toBeTruthy()
      expect(listener).toHaveBeenCalledWith(ketch, 'test')
      expect(window.androidListener.unknown).toHaveBeenCalledWith('test')
    })

    it('calls Android handlers with serialized arguments', () => {
      window.androidListener = {
        unknown: jest.fn(),
      }

      const ketch = new Ketch(webAPI, emptyConfig)
      const listener = jest.fn()
      const eventName = 'unknown'
      ketch.on(eventName, listener)
      expect(ketch.emit(eventName, 'test', 123)).toBeTruthy()
      expect(listener).toHaveBeenCalledWith('test', 123)
      expect(window.androidListener.unknown).toHaveBeenCalledWith(JSON.stringify(['test', 123]))
    })

    it('calls Android handlers with serialized single argument', () => {
      window.androidListener = {
        unknown: jest.fn(),
      }

      const ketch = new Ketch(webAPI, emptyConfig)
      const listener = jest.fn()
      const eventName = 'unknown'
      ketch.on(eventName, listener)
      expect(ketch.emit(eventName, 123)).toBeTruthy()
      expect(listener).toHaveBeenCalledWith(123)
      expect(window.androidListener.unknown).toHaveBeenCalledWith(JSON.stringify(123))
    })

    it('calls WebKit handlers with no arguments', () => {
      const postMessageMock = jest.fn()
      window.webkit = {
        messageHandlers: {
          unknown: {
            postMessage: postMessageMock,
          } as unknown as WKHandler,
        },
      }

      const ketch = new Ketch(webAPI, emptyConfig)
      const listener = jest.fn()
      const eventName = 'unknown'
      ketch.on(eventName, listener)
      expect(ketch.emit(eventName)).toBeTruthy()
      expect(listener).toHaveBeenCalledWith()
      expect(postMessageMock).toHaveBeenCalledWith(undefined)
    })

    it('calls WebKit handlers with single string argument', () => {
      const postMessageMock = jest.fn()
      window.webkit = {
        messageHandlers: {
          unknown: {
            postMessage: postMessageMock,
          } as unknown as WKHandler,
        },
      }

      const ketch = new Ketch(webAPI, emptyConfig)
      const listener = jest.fn()
      const eventName = 'unknown'
      ketch.on(eventName, listener)
      expect(ketch.emit(eventName, 'test')).toBeTruthy()
      expect(listener).toHaveBeenCalledWith('test')
      expect(postMessageMock).toHaveBeenCalledWith('test')
    })

    it('calls WebKit handlers with single non-string argument', () => {
      const postMessageMock = jest.fn()
      window.webkit = {
        messageHandlers: {
          unknown: {
            postMessage: postMessageMock,
          } as unknown as WKHandler,
        },
      }

      const ketch = new Ketch(webAPI, emptyConfig)
      const listener = jest.fn()
      const eventName = 'unknown'
      ketch.on(eventName, listener)
      expect(
        ketch.emit(eventName, {
          purposes: {
            analytics: true,
          },
        }),
      ).toBeTruthy()
      expect(listener).toHaveBeenCalledWith({
        purposes: {
          analytics: true,
        },
      })
      expect(postMessageMock).toHaveBeenCalledWith('{"purposes":{"analytics":true}}')
    })

    it('calls WebKit handlers with multiple arguments', () => {
      const postMessageMock = jest.fn()
      window.webkit = {
        messageHandlers: {
          unknown: {
            postMessage: postMessageMock,
          } as unknown as WKHandler,
        },
      }

      const ketch = new Ketch(webAPI, emptyConfig)
      const listener = jest.fn()
      const eventName = 'unknown'
      ketch.on(eventName, listener)
      expect(
        ketch.emit(eventName, 'test', {
          purposes: {
            analytics: true,
          },
        }),
      ).toBeTruthy()
      expect(listener).toHaveBeenCalledWith('test', {
        purposes: {
          analytics: true,
        },
      })
      expect(postMessageMock).toHaveBeenCalledWith(
        JSON.stringify([
          'test',
          {
            purposes: {
              analytics: true,
            },
          },
        ]),
      )
    })
  })

  describe('addListener/on', () => {
    it('registers a normal listener', () => {
      const ketch = new Ketch(webAPI, emptyConfig)
      const eventName = 'unknown'
      const listener = jest.fn()
      ketch.addListener(eventName, listener)
      expect(ketch.emit(eventName)).toBeTruthy()
      expect(ketch.emit(eventName)).toBeTruthy()
      expect(listener).toHaveBeenCalledTimes(2)
    })

    it('removes a future listener', () => {
      const ketch = new Ketch(webAPI, emptyConfig)
      const eventName = constants.CONSENT_EVENT
      const listener = jest.fn()
      ketch.on(eventName, listener)
      expect(ketch.setConsent({ purposes: { analytics: true } })).toBeTruthy()
      expect(ketch.setConsent({ purposes: { analytics: false } })).toBeTruthy()
      expect(listener).toHaveBeenCalledTimes(2)
    })
  })

  describe('once', () => {
    it('registers a normal listener that is only called once', () => {
      const ketch = new Ketch(webAPI, emptyConfig)
      const eventName = 'unknown'
      const listener = jest.fn()
      ketch.once(eventName, listener)
      expect(ketch.emit(eventName)).toBeTruthy()
      expect(ketch.emit(eventName)).toBeFalsy()
      expect(listener).toHaveBeenCalledTimes(1)
    })

    it('registers a future listener that is only called once', async () => {
      const ketch = new Ketch(webAPI, emptyConfig)
      const eventName = constants.CONSENT_EVENT
      const listener = jest.fn()
      ketch.once(eventName, listener)
      await ketch.setConsent({ purposes: { analytics: true } })
      await ketch.setConsent({ purposes: { analytics: false } })
      expect(listener).toHaveBeenCalledTimes(1)
    })
  })

  describe('off/removeListener', () => {
    it('removes a normal listener', () => {
      const ketch = new Ketch(webAPI, emptyConfig)
      const eventName = 'unknown'
      const listener = jest.fn()
      ketch.on(eventName, listener)
      ketch.off(eventName, listener)
      expect(ketch.emit(eventName)).toBeFalsy()
      expect(ketch.emit(eventName)).toBeFalsy()
      expect(listener).toHaveBeenCalledTimes(0)
    })

    it('removes a future listener', async () => {
      const ketch = new Ketch(webAPI, emptyConfig)
      const eventName = constants.CONSENT_EVENT
      const listener = jest.fn()
      ketch.addListener(eventName, listener)
      ketch.removeListener(eventName, listener)
      await ketch.setConsent({ purposes: { analytics: true } })
      await ketch.setConsent({ purposes: { analytics: false } })
      expect(listener).toHaveBeenCalledTimes(0)
    })
  })
})