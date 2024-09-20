import { wrapLogger } from '@ketch-sdk/ketch-logging'
import { clearCacheEntry, getCachedDomNode, KEYBOARD_HANDLER_CACHE_KEYS, setCachedDomNode } from './cache'
import { LANYARD_ID } from './constants'
import {
  ActionItemStack,
  ActionItemsTree,
  ArrowActions,
  EXPERIENCES,
  focusVisibleClasses,
  KetchHTMLElement,
  LanyardItemActions,
  SelectionObject,
  SupportedUserAgents,
  UserAgentHandlerMap,
} from './keyboardHandler.types'
import log from './log'
import { convertToKetchHTMLElement } from './utils'

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
  /*
   * Perf optimization - do not clear Lanyard root, unless hideExp
   */
  Object.values(KEYBOARD_HANDLER_CACHE_KEYS).forEach(i => {
    clearCacheEntry(i)
  })
}

export const handleSelection = () => {
  const node = getCachedDomNode(KEYBOARD_HANDLER_CACHE_KEYS.CTX_KEY) as KetchHTMLElement
  if (node && typeof node.click === 'function') {
    clearCachedNodes()
    node.click()
  }
}

export const getModalStacks = (nodes: KetchHTMLElement[]): ActionItemStack => {
  const l = wrapLogger(log, 'getModalStacks')
  if (nodes.length === 0) {
    l.debug('no clickable nodes')
    return { topNodes: [] }
  }
  const topNodes = nodes
    .filter(i => i.ketch.navParsed.subExperience === undefined)
    .sort((a, b) => {
      if (!a.ketch.navParsed || !b.ketch.navParsed) {
        return 0
      }
      return a.ketch.navParsed['nav-index'] - b.ketch.navParsed['nav-index']
    })
  l.debug(
    'top nodes:',
    topNodes.map(i => i.ketch.navParsed),
  )

  const expandNodes = nodes
    .filter(i => i.ketch.navParsed.subExperience && i.ketch.navParsed.action === LanyardItemActions.expand)
    .sort((a, b) => {
      return a.ketch.navParsed.subExperience - b.ketch.navParsed.subExperience
    })
  l.debug(
    'expand nodes:',
    expandNodes.map(i => i.ketch.navParsed),
  )

  const switchNodes = nodes
    .filter(i => i.ketch.navParsed.subExperience && i.ketch.navParsed.action === LanyardItemActions.switch)
    .sort((a, b) => {
      return a.ketch.navParsed.subExperience - b.ketch.navParsed.subExperience
    })
  l.debug(
    'switch nodes:',
    switchNodes.map(i => i.ketch.navParsed),
  )

  return {
    expandNodes: expandNodes.length > 0 ? expandNodes : undefined,
    switchNodes: switchNodes.length > 0 ? switchNodes : undefined,
    topNodes,
  }
}

export const navigateModalStacks = (
  stacks: ActionItemStack,
  arrowAction: ArrowActions,
  ctxNode: KetchHTMLElement | null,
): KetchHTMLElement | undefined => {
  const l = wrapLogger(log, 'navigateModalStacks')
  if (!stacks || !stacks.topNodes || !stacks.topNodes?.length) {
    l.debug('no top nodes found in the modal')
    return undefined
  }
  if (ctxNode === null) {
    l.debug(`Defaulting first selection to node: ${stacks.topNodes[0]}`)
    return stacks.topNodes[0]
  }

  const ctxNodeAction = ctxNode.ketch.navParsed.action
  const activeStack =
    ctxNodeAction === LanyardItemActions.expand
      ? stacks.expandNodes
      : ctxNodeAction === LanyardItemActions.switch
      ? stacks.switchNodes
      : stacks.topNodes
  if (!activeStack) {
    l.debug('Storage inconsistent')
    return undefined
  }
  const index = activeStack.findIndex(i => i.ketch.navParsed['nav-index'] === ctxNode.ketch.navParsed['nav-index'])
  switch (arrowAction) {
    case ArrowActions.UP:
      if (index === 0) {
        if (ctxNodeAction) {
          // Switch from "stack/list" to top order items
          return stacks.topNodes[stacks.topNodes.length - 1]
        } else {
          // Go to the last switch
          return stacks.switchNodes && stacks.switchNodes.length > 0
            ? stacks.switchNodes[stacks.switchNodes.length - 1]
            : undefined
        }
      } else {
        return activeStack[index - 1]
      }
    case ArrowActions.DOWN:
      if (index === activeStack.length - 1) {
        if (ctxNodeAction) {
          // Wrap around
          return stacks.topNodes[0]
        } else {
          // Move to first switch
          return stacks.switchNodes && stacks.switchNodes.length > 0 ? stacks.switchNodes[0] : undefined
        }
      } else {
        return activeStack[index + 1]
      }
    case ArrowActions.LEFT:
      if (ctxNodeAction === LanyardItemActions.switch) {
        // Move to expand button
        return stacks.expandNodes && stacks.expandNodes.length > index ? stacks.expandNodes[index] : undefined
      } else {
        return undefined
      }
    case ArrowActions.RIGHT:
      if (ctxNodeAction === LanyardItemActions.expand) {
        // Move to switch button
        return stacks.switchNodes && stacks.switchNodes.length > index ? stacks.switchNodes[index] : undefined
      } else {
        return undefined
      }
    case ArrowActions.OK:
      // TODO implement -> if ctx = div(action.drill?) then go to stack.switch[0]
      return undefined
    case ArrowActions.BACK:
      // TODO implement -> if ctx = div(action.exp | switch) then go to stack.top[last]
      // => if modal has a back button then this should invoke that
      return undefined
    default:
      return undefined
  }
}
export const getBannerTree = (nodes: KetchHTMLElement[]): ActionItemsTree => {
  const l = wrapLogger(log, 'getBannerTree')
  if (nodes.length === 0) {
    l.debug('no clickable nodes')
    return []
  }

  const sortedNodes = nodes.sort((a, b) => {
    if (!a.ketch.navParsed || !b.ketch.navParsed) {
      return 0
    }
    return a.ketch.navParsed['nav-index'] - b.ketch.navParsed['nav-index']
  })
  l.debug(sortedNodes.map(i => i.ketch.navParsed))
  return sortedNodes
}

export const navigateBannerTree = (
  tree: ActionItemsTree,
  arrowAction: ArrowActions,
  ctxNode: KetchHTMLElement | null,
) => {
  const l = wrapLogger(log, 'navigateBannerTree')
  if (ctxNode === null) {
    l.debug(`Defaulting first selection to node: ${tree[0]}`)
    return tree[0]
  }
  const index = tree.findIndex(i => i.ketch.navParsed['nav-index'] === ctxNode.ketch.navParsed['nav-index'])
  l.debug('Starting at: ', index)
  switch (arrowAction) {
    case ArrowActions.UP:
    case ArrowActions.LEFT:
      if (index === 0) {
        l.debug('Cannot move past last node')
        return
      }
      return tree[index - 1]
    case ArrowActions.RIGHT:
    case ArrowActions.DOWN:
      if (index === tree.length - 1) {
        l.debug('Cannot move beyond first node')
        return
      }
      return tree[index + 1]
    default:
      l.debug('Unknown arrowAction: ', arrowAction)
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
    lanyard.querySelectorAll('[data-nav]'),
  ) as NodeList

  if (!allClickables || allClickables.length === 0) {
    l.debug('No tagged DOM nodes found')
    return null
  }

  const decodedNodes: KetchHTMLElement[] = [...allClickables]
    .filter(i => i instanceof HTMLElement)
    .map(i => convertToKetchHTMLElement(i as HTMLElement))

  let nextNode, ctxNode
  const currentExperience = decodedNodes[0].ketch.navParsed.experience
  const cachedCtxNode = getCachedDomNode(KEYBOARD_HANDLER_CACHE_KEYS.CTX_KEY)
  if (cachedCtxNode instanceof NodeList) {
    l.debug('Storage inconsistent - expected HTMLElement | null', cachedCtxNode)
    ctxNode = null
  } else {
    ctxNode = cachedCtxNode instanceof HTMLElement ? convertToKetchHTMLElement(cachedCtxNode) : cachedCtxNode
  }

  if (currentExperience === EXPERIENCES.BANNER) {
    const tree = getBannerTree(decodedNodes)
    nextNode = navigateBannerTree(tree, arrowAction, ctxNode)
  } else if (currentExperience === EXPERIENCES.MODAL) {
    const stacks = getModalStacks(decodedNodes)
    nextNode = navigateModalStacks(stacks, arrowAction, ctxNode)
  } else {
    l.debug(`unhandled experience ${currentExperience}`)
    nextNode = null
  }

  if (nextNode) {
    l.debug('Updating cached context node: ', nextNode)
    setCachedDomNode(KEYBOARD_HANDLER_CACHE_KEYS.CTX_KEY, nextNode)
  } else {
    nextNode = null
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
        prevNode.blur()
        prevNode.innerHTML = prevNode.innerHTML.replace(' 🔍', '')
        focusVisibleClasses.forEach(i => prevNode.classList.remove(i))
      }
      if (nextNode) {
        nextNode.focus()
        focusVisibleClasses.forEach(i => nextNode.classList.add(i))
        nextNode.innerHTML = nextNode.innerHTML + ' 🔍'
      }
    }
  }
}

export default onKeyPress
