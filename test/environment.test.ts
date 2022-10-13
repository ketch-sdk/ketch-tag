jest.mock('../src/internal/parameters')

import errors from '../src/internal/errors'
import parameters from '../src/internal/parameters'
import { Ketch } from '../src/pure'
import { Configuration } from '@ketch-sdk/ketch-web-api'

const mockParametersGet = jest.mocked(parameters.get)

const prod = {
  code: 'production',
  deploymentID: 'khGIVjDxxvy7dPN4lmAtV3',
  hash: '1392568836159292875',
}

const dev = {
  code: 'dev',
  deploymentID: 'khGIVjDxxvy7dPN4lmAtV3',
  hash: '1392568836159292875',
  pattern: 'c2VuZGl0Lm5pbmph', // sendit.ninja
}

const devShort = {
  code: 'devShort',
  deploymentID: 'khGIVjDxxvy7dPN4lmAtV3',
  hash: '1392568836159292875',
  pattern: 'b2NhbGhvc3Q=', // ocalhost
}

const test = {
  code: 'test',
  deploymentID: 'khGIVjDxxvy7dPN4lmAtV3',
  hash: '1392568836159292875',
  pattern: 'dGVzdA==', // test
}

describe('environment', () => {
  describe('getEnvironment', () => {
    it('returns the existing environment', async () => {
      const ketch = new Ketch({} as Configuration)

      await ketch.setEnvironment(dev)
      const env = await ketch.getEnvironment()
      return expect(env).toBe(dev)
    })
  })

  describe('detectEnvironment', () => {
    it('returns null if no environments', async () => {
      const config: Configuration = {
        organization: {
          code: '',
        },
        environments: [],
      }
      const ketch = new Ketch(config)

      const env = ketch.detectEnvironment()
      return expect(env).rejects.toBe(errors.noEnvironmentError)
    })

    it('selects dev because it matches href', async () => {
      const config: Configuration = {
        organization: {
          code: '',
        },
        environments: [prod, dev, test],
      }
      const ketch = new Ketch(config)

      const env = await ketch.detectEnvironment()
      return expect(env).toBe(dev)
    })

    it('selects longer match', async () => {
      const config: Configuration = {
        organization: {
          code: '',
        },
        environments: [devShort, dev],
      }
      const ketch = new Ketch(config)

      const env = await ketch.detectEnvironment()
      return expect(env).toBe(dev)
    })

    it('allows selection of environment via query', async () => {
      const config: Configuration = {
        organization: {
          code: '',
        },
        environments: [prod, dev, test],
      }

      mockParametersGet.mockImplementationOnce(key => {
        if (key === parameters.ENV) return 'test'
        return ''
      })

      const ketch = new Ketch(config)
      const env = await ketch.detectEnvironment()
      return expect(env).toBe(test)
    })

    it('selects production by default', async () => {
      const config: Configuration = {
        organization: {
          code: '',
        },
        environments: [prod, test],
      }

      const ketch = new Ketch(config)
      const env = await ketch.detectEnvironment()
      return expect(env).toBe(prod)
    })
  })
})
