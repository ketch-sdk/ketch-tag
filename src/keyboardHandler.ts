import { wrapLogger } from '@ketch-sdk/ketch-logging'
import {
  clearCacheEntry,
  getCachedNavNode,
  getLanyardRoot,
  KEYBOARD_HANDLER_CACHE_KEYS,
  setCachedNavNode,
} from './cache'
import {
  ActionItemStack,
  ArrowActions,
  DataNav,
  EXPERIENCES,
  LanyardItemActions,
  SelectionObject,
  SupportedUserAgents,
  UserAgentHandlerMap,
} from './keyboardHandler.types'
import log from './log'
import { decodeDataNav, getDomNode } from './utils'

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
  const l = wrapLogger(log, 'clearCachedNodes')
  Object.values(KEYBOARD_HANDLER_CACHE_KEYS).forEach(i => {
    l.trace(`clearing ${i}`)
    clearCacheEntry(i)
  })
}

export const renderNavigation = (nodes: SelectionObject) => {
  const l = wrapLogger(log, 'renderNavigation')

  const lanyard = getLanyardRoot()
  if (!lanyard) {
    l.debug('missing lanyard root')
    return
  }

  const { prev, next } = nodes

  if (prev) {
    const prevNode = lanyard.querySelector(`[data-nav="${prev.src}"]`)
    if (!prevNode) {
      l.debug(`node not found: ${prev.src} -- ${prev['nav-index']}`)
    } else {
      // TODO read
      ;(prevNode as HTMLElement).blur()
    }
  }
  if (next) {
    const nextNode = lanyard.querySelector(`[data-nav="${next.src}"]`)
    if (!nextNode) {
      l.debug(`node not found: ${next.src} -- ${next['nav-index']}`)
    } else {
      ;(nextNode as HTMLElement).focus()
    }
  }
}
export const handleSelection = (clearCache = true) => {
  const l = wrapLogger(log, 'handleSelection')
  const ctxNav = getCachedNavNode(KEYBOARD_HANDLER_CACHE_KEYS.CTX_KEY)
  const node = getDomNode(ctxNav)
  if (node && typeof node.click === 'function') {
    if (clearCache) {
      clearCachedNodes()
    }
    node.click()
  } else {
    l.debug('Node missing or missing click fn', node)
  }
}

export const getModalStacks = (nodes: DataNav[]): ActionItemStack => {
  const l = wrapLogger(log, 'getModalStacks')
  if (nodes.length === 0) {
    l.debug('no clickable nodes')
    return { topNodes: [] }
  }
  const topNodes = nodes.filter(i => i.subExperience === undefined).sort((a, b) => a['nav-index'] - b['nav-index'])
  l.trace('top nodes:', topNodes)

  const expandNodes = nodes
    .filter(i => i.subExperience && i.action === LanyardItemActions.expand)
    .sort((a, b) => {
      if (a.subExperience === undefined || b.subExperience === undefined) {
        return 0
      }
      return a.subExperience.localeCompare(b.subExperience)
    })
  l.trace('expand nodes:', expandNodes)

  const switchNodes = nodes
    .filter(i => i.subExperience && i.action === LanyardItemActions.switch)
    .sort((a, b) => {
      if (a.subExperience === undefined || b.subExperience === undefined) {
        return 0
      }
      return a.subExperience.localeCompare(b.subExperience)
    })
  l.trace('switch nodes:', switchNodes)

  return {
    expandNodes: expandNodes.length > 0 ? expandNodes : undefined,
    switchNodes: switchNodes.length > 0 ? switchNodes : undefined,
    topNodes,
  }
}

export const navigateModalStacks = (
  stacks: ActionItemStack,
  arrowAction: ArrowActions,
  ctxNode: DataNav | null,
): DataNav | null => {
  const l = wrapLogger(log, 'navigateModalStacks')
  if (!stacks || !stacks.topNodes || !stacks.topNodes?.length) {
    l.debug('no top nodes found in the modal')
    return null
  }
  if (ctxNode === null) {
    l.debug(`Defaulting first selection to node: ${stacks.topNodes[0]}`)
    return stacks.topNodes[0]
  }

  const ctxNodeAction = ctxNode.action
  const activeStack =
    ctxNodeAction === LanyardItemActions.expand
      ? stacks.expandNodes
      : ctxNodeAction === LanyardItemActions.switch
      ? stacks.switchNodes
      : stacks.topNodes
  if (!activeStack) {
    l.debug('Storage inconsistent')
    return null
  }
  l.trace('activeStack:', activeStack)
  const index = activeStack.findIndex(i => i.src === ctxNode.src)
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
            : null
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
          return stacks.switchNodes && stacks.switchNodes.length > 0 ? stacks.switchNodes[0] : null
        }
      } else {
        return activeStack[index + 1]
      }
    case ArrowActions.LEFT:
      if (ctxNodeAction === LanyardItemActions.switch) {
        // Move to expand button
        return stacks.expandNodes && stacks.expandNodes.length > index ? stacks.expandNodes[index] : null
      } else {
        return null
      }
    case ArrowActions.RIGHT:
      if (ctxNodeAction === LanyardItemActions.expand) {
        // Move to switch button
        return stacks.switchNodes && stacks.switchNodes.length > index ? stacks.switchNodes[index] : null
      } else {
        return null
      }
    case ArrowActions.OK:
      // TODO implement -> if ctx = div(action.drill?) then go to stack.switch[0]
      handleSelection(ctxNodeAction === (LanyardItemActions.confirm || LanyardItemActions.close))
      return null
    case ArrowActions.BACK:
      // TODO implement -> if ctx = div(action.exp | switch) then go to stack.top[last]
      // => if modal has a back button then this should invoke that
      return null
    default:
      return null
  }
}
export const getBannerTree = (nodes: DataNav[]): DataNav[] => {
  const l = wrapLogger(log, 'getBannerTree')
  if (nodes.length === 0) {
    l.debug('no clickable nodes')
    return []
  }

  const sortedNodes = nodes.sort((a, b) => a['nav-index'] - b['nav-index'])
  l.debug(sortedNodes)
  return sortedNodes
}

export const navigateBannerTree = (
  tree: DataNav[],
  arrowAction: ArrowActions,
  ctxNode: DataNav | null,
): DataNav | null => {
  const l = wrapLogger(log, 'navigateBannerTree')
  if (ctxNode === null) {
    l.debug(`Defaulting first selection to node: ${tree[0]}`)
    return tree[0]
  }
  const index = tree.findIndex(i => i.src === ctxNode.src)
  l.debug('Starting at: ', index)
  switch (arrowAction) {
    case ArrowActions.UP:
    case ArrowActions.LEFT:
      if (index === 0) {
        l.debug('Cannot move past last node')
        return null
      }
      return tree[index - 1]
    case ArrowActions.RIGHT:
    case ArrowActions.DOWN:
      if (index === tree.length - 1) {
        l.debug('Cannot move beyond first node')
        return null
      }
      return tree[index + 1]
    case ArrowActions.OK:
      handleSelection(true)
      return null
    default:
      l.debug('Unknown arrowAction: ', arrowAction)
      return null
  }
}

export const handleNavigation = (arrowAction: ArrowActions): SelectionObject | null => {
  const l = wrapLogger(log, 'handleNavigation')
  l.debug('Navigating ', arrowAction)
  const lanyard = getLanyardRoot()

  if (lanyard === null) {
    l.debug('Cannot find lanyard root')
    return null
  } else if (!(lanyard instanceof HTMLElement)) {
    l.debug('Storage inconsistent')
    return null
  }

  const allClickables = lanyard.querySelectorAll('[data-nav]')

  if (!allClickables || allClickables.length === 0) {
    l.debug('No tagged DOM nodes found')
    return null
  }

  const decodedNodes: DataNav[] = []
  allClickables.forEach(i => {
    const parsedNav = decodeDataNav((i as HTMLElement).dataset.nav || '')
    if (parsedNav !== null) {
      decodedNodes.push(parsedNav)
    }
  })

  if (decodedNodes.length !== allClickables.length) {
    l.debug('inconsistent encoding of data-nav')
  }

  let nextNav: DataNav | null = null
  const currentExperience = decodedNodes[0].experience
  const ctxNav = getCachedNavNode(KEYBOARD_HANDLER_CACHE_KEYS.CTX_KEY)

  if (currentExperience === EXPERIENCES.BANNER) {
    const tree = getBannerTree(decodedNodes)
    nextNav = navigateBannerTree(tree, arrowAction, ctxNav)
  } else if (currentExperience === EXPERIENCES.MODAL) {
    const stacks = getModalStacks(decodedNodes)
    nextNav = navigateModalStacks(stacks, arrowAction, ctxNav)
  } else {
    l.debug(`unhandled experience ${currentExperience}`)
  }

  if (nextNav) {
    l.debug('Updating cached context node: ', nextNav)
    setCachedNavNode(KEYBOARD_HANDLER_CACHE_KEYS.CTX_KEY, nextNav)
  }
  return { prev: ctxNav, next: nextNav }
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
    // TODO ?
    l.debug('returning keyboard control')
    clearCachedNodes()
    returnKeyboardControl()
  } else {
    const nodes = handleNavigation(arrowAction)
    if (!nodes) {
      // Error or no next node
      /* Improvements: Add errorCodes and beam it to rollbar */
      l.debug('returning keyboard control')
      clearCachedNodes()
      returnKeyboardControl()
    } else {
      renderNavigation(nodes)
    }
  }
}

export default onKeyPress
/*
 * TODO
 * Losing track of ctx node or all clickable nodes
 * If switch is disabled then go to the expand
 * handleSelection not working for sub tree
 * test sub sub menus like cookies and vendors
 */
