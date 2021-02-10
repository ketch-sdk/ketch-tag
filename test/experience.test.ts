jest.mock('../src/internal/scripts');

import { mocked } from 'ts-jest/utils';
import * as scripts from '../src/internal/scripts';
import constants from '../src/internal/constants';
import {Configuration} from '@ketch-sdk/ketch-web-api';
import {ConsentStatus} from '../src/internal/types';
import {Ketch} from '../src/pure';

const mockScriptsLoad = mocked(scripts.load);

describe('experience', () => {
  const from = 'lanyard';
  const to = 'semaphore';

  it('loads and initializes', () => {
    mockScriptsLoad.mockResolvedValue(true);
    // const origin = window.location.protocol + '//' + window.location.host;
    // @ts-ignore
    const config: Configuration = {
      services: {
        [constants.LANYARD]: 'http://lanyard/',
      },
    };
    const consent: ConsentStatus = {
      consent: true,
    };
    const experience = 'full';

    const ketch = new Ketch(config);

    expect(ketch.loadExperience(consent, experience)).resolves.toBeUndefined();
  });

  it('creates consents on updateConsent message', () => {
    mockScriptsLoad.mockResolvedValue(true);

    const origin = window.location.protocol + '//' + window.location.host;
    // @ts-ignore
    const config: Configuration = {
      services: {
        [constants.LANYARD]: 'http://lanyard/',
      },
    };
    const consent: ConsentStatus = {
      consent: true,
    };
    const experience = 'full';
    const ketch = new Ketch(config);

    expect(ketch.loadExperience(consent, experience)).resolves.toBeUndefined();

    return ketch.handleEvent({
      data: {
        type: constants.UPDATE_CONSENT,
        consent: {
          pa1: true,
          pa2: false,
        },
        from,
        to,
      },
      origin,
    } as MessageEvent);
  });

  it('invokes rights on invokeRights message', () => {
    mockScriptsLoad.mockResolvedValue(true);

    const origin = window.location.protocol + '//' + window.location.host;
    // @ts-ignore
    const config: Configuration = {
      app: {
        code: 'app',
      },
      environment: {
        code: 'env',
      },
      policyScope: {
        code: 'ps',
      },
      services: {
        [constants.LANYARD]: 'http://lanyard/',
      },
    };
    const consent: ConsentStatus = {
      consent: true,
    };
    const experience = 'full';
    const ketch = new Ketch(config);

    expect(ketch.loadExperience(consent, experience)).resolves.toBeUndefined();

    expect(ketch.handleEvent({
      data: {
        type: constants.INVOKE_RIGHTS,
        right: 'right1',
        firstName: 'first',
        lastName: 'last',
        rightsEmail: 'test@test.com',
        country: 'United States',
        state: 'California',
        details: '',
        from,
        to,
      },
      origin,
    } as MessageEvent)).resolves.toBeUndefined();
  });
});
