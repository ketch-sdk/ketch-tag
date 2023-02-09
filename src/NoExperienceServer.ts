import { ExperienceAction, ExperienceOptions, ExperienceServer } from '@ketch-sdk/ketch-types'
import log from './log'

export default class NoExperienceServer implements ExperienceServer {
  constructor() {}

  render(options: ExperienceOptions): Promise<ExperienceAction[]> {
    log.trace('render', options)
    return Promise.resolve([])
  }
}
