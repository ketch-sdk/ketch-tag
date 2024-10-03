import Router from './Router'
import { Ketch } from './Ketch'
import { KetchWebAPI } from '@ketch-sdk/ketch-web-api'
import { Configuration } from '@ketch-sdk/ketch-types'
import errors from './errors'
import constants from './constants'
import InternalRouter from './InternalRouter'

describe('Router', () => {
  const ketch = new Ketch(new KetchWebAPI(''), {} as Configuration)

  describe('push', () => {
    it('returns immediately if given undefined', () => {
      const router = new Router(ketch)
      const entrypoint = jest.spyOn(router, 'route')
      router.push(undefined)
      expect(entrypoint).not.toHaveBeenCalled()
    })

    it('calls entrypoint from string', () => {
      const router = new Router(ketch)
      const entrypoint = jest.spyOn(router, 'route')
      router.push('getConfig')
      expect(entrypoint).toHaveBeenCalledWith('getConfig')
    })

    it('calls entrypoint from array length 1', () => {
      const router = new Router(ketch)
      const entrypoint = jest.spyOn(router, 'route')
      router.push(['getConfig'])
      expect(entrypoint).toHaveBeenCalledWith('getConfig')
    })

    it('calls entrypoint from array length 2', () => {
      const router = new Router(ketch)
      const entrypoint = jest.spyOn(router, 'route')
      router.push(['setRegionInfo', 'arg1'])
      expect(entrypoint).toHaveBeenCalledWith('setRegionInfo', 'arg1')
    })

    it('calls entrypoint from arguments', () => {
      const router = new Router(ketch)
      const entrypoint = jest.spyOn(router, 'route')

      function p() {
        router.push(arguments) //eslint-disable-line
      }

      const f = p as any
      f('setRegionInfo', 'arg1')
      expect(entrypoint).toHaveBeenCalledWith('setRegionInfo', 'arg1')
    })

    it('handles a Promise', () => {
      const router = new Router(ketch)
      const entrypoint = jest.spyOn(router, 'route')
      router.push(['setRegionInfo', 'arg1'])
      expect(entrypoint).toHaveBeenCalledWith('setRegionInfo', 'arg1')
    })

    it('handles a Promise that rejects', () => {
      jest.spyOn(global.console, 'log').mockImplementation(() => {})
      const router = new Router(ketch)
      const entrypoint = jest.spyOn(router, 'route').mockRejectedValue('oops')
      router.push(['setRegionInfo', 'arg1'])
      expect(entrypoint).toHaveBeenCalledWith('setRegionInfo', 'arg1')
    })
  })

  describe('route', () => {
    it('rejects on push', () => {
      const router = new Router(ketch)
      return expect(router.route('push')).rejects.toEqual(errors.actionNotFoundError('push'))
    })

    it('rejects on route', () => {
      const router = new Router(ketch)
      return expect(router.route('route')).rejects.toEqual(errors.actionNotFoundError('route'))
    })

    it('rejects on unknown', () => {
      const router = new Router(ketch)
      return expect(router.route('unknown')).rejects.toEqual(errors.actionNotFoundError('unknown'))
    })

    it('resolves on getConfig', () => {
      const router = new Router(ketch)
      return expect(router.route('getConfig')).resolves.toEqual({})
    })

    it('rejects on bad resolve argument', async () => {
      const router = new Router(ketch)
      await expect(router.route('getConfig', 'foo')).rejects.toEqual(errors.expectedFunctionError('getConfig'))
      const reject = jest.fn().mockImplementation(() => 'foo')
      await expect(router.route('getConfig', 'foo', reject)).rejects.toEqual(errors.expectedFunctionError('getConfig'))
    })

    it('takes callback for promise resolve', async () => {
      const router = new Router(ketch)
      const resolve = jest.fn().mockImplementation(() => 'foo')
      expect(await router.route('getConfig', resolve)).toBe('foo')
      expect(resolve).toHaveBeenCalled()
    })

    it('rejects on bad reject argument', () => {
      const router = new Router(ketch)
      const resolve = jest.fn().mockImplementation(() => 'foo')
      return expect(router.route('getConfig', resolve, 'foo')).rejects.toEqual(
        errors.expectedFunctionError('getConfig'),
      )
    })

    it('takes callback for promise reject', async () => {
      jest.spyOn(global.console, 'log').mockImplementation(() => {})
      const router = new Router(ketch)
      const mockGetConfig = jest.spyOn(router, 'getConfig').mockRejectedValue('oops')
      const resolve = jest.fn().mockImplementation(() => 'foo')
      const reject = jest.fn().mockImplementation(() => 'bar')
      expect(await router.route('getConfig', resolve, reject)).toBe('bar')
      expect(resolve).not.toHaveBeenCalled()
      expect(reject).toHaveBeenCalled()
      expect(mockGetConfig).toHaveBeenCalled()
    })

    it('calls getConsent', async () => {
      const getConsent = jest.fn().mockResolvedValue({})
      const router = new Router({
        getConsent,
      } as any as Ketch)
      await router.route('getConsent')
      return expect(getConsent).toHaveBeenCalled()
    })

    it('calls getEnvironment', async () => {
      const getEnvironment = jest.fn().mockResolvedValue({})
      const router = new Router({
        getEnvironment,
      } as any as Ketch)
      await router.route('getEnvironment')
      return expect(getEnvironment).toHaveBeenCalled()
    })

    it('calls getGeoIP', async () => {
      const getGeoIP = jest.fn().mockResolvedValue({})
      const router = new Router({
        getGeoIP,
      } as any as Ketch)
      await router.route('getGeoIP')
      return expect(getGeoIP).toHaveBeenCalled()
    })

    it('calls getIdentities', async () => {
      const getIdentities = jest.fn().mockResolvedValue({})
      const router = new Router({
        getIdentities,
      } as any as Ketch)
      await router.route('getIdentities')
      return expect(getIdentities).toHaveBeenCalled()
    })

    it('calls getJurisdiction', async () => {
      const getJurisdiction = jest.fn().mockResolvedValue(undefined)
      const router = new Router({
        getJurisdiction,
      } as any as Ketch)
      await router.route('getJurisdiction')
      return expect(getJurisdiction).toHaveBeenCalled()
    })

    it('calls getRegionInfo', async () => {
      const getRegionInfo = jest.fn().mockResolvedValue(undefined)
      const router = new Router({
        getRegionInfo,
      } as any as Ketch)
      await router.route('getRegionInfo')
      return expect(getRegionInfo).toHaveBeenCalled()
    })

    it('calls getFullConfig', async () => {
      const getFullConfig = jest.fn().mockResolvedValue({})
      const router = new Router({
        getFullConfig,
      } as any as Ketch)
      await router.route('getFullConfig')
      return expect(getFullConfig).toHaveBeenCalled()
    })

    it('calls onConsent', async () => {
      const on = jest.fn().mockResolvedValue(undefined)
      const router = new Router({
        on,
      } as any as Ketch)
      await router.route('onConsent')
      return expect(on).toHaveBeenCalledWith(constants.CONSENT_EVENT, undefined)
    })

    it('calls onEnvironment', async () => {
      const on = jest.fn().mockResolvedValue(undefined)
      const router = new Router({
        on,
      } as any as Ketch)
      await router.route('onEnvironment')
      return expect(on).toHaveBeenCalledWith(constants.ENVIRONMENT_EVENT, undefined)
    })

    it('calls onGeoIP', async () => {
      const on = jest.fn().mockResolvedValue(undefined)
      const router = new Router({
        on,
      } as any as Ketch)
      await router.route('onGeoIP')
      return expect(on).toHaveBeenCalledWith(constants.GEOIP_EVENT, undefined)
    })

    it('calls onHideExperience', async () => {
      const on = jest.fn().mockResolvedValue(undefined)
      const router = new Router({
        on,
      } as any as Ketch)
      await router.route('onHideExperience')
      return expect(on).toHaveBeenCalledWith(constants.HIDE_EXPERIENCE_EVENT, undefined)
    })

    it('calls onWillShowExperience', async () => {
      const on = jest.fn().mockResolvedValue(undefined)
      const router = new Router({
        on,
      } as any as Ketch)
      await router.route('onWillShowExperience')
      return expect(on).toHaveBeenCalledWith(constants.WILL_SHOW_EXPERIENCE_EVENT, undefined)
    })

    it('calls onIdentities', async () => {
      const on = jest.fn().mockResolvedValue(undefined)
      const router = new Router({
        on,
      } as any as Ketch)
      await router.route('onIdentities')
      return expect(on).toHaveBeenCalledWith(constants.IDENTITIES_EVENT, undefined)
    })

    it('calls onJurisdiction', async () => {
      const on = jest.fn().mockResolvedValue(undefined)
      const router = new Router({
        on,
      } as any as Ketch)
      await router.route('onJurisdiction')
      return expect(on).toHaveBeenCalledWith(constants.JURISDICTION_EVENT, undefined)
    })

    it('calls onRegionInfo', async () => {
      const on = jest.fn().mockResolvedValue(undefined)
      const router = new Router({
        on,
      } as any as Ketch)
      await router.route('onRegionInfo')
      return expect(on).toHaveBeenCalledWith(constants.REGION_INFO_EVENT, undefined)
    })

    it('calls setEnvironment', async () => {
      const setEnvironment = jest.fn().mockResolvedValue(undefined)
      const router = new Router({
        setEnvironment,
      } as any as Ketch)
      await router.route('setEnvironment')
      return expect(setEnvironment).toHaveBeenCalled()
    })

    it('calls setGeoIP', async () => {
      const setGeoIP = jest.fn().mockResolvedValue(undefined)
      const router = new Router({
        setGeoIP,
      } as any as Ketch)
      await router.route('setGeoIP')
      return expect(setGeoIP).toHaveBeenCalled()
    })

    it('calls setIdentities', async () => {
      const setIdentities = jest.fn().mockResolvedValue(undefined)
      const router = new Router({
        setIdentities,
      } as any as Ketch)
      await router.route('setIdentities')
      return expect(setIdentities).toHaveBeenCalled()
    })

    it('calls setJurisdiction', async () => {
      const setJurisdiction = jest.fn().mockResolvedValue(undefined)
      const router = new Router({
        setJurisdiction,
      } as any as Ketch)
      await router.route('setJurisdiction')
      return expect(setJurisdiction).toHaveBeenCalled()
    })

    it('calls setRegionInfo', async () => {
      jest.spyOn(global.console, 'log').mockImplementation(() => {})
      const setRegionInfo = jest.fn().mockResolvedValue(undefined)
      const router = new Router({
        setRegionInfo,
      } as any as Ketch)
      await router.route('setRegionInfo')
      return expect(setRegionInfo).toHaveBeenCalled()
    })

    it('calls showConsent', async () => {
      const showConsentExperience = jest.fn().mockResolvedValue(undefined)
      const router = new Router({
        showConsentExperience,
      } as any as Ketch)
      await router.route('showConsent')
      return expect(showConsentExperience).toHaveBeenCalled()
    })

    it('calls showPreferences', async () => {
      const showPreferenceExperience = jest.fn().mockResolvedValue(undefined)
      const router = new Router({
        showPreferenceExperience,
      } as any as Ketch)
      await router.route('showPreferences')
      return expect(showPreferenceExperience).toHaveBeenCalled()
    })

    it('calls reinit', async () => {
      const getConsent = jest.fn().mockResolvedValue(undefined)
      const router = new Router({
        getConsent,
      } as any as Ketch)
      await router.route('reinit')
      return expect(getConsent).toHaveBeenCalled()
    })

    it('calls registerPlugin', async () => {
      const registerPlugin = jest.fn().mockResolvedValue(undefined)
      const router = new Router({
        registerPlugin,
      } as any as Ketch)
      await router.route('registerPlugin')
      return expect(registerPlugin).toHaveBeenCalled()
    })

    it('calls registerIdentityProvider', async () => {
      const registerIdentityProvider = jest.fn().mockResolvedValue(undefined)
      const router = new Router({
        registerIdentityProvider,
      } as any as Ketch)
      await router.route('registerIdentityProvider')
      return expect(registerIdentityProvider).toHaveBeenCalled()
    })

    it('calls emit', async () => {
      const emit = jest.fn().mockResolvedValue(undefined)
      const router = new Router({
        emit,
      } as any as Ketch)
      await router.route('emit')
      return expect(emit).toHaveBeenCalled()
    })

    it('calls on', async () => {
      const on = jest.fn().mockResolvedValue(undefined)
      const router = new Router({
        on,
      } as any as Ketch)
      await router.route('on')
      return expect(on).toHaveBeenCalled()
    })

    it('calls once', async () => {
      const once = jest.fn().mockResolvedValue(undefined)
      const router = new Router({
        once,
      } as any as Ketch)
      await router.route('once')
      return expect(once).toHaveBeenCalled()
    })

    it('calls off', async () => {
      const off = jest.fn().mockResolvedValue(undefined)
      const router = new Router({
        off,
      } as any as Ketch)
      await router.route('off')
      return expect(off).toHaveBeenCalled()
    })

    it('calls addListener', async () => {
      const addListener = jest.fn().mockResolvedValue(undefined)
      const router = new Router({
        addListener,
      } as any as Ketch)
      await router.route('addListener')
      return expect(addListener).toHaveBeenCalled()
    })

    it('calls removeListener', async () => {
      const removeListener = jest.fn().mockResolvedValue(undefined)
      const router = new Router({
        removeListener,
      } as any as Ketch)
      await router.route('removeListener')
      return expect(removeListener).toHaveBeenCalled()
    })

    it('calls removeAllListeners', async () => {
      const removeAllListeners = jest.fn().mockResolvedValue(undefined)
      const router = new Router({
        removeAllListeners,
      } as any as Ketch)
      await router.route('removeAllListeners')
      return expect(removeAllListeners).toHaveBeenCalled()
    })

    it('calls registerStorageProvider', async () => {
      const registerStorageProvider = jest.fn().mockResolvedValue(undefined)
      const router = new InternalRouter({
        registerStorageProvider,
      } as any as Ketch)
      await router.route('registerStorageProvider')
      return expect(registerStorageProvider).toHaveBeenCalled()
    })

    it('calls registerExperienceServer', async () => {
      const registerExperienceServer = jest.fn().mockResolvedValue(undefined)
      const router = new InternalRouter({
        registerExperienceServer,
      } as any as Ketch)
      await router.route('registerExperienceServer')
      return expect(registerExperienceServer).toHaveBeenCalled()
    })

    it('calls setConsent', async () => {
      const setConsent = jest.fn().mockResolvedValue(undefined)
      const router = new InternalRouter({
        setConsent,
      } as any as Ketch)
      await router.route('setConsent')
      return expect(setConsent).toHaveBeenCalled()
    })

    it('calls showExperience', async () => {
      const showExperience = jest.fn().mockResolvedValue(undefined)
      const router = new InternalRouter({
        showExperience,
      } as any as Ketch)
      await router.route('showExperience')
      return expect(showExperience).toHaveBeenCalled()
    })

    it('calls handleKeyboardEvent', async () => {
      const handleKeyboardEvent = jest.fn().mockResolvedValue(undefined)
      const router = new InternalRouter({ handleKeyboardEvent } as any as Ketch)
      await router.route('handleKeyboardEvent')
      return expect(handleKeyboardEvent).toHaveBeenCalled()
    })

    it('calls returnKeyboardControl', async () => {
      const returnKeyboardControl = jest.fn().mockResolvedValue(undefined)
      const router = new InternalRouter({ returnKeyboardControl } as any as Ketch)
      await router.route('returnKeyboardControl')
      return expect(returnKeyboardControl).toHaveBeenCalled()
    })
  })
})
