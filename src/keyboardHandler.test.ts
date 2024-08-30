import onKeyPress from './keyboardHandler'
import log from './log'

jest.mock('./log')
const loggerName = '[onKeyPress]'

describe('keyboardHandler', () => {
  beforeEach(jest.resetAllMocks)

  it('should log error on unknown keycode', () => {
    const unknownTizenKey = -1
    jest.spyOn(window.navigator, 'userAgent', 'get').mockReturnValue('Tizen')

    onKeyPress({ keyCode: unknownTizenKey } as KeyboardEvent)

    expect(log.error).toHaveBeenCalledWith(loggerName, `Unknown keycode: ${unknownTizenKey}`)
  })

  it('should log error on unknown userAgent', () => {
    const unknownUserAgent = 'sagar'
    jest.spyOn(window.navigator, 'userAgent', 'get').mockReturnValue(unknownUserAgent)

    onKeyPress({ keyCode: 37 } as KeyboardEvent)

    expect(log.error).toHaveBeenCalledWith(loggerName, `Unknown userAgent: ${unknownUserAgent}`)
  })
})
