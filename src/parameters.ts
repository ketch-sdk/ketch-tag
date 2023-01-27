import { getParams } from '@ketch-sdk/ketch-logging'

const parameters = getParams(window.location.search, ['ketch_', 'swb_'])

export default {
  ENV: 'env',
  REGION: 'region',
  JURISDICTION: 'jurisdiction',
  LANGUAGE: 'lang',
  SHOW: 'show',
  PREFERENCES_TAB: 'preferences_tab',
  CONSENT: 'cd',
  PREFERENCES: 'preferences',

  get: (key: string): string => {
    return parameters.get(key) || ''
  },

  has: (key: string): boolean => {
    return parameters.has(key)
  },
}
