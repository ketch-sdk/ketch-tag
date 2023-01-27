import { getParams } from '@ketch-sdk/ketch-logging'

const parameters = getParams(window.location.search, ['ketch_', 'swb_'])

export default parameters
