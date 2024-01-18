import { Ketch } from './Ketch'
import constants from './constants'
import { emptyConfig, webAPI } from './__mocks__/webApi'

describe('hasShownExperience', () => {
  it('emits hasShownExperience event', () => {
    const ketch = new Ketch(webAPI, emptyConfig)
    const listenerSpy = jest.fn()
    ketch.on(constants.HAS_SHOWN_EXPERIENCE_EVENT, listenerSpy)
    ketch.hasShownExperience()
    expect(listenerSpy).toHaveBeenCalledWith()
  })
})
