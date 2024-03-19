import Trackers from './Trackers'
import Builder from './Builder'
import { Configuration } from '@ketch-sdk/ketch-types'
import fetchMock from 'jest-fetch-mock'
import errors from './errors'

describe('Trackers', () => {
  // @ts-ignore
  const config: Configuration = {
    organization: {
      code: 'org',
    },
    property: {
      code: 'app',
    },
    environment: {
      code: 'env',
    },
    jurisdiction: {
      code: 'ps',
    },
    rights: [
      {
        code: 'portability',
        name: 'Portability',
        description: 'Right to have all data provided to you.',
        canonicalRightCode: 'get',
      },
      {
        code: 'rtbf',
        name: 'Data Deletion',
        description: 'Right to be forgotten.',
        canonicalRightCode: 'delete',
      },
    ],
    purposes: [
      // @ts-ignore
      {
        code: 'pacode1',
        legalBasisCode: 'lb1',
      },
      // @ts-ignore
      {
        code: 'pacode2',
        legalBasisCode: 'lb2',
      },
      // @ts-ignore
      {
        code: 'pacode4',
        legalBasisCode: 'lb4',
      },
    ],
    options: {
      migration: '3',
    },
  }
  const identities = {
    space1: 'id1',
  }

  it('rejects on identities', async () => {
    jest.spyOn(window.navigator, 'language', 'get').mockReturnValue('')
    const builder = new Builder(config)
    config.language = 'en'
    fetchMock.mockResponseOnce(async (): Promise<string> => JSON.stringify(config))
    const ketch = await builder.build()
    const trackers = new Trackers(ketch, config)
    expect(trackers).toBeTruthy()
    await expect(trackers.enableAllConsent()).rejects.toBe(errors.noIdentitiesError)
  })

  it('resolves with consent', async () => {
    jest.spyOn(window.navigator, 'language', 'get').mockReturnValue('')
    const builder = new Builder(config)
    config.language = 'en'
    fetchMock.mockResponseOnce(async (): Promise<string> => JSON.stringify(config))
    const ketch = await builder.build()
    ketch.setIdentities(identities)
    const trackers = new Trackers(ketch, config)
    expect(trackers).toBeTruthy()
    await expect(trackers.enableAllConsent()).resolves.toEqual({ purposes: { '0': true, '1': true, '2': true } })
  })
})
