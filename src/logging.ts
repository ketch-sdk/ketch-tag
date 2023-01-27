import { getLogger, getLogLevel, getParams } from '@ketch-sdk/ketch-logging'

export default getLogger('ketch', getLogLevel(getParams(window.location.search, ['ketch_', 'swb_'])))
