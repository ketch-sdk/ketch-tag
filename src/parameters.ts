/**
 * Prefix the parameter.
 *
 * @param param
 */
function prefixed(param: string): string {
  return `swb_${param}`
}

export default {
  SWB_ENV: prefixed('env'),
  SWB_REGION: prefixed('region'),
  SWB_JURISDICTION: prefixed('p'),
  SWB_LANGUAGE: prefixed('l'),
  SWB_SHOW: prefixed('show'),
  SWB_PREFERENCES_TAB: prefixed('preferences_tab'),
  LANG: 'lang',
  CONSENT: 'cd',
  PREFERENCES: 'preferences',
  get: (key: string, input: string): string => new URLSearchParams(input).get(key) || '',
  has: (key: string, input: string): boolean => new URLSearchParams(input).has(key),
}
