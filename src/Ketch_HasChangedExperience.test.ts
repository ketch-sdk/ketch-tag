import { Ketch } from './Ketch'
import { ExperienceDisplayType } from '@ketch-sdk/ketch-types'
import constants from './constants'
import { emptyConfig, webAPI } from './__mocks__/webApi'

describe('hasChangedExperience', () => {
  it('emits hasChangedExperience event', () => {
    const ketch = new Ketch(webAPI, emptyConfig)
    const listenerSpy = jest.fn()
    ketch.on(constants.HAS_CHANGED_EXPERIENCE_EVENT, listenerSpy)
    ketch.hasChangedExperience(ExperienceDisplayType.Banner)
    expect(listenerSpy).toHaveBeenCalledWith(ExperienceDisplayType.Banner)
  })
})
