import { ketch } from './init'

export default function getAction(action: string): Function | undefined {
  if (ketch === undefined) {
    return undefined
  }

  switch (action) {
    // TODO: case 'onConfig': return ketch.onConfig;
    case 'getConfig':
      return ketch.getConfig
    case 'getConsent':
      return ketch.getConsent
    case 'getEnvironment':
      return ketch.getEnvironment
    case 'getGeoIP':
      return ketch.getGeoIP
    case 'getIdentities':
      return ketch.getIdentities
    case 'getJurisdiction':
      return ketch.getJurisdiction
    case 'getRegionInfo':
      return ketch.getRegionInfo

    case 'onConsent':
      return ketch.onConsent
    case 'onEnvironment':
      return ketch.onEnvironment
    case 'onGeoIP':
      return ketch.onGeoIP
    case 'onHideExperience':
      return ketch.onHideExperience
    case 'onWillShowExperience':
      return ketch.onWillShowExperience
    case 'onIdentities':
      return ketch.onIdentities
    case 'onJurisdiction':
      return ketch.onJurisdiction
    case 'onRegionInfo':
      return ketch.onRegionInfo

    case 'setEnvironment':
      return ketch.setEnvironment
    case 'setGeoIP':
      return ketch.setGeoIP
    case 'setIdentities':
      return ketch.setIdentities
    case 'setJurisdiction':
      return ketch.setJurisdiction
    case 'setRegionInfo':
      return ketch.setRegionInfo

    case 'showConsent':
      return ketch.showConsentExperience
    case 'showPreferences':
      return ketch.showPreferenceExperience
    case 'registerPlugin':
      return ketch.registerPlugin
    case 'emit':
      return ketch.emit
    case 'on':
      return ketch.on
    case 'once':
      return ketch.once
  }

  return undefined
}
