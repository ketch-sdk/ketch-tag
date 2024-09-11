import { KEYBOARD_HANDLER_CACHE_KEYS } from './cache'
import onKeyPress from './keyboardHandler'
import * as testExports from './keyboardHandler'
import * as utils from './utils'

import {
  ArrowActions,
  BannerActionTree,
  KetchHTMLElement,
  SupportedUserAgents,
  UserAgentHandlerMap,
} from './keyboardHandler.types'
import log from './log'
import * as cache from './cache'

jest.mock('./log')

describe('keyboardHandler: onKeyPress', () => {
  const loggerName = '[onKeyPress]'
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

  it('should returnKeyboardControl when the next node to navigate is undefined', () => {
    const returnFn = jest.fn()
    jest.spyOn(testExports, 'handleNavigation').mockReturnValue(null)

    onKeyPress(ArrowActions.DOWN, returnFn)

    expect(returnFn).toHaveBeenCalled()
  })

  it('should invoke handleNavigation to get the next node', () => {
    const parser = new DOMParser()
    const doc = parser.parseFromString('<span class="selected">prev 🔍</span><span>next</span>', 'text/html')
    const prevNode = doc.body.childNodes[0] as KetchHTMLElement
    const nextNode = doc.body.childNodes[1] as KetchHTMLElement
    jest.spyOn(testExports, 'handleNavigation').mockImplementation(() => {
      return { prevNode, nextNode }
    })

    onKeyPress(ArrowActions.DOWN, jest.fn())

    expect(prevNode.innerHTML).toBe('prev')
    expect(nextNode.innerHTML).toBe(`next 🔍`)
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
    jest.spyOn(cache, 'clearCachedDomNode').mockImplementation(spy)

    testExports.clearCachedNodes()
    Object.values(KEYBOARD_HANDLER_CACHE_KEYS).forEach((v, i) => {
      expect(spy).toHaveBeenNthCalledWith(i + 1, v)
    })
  })
})

describe('keyboardHandler: handleSelection', () => {
  it('should get the currently selected node from the cache', () => {
    const spy = jest.spyOn(cache, 'getCachedDomNode').mockReturnValue({} as KetchHTMLElement)

    testExports.handleSelection()

    expect(spy).toHaveBeenCalled()
  })

  it('should click on the currently selected node', () => {
    const spy = jest.fn()
    jest.spyOn(cache, 'getCachedDomNode').mockReturnValue({ click: spy } as unknown as KetchHTMLElement)

    testExports.handleSelection()

    expect(spy).toHaveBeenCalled()
  })

  it('should validate if node has a click function', () => {
    jest.spyOn(cache, 'getCachedDomNode').mockReturnValue(undefined as unknown as KetchHTMLElement)

    expect(testExports.handleSelection).not.toThrow()

    jest.spyOn(cache, 'getCachedDomNode').mockReturnValue({} as unknown as KetchHTMLElement)
    expect(testExports.handleSelection).not.toThrow()
  })
})

describe('keyboardHandler: buildTree', () => {
  it('should return an empty list if no clickable items are passed', () => {
    const a = [] as unknown as NodeList
    expect(testExports.buildTree(a)).toEqual([])
  })

  it('should parse data-nav and build KetchHTMLElement', () => {
    const parser = new DOMParser()
    const doc = parser.parseFromString(
      `
        <button data-nav="1">btn 1</button>
        <button data-nav="2">btn 2</button>
      `,
      'text/html',
    )
    const spy = jest.spyOn(utils, 'decodeDataNav').mockImplementation(str => {
      return { experience: 'ketch-consent-banner', 'nav-index': parseInt(str) }
    })

    const results = testExports.buildTree(doc.querySelectorAll('button')) as BannerActionTree

    expect(results).toBeDefined()
    expect(spy).toHaveBeenNthCalledWith(1, '1')
    expect(spy).toHaveBeenNthCalledWith(2, '2')
    results.forEach(i => {
      expect(i.ketch).toBeDefined()
    })
  })

  it('should sort nodes by nav-index for Banner Experience', () => {
    const parser = new DOMParser()
    const doc = parser.parseFromString(
      `
        <button data-nav="1">btn 1</button>
        <button data-nav="2">btn 2</button>
      `,
      'text/html',
    )
    jest.spyOn(utils, 'decodeDataNav').mockImplementation(str => {
      return { experience: 'ketch-consent-banner', 'nav-index': parseInt(str) }
    })

    const results = testExports.buildTree(doc.querySelectorAll('button')) as BannerActionTree

    expect(Array.isArray(results)).toBeTruthy()
    expect(results.length === 2).toBeTruthy()
    expect(results[0].ketch.navParsed['nav-index']).toBeLessThan(results[1].ketch.navParsed['nav-index'])
  })

  it('should return undefined if the experience is not handled', () => {
    const parser = new DOMParser()
    const doc = parser.parseFromString('<button data-nav="1">btn 1</button>', 'text/html')
    jest.spyOn(utils, 'decodeDataNav').mockImplementation(() => {
      return { experience: 'fresh-new-experience' }
    })

    const results = testExports.buildTree(doc.querySelectorAll('button')) as BannerActionTree
    expect(results).toBeUndefined()
  })
})

describe('keyboardHandler: navigateBannerTree', () => {
  const loggerName = '[navigateBannerTree]'
  const tree: BannerActionTree = []
  beforeAll(() => {
    const parser = new DOMParser()
    const doc = parser.parseFromString(
      `
          <button data-nav="1">btn 1</button>
          <button data-nav="2">btn 2</button>
          <button data-nav="3">btn 3</button>
        `,
      'text/html',
    )
    doc.querySelectorAll('button').forEach(i => {
      const n = i as unknown as KetchHTMLElement
      n.ketch = {
        navParsed: {
          experience: 'ketch-consent-banner',
          ['nav-index']: parseInt(n.dataset.nav as string),
        },
      }
      tree.push(n)
    })
  })

  it('should init correctly', () => {
    expect(tree).toHaveLength(3)
    expect(tree[0].ketch.navParsed['nav-index']).toBeLessThan(tree[1].ketch.navParsed['nav-index'])
    expect(tree[1].ketch.navParsed['nav-index']).toBeLessThan(tree[2].ketch.navParsed['nav-index'])
  })

  it('should navigate left-to-right low-nav-index to high-nav-index', () => {
    const ctx = tree[1]

    let result = testExports.navigateBannerTree(tree, ArrowActions.LEFT, ctx) as KetchHTMLElement
    expect(result.innerHTML).toEqual(tree[2].innerHTML)

    result = testExports.navigateBannerTree(tree, ArrowActions.RIGHT, ctx) as KetchHTMLElement
    expect(result.innerHTML).toEqual(tree[0].innerHTML)
  })

  it('should navigate up-to-down low-nav-index to high-nav-index', () => {
    const ctx = tree[1]

    let result = testExports.navigateBannerTree(tree, ArrowActions.UP, ctx) as KetchHTMLElement
    expect(result.innerHTML).toEqual(tree[2].innerHTML)

    result = testExports.navigateBannerTree(tree, ArrowActions.DOWN, ctx) as KetchHTMLElement
    expect(result.innerHTML).toEqual(tree[0].innerHTML)
  })

  it('should return undefined if there are no nodes to navigate', () => {
    const ctx = tree[2]

    const result = testExports.navigateBannerTree(tree, ArrowActions.LEFT, ctx)
    expect(result).toBeUndefined()
  })

  it('should return undefined for other arrowActions and log', () => {
    const ctx = tree[2]

    const result = testExports.navigateBannerTree(tree, ArrowActions.OK, ctx)
    expect(result).toBeUndefined()
    expect(log.debug).toHaveBeenCalledWith(loggerName, 'Unknown arrowAction: ', ArrowActions.OK)
  })
})
