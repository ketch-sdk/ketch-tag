import { Configuration } from '@ketch-sdk/ketch-types'
import constants from './constants'

/**
 * Service url
 *
 * @param config The configuration
 */
export default function getApiUrl(config: Configuration): string {
  if (config.services) {
    let url = config.services[constants.API_SERVER]

    // url must not end in '/'
    if (url.endsWith('/')) {
      url = url.slice(0, -1)
    }

    // url must end in /web/v2 or /web/v3 if not set
    if (!(url.endsWith('/web/v2') || url.endsWith('/web/v3'))) {
      url = url + '/web/v2'
    }

    return url
  }

  // default case
  return constants.API_SERVER_BASE_URL
}
