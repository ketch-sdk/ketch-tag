jest.mock('@ketch-sdk/ketch-web-api');
jest.mock('../src/internal/parameters');

import {mocked} from 'ts-jest/utils';
import errors from '../src/internal/errors';
import parameters from '../src/internal/parameters';
import {Ketch} from '../src/pure';
import {Configuration, getLocation, GetLocationResponse} from '@ketch-sdk/ketch-web-api';

describe('policyScope', () => {
  const mockParametersGet = mocked(parameters.get);

  describe('getPolicyScope', () => {
    it('returns the existing policy scope', () => {
      const ketch = new Ketch({} as Configuration);

      const ps = 'gdpr';
      return ketch.setPolicyScope(ps).then(() => {
        return expect(ketch.getPolicyScope()).resolves.toEqual(ps);
      });
    });
  });

  describe('loadPolicyScope', () => {
    it('allows setting policy scope on query', () => {
      const ketch = new Ketch({} as Configuration);

      mockParametersGet.mockImplementationOnce((key) => {
        if (key === parameters.POLICY_SCOPE) return 'FOO';
        return '';
      });

      return expect(ketch.loadPolicyScope()).resolves.toEqual('FOO');
    });

    it('handles null regionInfo', () => {
      const ketch = new Ketch({} as Configuration);

      const mockLoadRegionInfo = mocked(getLocation);

      mockLoadRegionInfo.mockRejectedValue(errors.unrecognizedLocationError);

      return expect(ketch.loadPolicyScope()).rejects.toBe(errors.noPolicyScopeError);
    });

    it('loads from dataLayer', () => {
      const ketch = new Ketch({
        policyScope: {
          variable: 'foobar',
        },
      } as Configuration);

      const mockLoadRegionInfo = mocked(getLocation);
      mockLoadRegionInfo.mockResolvedValue({
        location: {
          countryCode: 'GB'
        }
      } as GetLocationResponse);

      // @ts-ignore
      window['dataLayer'] = [];
      // @ts-ignore
      window['dataLayer'].push({
        foobar: 'ccpa',
      });

      return expect(ketch.loadPolicyScope()).resolves.toEqual('ccpa');
    });

    it('locates specified policy scope', () => {
      const ketch = new Ketch(({
        policyScope: {
          defaultScopeCode: 'default',
          scopes: {
            'US-CA': 'ccpa',
            'UK': 'gdpr',
          },
        },
      } as any) as Configuration);

      const mockLoadRegionInfo = mocked(getLocation);
      mockLoadRegionInfo.mockResolvedValue({
        location: {
          countryCode: 'US',
          regionCode: 'CA'
        }
      } as GetLocationResponse);

      return expect(ketch.loadPolicyScope()).resolves.toEqual('ccpa');
    });

    it('defaults policy scope if not found', () => {
      const ketch = new Ketch(({
        policyScope: {
          defaultScopeCode: 'default',
          scopes: {
            'US-CA': 'ccpa',
            'UK': 'gdpr',
          },
        },
      } as any) as Configuration);

      const mockLoadRegionInfo = mocked(getLocation);
      mockLoadRegionInfo.mockResolvedValue({
        location: {
          countryCode: 'NA',
        }
      } as GetLocationResponse);

      return expect(ketch.loadPolicyScope()).resolves.toEqual('default');
    });

    it('defaults policy scope on reject', () => {
      const ketch = new Ketch(({
        policyScope: {
          defaultScopeCode: 'default',
          scopes: {
            'US-CA': 'ccpa',
            'UK': 'gdpr',
          },
        },
      } as any) as Configuration);

      const mockLoadRegionInfo = mocked(getLocation);
      mockLoadRegionInfo.mockRejectedValue(errors.unrecognizedLocationError);

      return expect(ketch.loadPolicyScope()).resolves.toEqual('default');
    });
  });

  describe('pushPolicyScope', () => {
    it('pushes policyScope to dataLayer', () => {
      const ps = "US-CA"

      const ketch = new Ketch({} as Configuration);

      ketch.pushPolicyScope(ps)
      let dataLayerPS = "";

      // @ts-ignore
      for (const dl of window['dataLayer']) {
        if (dl['event'] === 'ketchPolicyScope') {
          dataLayerPS = dl['policyScopeCode']
        }
      }
      return expect(dataLayerPS).toEqual(ps)
    });
  });
});
