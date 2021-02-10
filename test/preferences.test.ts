import {Configuration} from '@ketch-sdk/ketch-web-api';
import {Ketch} from '../src/pure';

describe('preferences', () => {
  describe('showPreferences', () => {
    it('shows experience', () => {
      const ketch = new Ketch(({
        "experiences": {
          "preference": {
            "code": "test"
          }
        }
      } as any) as Configuration);

      expect(ketch.showPreferences()).resolves.toBeUndefined();
    });

    it('does not show experience', () => {
      const ketch = new Ketch({} as Configuration);

      expect(ketch.showPreferences()).resolves.toBeUndefined();
    });
  });
});
