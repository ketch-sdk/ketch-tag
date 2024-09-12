import { getLogger, getLogLevel, getParams, LogLevel } from '@ketch-sdk/ketch-logging'

let passedLevel = getLogLevel(getParams(window.location.search, ['ketch_', 'swb_']))
if (!passedLevel && process.env.NODE_ENV === 'development') {
  passedLevel = LogLevel.DEBUG
}

export default getLogger('ketch', passedLevel)
