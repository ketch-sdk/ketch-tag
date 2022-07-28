jest.mock('@ketch-sdk/ketch-web-api');

import {mocked} from 'ts-jest';
import {Configuration, getConsent, setConsent} from '@ketch-sdk/ketch-web-api';
import errors from '../src/internal/errors';
import {Ketch} from '../src/pure';
import constants from "../src/internal/constants";

describe('consent', () => {
  // @ts-ignore
  const config2: Configuration = {
    organization: {
      code: 'org'
    },
    property: {
      code: 'axonic',
      name: 'axonic.io',
      platform: 'WEB'
    },
    environments: [
      {
        code: 'production',
        hash: '1392568836159292875'
      }
    ],
    jurisdiction: {
      code: 'ccpa',
      defaultScopeCode: 'ccpa',
      variable: 'scope_tag'
    },
    identities: {
      'axonic_cookie': {
        type: 'dataLayer',
        variable: 'huid'
      }
    },
    environment: {
      code: 'production',
      hash: '1392568836159292875'
    },
    deployment: {
      code: 'axonic_dep',
      version: 2
    },
    rights: [
      {
        code: 'portability',
        name: 'Portability',
        description: 'Right to have all data provided to you.'
      },
      {
        code: 'rtbf',
        name: 'Data Deletion',
        description: 'Right to be forgotten.'
      }
    ],
    purposes: [
      // @ts-ignore
      {
        code: 'productresearch',
        name: 'Product Research',
        description: 'We will use data collected about you to perform critical product enhancements.',
        legalBasisCode: 'disclosure',
        requiresPrivacyPolicy: true
      },
      // @ts-ignore
      {
        code: 'analytics',
        name: 'Analytics',
        description: 'We perform analytics on your data to get smarter.',
        legalBasisCode: 'consent-optin',
        requiresOptIn: true,
        requiresPrivacyPolicy: true
      },
      // @ts-ignore
      {
        code: 'datasales',
        name: 'Data Sales',
        description: 'We will sell your personal data to other institutions. ',
        legalBasisCode: 'consent-optout',
        allowsOptOut: true,
        requiresPrivacyPolicy: true
      }
    ],
    experiences: {
      // @ts-ignore
      consent: {
        experienceDefault: 2
      }
    },
    options: {
      localStorage: "1",
      migration: "1"
    }
  };


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
    'space1': 'id1'
  };

  describe('getConsent', () => {
    it('handles a call with full config', () => {
      const ketch = new Ketch(config);

      const mockGetConsent = mocked(getConsent);

      mockGetConsent.mockResolvedValue({
        purposes: {
          pacode1: {
            allowed: 'true',
          },
          pacode2: {
            allowed: 'false',
          },
          pacode3: {
            allowed: 'false',
          },
        },
        vendors: ["1"]
      });

      return ketch.fetchConsent(identities).then((x) => {
        expect(x).toEqual({
          purposes: {
            pacode1: true,
            pacode2: false,
          },
          vendors: ["1"]
        });
        const {property, jurisdiction, organization, environment} = config;
        expect(property).not.toBeNull();
        expect(jurisdiction).not.toBeNull();
        expect(organization).not.toBeNull();
        expect(environment).not.toBeNull();
      });
    });

    it('skips calling if no identities', () => {
      const ketch = new Ketch(config);

      return expect(ketch.fetchConsent({}))
        .rejects.toBe(errors.noIdentitiesError);
    });

    it('skips calling if no purposes', () => {
      const ketch = new Ketch({
        organization: {
          code: 'org'
        },
        property: {
          code: 'property'
        },
        environment: {
          code: 'env',
        },
        jurisdiction: {
          code: 'default',
        },
        purposes: [],
      } as any as Configuration);

      return expect(ketch.fetchConsent(identities)).rejects.toBe(errors.noPurposesError);
    });
  });

  describe('updateConsent', () => {
    it('handles a call with full config', () => {
      const ketch = new Ketch(config);

      const mockSetConsent = mocked(setConsent);
      mockSetConsent.mockResolvedValue();

      return ketch.updateConsent(identities, {
        purposes: {
          pacode1: true,
          pacode2: false,
        },
        vendors: ["1"]
      }).then(() => {
        const {property, jurisdiction, organization, environment} = config;
        expect(property).not.toBeNull();
        expect(jurisdiction).not.toBeNull();
        expect(organization).not.toBeNull();
        expect(environment).not.toBeNull();

        if (property && jurisdiction && organization && environment) {
          expect(mockSetConsent).toHaveBeenCalledWith('https://global.ketchcdn.com/web/v2', {
            propertyCode: property.code,
            environmentCode: environment.code,
            controllerCode: '',
            organizationCode: 'org',
            identities,
            jurisdictionCode: jurisdiction.code,
            purposes: {
              'pacode1': {
                allowed: 'true',
                legalBasisCode: 'lb1',
              },
              'pacode2': {
                allowed: 'false',
                legalBasisCode: 'lb2',
              },
            },
            vendors: ["1"],
            migrationOption: 3,
          });
        }
      });
    });

    it('skips if no identities', () => {
      const ketch = new Ketch(config);

      return ketch.updateConsent({}, {
        purposes: {
          pacode1: true,
          pacode2: false,
        },
        vendors: ["1"]
      }).then((x) => {
        expect(x).toBeUndefined();
      });
    });

    it('skips if no purposes', () => {
      const ketch = new Ketch({
        organization: {
          code: 'org'
        },
        property: {
          code: 'property'
        },
        environment: {
          code: 'env',
        },
        jurisdiction: {
          code: 'default',
        },
        purposes: [],
        options: {
          migration: "3",
        }
      } as any as Configuration);

      return ketch.updateConsent(identities, {
        purposes: {
          pacode1: true,
          pacode2: false,
        }
      }).then((x) => {
        expect(x).toBeUndefined();
      });
    });

    it('skips if no consents', () => {
      const ketch = new Ketch(config);

      return ketch.updateConsent(identities, {purposes:{}}).then((x) => {
        expect(x).toBeUndefined();
      });
    });
  });

  describe('getConsent', () => {
    const ketch = new Ketch(config);

    const mockSetConsent = mocked(setConsent);

    it('returns the existing consent', () => {
      const c = {
        purposes: {
          ip: true
        },
        vendors: ['1']
      };
      mockSetConsent.mockResolvedValue();

      expect(ketch.hasConsent()).not.toBeTruthy();
      return ketch.setConsent(c).then((x) => {
        expect(x).toEqual({
          purposes: {
            ip: true
          },
          vendors: ['1']
        });
        expect(ketch.hasConsent()).toBeTruthy();
        return ketch.getConsent();
      }).then((y) => {
        expect(y).toEqual({
          purposes: {
            ip: true
          },
          vendors: ['1']
        });
      });
    });
  });

  describe('selectExperience', () => {
    it('returns modal if any purposes requires opt in and defaultExperience is modal', () => {
      const ketch = new Ketch(({
        purposes: [
          {
            code: '',
            name: '',
            description: '',
            legalBasisCode: '',
            requiresOptIn: true,
          }
        ],
        experiences: {
          consent: {
            experienceDefault: 2
          }
        }
      } as any) as Configuration);

      expect(ketch.selectExperience()).toEqual(constants.CONSENT_MODAL);
    });

    it('returns banner if any purposes requires opt in and defaultExperience is not modal', () => {
      const ketch = new Ketch(({
        purposes: [
          {
            code: '',
            name: '',
            description: '',
            legalBasisCode: '',
            requiresOptIn: false,
          }
        ],
      } as any) as Configuration);

      expect(ketch.selectExperience()).toEqual(constants.CONSENT_BANNER);
    });

    it('returns banner if none of the purposes requires opt in', () => {
      const ketch = new Ketch(({
        purposes: [
          {
            code: '',
            name: '',
            description: '',
            legalBasisCode: '',
            requiresOptIn: false,
          }
        ],
      } as any) as Configuration);

      expect(ketch.selectExperience()).toEqual(constants.CONSENT_BANNER);
    });

    it('returns banner no purposes', () => {
      const ketch = new Ketch(config2);

      expect(ketch.selectExperience()).toEqual(constants.CONSENT_MODAL);
    });
  });

  describe('shouldShowConsent', () => {
    it('shows when missing options', () => {
      const ketch = new Ketch(config2);

      expect(ketch.shouldShowConsent({purposes:{}})).toBeTruthy();
    });

    it('does not show when no purposes', () => {
      const ketch = new Ketch(({
        purposes: [],
        experiences: {
          consent: {
            code: "test"
          }
        }
      } as any) as Configuration);

      expect(ketch.shouldShowConsent({purposes: {analytics: true}})).not.toBeTruthy();
    });

    it('does not show when no consent experience', () => {
      const ketch = new Ketch(({
        purposes: [
          {
            code: 'productresearch',
            name: 'Product Research',
            description: 'We will use data collected about you to perform critical product enhancements.',
            legalBasisCode: 'disclosure',
            requiresPrivacyPolicy: true
          }
        ]
      } as any) as Configuration);

      expect(ketch.shouldShowConsent({purposes: {}})).not.toBeTruthy();
    });

    it('shows when options', () => {
      const ketch = new Ketch(config2);

      expect(ketch.shouldShowConsent({
        purposes: {
          datasales: true,
        }
      })).toBeTruthy();
    });
  });

  describe('showConsent', () => {
    it('calls lanyard', () => {
      const ketch = new Ketch(config2);

      const c = {purposes: {datasales: true}};

      expect(ketch.setConsent(c)).resolves.toBe(c);
      expect(ketch.showConsentExperience()).resolves.toBe(c);
    });
  });
});
