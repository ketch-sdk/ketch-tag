/**
 * Prefix the parameter.
 *
 * @param param
 */
function prefixed(param: string): string {
  return `swb_${param}`
}

export default {
  ENV: prefixed('env'),
  REGION: prefixed('region'),
  JURISDICTION: prefixed('p'),
  LANGUAGE: prefixed('l'),
  SHOW: prefixed('show'),
  PREFERENCES_TAB: prefixed('preferences_tab'),
  CONSENT: 'cd',
  PREFERENCES: 'preferences',
  get: (key: string, input: string): string => new URLSearchParams(input).get(key) || '',
  has: (key: string, input: string): boolean => new URLSearchParams(input).has(key),
}
