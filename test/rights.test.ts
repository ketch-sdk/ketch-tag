jest.mock('@ketch-sdk/ketch-web-api');

import {mocked} from 'ts-jest/utils';
import {Configuration, invokeRight} from '@ketch-sdk/ketch-web-api';
import {Ketch} from '../src/pure';

describe('gangplank', () => {
  // @ts-ignore
  const config: Configuration = {
    organization: {
      code: 'org'
    },
    property: {
      code: 'app'
    },
    environment: {
      code: 'env'
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
      }
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
      }
    ],
    options: {
      migration: "3",
    }
  };
  const identities = {
    'email': 'rights@email.com'
  };
  const data = {
    right: 'portability',
    firstName: 'first',
    lastName: 'last',
    rightsEmail: 'rights@email.com',
    country: 'United States',
    state: 'California',
    details: ''
  }
  const ketch = new Ketch(config);

  describe('invokeRights', () => {
    it('handles a call with full config', () => {
      const mockInvokeRight = mocked(invokeRight);
      mockInvokeRight.mockResolvedValue();

      return ketch.invokeRight(data).then(() => {
        const {property, jurisdiction, organization, environment} = config;
        expect(property).not.toBeNull();
        expect(jurisdiction).not.toBeNull();
        expect(organization).not.toBeNull();
        expect(environment).not.toBeNull();

        if (property && jurisdiction && organization && environment) {
          expect(mockInvokeRight).toHaveBeenCalledWith('https://global.ketchcdn.com/web/v1', {
            propertyCode: property.code,
            environmentCode: environment.code,
            organizationCode: 'org',
            controllerCode: '',
            identities,
            jurisdictionCode: jurisdiction.code,
            rightCodes: ['portability'],
            user: {
              first: 'first',
              last: 'last',
              email: 'rights@email.com',
              country: 'United States',
              stateRegion: 'California',
              description: ''
            }
          });
        }
      });
    });

    it('skips if no identities', () => {
      return ketch.invokeRight([], data).then(() => {
        // expect(fetch).not.toHaveBeenCalled();
      });
    });

    const dataNoEmail = {
      right: 'portability',
      firstName: '',
      lastName: '',
      rightsEmail: '',
      country: '',
      state: '',
      details: ''
    }

    it('skips if no rightsEmail', () => {
      return ketch.invokeRight(identities, dataNoEmail).then(() => {
        // expect(fetch).not.toHaveBeenCalled();
      });
    });

    const dataNoRight = {
      right: '',
      firstName: '',
      lastName: '',
      rightsEmail: 'rights@email.com',
      country: '',
      state: '',
      details: ''
    }

    it('skips if no rights', () => {
      return ketch.invokeRight(identities, dataNoRight).then(() => {
        // expect(fetch).not.toHaveBeenCalled();
      });
    });
  });
});
