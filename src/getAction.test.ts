import getAction from './getAction'
import { Configuration } from '@ketch-sdk/ketch-types'
import { Ketch } from './ketch'

describe('getAction', () => {
  describe('no ketch', () => {
    it('no ketch returns undefined', () => {
      return expect(getAction(undefined, 'undefined')).toBeUndefined()
    })
  })

  describe('ketch defined', () => {
    const config = {} as Configuration
    const ketch = new Ketch(config)

    it('invalid returns undefined', () => {
      return expect(getAction(ketch, 'undefined')).toBeUndefined()
    })
    it('showConsent', () => {
      return expect(getAction(ketch, 'showConsent')).toEqual(ketch?.showConsentExperience)
    })
    it('showPreferences', () => {
      return expect(getAction(ketch, 'showPreferences')).toEqual(ketch?.showPreferenceExperience)
    })
    it('onHideExperience', () => {
      return expect(getAction(ketch, 'onHideExperience')).toEqual(ketch?.onHideExperience)
    })
    it('setIdentities', () => {
      return expect(getAction(ketch, 'setIdentities')).toEqual(ketch?.setIdentities)
    })
    it('registerPlugin', () => {
      return expect(getAction(ketch, 'registerPlugin')).toEqual(ketch?.registerPlugin)
    })
    it('emit', () => {
      return expect(getAction(ketch, 'emit')).toEqual(ketch?.emit)
    })
    it('on', () => {
      return expect(getAction(ketch, 'on')).toEqual(ketch?.on)
    })
    it('once', () => {
      return expect(getAction(ketch, 'once')).toEqual(ketch?.once)
    })
  })
})
