import { wrapLogger } from '@ketch-sdk/ketch-logging'
import { clearCachedDomNode, getCachedDomNode, KEYBOARD_HANDLER_CACHE_KEYS, setCachedDomNode } from './cache'
import { LANYARD_ID } from './constants'
import {
  ArrowActions,
  BannerActionTree,
  DataNav,
  EXPERIENCES,
  KetchHTMLElement,
  SelectionObject,
  SupportedUserAgents,
  UserAgentHandlerMap,
} from './keyboardHandler.types'
import log from './log'
import { decodeDataNav } from './utils'

export const getUserAgent = (): SupportedUserAgents | undefined => {
  const l = wrapLogger(log, 'getUserAgent')
  const userAgentStr = navigator.userAgent.toUpperCase()
  const agent = Object.values(SupportedUserAgents).find(i => userAgentStr.search(i) !== -1)
  if (!agent) {
    l.debug(`Unsupported userAgent: ${userAgentStr}`)
    return
  } else {
    return agent
  }
}

export const getArrowActionFromUserAgent = (event: KeyboardEvent) => {
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
  if (userAgentKeyMap[event.keyCode]) {
    return userAgentKeyMap[event.keyCode]
  } else {
    l.debug(`Unknown key: ${event.keyCode}`)
    return ArrowActions.UNKNOWN
  }
}

export const clearCachedNodes = () => {
  Object.values(KEYBOARD_HANDLER_CACHE_KEYS).forEach(i => {
    clearCachedDomNode(i)
  })
}

export const handleSelection = () => {
  const node = getCachedDomNode(KEYBOARD_HANDLER_CACHE_KEYS.CTX_KEY) as KetchHTMLElement
  if (node && typeof node.click === 'function') {
    node.click()
  }
}

export const buildTree = (allClickables: NodeList): BannerActionTree | undefined => {
  const l = wrapLogger(log, 'buildTree')
  if (allClickables.length === 0) {
    return []
  }
  const nodes: KetchHTMLElement[] = [...allClickables]
    .filter(i => i instanceof HTMLElement)
    .map(j => {
      const i = j as KetchHTMLElement
      if (!i.ketch) {
        i.ketch = {}
      }
      // eg. data-nav="eyJleHBlcmllbmNlIjoia2V0Y2gtY29uc2VudC1iYW5uZXIiLCJuYXYtaW5kZXgiOjJ9"
      i.ketch.navParsed = decodeDataNav(i.dataset.nav || '') as DataNav
      return i
    })

  const currentExperience = decodeDataNav(nodes[0].dataset.nav || '').experience
  if (currentExperience === EXPERIENCES.BANNER) {
    const sortedNodes = nodes.sort((a, b) => {
      if (!a.ketch.navParsed || !b.ketch.navParsed) {
        return 0
      }
      return a.ketch.navParsed['nav-index'] - b.ketch.navParsed['nav-index']
    })
    l.debug(sortedNodes)
    return sortedNodes
  } else if (currentExperience === EXPERIENCES.MODAL) {
    return nodes
  } else if (currentExperience === EXPERIENCES.PREFERENCES) {
    return nodes
  } else {
    return
  }
}

export const navigateBannerTree = (tree: BannerActionTree, arrowAction: ArrowActions, ctxNode: KetchHTMLElement) => {
  const l = wrapLogger(log, 'navigateBannerTree')
  const index = tree.findIndex(i => i.ketch.navParsed['nav-index'] === ctxNode.ketch.navParsed['nav-index'])
  l.debug('Starting at: ', index)
  switch (arrowAction) {
    case ArrowActions.UP:
    case ArrowActions.LEFT:
      if (index === tree.length - 1) {
        l.debug('Cannot move past last node')
        return
      }
      return tree[index + 1]
    case ArrowActions.RIGHT:
    case ArrowActions.DOWN:
      if (index === 0) {
        l.debug('Cannot move beyond first node')
        return
      }
      return tree[index - 1]
    default:
      l.error('Unknown arrowAction: ', arrowAction)
      return
  }
}

export const handleNavigation = (arrowAction: ArrowActions): SelectionObject | null => {
  const l = wrapLogger(log, 'handleNavigation')
  l.debug('Navigating ', arrowAction)
  const lanyard = getCachedDomNode(KEYBOARD_HANDLER_CACHE_KEYS.LANYARD_DOM, document.getElementById(LANYARD_ID))

  if (lanyard === null) {
    l.debug('Cannot find lanyard root')
    return null
  } else if (!(lanyard instanceof HTMLElement)) {
    l.debug('Storage inconsistent')
    return null
  }

  const allClickables = getCachedDomNode(
    KEYBOARD_HANDLER_CACHE_KEYS.FOCUSABLE_ELEMS,
    lanyard.querySelectorAll('button, input'),
  ) as NodeList
  const tree = buildTree(allClickables)
  if (!tree) {
    l.debug('Cannot find experience(banner|modal|pref) root')
    return null
  }

  const ctxNode = getCachedDomNode(KEYBOARD_HANDLER_CACHE_KEYS.CTX_KEY) as KetchHTMLElement
  const nextNode = !ctxNode ? tree[0] : navigateBannerTree(tree, arrowAction, ctxNode) || null

  if (nextNode) {
    l.debug('Updating cached context node: ', nextNode)
    setCachedDomNode(KEYBOARD_HANDLER_CACHE_KEYS.CTX_KEY, nextNode)
  }
  return { prevNode: ctxNode, nextNode }
}

function onKeyPress(input: KeyboardEvent | ArrowActions, returnKeyboardControl: () => void) {
  const l = wrapLogger(log, 'onKeyPress')
  const arrowAction = typeof input === 'string' ? input : getArrowActionFromUserAgent(input)

  l.debug('Processing movement: ', arrowAction)

  if (arrowAction === ArrowActions.UNKNOWN) {
    const badInput = typeof input === 'string' ? input : input.keyCode
    l.error(`Unknown input: ${badInput}`)
    l.debug('returning keyboard control')
    clearCachedNodes()
    returnKeyboardControl()
  } else if (arrowAction === ArrowActions.BACK) {
    l.debug('returning keyboard control')
    clearCachedNodes()
    returnKeyboardControl()
  } else if (arrowAction === ArrowActions.OK) {
    handleSelection()
  } else {
    const nodes = handleNavigation(arrowAction)
    if (!nodes) {
      // Error or no next node
      /* Improvements: Add errorCodes and beam it to rollbar */
      l.debug('returning keyboard control')
      clearCachedNodes()
      returnKeyboardControl()
    } else {
      const { prevNode, nextNode } = nodes
      if (prevNode && nextNode) {
        prevNode.innerHTML = prevNode.innerHTML.replace(' 🔍', '')
        prevNode.classList.remove('active')
        prevNode.classList.remove('selected')
      }
      if (nextNode) {
        nextNode.classList.add('active')
        nextNode.classList.add('selected')
        nextNode.innerHTML = nextNode.innerHTML + ' 🔍'
      }
    }
  }
}

export default onKeyPress
