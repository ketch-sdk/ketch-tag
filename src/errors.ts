export default {
  actionNotFoundError: (fnName: string): Error => new Error(`action "${fnName}" not found`),
  expectedFunctionError: (fnName: string): Error => new Error(`action "${fnName}" expected a function`),
  unrecognizedLocationError: new Error('unrecognized location'),
  noIdentitiesError: new Error('no identities'),
  noPurposesError: new Error('no purposes'),
  noEnvironmentError: new Error('no environment'),
  noJurisdictionError: new Error('no jurisdiction'),
  invalidConfigurationError: new Error('invalid configuration'),
  emptyConsentError: new Error('empty consent'),
}
