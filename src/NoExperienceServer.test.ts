import NoExperienceServer from './NoExperienceServer'
import { ExperienceOptions } from '@ketch-sdk/ketch-types'

describe('NoExperienceServer', () => {
  describe('render', () => {
    it('returns actions', () => {
      const server = new NoExperienceServer()
      return expect(server.render({} as ExperienceOptions)).resolves.toBeDefined()
    })
  })
})
