import onKeyPress, { ArrowActions } from './keyboardHandler'
import log from './log'
import * as cache from './cache'

jest.mock('./log')
const loggerName = '[onKeyPress]'

describe('keyboardHandler', () => {
  beforeEach(jest.resetAllMocks)

  it('should log error on unknown keycode and return keyboard control', () => {
    const unknownTizenKey = -1
    const fn = jest.fn()
    jest.spyOn(window.navigator, 'userAgent', 'get').mockReturnValue('Tizen')
    const spy = jest.spyOn(cache, 'clearCachedDomNode')

    onKeyPress({ keyCode: unknownTizenKey } as KeyboardEvent, fn)

    expect(log.error).toHaveBeenCalledWith(loggerName, `Unknown input: ${unknownTizenKey}`)
    expect(spy).toHaveBeenCalled()
    expect(fn).toHaveBeenCalled()
  })

  it('should log error on unknown userAgent and return keyboard control', () => {
    const unknownUserAgent = 'sagar'
    const fn = jest.fn()
    jest.spyOn(window.navigator, 'userAgent', 'get').mockReturnValue(unknownUserAgent)
    const spy = jest.spyOn(cache, 'clearCachedDomNode')

    onKeyPress({ keyCode: 37 } as KeyboardEvent, fn)

    expect(log.error).toHaveBeenCalledWith(loggerName, `Unknown input: 37`)
    expect(spy).toHaveBeenCalled()
    expect(fn).toHaveBeenCalled()
  })

  it('should return keyboard control on back keycode', () => {
    const fn = jest.fn()
    const spy = jest.spyOn(cache, 'clearCachedDomNode')
    onKeyPress(ArrowActions.BACK, fn)

    expect(spy).toHaveBeenCalled()
    expect(fn).toHaveBeenCalled()
  })

  it('should look for cached ctx node on selection', () => {
    const returnFn = jest.fn()
    const clickFn = jest.fn()
    const mockNode = { click: clickFn } as unknown as HTMLElement
    const spy = jest.spyOn(cache, 'getCachedDomNode').mockReturnValue(mockNode)

    onKeyPress(ArrowActions.OK, returnFn)

    expect(spy).toHaveBeenCalled()
    expect(clickFn).toHaveBeenCalled()
  })

  // it('should returnKeyboardControl when the next node to navigate is undefined', () => {
  //   const returnFn = jest.fn()
  //   jest.spyOn(exportedForTesting, 'handleNavigation').mockReturnValue(null)
  //
  //   onKeyPress(ArrowActions.DOWN, returnFn)
  //
  //   expect(returnFn).toHaveBeenCalled()
  // })

  // it('should invoke handleNavigation to get the next node', () => {
  //   const dummyStr = ' 🔍'
  //   const prevNode = { innerHTML: `prev ${dummyStr}` } as unknown as KetchHTMLElement
  //   const nextNode = { innerHTML: 'next' } as unknown as KetchHTMLElement
  //   jest.spyOn(exportedForTesting, 'handleNavigation').mockImplementation(_ => {
  //     return [prevNode, nextNode]
  //   })
  //
  //   onKeyPress(ArrowActions.DOWN, jest.fn())
  //
  //   expect(prevNode.innerHTML).toBe('prev')
  //   expect(nextNode.innerHTML).toBe(`next ${dummyStr}`)
  // })
})
