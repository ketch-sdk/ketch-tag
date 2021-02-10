export default {
  actionNotFoundError: (fnName: string): Error => new Error(`action "${fnName}" not found`),
  missingArgumentsError: (fnName: string): Error => new Error(`action "${fnName}" missing arguments`),
  expectedFunctionError: (fnName: string): Error => new Error(`action "${fnName}" expected a function`),
  unrecognizedLocationError: new Error('unrecognized location'),
  noIdentitiesError: new Error('no identities'),
  noPurposesError: new Error('no purposes'),
  noEnvironmentError: new Error('no environment'),
  noPolicyScopeError: new Error('no policy scope'),
  notImplementedError: new Error('not implemented'),
  timedOutError: (ms: number): Error => new Error(`Timed out in ${ms} ms.`),
  itemNotFoundError: new Error('item not found')
};
