import {getCookie} from '../src/internal/cookie';
import {Ketch} from '../src/pure';
import {Configuration} from '@ketch-sdk/ketch-web-api';

describe('identity', () => {
  describe('getIdentities', () => {
    it('returns one item list', () => {
      const ketch = new Ketch({} as Configuration);

      return ketch.setIdentities(['id1']).then(() => {
        return expect(ketch.getIdentities()).resolves.toEqual(['id1']);
      });
    });

    it('returns two item list', () => {
      const ketch = new Ketch({} as Configuration);

      return ketch.setIdentities(['id1', 'id2']).then(() => {
        return expect(ketch.getIdentities()).resolves.toEqual(['id1', 'id2']);
      });
    });
  });

  describe('collectIdentities', () => {
    const organization = {
      ID: 'orgID1',
      code: 'org1'
    };

    // config.identities
    it('handles no identities defined', () => {
      const ketch = new Ketch({} as Configuration);

      const r = ketch.collectIdentities().then(
        (ids) => {
          expect(ids).toEqual([])
        }
      )
      return r;
    });

    it('handles window properties', () => {
      const config = {
        organization,
        identities: {
          f1: {
            type: 'window',
            variable: 'window.foo1',
          },
        }
      };
      const ketch = new Ketch((config as any) as Configuration);

      // @ts-ignore
      window['foo1'] = 'wfv1';

      const r = ketch.collectIdentities().then(
        (ids) => {
          return expect(ids).toEqual([
            'srn:::::org1:id/f1/wfv1'
          ]);
        }
      )
      return r
    });

    it('handles dataLayer properties', () => {
      const config = {
        organization,
        identities: {
          f1: {
            type: 'dataLayer',
            variable: 'bar1',
          },
          f2: {
            type: 'dataLayer',
            variable: 'bar2',
          },
          f3: {
            type: 'dataLayer',
            variable: 'window.bar3',
          },
          f4: {
            type: 'dataLayer',
            variable: 'bar4',
          }
        }
      };
      const ketch = new Ketch((config as any) as Configuration);

      // @ts-ignore
      window['dataLayer'] = [
        {
          bar1: 'dlfv1',
          bar2: 'dlfv2',
        },
        {
          bar3: 'dlfv3',
        },
        {
          bar4: 'dlfv4',
        }
      ];

      const r = ketch.collectIdentities().then(
        (ids) => {
          return expect(ids).toEqual([
            'srn:::::org1:id/f1/dlfv1',
            'srn:::::org1:id/f2/dlfv2',
            'srn:::::org1:id/f4/dlfv4'
          ]);
        }
      )
      return r
    });

    it('handles cookie properties', () => {
      const config = {
        organization,
        identities: {
          f1: {
            type: 'cookie',
            variable: 'cookie1',
          },
          f2: {
            type: 'cookie',
            variable: 'cookie2',
          },
        }
      };
      const ketch = new Ketch((config as any) as Configuration);

      document.cookie = 'cookie1=cfv1'
      expect(ketch.collectIdentities()).resolves.toEqual(['srn:::::org1:id/f1/cfv1']);
    });

    it('handles managed cookie properties', () => {
      const config = {
        organization,
        identities: {
          f1: {
            type: 'managedCookie',
            variable: 'mc1',
          },
          f2: {
            type: 'managedCookie',
            variable: 'mc2',
          },
        }
      };
      const ketch = new Ketch((config as any) as Configuration);

      document.cookie = 'mc1=mcfv1'

      const r = ketch.collectIdentities().then(
        (ids) => {
          getCookie('mc2').then(
            (mc2) => {
              return expect(ids).toEqual([
                'srn:::::org1:id/f1/mcfv1',
                'srn:::::org1:id/f2/'+mc2
              ]);
            },
            (error) => {
              return expect(error).toBeNull()
            }
          )
        }
      )
      return r
    });
  });
});
