import { Configuration, GetLocationResponse, IPInfo } from '@ketch-sdk/ketch-types'
import errors from './errors'
import parameters from './parameters'
import constants from './constants'
import Builder from './Builder'
import fetchMock from 'jest-fetch-mock'
import { KetchWebAPI } from '@ketch-sdk/ketch-web-api'
import getApiUrl from './getApiUrl'
import { Ketch } from './Ketch'

jest.mock('./parameters')

const prod = {
  code: constants.PRODUCTION,
  deploymentID: 'khGIVjDxxvy7dPN4lmAtV3',
  hash: '1392568836159292875',
}

const dev = {
  code: 'dev',
  deploymentID: 'khGIVjDxxvy7dPN4lmAtV3',
  hash: '1392568836159292875',
  pattern: 'bG9jYWxob3N0', // localhost
}

const devShort = {
  code: 'devShort',
  deploymentID: 'khGIVjDxxvy7dPN4lmAtV3',
  hash: '1392568836159292875',
  pattern: 'b2NhbGhvc3Q=', // ocalhost
}

const test = {
  code: 'test',
  deploymentID: 'khGIVjDxxvy7dPN4lmAtV3',
  hash: '1392568836159292875',
  pattern: 'dGVzdA==', // test
}

describe('builder', () => {
  beforeEach(() => {
    // Clear all mocks before each test to reset the state
    jest.clearAllMocks()
    fetchMock.resetMocks()
  })

  const mockParametersGet = jest.mocked(parameters.get)

  describe('build', () => {
    const ip: GetLocationResponse = {
      // @ts-ignore
      location: {
        ip: '1.2.3.5',
        countryCode: 'US',
      },
    } as GetLocationResponse

    beforeEach(() => {
      fetchMock.mockResponseOnce(async (): Promise<string> => JSON.stringify(ip))
    })

    let originalLocation: Location
    beforeEach(() => {
      originalLocation = window.location
    })
    afterEach(() => {
      window.location = originalLocation
    })

    it('rejects on empty configuration', () => {
      const ketch = new Builder({} as Configuration)
      return expect(ketch.build()).rejects.toBe(errors.invalidConfigurationError)
    })

    it('resolves on full configuration using default language', async () => {
      const config = {
        organization: {
          code: 'axonic',
        },
        property: {
          code: 'axonic',
        },
        environment: {
          code: constants.PRODUCTION,
        },
        jurisdiction: {
          code: 'gdpr',
        },
      } as Configuration
      jest.spyOn(window.navigator, 'language', 'get').mockReturnValue('')
      const builder = new Builder(config)
      config.language = 'en'
      fetchMock.mockResponseOnce(async (): Promise<string> => JSON.stringify(config))
      const ketch = await builder.build()
      expect(ketch).toBeTruthy()
      await expect(ketch.getConfig()).resolves.toBe(config)
      await expect(ketch.getEnvironment()).resolves.toBe(config.environment)
      await expect(ketch.getJurisdiction()).resolves.toBe(config.jurisdiction?.code)
    })

    it('resolves on full configuration using config language', async () => {
      const config = {
        language: 'es',
        organization: {
          code: 'axonic',
        },
        property: {
          code: 'axonic',
        },
        environment: {
          code: constants.PRODUCTION,
        },
        jurisdiction: {
          code: 'gdpr',
        },
      } as Configuration
      jest.spyOn(window.navigator, 'language', 'get').mockReturnValue('')
      const builder = new Builder(config)
      const ketch = await builder.build()
      expect(ketch).toBeTruthy()
      await expect(ketch.getConfig()).resolves.toBe(config)
      await expect(ketch.getEnvironment()).resolves.toBe(config.environment)
      await expect(ketch.getJurisdiction()).resolves.toBe(config.jurisdiction?.code)
    })

    it('resolves on full configuration using browser language', async () => {
      const config = {
        language: 'zh',
        organization: {
          code: 'axonic',
        },
        property: {
          code: 'axonic',
        },
        environment: {
          code: constants.PRODUCTION,
        },
        jurisdiction: {
          code: 'gdpr',
        },
      } as Configuration
      jest.spyOn(window.navigator, 'language', 'get').mockReturnValue('zh')
      const builder = new Builder(config)
      const ketch = await builder.build()
      expect(ketch).toBeTruthy()
      await expect(ketch.getConfig()).resolves.toBe(config)
      await expect(ketch.getEnvironment()).resolves.toBe(config.environment)
      await expect(ketch.getJurisdiction()).resolves.toBe(config.jurisdiction?.code)
    })

    it('resolves on full configuration using lang in query string', async () => {
      const config = {
        organization: {
          code: 'axonic',
        },
        property: {
          code: 'axonic',
        },
        environment: {
          code: constants.PRODUCTION,
        },
        jurisdiction: {
          code: 'gdpr',
        },
      } as Configuration
      Object.assign(window.location, new URL('https://localhost/?lang=jjj'))
      const builder = new Builder(config)
      const fullConfig = {
        organization: config.organization,
        property: config.property,
        environment: config.environment,
        jurisdiction: config.jurisdiction,
        language: 'jj',
      }
      fetchMock.mockResponseOnce(async (): Promise<string> => JSON.stringify(fullConfig))
      const ketch = await builder.build()
      expect(ketch).toBeTruthy()
      await expect(ketch.getConfig()).resolves.toStrictEqual(fullConfig)
      await expect(ketch.getEnvironment()).resolves.toBe(fullConfig.environment)
      await expect(ketch.getJurisdiction()).resolves.toBe(fullConfig.jurisdiction?.code)
    })

    it('resolves on full configuration using ketch_lang in query string', async () => {
      const config = {
        organization: {
          code: 'axonic',
        },
        property: {
          code: 'axonic',
        },
        environment: {
          code: constants.PRODUCTION,
        },
        jurisdiction: {
          code: 'gdpr',
        },
      } as Configuration
      Object.assign(window.location, new URL('https://localhost/?ketch_lang=jj'))
      const builder = new Builder(config)
      const fullConfig = {
        organization: config.organization,
        property: config.property,
        environment: config.environment,
        jurisdiction: config.jurisdiction,
        language: 'jj',
      }
      fetchMock.mockResponseOnce(async (): Promise<string> => JSON.stringify(fullConfig))
      const ketch = await builder.build()
      expect(ketch).toBeTruthy()
      await expect(ketch.getConfig()).resolves.toStrictEqual(fullConfig)
      await expect(ketch.getEnvironment()).resolves.toBe(fullConfig.environment)
      await expect(ketch.getJurisdiction()).resolves.toBe(fullConfig.jurisdiction?.code)
    })

    it('resolves on full configuration using html lang', async () => {
      const config = {
        organization: {
          code: 'axonic',
        },
        property: {
          code: 'axonic',
        },
        environment: {
          code: constants.PRODUCTION,
        },
        jurisdiction: {
          code: 'gdpr',
        },
      } as Configuration
      jest.spyOn(document.documentElement, 'lang', 'get').mockReturnValue('jj')
      const builder = new Builder(config)
      const fullConfig = {
        organization: config.organization,
        property: config.property,
        environment: config.environment,
        jurisdiction: config.jurisdiction,
        language: 'jj',
      }
      fetchMock.mockResponseOnce(async (): Promise<string> => JSON.stringify(fullConfig))
      const ketch = await builder.build()
      expect(ketch).toBeTruthy()
      await expect(ketch.getConfig()).resolves.toStrictEqual(fullConfig)
      await expect(ketch.getEnvironment()).resolves.toBe(fullConfig.environment)
      await expect(ketch.getJurisdiction()).resolves.toBe(fullConfig.jurisdiction?.code)
    })

    /*
        const env = await this.buildEnvironment()
        const ipInfo = await this.buildGeoIP()
        const region = await this.buildRegionInfo(ipInfo)
        const jurisdiction = await this.buildJurisdiction(region)

        log.info('loadConfig', env, jurisdiction, language)

        const request: GetFullConfigurationRequest = {
          organizationCode: this._config.organization.code,
          propertyCode: this._config.property?.code || '',
          environmentCode: env.code,
          hash: env.hash || '',
          languageCode: language,
          jurisdictionCode: jurisdiction,
        }

        const cfg = await this._api.getFullConfiguration(request)

        const k = new Ketch(this._api, cfg)

        await k.setEnvironment(env)
        await k.setGeoIP(ipInfo)
        await k.setRegionInfo(region)
        await k.setJurisdiction(jurisdiction)

        return k
     */
  })

  describe('buildRegionInfo', () => {
    it('resolves to US on invalid IPInfo', async () => {
      const ketch = new Builder({} as Configuration)
      return expect(ketch.buildRegionInfo({} as IPInfo)).resolves.toBe('US')
    })

    it('resolves to US on missing country_code', async () => {
      const ketch = new Builder({} as Configuration)

      return expect(
        ketch.buildRegionInfo({
          ip: '10.11.12.13',
        } as IPInfo),
      ).resolves.toBe('US')
    })

    it('resolves a non-US country_code with a region', async () => {
      const ketch = new Builder({} as Configuration)

      return expect(
        ketch.buildRegionInfo({
          ip: '10.11.12.13',
          countryCode: 'UK',
          regionCode: 'CA',
        } as IPInfo),
      ).resolves.toBe('UK')
    })

    it('resolves no region', async () => {
      const ketch = new Builder({} as Configuration)

      return expect(
        ketch.buildRegionInfo({
          ip: '10.11.12.13',
          countryCode: 'AU',
        } as IPInfo),
      ).resolves.toBe('AU')
    })

    it('resolves sub region', async () => {
      const ketch = new Builder({} as Configuration)

      return expect(
        ketch.buildRegionInfo({
          ip: '10.11.12.13',
          countryCode: 'US',
          regionCode: 'CA',
        } as IPInfo),
      ).resolves.toBe('US-CA')
    })

    it('resolves Canadian sub regions', async () => {
      const ketch = new Builder({} as Configuration)

      return expect(
        ketch.buildRegionInfo({
          ip: '10.11.12.13',
          countryCode: 'CA',
          regionCode: 'QC',
        } as IPInfo),
      ).resolves.toBe('CA-QC')
    })

    it('resolves query param country', async () => {
      // Spy on and mock the 'get' method
      jest.spyOn(parameters, 'get').mockImplementation(key => (key === constants.REGION ? 'FR' : ''))
      const config = {
        organization: {
          code: 'axonic',
        },
        property: {
          code: 'axonic',
        },
        environment: {
          code: constants.PRODUCTION,
        },
        jurisdiction: {
          code: 'default',
        },
      } as Configuration
      const builder = new Builder(config)

      fetchMock.mockResponseOnce(async (): Promise<string> => JSON.stringify(config))
      const ketch = await builder.build()

      expect(ketch).toBeTruthy()
      await expect(ketch.getConfig()).resolves.toStrictEqual(config)
      await expect(ketch.getRegionInfo()).resolves.toBe('FR')
      jest.spyOn(parameters, 'get').mockRestore()
    })

    it('resolves no query param', async () => {
      const config = {
        organization: {
          code: 'axonic',
        },
        property: {
          code: 'axonic',
        },
        environment: {
          code: constants.PRODUCTION,
        },
        jurisdiction: {
          code: 'default',
        },
      } as Configuration
      const builder = new Builder(config)
      const ip: GetLocationResponse = {
        // @ts-ignore
        location: {
          ip: '1.2.3.5',
          countryCode: 'BR',
        },
      } as GetLocationResponse
      fetchMock.mockResponses(async (): Promise<string> => JSON.stringify(ip))
      fetchMock.mockResponseOnce(async (): Promise<string> => JSON.stringify(config))
      const ketch = await builder.build()

      expect(ketch).toBeTruthy()
      await expect(ketch.getRegionInfo()).resolves.toBe('BR')
    })
  })

  describe('buildGeoIP', () => {
    it('resolves the location information', async () => {
      const ip: GetLocationResponse = {
        // @ts-ignore
        location: {
          ip: '1.2.3.5',
        },
      } as GetLocationResponse
      fetchMock.mockResponseOnce(async (): Promise<string> => JSON.stringify(ip))

      const ketch = new Builder({} as Configuration)

      return expect(ketch.buildGeoIP()).resolves.toEqual({
        ip: '1.2.3.5',
      })
    })

    it('rejects on invalid geoip', async () => {
      fetchMock.mockResponseOnce(async (): Promise<string> => JSON.stringify({}))

      const ketch = new Builder({} as Configuration)

      return expect(ketch.buildGeoIP()).rejects.toEqual(errors.unrecognizedLocationError)
    })
  })

  describe('buildJurisdiction', () => {
    beforeEach(jest.resetAllMocks)

    it('resolves jurisdiction with code', async () => {
      const ketch = new Builder({
        jurisdiction: {
          code: 'gdpr',
        },
      } as Configuration)

      return expect(ketch.buildJurisdiction('US')).resolves.toBe('gdpr')
    })

    it('resolves setting jurisdiction on query', async () => {
      const ketch = new Builder({} as Configuration)

      mockParametersGet.mockImplementationOnce(key => {
        if (key === constants.JURISDICTION) return 'FOO'
        return ''
      })

      return expect(ketch.buildJurisdiction('US')).resolves.toBe('FOO')
    })

    it('rejects on empty regionInfo', async () => {
      const ketch = new Builder({} as Configuration)

      return expect(ketch.buildJurisdiction('')).rejects.toBe(errors.noJurisdictionError)
    })

    it('rejects on empty jurisdiction', async () => {
      const ketch = new Builder({} as Configuration)

      return expect(ketch.buildJurisdiction('US')).rejects.toBe(errors.noJurisdictionError)
    })

    it('resolves from dataLayer', async () => {
      const ketch = new Builder({
        jurisdiction: {
          variable: 'foobar',
        },
      } as Configuration)

      window.dataLayer = []
      window.dataLayer.push({
        foobar: 'ccpa',
      })

      return expect(ketch.buildJurisdiction('GB')).resolves.toBe('ccpa')
    })

    it('resolves from document attribute', async () => {
      const ketch = new Builder({
        jurisdiction: {},
      } as Configuration)

      jest.spyOn(document.documentElement, 'getAttribute').mockReturnValue('ccpa')

      return expect(ketch.buildJurisdiction('GB')).resolves.toBe('ccpa')
    })

    it('resoles specified jurisdiction', async () => {
      const ketch = new Builder({
        jurisdiction: {
          defaultJurisdictionCode: 'default',
          jurisdictions: {
            'US-CA': 'ccpa',
            UK: 'gdpr',
          },
        },
      } as any as Configuration)

      return expect(ketch.buildJurisdiction('US-CA')).resolves.toBe('ccpa')
    })

    it('resolves defaults jurisdiction if not found', async () => {
      const ketch = new Builder({
        jurisdiction: {
          defaultJurisdictionCode: 'default',
          jurisdictions: {
            'US-CA': 'ccpa',
            UK: 'gdpr',
          },
        },
      } as any as Configuration)

      return expect(ketch.buildJurisdiction('NA')).resolves.toBe('default')
    })

    it('rejects on no jurisdiction', async () => {
      const ketch = new Builder({
        jurisdiction: {
          defaultJurisdictionCode: '',
          jurisdictions: {
            'US-CA': 'ccpa',
            UK: 'gdpr',
          },
        },
      } as any as Configuration)

      return expect(ketch.buildJurisdiction('')).rejects.toEqual(errors.noJurisdictionError)
    })
  })

  describe('formatLanguage', () => {
    const config: Configuration = {
      organization: {
        code: '',
      },
      environment: test,
      formTemplates: [],
    }

    it('formats fr-CA to fr-CA', () => {
      expect(new Builder(config).formatLanguage('fr-CA')).toEqual('fr-CA')
    })

    it('formats fr-ca to fr-CA', () => {
      expect(new Builder(config).formatLanguage('fr-ca')).toEqual('fr-CA')
    })

    it('formats fr to fr', () => {
      expect(new Builder(config).formatLanguage('fr')).toEqual('fr')
    })
  })

  describe('buildEnvironment', () => {
    it('resolves environment', () => {
      const config: Configuration = {
        organization: {
          code: '',
        },
        environment: test,
        formTemplates: [],
      }
      const ketch = new Builder(config)

      const env = ketch.buildEnvironment()
      return expect(env).resolves.toBe(test)
    })

    it('rejects if no environments', () => {
      const config: Configuration = {
        organization: {
          code: '',
        },
        environments: [],
        formTemplates: [],
      }
      const ketch = new Builder(config)

      const env = ketch.buildEnvironment()
      return expect(env).rejects.toBe(errors.noEnvironmentError)
    })

    it('resolves dev because it matches href', () => {
      const config: Configuration = {
        organization: {
          code: '',
        },
        environments: [prod, dev, test],
        formTemplates: [],
      }
      const ketch = new Builder(config)

      const env = ketch.buildEnvironment()
      return expect(env).resolves.toBe(dev)
    })

    it('resolves longer match', () => {
      const config: Configuration = {
        organization: {
          code: '',
        },
        environments: [devShort, dev],
        formTemplates: [],
      }
      const builder = new Builder(config)

      const env = builder.buildEnvironment()
      return expect(env).resolves.toBe(dev)
    })

    it('resolves selection of environment via query', () => {
      const config: Configuration = {
        organization: {
          code: '',
        },
        environments: [prod, dev, test],
        formTemplates: [],
      }

      mockParametersGet.mockImplementationOnce(key => {
        if (key === constants.ENV) return 'test'
        return ''
      })

      const builder = new Builder(config)
      const env = builder.buildEnvironment()
      return expect(env).resolves.toBe(test)
    })

    it('rejects if environment via query not found', () => {
      const config: Configuration = {
        organization: {
          code: '',
        },
        environments: [prod, dev, test],
        formTemplates: [],
      }

      mockParametersGet.mockImplementationOnce(key => {
        if (key === constants.ENV) return 'test1'
        return ''
      })

      const builder = new Builder(config)
      const env = builder.buildEnvironment()
      return expect(env).rejects.toBe(errors.noEnvironmentError)
    })

    it('resolves production by default', () => {
      const config: Configuration = {
        organization: {
          code: '',
        },
        environments: [prod, test],
        formTemplates: [],
      }

      const builder = new Builder(config)
      const env = builder.buildEnvironment()
      return expect(env).resolves.toBe(prod)
    })

    it('rejects if production not defined', () => {
      const config: Configuration = {
        organization: {
          code: '',
        },
        environments: [test],
        formTemplates: [],
      }

      const builder = new Builder(config)
      const env = builder.buildEnvironment()
      return expect(env).rejects.toBe(errors.noEnvironmentError)
    })
  })

  describe('buildTelemetry', () => {
    it('skips telemetry setup if service is not provided', async () => {
      const config: Configuration = {
        formTemplates: [],
        organization: {
          code: 'blah',
        },
        environment: {
          code: 'production',
        },
        services: {
          shoreline: 'https://shoreline.ketch.com',
        },
        options: {
          beaconPercentage: '1',
        },
      }
      const builder = new Builder(config)
      const api = new KetchWebAPI(getApiUrl(config))
      const ketch = new Ketch(api, config)

      const resp = await builder.setupTelemetry(ketch, config, { region: 'US' })
      expect(resp).toBeFalsy()
    })
    it('skips telemetry setup if service is empty', async () => {
      const config: Configuration = {
        formTemplates: [],
        organization: {
          code: 'blah',
        },
        environment: {
          code: 'production',
        },
        services: {
          shoreline: 'https://shoreline.ketch.com',
          telemetry: '',
        },
        options: {
          beaconPercentage: '1',
        },
      }
      const builder = new Builder(config)
      const api = new KetchWebAPI(getApiUrl(config))
      const ketch = new Ketch(api, config)

      const resp = await builder.setupTelemetry(ketch, config, { region: 'US' })
      expect(resp).toBeFalsy()
    })
    it('fires telemetry beacon once identity and on visibility hidden', async () => {
      const config: Configuration = {
        formTemplates: [],
        organization: {
          code: 'blah',
        },
        services: {
          shoreline: 'https://shoreline.ketch.com',
          telemetry: 'https://shoreline.ketch.com',
        },
        property: {
          code: 'myProp',
        },
        environment: {
          code: 'myEnv',
        },
        jurisdiction: {
          code: 'myJurisdiction',
        },
        deployment: {
          code: 'myDeployCode',
          version: 12334,
        },
        options: {
          beaconPercentage: '1',
        },
      }
      // Set up the builder and mock sendBeacon
      const builder = new Builder(config)
      const api = new KetchWebAPI(getApiUrl(config))
      const ketch = new Ketch(api, config)

      navigator.sendBeacon = jest.fn()

      await builder.setupTelemetry(ketch, config, { region: 'US' })

      await ketch.setIdentities({ userId: 'user123' })
      await ketch.setIdentities({ userId: 'user123', clientId: 'client123' })
      await ketch.setIdentities({ userId: 'user123', clientId: 'client123', foo: 'bar' })

      // Mock the document.visibilityState to simulate the change
      Object.defineProperty(document, 'visibilityState', {
        configurable: true,
        get: () => 'hidden',
      })

      // Dispatch the visibilitychange event
      document.dispatchEvent(new Event('visibilitychange'))

      // Assert that sendBeacon was called with the correct telemetry data for identities
      expect(navigator.sendBeacon).toHaveBeenNthCalledWith(
        1,
        expect.stringContaining(
          // eslint-disable-next-line max-len
          'https://shoreline.ketch.com?hasConsent=false&url=https%3A%2F%2Flocalhost.localdomain%2Findex.html&property=myProp&environment=myEnv&jurisdiction=myJurisdiction&tenant=blah&dver=12334&event_type=once_identities&ids=eyJ1c2VySWQiOiJ1c2VyMTIzIn0%3D&region=US',
        ),
      )

      // Assert that sendBeacon was called with the correct telemetry data for visibility change
      expect(navigator.sendBeacon).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining(
          // eslint-disable-next-line max-len
          'https://shoreline.ketch.com?hasConsent=false&url=https%3A%2F%2Flocalhost.localdomain%2Findex.html&property=myProp&environment=myEnv&jurisdiction=myJurisdiction&tenant=blah&dver=12334&event_type=visibility_hidden&ids=eyJ1c2VySWQiOiJ1c2VyMTIzIiwiY2xpZW50SWQiOiJjbGllbnQxMjMiLCJmb28iOiJiYXIifQ%3D%3D&region=US',
        ),
      )

      // Ensure sendBeacon was called exactly twice
      expect(navigator.sendBeacon).toHaveBeenCalledTimes(2)
    })
    it('sets up telemetry if service is present', async () => {
      const config: Configuration = {
        formTemplates: [],
        organization: {
          code: 'blah',
        },
        environment: {
          code: 'production',
        },
        services: {
          shoreline: 'https://shoreline.ketch.com',
          telemetry: 'https://shoreline.ketch.com',
        },
        options: {
          beaconPercentage: '1',
        },
      }
      const builder = new Builder(config)
      const api = new KetchWebAPI(getApiUrl(config))
      const ketch = new Ketch(api, config)

      navigator.sendBeacon = jest.fn()

      const resp = await builder.setupTelemetry(ketch, config, { region: 'US' })
      expect(resp).toBeTruthy()
    })
  })
})
