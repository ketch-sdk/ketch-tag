import { Ketch } from './Ketch'
import { ExperienceDisplayType } from '@ketch-sdk/ketch-types'
import constants from './constants'
import { emptyConfig, webAPI } from './__mocks__/webApi'

describe('willChangeExperience', () => {
  it('emits willChangeExperience event', () => {
    const ketch = new Ketch(webAPI, emptyConfig)
    const listenerSpy = jest.fn()
    ketch.on(constants.WILL_CHANGE_EXPERIENCE_EVENT, listenerSpy)
    ketch.willChangeExperience(ExperienceDisplayType.Banner)
    expect(listenerSpy).toHaveBeenCalledWith(ExperienceDisplayType.Banner)
  })
})
