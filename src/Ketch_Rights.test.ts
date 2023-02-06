import { Configuration } from '@ketch-sdk/ketch-types'
import { Ketch } from './'
import fetchMock from 'jest-fetch-mock'
import { KetchWebAPI } from '@ketch-sdk/ketch-web-api'

describe('rights', () => {
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
      },
      {
        code: 'rtbf',
        name: 'Data Deletion',
        description: 'Right to be forgotten.',
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
  const data = {
    right: 'portability',
    subject: {
      email: 'rights@email.com',
      firstName: 'first',
      lastName: 'last',
      country: 'United States',
      stateRegion: 'California',
    },
  }
  const ketch = new Ketch(new KetchWebAPI('https://global.ketchcdn.com/web/v2'), config)

  describe('invokeRights', () => {
    it('handles a call with full config', () => {
      fetchMock.mockResponse(JSON.stringify({}))

      return ketch.invokeRight(data).then(() => {
        const { property, jurisdiction, organization, environment } = config
        expect(property).not.toBeNull()
        expect(jurisdiction).not.toBeNull()
        expect(organization).not.toBeNull()
        expect(environment).not.toBeNull()

        if (property && jurisdiction && organization && environment) {
          // eslint-disable-next-line jest/no-conditional-expect
          expect(fetchMock).toHaveBeenCalledWith('https://global.ketchcdn.com/web/v2/rights/org/invoke', {
            body: '{"organizationCode":"org","propertyCode":"app","environmentCode":"env","controllerCode":"","identities":{"email":"rights@email.com"},"jurisdictionCode":"ps","rightCode":"portability","user":{"email":"rights@email.com","firstName":"first","lastName":"last","country":"United States","stateRegion":"California"}}',
            credentials: 'omit',
            headers: {
              Accept: 'application/json',
              'Content-Type': 'application/json',
            },
            method: 'POST',
            mode: 'cors',
          })
        }
      })
    })

    const dataNoEmail = {
      right: 'portability',
      subject: {
        firstName: '',
        lastName: '',
        email: '',
      },
    }

    it('skips if no rightsEmail', () => {
      fetchMock.mockResponse(
        JSON.stringify({
          location: {},
        }),
      )

      return ketch.invokeRight(dataNoEmail).then(() => {
        expect(fetchMock).not.toHaveBeenCalled()
      })
    })

    const dataNoRight = {
      right: '',
      subject: {
        firstName: '',
        lastName: '',
        email: 'rights@email.com',
      },
    }

    it('skips if no rights', () => {
      fetchMock.mockResponse(
        JSON.stringify({
          location: {},
        }),
      )

      return ketch.invokeRight(dataNoRight).then(() => {
        expect(fetchMock).not.toHaveBeenCalled()
      })
    })
  })
})
