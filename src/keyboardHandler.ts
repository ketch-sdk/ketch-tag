import { wrapLogger } from '@ketch-sdk/ketch-logging'
import { decodeDataNav } from './utils'
import { getCachedDomNode, KEYBOARD_HANDLER_CACHE_KEYS, setCachedDomNode } from './cache'
import { LANYARD_ID } from './constants'
import {
  BannerActionTree,
  DataNav,
  EXPERIENCES,
  KetchHTMLElement,
} from './keyboardHandler.types'
import log from './log'

enum SupportedUserAgents {
  TIZEN = 'TIZEN',
}

export enum ArrowActions {
  LEFT = 'LEFT',
  RIGHT = 'RIGHT',
  UP = 'UP',
  DOWN = 'DOWN',
  BACK = 'BACK',
  OK = 'OK',
  UNKNOWN = 'UNKNOWN',
}

const UserAgentHandlerMap: Record<SupportedUserAgents, (keyCode: number) => ArrowActions> = {
  [SupportedUserAgents.TIZEN]: TizenKeyBoardHandler,
}

function TizenKeyBoardHandler(keyCode: number): ArrowActions {
  const l = wrapLogger(log, 'TizenKeyboardHandler')
  switch (keyCode) {
    case 37:
      return ArrowActions.LEFT
    case 38:
      return ArrowActions.UP
    case 39:
      return ArrowActions.RIGHT
    case 40:
      return ArrowActions.DOWN
    case 13:
      return ArrowActions.OK
    case 10009:
      return ArrowActions.BACK
    default:
      l.debug(`Unhandled Key code: ${keyCode}`)
      return ArrowActions.UNKNOWN
  }
}

function getUserAgent(): SupportedUserAgents | undefined {
  const l = wrapLogger(log, 'getUserAgent')
  const userAgentStr = navigator.userAgent.toUpperCase()
  if (userAgentStr.search(SupportedUserAgents.TIZEN) === -1) {
    l.debug(`Non Tizen device trying to use remote control: ${userAgentStr}`)
    return
  }
  return SupportedUserAgents.TIZEN
}

function handleSelection() {
  const node = getCachedDomNode(KEYBOARD_HANDLER_CACHE_KEYS.CTX_KEY) as KetchHTMLElement
  if (node && typeof node.click === 'function') {
    node.click()
  }
}

function handleNavigation(arrowAction: ArrowActions): void {
  const l = wrapLogger(log, 'handleNavigation')
  l.debug('Navigating ', arrowAction)
  const lanyard = getCachedDomNode(KEYBOARD_HANDLER_CACHE_KEYS.LANYARD_DOM, document.getElementById(LANYARD_ID))
  if (lanyard === null) {
    l.error('Cannot find lanyard root')
    return
  }
  else if(!(lanyard instanceof HTMLElement)) {
    l.error('Storage inconsistent')
    return
  }
  const allClickables = getCachedDomNode(
    KEYBOARD_HANDLER_CACHE_KEYS.FOCUSABLE_ELEMS,
    lanyard.querySelectorAll('button, input'),
  ) as NodeList
  const tree = buildTree(allClickables)
  if(!tree) {
    l.debug('Cannot find experience root')
    return
  }
  const ctxNode = getCachedDomNode(KEYBOARD_HANDLER_CACHE_KEYS.CTX_KEY, tree[0]) as KetchHTMLElement
  const nextNode = navigateBannerTree(tree, arrowAction, ctxNode)
  if(!nextNode) { return }
  setCachedDomNode(KEYBOARD_HANDLER_CACHE_KEYS.CTX_KEY, nextNode)
  nextNode.innerHTML = nextNode.innerHTML + ' 🔍'
  /* TODO LIST
   * <done> Retrieve current context
   * Understand DOM -> build map of experiences
   * Navigate to next actionableToken
   * <done> Mark it as selected/focussed
   * actionableToken = [button, inputs, filter(i.role === 'link') for Cookies Link in pref manager]
   * Let's call the expansion buttons as name='combo-buttons'
   * <done = x>Let's leverage tabIndex. document.querySelectorAll('[tabindex]')
   * <done = x>...easier way via accessibility? -> culled focusableElements.
   */
}

function buildTree(allClickables: NodeList): BannerActionTree | undefined {
  if(allClickables.length === 0) { return [] }
  const nodes: KetchHTMLElement[] = [...allClickables]
    .filter(i => i instanceof HTMLElement)
    .map(j => {
      const i = j as KetchHTMLElement
      if(!i.ketch) {
        i.ketch = {}
      }
      // eg. data-nav='{"experience":"ketch-consent-banner","action":"close","navIndex":1}'
      i.ketch.navParsed = decodeDataNav(i.dataset.nav || '') as DataNav
      return i
    })

  const currentExperience = decodeDataNav(nodes[0].dataset.nav || '').experience
  if(currentExperience === EXPERIENCES.BANNER) {
    return nodes.sort((a, b) => {
      if(!a.ketch.navParsed || !b.ketch.navParsed) { return 0 }
      return a.ketch.navParsed['nav-index'] - b.ketch.navParsed['nav-index']
    })
  }
  else if(currentExperience === EXPERIENCES.MODAL) {
    return nodes
  }
  else if(currentExperience === EXPERIENCES.PREFERENCES) {
    return nodes
  }
  else { return }
}

function navigateBannerTree(tree: BannerActionTree, arrowAction: ArrowActions, ctxNode: KetchHTMLElement) {
  const index = tree.findIndex(i => i.ketch.navParsed['nav-index'] === ctxNode.ketch.navParsed['nav-index'])
  switch (arrowAction) {
    case ArrowActions.UP:
    case ArrowActions.LEFT:
      if(index === 0) { return }
      return tree[index-1]
    case ArrowActions.RIGHT:
    case ArrowActions.DOWN:
      if(index === tree.length - 1) { return }
      return tree[index+1]
    default:
      return
  }
}

function getArrowActionFromUserAgent(event: KeyboardEvent) {
  const l = wrapLogger(log, 'getArrowActionFromUserAgent')
  const userAgent = getUserAgent()
  if (!userAgent) {
    l.debug(`Unknown userAgent: ${navigator.userAgent}`)
    return ArrowActions.UNKNOWN
  }
  /*
   * MDN has deprecated keyCode from KeyboardAPI.
   * 1. However, all the browsers support it.
   * 2. Tizen (6+) supports only keyCode.
   * 3. Reevaluate this decision when Tizen upgrades to support KeyboardAPI key
   */
  const userAgentKeyMap = UserAgentHandlerMap[userAgent]
  if (!userAgentKeyMap) {
    l.debug(`Misconfigured userAgent: ${userAgent}`)
    return ArrowActions.UNKNOWN
  }
  return userAgentKeyMap(event.keyCode)

}

function onKeyPress(input: KeyboardEvent | ArrowActions) {
  const l = wrapLogger(log, 'onKeyPress')
  l.debug(input, typeof input === 'string')
  const arrowAction = (typeof input === 'string') ? input : getArrowActionFromUserAgent(input)

  if (arrowAction === ArrowActions.UNKNOWN) {
    const badInput = (typeof  input === 'string') ? input : input.keyCode
    l.error(`Unknown input: ${badInput}`)
    return
  } else if (arrowAction === ArrowActions.OK) {
    handleSelection()
  } else {
    handleNavigation(arrowAction)
  }
}

export default onKeyPress
