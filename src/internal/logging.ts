import * as loglevel from 'loglevel';
import parameters from './parameters';

// Setup the log level based on a query string parameter.
if (parameters.get(parameters.DEBUG, window.location.search)) {
  loglevel.setLevel('debug', true);
} else {
  const ll = parameters.get(parameters.LOG_LEVEL, window.location.search) as loglevel.LogLevelDesc;
  if (ll) {
    loglevel.setLevel(ll, true);
  }
}

export default loglevel;
