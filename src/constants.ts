import { Consent } from '@ketch-sdk/ketch-types'

const events = {
  CONSENT_EVENT: 'consent',
  ENVIRONMENT_EVENT: 'environment',
  FULFILLED_EVENT: 'fulfilled',
  GEOIP_EVENT: 'geoip',
  HANDLE_KEYBOARD_EVENT: 'handleKeyboardEvent',
  HAS_CHANGED_EXPERIENCE_EVENT: 'hasChangedExperience',
  HAS_SHOWN_EXPERIENCE_EVENT: 'hasShownExperience',
  HIDE_EXPERIENCE_EVENT: 'hideExperience',
  IDENTITIES_EVENT: 'identities',
  IDENTITY_EVENT: 'identity',
  JURISDICTION_EVENT: 'jurisdiction',
  PROTOCOLS_EVENT: 'protocols',
  REGION_INFO_EVENT: 'regionInfo',
  RETURN_KEYBOARD_CONTROL: 'returnKeyboardControl',
  RIGHT_INVOKED_EVENT: 'rightInvoked',
  SHOW_CONSENT_EXPERIENCE_EVENT: 'showConsentExperience',
  SHOW_PREFERENCE_EXPERIENCE_EVENT: 'showPreferenceExperience',
  SUBSCRIPTIONS_EVENT: 'subscriptions',
  SUBSCRIPTION_CONFIG_EVENT: 'subscriptionConfig',
  USER_CONSENT_UPDATED_EVENT: 'userConsentUpdated',
  WILL_CHANGE_EXPERIENCE_EVENT: 'willChangeExperience',
  WILL_SHOW_EXPERIENCE_EVENT: 'willShowExperience',
}

export default {
  ...events,
  NONE: 'none',
  ENV: 'env',
  PRODUCTION: 'production',
  REGION: 'region',
  JURISDICTION: 'jurisdiction',
  LANGUAGE: 'lang',
  SHOW: 'show',
  PREFERENCES_TAB: 'preferences_tab',
  PREFERENCES_TABS: 'preferences_tabs',
  CONSENT: 'cd',
  PREFERENCES: 'preferences',
  API_SERVER: 'shoreline',
  API_SERVER_BASE_URL: 'https://global.ketchcdn.com/web/v2',
  EXPERIENCE_VERSION: 'experience_version',
}

export const EMPTY_CONSENT: Consent = {
  purposes: {},
  vendors: [],
  protocols: {},
}
