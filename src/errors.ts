export default {
  actionNotFoundError: (fnName: string): Error => new Error(`action "${fnName}" not found`),
  expectedFunctionError: (fnName: string): Error => new Error(`action "${fnName}" expected a function`),
  unrecognizedLocationError: new Error('unrecognized location'),
  noIdentitiesError: new Error('no identities'),
  noPurposesError: new Error('no purposes'),
  noEnvironmentError: new Error('no environment'),
  noJurisdictionError: new Error('no jurisdiction'),
  notImplementedError: new Error('not implemented'),
  itemNotFoundError: new Error('item not found'),
  invalidConfigurationError: new Error('invalid configuration'),
}
