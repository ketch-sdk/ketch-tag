import Builder from './Builder'
import { Ketch } from './Ketch'
import CookieBlocker from './CookieBlocker'
import { Configuration, ConfigurationV2, IdentityType } from '@ketch-sdk/ketch-types'
import fetchMock from 'jest-fetch-mock'

describe('CookieBlocker', () => {
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
        code: '0',
        legalBasisCode: 'lb1',
      },
      // @ts-ignore
      {
        code: '1',
        legalBasisCode: 'lb2',
      },
      // @ts-ignore
      {
        code: '2',
        legalBasisCode: 'lb4',
      },
    ],
    options: {
      migration: '3',
    },
    identities: {
      space1: {
        type: IdentityType.IDENTITY_TYPE_WINDOW,
        variable: 'id1',
      },
    },
  }

  // @ts-ignore
  const configV2: ConfigurationV2 = {
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
        code: '0',
        legalBasisCode: 'lb1',
      },
      // @ts-ignore
      {
        code: '1',
        legalBasisCode: 'lb2',
      },
      // @ts-ignore
      {
        code: '2',
        legalBasisCode: 'lb4',
      },
    ],
    options: {
      migration: '3',
    },
    identities: {
      space1: {
        type: IdentityType.IDENTITY_TYPE_WINDOW,
        variable: 'id1',
      },
    },
    tags: {
      '1': {
        purposeCodes: ['purpose-1'],
      },
      '2': {
        purposeCodes: ['purpose-2', 'purpose-3'],
      },
      // Test GTM/Adobe tags which should not be wrapped
      '2rX92N95ZoveKKtluFjW7E_121': {
        purposeCodes: ['advertising'],
      },
      '2rX92N95ZoveKKtluFjW7E_14': {
        purposeCodes: ['analytics'],
      },
      '2rX92N95ZoveKKtluFjW7E_20': {
        purposeCodes: ['analytics'],
      },
    },
  }

  let ketch: Ketch
  let cookieBlocker: CookieBlocker

  beforeEach(async () => {
    // Setup ketch tag and builder
    jest.spyOn(window.navigator, 'language', 'get').mockReturnValue('')
    const builder = new Builder(config)
    config.language = 'en'
    fetchMock.mockResponseOnce(async (): Promise<string> => JSON.stringify(config))
    ketch = await builder.build()
    cookieBlocker = new CookieBlocker(ketch, config)

    jest.spyOn(document, 'cookie', 'get').mockReturnValue('cookie1_a=val;cookie1_b=val;cookie1_c=val;')

    // Mock consents
    jest.spyOn(ketch, 'getConsent').mockResolvedValue({
      purposes: {
        'purpose-1': true,
        'purpose-2': true,
        'purpose-3': false,
      },
    })
  })

  it('gets granted purposes', async () => {
    const grantedPurposes = await cookieBlocker.getGrantedPurposes()
    expect(grantedPurposes.size).toBe(2)
    expect(grantedPurposes.has('purpose-1')).toBe(true)
    expect(grantedPurposes.has('purpose-2')).toBe(true)
    expect(grantedPurposes.has('purpose-3')).toBe(false)
  })

  it('deletes one cookie', async () => {})

  it('deletes multiple cookies', async () => {})

  it("doesn't delete cookies when we have consent for one of its purposes", async () => {})

  it("doesn't delete cookies when we have consent for multiple of its purposes", async () => {})
})
