import { Configuration } from '@ketch-sdk/ketch-types'
import constants from './constants'
import parameters from "./parameters";

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

    // TODO remove post experience cut over
    // This is uses the requested version of shoreline for experience cut over
    const experienceVersion = parameters.get(constants.EXPERIENCE_VERSION)
    if (experienceVersion) {
      // Note: experienceVersion new -> shorelineVersion v3; experienceVersion old -> shorelineVersion v2
      if (url.includes("v3") && experienceVersion === "old") {
        url = url.replace("v3", "v2")
      } else if (url.includes("v2") && experienceVersion === "new") {
        url = url.replace("v2", "v3")
      }
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
