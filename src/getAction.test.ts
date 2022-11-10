import { ketch } from './init'
import getAction from './getAction'
import { Configuration } from '@ketch-sdk/ketch-types'
import { Ketch } from './ketch'

describe('getAction', () => {
  describe('no ketch', () => {
    it('no ketch returns undefined', () => {
      return expect(getAction('undefined')).toBeUndefined()
    })
  })

  describe('ketch defined', () => {
    const config = {} as Configuration
    // @ts-ignore
    ketch = new Ketch(config)

    it('invalid returns undefined', () => {
      return expect(getAction('undefined')).toBeUndefined()
    })
    it('showConsent', () => {
      return expect(getAction('showConsent')).toEqual(ketch?.showConsentExperience)
    })
    it('showPreferences', () => {
      return expect(getAction('showPreferences')).toEqual(ketch?.showPreferenceExperience)
    })
    it('onHideExperience', () => {
      return expect(getAction('onHideExperience')).toEqual(ketch?.onHideExperience)
    })
    it('setIdentities', () => {
      return expect(getAction('setIdentities')).toEqual(ketch?.setIdentities)
    })
    it('registerPlugin', () => {
      return expect(getAction('registerPlugin')).toEqual(ketch?.registerPlugin)
    })
    it('emit', () => {
      return expect(getAction('emit')).toEqual(ketch?.emit)
    })
    it('on', () => {
      return expect(getAction('on')).toEqual(ketch?.on)
    })
    it('once', () => {
      return expect(getAction('once')).toEqual(ketch?.once)
    })
  })
})
