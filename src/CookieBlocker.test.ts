import Builder from './Builder'
import { Ketch } from './Ketch'
import CookieBlocker from './CookieBlocker'
import { Configuration, ConfigurationV2, Consent, IdentityType } from '@ketch-sdk/ketch-types'
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
    blockedCookies: {
      'cookie-1': {
        regex: 'cookie-1_a',
        purposeCodes: ['purpose-1'],
      },
      'cookie-2': {
        regex: 'cookie-2_.+',
        purposeCodes: ['purpose-2', 'purpose-3'],
      },
      'cookie-3': {
        purposeCodes: ['purpose-2', 'purpose-3'],
      },
      'cookie-4': {
        purposeCodes: ['purpose-2', 'purpose-3'],
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
    cookieBlocker = new CookieBlocker(ketch, configV2)
  })

  it('gets granted purposes', async () => {
    // Mock consents
    jest.spyOn(ketch, 'getConsent').mockResolvedValue({
      purposes: {
        'purpose-1': true,
        'purpose-2': false,
        'purpose-3': false,
      },
    })

    // Mock cookies
    jest.spyOn(document, 'cookie', 'get').mockReturnValue('cookie-1_a=val;cookie-1_b=val;cookie-1_c=val;')

    const grantedPurposes = await cookieBlocker.getGrantedPurposes()
    expect(grantedPurposes.size).toBe(1)
    expect(grantedPurposes.has('purpose-1')).toBe(true)
    expect(grantedPurposes.has('purpose-2')).toBe(false)
    expect(grantedPurposes.has('purpose-3')).toBe(false)
  })

  it('deletes one cookie with regex only', async () => {
    // Mock consents
    jest.spyOn(ketch, 'getConsent').mockResolvedValue({
      purposes: {
        'purpose-1': false,
        'purpose-2': true,
        'purpose-3': true,
      },
    })

    // Mock cookies
    jest.spyOn(document, 'cookie', 'get').mockReturnValue('cookie-1_a=val;cookie-1_b=val;cookie-1_c=val;')

    const blockedCookies = await cookieBlocker.execute()
    expect(blockedCookies.length).toBe(1)
    expect(blockedCookies[0]).toBe('cookie-1_a')
  })

  it('deletes multiple cookies with regex only', async () => {
    // Mock consents
    jest.spyOn(ketch, 'getConsent').mockResolvedValue({
      purposes: {
        'purpose-1': true,
        'purpose-2': false,
        'purpose-3': false,
      },
    })

    // Mock cookies
    jest
      .spyOn(document, 'cookie', 'get')
      .mockReturnValue(
        'cookie-1;cookie-1_a;cookie-2_a=val;cookie-2_b=val;cookie-2_c=val;cookie-2_;cookie-2;anothercookie=val;',
      )

    const blockedCookies = await cookieBlocker.execute()

    // Should match all 3 cookies
    expect(blockedCookies.length).toBe(3)
    expect(blockedCookies[0]).toBe('cookie-2_a')
    expect(blockedCookies[1]).toBe('cookie-2_b')
    expect(blockedCookies[2]).toBe('cookie-2_c')
  })

  it('deletes one cookie with exact match only', async () => {
    // Mock consents
    jest.spyOn(ketch, 'getConsent').mockResolvedValue({
      purposes: {
        'purpose-1': false,
        'purpose-2': false,
        'purpose-3': false,
      },
    })

    // Mock cookies
    jest.spyOn(document, 'cookie', 'get').mockReturnValue('cookie-3=val')

    const blockedCookies = await cookieBlocker.execute()
    expect(blockedCookies.length).toBe(1)
    expect(blockedCookies[0]).toBe('cookie-3')
  })

  it('deletes multiple cookies with exact match only', async () => {
    // Mock consents
    jest.spyOn(ketch, 'getConsent').mockResolvedValue({
      purposes: {
        'purpose-1': true,
        'purpose-2': false,
        'purpose-3': false,
      },
    })

    // Mock cookies
    jest.spyOn(document, 'cookie', 'get').mockReturnValue('cookie-3;cookie-4;anothercookie;')

    const blockedCookies = await cookieBlocker.execute()

    // Should match all 3 cookies
    expect(blockedCookies.length).toBe(2)
    expect(blockedCookies[0]).toBe('cookie-3')
    expect(blockedCookies[1]).toBe('cookie-4')
  })

  it('deletes multiple cookies with regex and exact match', async () => {
    // Mock consents
    jest.spyOn(ketch, 'getConsent').mockResolvedValue({
      purposes: {
        'purpose-1': true,
        'purpose-2': false,
        'purpose-3': false,
      },
    })

    // Mock cookies
    jest
      .spyOn(document, 'cookie', 'get')
      .mockReturnValue(
        'cookie-1;cookie-1_a;cookie-2_a=val;cookie-2_b=val;cookie-2_c=val;cookie-2_;cookie-2;anothercookie;cookie-3;cookie-4',
      )

    const blockedCookies = await cookieBlocker.execute()

    // Should match all 3 cookies
    expect(blockedCookies.length).toBe(5)
    // Regex cookies
    expect(blockedCookies[0]).toBe('cookie-2_a')
    expect(blockedCookies[1]).toBe('cookie-2_b')
    expect(blockedCookies[2]).toBe('cookie-2_c')
    // Exact match cookies
    expect(blockedCookies[3]).toBe('cookie-3')
    expect(blockedCookies[4]).toBe('cookie-4')
  })

  it("doesn't delete cookies when we have consent for one of its purposes", async () => {
    // Mock consents
    jest.spyOn(ketch, 'getConsent').mockResolvedValue({
      purposes: {
        'purpose-1': true,
        'purpose-2': true,
        'purpose-3': false,
      },
    })

    // Mock cookies
    jest
      .spyOn(document, 'cookie', 'get')
      .mockReturnValue('cookie-1_a=val;cookie-1_b=val;cookie-1_c=val;cookie-2_a=val;cookie-2_b=val;cookie-2_c=val;')

    const blockedCookies = await cookieBlocker.execute()

    // No cookies should be blocked because we have consent
    expect(blockedCookies.length).toBe(0)
  })

  it("doesn't delete cookies when we have consent for multiple of its purposes", async () => {
    // Mock consents
    jest.spyOn(ketch, 'getConsent').mockResolvedValue({
      purposes: {
        'purpose-1': true,
        'purpose-2': true,
        'purpose-3': true,
      },
    })

    // Mock cookies
    jest
      .spyOn(document, 'cookie', 'get')
      .mockReturnValue('cookie-1_a=val;cookie-1_b=val;cookie-1_c=val;cookie-2_a=val;cookie-2_b=val;cookie-2_c=val;')

    const blockedCookies = await cookieBlocker.execute()

    // No cookies should be blocked because we have consent
    expect(blockedCookies.length).toBe(0)
  })

  it('re-executes with updated consent values', async () => {
    // Spy on the execute method of the Tags instance
    const executeSpy = jest.spyOn(cookieBlocker, 'execute')
    cookieBlocker.execute()
    // Set consent to trigger the listener in the Tags constructor
    expect(executeSpy).toHaveBeenCalledTimes(1)
    ketch.setConsent({ purposes: { purpose1: true } })
    expect(executeSpy).toHaveBeenCalledTimes(2)
  })

  it('verifies no errors when consent is undefined', async () => {
    // Mock consents
    jest.spyOn(ketch, 'getConsent').mockResolvedValue(undefined as unknown as Consent)
    cookieBlocker.execute()
  })

  it('verifies no errors when consent is has no consent field', async () => {
    // Mock consents
    jest.spyOn(ketch, 'getConsent').mockResolvedValue({} as Consent)
    cookieBlocker.execute()
  })
})
