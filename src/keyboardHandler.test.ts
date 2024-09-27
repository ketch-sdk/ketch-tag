import { KEYBOARD_HANDLER_CACHE_KEYS } from './cache'
import onKeyPress from './keyboardHandler'
import * as testExports from './keyboardHandler'
import * as utils from './utils'

import { ArrowActions, DataNav, SupportedUserAgents, UserAgentHandlerMap } from './keyboardHandler.types'
import log from './log'
import * as cache from './cache'
import { LANYARD_ID } from './constants'

jest.mock('./log')

describe('keyboardHandler: onKeyPress', () => {
  const loggerName = '[onKeyPress]'
  beforeEach(jest.resetAllMocks)

  it('should log error on unknown keycode and return keyboard control', () => {
    const unknownTizenKey = -1
    const fn = jest.fn()
    jest.spyOn(window.navigator, 'userAgent', 'get').mockReturnValue('Tizen')
    const spy = jest.spyOn(cache, 'clearCacheEntry')

    onKeyPress({ keyCode: unknownTizenKey } as KeyboardEvent, fn)

    expect(log.error).toHaveBeenCalledWith(loggerName, `Unknown input: ${unknownTizenKey}`)
    expect(spy).toHaveBeenCalled()
    expect(fn).toHaveBeenCalled()
  })

  it('should log error on unknown userAgent and return keyboard control', () => {
    const unknownUserAgent = 'sagar'
    const fn = jest.fn()
    jest.spyOn(window.navigator, 'userAgent', 'get').mockReturnValue(unknownUserAgent)
    const spy = jest.spyOn(cache, 'clearCacheEntry')

    onKeyPress({ keyCode: 37 } as KeyboardEvent, fn)

    expect(log.error).toHaveBeenCalledWith(loggerName, `Unknown input: 37`)
    expect(spy).toHaveBeenCalled()
    expect(fn).toHaveBeenCalled()
  })

  it('should return keyboard control on back keycode', () => {
    const fn = jest.fn()
    const spy = jest.spyOn(cache, 'clearCacheEntry')
    onKeyPress(ArrowActions.BACK, fn)

    expect(spy).toHaveBeenCalled()
    expect(fn).toHaveBeenCalled()
  })

  it('should returnKeyboardControl when the next node to navigate is undefined', () => {
    const returnFn = jest.fn()
    jest.spyOn(testExports, 'handleNavigation').mockReturnValue(null)

    onKeyPress(ArrowActions.DOWN, returnFn)

    expect(returnFn).toHaveBeenCalled()
  })

  it('should invoke handleNavigation to get the next node', () => {
    const spy = jest.spyOn(testExports, 'handleNavigation')

    onKeyPress(ArrowActions.DOWN, jest.fn())

    expect(spy).toHaveBeenCalled()
  })
})

describe('keyboardHandler: getUserAgent', () => {
  const loggerName = '[getUserAgent]'
  it('should return user agent if supported', () => {
    const spy = jest.spyOn(window.navigator, 'userAgent', 'get').mockReturnValue('Tizen')

    const result = testExports.getUserAgent()

    expect(spy).toHaveBeenCalled()
    expect(result).toBe(SupportedUserAgents.TIZEN)
  })

  it('should be case insensitive when matching user agents', () => {
    const spy = jest.spyOn(window.navigator, 'userAgent', 'get').mockReturnValue('TIzEn')

    const result = testExports.getUserAgent()

    expect(spy).toHaveBeenCalled()
    expect(result).toBe(SupportedUserAgents.TIZEN)
  })

  it('should search for keyword in the user agent string', () => {
    const str = `Mozilla/5.0 (SMART-TV; Linux; Tizen 2.3) AppleWebkit/538.1 (KHTML, like Gecko)
     SamsungBrowser/1.0 TV Safari/538.1`
    const spy = jest.spyOn(window.navigator, 'userAgent', 'get').mockReturnValue(str)

    const result = testExports.getUserAgent()

    expect(spy).toHaveBeenCalled()
    expect(result).toBe(SupportedUserAgents.TIZEN)
  })

  it('should log and return undefined for unknown agents', () => {
    const spy = jest.spyOn(window.navigator, 'userAgent', 'get').mockReturnValue('sagar')

    const result = testExports.getUserAgent()

    expect(spy).toHaveBeenCalled()
    expect(result).toBeUndefined()
    expect(log.debug).toHaveBeenCalledWith(loggerName, 'Unsupported userAgent: SAGAR')
  })
})

describe('keyboardHandler: getArrowActionFromUserAgent', () => {
  const loggerName = '[getArrowActionFromUserAgent]'
  it.each(Object.values(SupportedUserAgents))('should support all ArrowActions for user agent: %s', agent => {
    Object.keys(ArrowActions)
      .filter(i => i !== ArrowActions.UNKNOWN)
      .forEach(action => {
        const keyToNavMap = UserAgentHandlerMap[agent]
        expect(keyToNavMap).toBeDefined()
        const supportedNavs = Object.values(keyToNavMap).filter(i => i !== ArrowActions.UNKNOWN)
        expect(supportedNavs).toContain(action)
      })
  })

  it('should return the ArrowAction', () => {
    const spy = jest.spyOn(testExports, 'getUserAgent').mockImplementation(() => SupportedUserAgents.TIZEN)
    const result = testExports.getArrowActionFromUserAgent({ keyCode: 37 } as KeyboardEvent)
    expect(spy).toHaveBeenCalled()
    expect(result).toBe(ArrowActions.LEFT)
  })

  it('should return UNKNOWN for unsupported user agent and log line', () => {
    jest.spyOn(window.navigator, 'userAgent', 'get').mockReturnValue('unsupported')
    const spy = jest.spyOn(testExports, 'getUserAgent').mockImplementation(() => undefined)

    const result = testExports.getArrowActionFromUserAgent({} as KeyboardEvent)

    expect(spy).toHaveBeenCalled()
    expect(result).toEqual(ArrowActions.UNKNOWN)
    expect(log.debug).toHaveBeenCalledWith(loggerName, 'Unknown userAgent: unsupported')
  })

  it('should return UNKNOWN if user agent key configuration is missing', () => {
    const spy = jest.spyOn(testExports, 'getUserAgent').mockImplementation(() => 'unsupported' as SupportedUserAgents)

    const result = testExports.getArrowActionFromUserAgent({} as KeyboardEvent)
    expect(spy).toHaveBeenCalled()
    expect(result).toEqual(ArrowActions.UNKNOWN)
    expect(log.debug).toHaveBeenCalledWith(loggerName, 'Misconfigured userAgent: unsupported')
  })
})

describe('keyboardHandler: clearCachedNodes', () => {
  it('should call cache utility for every KEYBOARD_HANDLER_CACHE_KEY', () => {
    const spy = jest.fn()
    jest.spyOn(cache, 'clearCacheEntry').mockImplementation(spy)

    testExports.clearCachedNodes()
    Object.values(KEYBOARD_HANDLER_CACHE_KEYS).forEach((v, i) => {
      expect(spy).toHaveBeenNthCalledWith(i + 1, v)
    })
  })
})

describe('keyboardHandler: handleSelection', () => {
  it('should get the currently selected node from the cache', () => {
    const spy = jest.spyOn(cache, 'getCachedNavNode').mockReturnValue({} as DataNav)

    testExports.handleSelection()

    expect(spy).toHaveBeenCalled()
  })

  it('should click on the currently selected node', () => {
    const spy = jest.fn()
    jest.spyOn(utils, 'getDomNode').mockReturnValue({ click: spy } as unknown as HTMLElement)

    testExports.handleSelection()

    expect(spy).toHaveBeenCalled()
  })

  it('should validate if node has a click function', () => {
    jest.spyOn(cache, 'getCachedNavNode').mockReturnValue(undefined as unknown as DataNav)

    expect(testExports.handleSelection).not.toThrow()

    jest.spyOn(cache, 'getCachedNavNode').mockReturnValue({} as unknown as DataNav)
    expect(testExports.handleSelection).not.toThrow()
  })

  it('should clear cache when flag set to true', () => {
    const spy = jest.spyOn(testExports, 'clearCachedNodes')
    jest.spyOn(cache, 'getCachedNavNode').mockReturnValue({ click: jest.fn() } as unknown as DataNav)

    testExports.handleSelection(true)

    expect(spy).toHaveBeenCalled()
  })
})

describe('keyboardHandler: getBannerTree', () => {
  it('should return an empty list if no clickable items are passed', () => {
    const a = [] as unknown as DataNav[]
    expect(testExports.getBannerTree(a)).toEqual([])
  })

  it('should sort nodes by nav-index for Banner Experience', () => {
    const nodes = [
      { experience: 'ketch-consent-banner', 'nav-index': 2 },
      { experience: 'ketch-consent-banner', 'nav-index': 1 },
    ] as DataNav[]

    const results = testExports.getBannerTree(nodes)

    expect(Array.isArray(results)).toBeTruthy()
    expect(results.length === 2).toBeTruthy()
    expect(results[0]['nav-index']).toBeLessThan(results[1]['nav-index'])
  })
})

describe('keyboardHandler: navigateBannerTree', () => {
  const loggerName = '[navigateBannerTree]'
  // @ts-ignore
  const tree: DataNav[] = [
    { src: 'a', ['nav-index']: 2 },
    { src: 'b', ['nav-index']: 1 },
    { src: 'c', ['nav-index']: 3 },
  ] as DataNav[]

  it('should init correctly', () => {
    const sortedTree = testExports.getBannerTree(tree)
    expect(sortedTree).toHaveLength(3)
    expect(sortedTree[0]['nav-index']).toBeLessThan(sortedTree[1]['nav-index'])
    expect(sortedTree[1]['nav-index']).toBeLessThan(sortedTree[2]['nav-index'])
  })

  it('should navigate left-to-right low-nav-index to high-nav-index', () => {
    const ctx = tree[1]
    const sortedTree = testExports.getBannerTree(tree)
    let result = testExports.navigateBannerTree(sortedTree, ArrowActions.LEFT, ctx)
    expect(result).not.toBeNull()
    // @ts-ignore
    expect(result['nav-index']).toEqual(sortedTree[0]['nav-index'])

    result = testExports.navigateBannerTree(sortedTree, ArrowActions.RIGHT, ctx)
    expect(result).not.toBeNull()
    // @ts-ignore
    expect(result['nav-index']).toEqual(sortedTree[2]['nav-index'])
  })

  it.skip('should navigate up-to-down low-nav-index to high-nav-index', () => {
    const ctx = tree[1]

    let result = testExports.navigateBannerTree(tree, ArrowActions.UP, ctx)
    expect(result).not.toBeNull()
    // @ts-ignore
    expect(result['nav-index']).toEqual(tree[0]['nav-index'])

    result = testExports.navigateBannerTree(tree, ArrowActions.DOWN, ctx)
    expect(result).not.toBeNull()
    // @ts-ignore
    expect(result['nav-index']).toEqual(tree[2]['nav-index'])
  })

  it('should return undefined (LTR) if there are no nodes to navigate', () => {
    const ctx = tree[0]

    const result = testExports.navigateBannerTree(tree, ArrowActions.LEFT, ctx)
    expect(result).toBeNull()
  })

  it('should return undefined (UTD) if there are no nodes to navigate', () => {
    const ctx = tree[0]

    const result = testExports.navigateBannerTree(tree, ArrowActions.UP, ctx)
    expect(result).toBeNull()
  })

  it('should return null for other arrowActions and log', () => {
    const ctx = tree[2]

    const result = testExports.navigateBannerTree(tree, 'INVALID_ARROW' as ArrowActions, ctx)
    expect(result).toBeNull()
    expect(log.debug).toHaveBeenCalledWith(loggerName, 'Unknown arrowAction: ', 'INVALID_ARROW')
  })
})

describe('keyboardHandler: handleNavigation', () => {
  const loggerName = '[handleNavigation]'

  beforeEach(() => {
    jest.resetAllMocks()
  })

  it('should return null if lanyard root is absent', () => {
    jest.spyOn(cache, 'getCachedNavNode').mockImplementation(() => null)

    const r = testExports.handleNavigation(ArrowActions.LEFT)
    expect(r).toBeNull()
  })

  it('should detect tampered storage and return null', () => {
    jest.spyOn(cache, 'getLanyardRoot').mockReturnValue(null)

    const r = testExports.handleNavigation(ArrowActions.LEFT)

    expect(log.debug).toHaveBeenNthCalledWith(2, loggerName, 'Cannot find lanyard root')
    expect(r).toBeNull()
  })

  it('should parse data-nav and build KetchHTMLElement', () => {
    const parser = new DOMParser()
    const doc = parser.parseFromString(
      `
        <div id="lanyard_root">
          <button data-nav="1">btn 1</button>
          <button data-nav="2">btn 2</button>
        </div>
      `,
      'text/html',
    )
    jest.spyOn(document, 'getElementById').mockReturnValue(doc.getElementById(LANYARD_ID))
    const decoderSpy = jest.spyOn(utils, 'decodeDataNav').mockReturnValue({
      experience: 'ketch-consent-banner',
      'nav-index': 1,
    } as DataNav)
    const treeSpy = jest.spyOn(testExports, 'getBannerTree')

    testExports.handleNavigation(ArrowActions.LEFT)

    expect(decoderSpy).toHaveBeenNthCalledWith(1, '1')
    expect(decoderSpy).toHaveBeenNthCalledWith(2, '2')
    expect(treeSpy).toHaveBeenCalled()
    const args = treeSpy.mock.calls[0][0]
    args.forEach(i => {
      expect(i).toBeDefined()
    })
  })

  it('should return undefined if the experience is not handled', () => {
    const dummyExp = { experience: 'fresh-new-experience' } as DataNav
    const parser = new DOMParser()
    const doc = parser.parseFromString('<div id="lanyard_root"><button data-nav="1">btn 1</button></div>', 'text/html')
    jest.spyOn(document, 'getElementById').mockReturnValue(doc.getElementById(LANYARD_ID))
    jest.spyOn(utils, 'decodeDataNav').mockReturnValue(dummyExp)

    const results = testExports.handleNavigation(ArrowActions.LEFT)
    expect(log.debug).toHaveBeenCalledWith(loggerName, 'unhandled experience fresh-new-experience')
    expect(results).not.toBeNull()
    // @ts-ignore
    expect(results.next).toBeNull()
  })
})
