/**
 * Prefix the parameter.
 *
 * @param param
 */
function prefixed(param: string): string {
  return `swb_${param}`
}

export default {
  DEBUG: prefixed('debug'),
  LOG_LEVEL: prefixed('log'),
  ENV: prefixed('env'),
  REGION: prefixed('region'),
  DEPLOYMENT: prefixed('d'),
  POLICY_SCOPE: prefixed('p'),
  LANGUAGE: prefixed('l'),
  SHOW: prefixed('show'),
  CONSENT: 'cd',
  PREFERENCES: 'preferences',
  get: (key: string, input: string): string => new URLSearchParams(input).get(key) || '',
  has: (key: string, input: string): boolean => new URLSearchParams(input).has(key),
}
