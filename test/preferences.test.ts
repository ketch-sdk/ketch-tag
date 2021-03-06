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

      return expect(ketch.showPreferenceExperience()).resolves.toStrictEqual({"purposes": {}, "vendors": []});
    });

    it('does not show experience', () => {
      const ketch = new Ketch({} as Configuration);

      return expect(ketch.showPreferenceExperience()).resolves.toStrictEqual({"purposes": {}, "vendors": []});
    });
  });
});
