/**
 * Prefix the parameter.
 *
 * @param param
 */
function prefixed(param: string): string {
  return `swb_${param}`;
}

export default {
  NAMED: prefixed,
  DEBUG: prefixed('debug'),
  LOG_LEVEL: prefixed('log'),
  ENV: prefixed('env'),
  DEPLOYMENT: prefixed('d'),
  POLICY_SCOPE: prefixed('p'),
  REGION: prefixed('region'),
  LANGUAGE: prefixed('l'),
  serviceNamed: (name: string): string => prefixed(`s_${name}`),
  get: jest.fn(),
};
