const prefixes = ['ketch', 'swb']

export default {
  SWB_ENV: 'env',
  SWB_REGION: 'region',
  SWB_JURISDICTION: 'jurisdiction',
  SWB_LANGUAGE: 'lang',
  SWB_SHOW: 'show',
  SWB_PREFERENCES_TAB: 'preferences_tab',
  LANG: 'lang',
  CONSENT: 'cd',
  PREFERENCES: 'preferences',
  get: (key: string, input: string): string => {
    const p = new URLSearchParams(input)
    for (const prefix of prefixes) {
      const value = p.get(`${prefix}_${key}`)
      if (value) {
        return value
      }
    }
    return ''
  },
  has: (key: string, input: string): boolean => {
    const p = new URLSearchParams(input)
    for (const prefix of prefixes) {
      if (p.has(`${prefix}_${key}`)) {
        return true
      }
    }
    return false
  },
}
