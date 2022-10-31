import parameters from './parameters'

const levels: { [key: string]: number } = {
  trace: 1,
  debug: 2,
  info: 3,
  log: 3,
  warn: 4,
  error: 5,
}
let logLevel = levels.warn

// Set up the log level based on a query string parameter.
if (parameters.get(parameters.DEBUG, window.location.search)) {
  logLevel = levels.debug
} else if (parameters.has(parameters.LOG_LEVEL, window.location.search)) {
  logLevel = levels[parameters.get(parameters.LOG_LEVEL, window.location.search)] || levels.log
}

function logAt(level: number, ...data: any[]) {
  if (level >= logLevel) {
    console.log('[ketch]', ...data)
  }
}

export default {
  debug: (...data: any[]) => logAt(levels.debug, ...data),
  trace: (...data: any[]) => logAt(levels.trace, ...data),
  info: (...data: any[]) => logAt(levels.info, ...data),
  log: (...data: any[]) => logAt(levels.log, ...data),
  warn: (...data: any[]) => logAt(levels.warn, ...data),
  error: (...data: any[]) => logAt(levels.error, ...data),
}
