import errors from './errors'
import parameters from './parameters'
import { Ketch } from './'
import { Configuration } from '@ketch-sdk/ketch-types'

jest.mock('./parameters')

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
  pattern: 'bG9jYWxob3N0', // localhost
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
    it('returns the existing environment', () => {
      const ketch = new Ketch({} as Configuration)

      return ketch.setEnvironment(dev).then(() => {
        return expect(ketch.getEnvironment()).resolves.toBe(dev)
      })
    })
  })

  describe('detectEnvironment', () => {
    it('returns null if no environments', () => {
      const config: Configuration = {
        organization: {
          code: ""
        },
        environments: []
      }
      const ketch = new Ketch(config)

      const env = ketch.detectEnvironment()
      return expect(env).rejects.toBe(errors.noEnvironmentError)
    })

    it('selects dev because it matches href', () => {
      const config: Configuration = {
        organization: {
          code: ""
        },
        environments: [prod, dev, test],
      }
      const ketch = new Ketch(config)

      const env = ketch.detectEnvironment()
      return expect(env).resolves.toBe(dev)
    })

    it('selects longer match', () => {
      const config: Configuration = {
        organization: {
          code: ""
        },
        environments: [devShort, dev],
      }
      const ketch = new Ketch(config)

      const env = ketch.detectEnvironment()
      return expect(env).resolves.toBe(dev)
    })

    it('allows selection of environment via query', () => {
      const config: Configuration = {
        organization: {
          code: ""
        },
        environments: [prod, dev, test],
      }

      mockParametersGet.mockImplementationOnce(key => {
        if (key === parameters.ENV) return 'test'
        return ''
      })

      const ketch = new Ketch(config)
      const env = ketch.detectEnvironment()
      return expect(env).resolves.toBe(test)
    })

    it('selects production by default', () => {
      const config: Configuration = {
        organization: {
          code: ""
        },
        environments: [prod, test],
      }

      const ketch = new Ketch(config)
      const env = ketch.detectEnvironment()
      return expect(env).resolves.toBe(prod)
    })
  })
})
