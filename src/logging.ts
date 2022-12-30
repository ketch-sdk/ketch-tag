import { getLogger, getLogLevel } from '@ketch-sdk/ketch-logging'

export default getLogger('ketch', getLogLevel(window.location.search, 'swb_'))
