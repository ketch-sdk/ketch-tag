import loglevel, { LogLevelDesc } from 'loglevel'
import parameters from './parameters'

// Setup the log level based on a query string parameter.
if (parameters.get(parameters.DEBUG, window.location.search)) {
  loglevel.setLevel('debug', true)
} else {
  const ll = parameters.get(parameters.LOG_LEVEL, window.location.search) as LogLevelDesc
  if (ll) {
    loglevel.setLevel(ll, true)
  }
}

const originalFactory = loglevel.methodFactory
loglevel.methodFactory =
  (methodName, logLevel, loggerName) =>
  (...message): void => {
    originalFactory(methodName, logLevel, loggerName)(`[semaphore] ${String(loggerName)}`, ...message)
  }

export default loglevel
