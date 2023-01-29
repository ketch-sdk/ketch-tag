import { Configuration } from '@ketch-sdk/ketch-types'
import getApiUrl from './getApiUrl'
import constants from './constants'

describe('getApiUrl', () => {
  it('returns default base URL if no configuration', () => {
    const url = getApiUrl({} as Configuration)
    expect(url).toBe(constants.API_SERVER_BASE_URL)
  })

  it('trims trailing slash', () => {
    const url = getApiUrl({
      services: {
        [constants.API_SERVER]: 'https://foobar/',
      },
    } as Configuration)
    expect(url).toBe('https://foobar/web/v2')
  })
})
