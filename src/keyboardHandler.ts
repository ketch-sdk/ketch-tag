import { wrapLogger } from '@ketch-sdk/ketch-logging'
import {
  clearCacheEntry,
  getCachedNavNode,
  getCacheEntry,
  getLanyardRoot,
  KEYBOARD_HANDLER_CACHE_KEYS,
  setCachedNavNode,
  setCacheEntry,
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
import { decodeDataNav, getDomNode, safeJsonParse } from './utils'

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

export const handleSubExperienceCaching = (ctxNav: DataNav, expandNodes: DataNav[]) => {
  const existingSubExperience = getCacheEntry(KEYBOARD_HANDLER_CACHE_KEYS.SUB_EXPERIENCE_CTX)
  if (!existingSubExperience && ctxNav.action === LanyardItemActions.expand) {
    // Expanding the div in ctx
    setCacheEntry(KEYBOARD_HANDLER_CACHE_KEYS.SUB_EXPERIENCE_CTX, ctxNav.subExperience as string)
    return
  } else if (ctxNav.action === LanyardItemActions.expand && existingSubExperience === ctxNav.subExperience) {
    // The ctx div is collapsing. Evict cache
    clearCacheEntry(KEYBOARD_HANDLER_CACHE_KEYS.SUB_EXPERIENCE_CTX)
  } else if (ctxNav.action === LanyardItemActions.switch && existingSubExperience === ctxNav.subExperience) {
    // The user read the details. Collapse the subExperience
    // 1. programmatically collapse the previously expanded div
    const prevExpandNav = expandNodes.find(
      i => i.subExperience === existingSubExperience && i.action === LanyardItemActions.expand,
    )
    const prevExpandNode = prevExpandNav && getDomNode(prevExpandNav)
    if (prevExpandNode && typeof prevExpandNode.click === 'function') {
      prevExpandNode.click()
    }
    // Clear cache
    clearCacheEntry(KEYBOARD_HANDLER_CACHE_KEYS.SUB_EXPERIENCE_CTX)
  } else if (existingSubExperience !== ctxNav.subExperience && ctxNav.action === LanyardItemActions.expand) {
    // Another stack item is being expanded
    // 1. programmatically collapse the previously expanded div
    const prevExpandNav = expandNodes.find(
      i => i.subExperience === existingSubExperience && i.action === LanyardItemActions.expand,
    )
    const prevExpandNode = prevExpandNav && getDomNode(prevExpandNav)
    if (prevExpandNode && typeof prevExpandNode.click === 'function') {
      prevExpandNode.click()
    }
    // 2. update the cache
    setCacheEntry(KEYBOARD_HANDLER_CACHE_KEYS.SUB_EXPERIENCE_CTX, ctxNav.subExperience as string)
  }
}

export const handleSelection = (clearCache = true, expandNodes?: DataNav[]) => {
  const l = wrapLogger(log, 'handleSelection')
  const ctxNav = getCachedNavNode(KEYBOARD_HANDLER_CACHE_KEYS.CTX_KEY)
  const node = getDomNode(ctxNav)
  if (ctxNav && node && typeof node.click === 'function') {
    if (clearCache) {
      clearCachedNodes()
    }
    if (Array.isArray(expandNodes) && ctxNav.subExperience) {
      handleSubExperienceCaching(ctxNav, expandNodes)
    }
    node.click()
  } else {
    l.debug('Node missing or missing click fn', node)
  }
}

export const getStaticModalNodes = (nodes: DataNav[]): ActionItemStack => {
  const l = wrapLogger(log, 'getStaticModalNodes')
  if (nodes.length === 0) {
    l.debug('no clickable nodes')
    return { topNodes: [] }
  }
  const o = safeJsonParse(getCacheEntry(KEYBOARD_HANDLER_CACHE_KEYS.MODAL_STACKS))
  if (o && Array.isArray(o.topNodes)) {
    return o
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

  const stack = {
    expandNodes: expandNodes.length > 0 ? expandNodes : undefined,
    switchNodes: switchNodes.length > 0 ? switchNodes : undefined,
    topNodes,
  }
  setCacheEntry(KEYBOARD_HANDLER_CACHE_KEYS.MODAL_STACKS, JSON.stringify(stack))
  return stack
}

export const getModalStacks = (nodes: DataNav[]): ActionItemStack => {
  const l = wrapLogger(log, 'getModalStacks')
  const stacks = getStaticModalNodes(nodes)

  if (!Array.isArray(stacks.topNodes) || stacks.topNodes.length === 0) {
    l.debug('Missing top nodes in the stack')
  }
  // 1. Account for the dynamic bits in cached response
  const subExperienceCtx = getCacheEntry(KEYBOARD_HANDLER_CACHE_KEYS.SUB_EXPERIENCE_CTX)
  if (subExperienceCtx) {
    l.trace('existing subExperienceCtx:', subExperienceCtx)
    if (!stacks.expandNodes || stacks.expandNodes.length === 0) {
      l.debug(`missing expand nodes for ${subExperienceCtx}. Returning without subExperience`)
      return stacks
    }
    const subExperience = nodes
      .filter(i => i.subExperience === subExperienceCtx)
      .sort((a, b) => a['nav-index'] - b['nav-index'])
    l.trace(`found ${subExperience.length} nodes in ${subExperienceCtx}`)

    // 2. In-place insertion in expandNodes for smooth nav between stack items
    const index = stacks.expandNodes.findIndex(i => i.subExperience === subExperienceCtx)
    if (index === -1) {
      l.debug(`Expand nodes missing for ${subExperienceCtx}. Returning stacks without subExperience`)
      return stacks
    }
    stacks.expandNodes = [
      ...stacks.expandNodes.slice(0, index),
      ...subExperience,
      ...stacks.expandNodes.slice(index + 1),
    ]
    l.trace('updating expand nodes', stacks.expandNodes)
  }

  return stacks
}

export const handleDisabledSwitches = (nextNode: DataNav, expandNodes?: DataNav[]) => {
  if (nextNode.action === LanyardItemActions.switch && nextNode.disabled) {
    const siblingExpandNode = expandNodes?.find(i => i.subExperience === nextNode.subExperience)
    if (siblingExpandNode) {
      return siblingExpandNode
    }
  }
  return nextNode
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
    ctxNodeAction === LanyardItemActions.switch
      ? stacks.switchNodes
      : ctxNodeAction === LanyardItemActions.expand || ctxNode.subExperience
      ? stacks.expandNodes
      : stacks.topNodes
  if (!activeStack) {
    l.debug('Storage inconsistent')
    return null
  }
  l.trace('activeStack:', activeStack)

  const index = activeStack.findIndex(i => i.src === ctxNode.src)
  l.trace(`moving ${arrowAction} from index ${index}`)

  let nextNode: DataNav | null | undefined = null
  switch (arrowAction) {
    case ArrowActions.UP:
      if (index === 0) {
        if (ctxNodeAction === LanyardItemActions.expand || ctxNodeAction === LanyardItemActions.switch) {
          // Move to the parent nodes
          nextNode = stacks.topNodes[stacks.topNodes.length - 1]
          break
        } else {
          // Btn"Confirm" is the last visually, but nav-index=0. So we want to go up to the node above it
          const nextStack = stacks.switchNodes || stacks.expandNodes
          nextNode = nextStack && nextStack.length > 0 ? nextStack[nextStack.length - 1] : null
          break
        }
      } else {
        nextNode = activeStack[index - 1]
        break
      }
    case ArrowActions.DOWN:
      if (index === activeStack.length - 1) {
        if (ctxNodeAction === LanyardItemActions.expand || ctxNodeAction === LanyardItemActions.switch) {
          // DOWN from last switch/expand goes to "btn confirm"
          nextNode = stacks.topNodes[0]
          break
        } else {
          // Move to first stack item
          const nextStack = stacks.switchNodes || stacks.expandNodes
          nextNode = nextStack && nextStack.length > 0 ? nextStack[0] : null
          break
        }
      } else {
        nextNode = activeStack[index + 1]
        break
      }
    case ArrowActions.LEFT:
      if (ctxNodeAction === LanyardItemActions.switch) {
        // Move to expand button
        nextNode = stacks.expandNodes?.find(i => i.subExperience === ctxNode.subExperience)
      }
      break
    case ArrowActions.RIGHT:
      if (ctxNodeAction === LanyardItemActions.expand) {
        // Move to switch button
        nextNode = stacks.switchNodes?.find(i => i.subExperience === ctxNode.subExperience)
      }
      break
    case ArrowActions.OK:
      const clearCache =
        ctxNode.action === LanyardItemActions.confirm ||
        ctxNode.action === LanyardItemActions.close ||
        ctxNode.action === LanyardItemActions.back ||
        Boolean(ctxNode.clearCache)

      handleSelection(clearCache, stacks.expandNodes)
      break
    case ArrowActions.BACK:
      // User forced "action=back" using BACK key. Set the right context and treat as "OK" on a back button
      const backNav = stacks.topNodes.find(i => i.action === LanyardItemActions.back)
      if (backNav) {
        setCachedNavNode(KEYBOARD_HANDLER_CACHE_KEYS.CTX_KEY, backNav)
        handleSelection(true)
      }
      break
    default:
      return null
  }

  // Handle disabled switches
  return nextNode ? handleDisabledSwitches(nextNode, stacks.expandNodes) : null
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
    case ArrowActions.BACK:
      // TODO - confirm if we want to lock the banner experience. Else, this would mean returning keyboard ctrl
      l.trace('cannot back out of banner')
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
  } else {
    window.decodedNodes = decodedNodes
  }

  let nextNav: DataNav | null = null
  const currentExperience = decodedNodes[0].experience
  const ctxNav = getCachedNavNode(KEYBOARD_HANDLER_CACHE_KEYS.CTX_KEY)

  /* Optimization: can cache trees */
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
  } else {
    const nodes = handleNavigation(arrowAction)
    if (!nodes) {
      // Possibilities: 1. Error 2. no next node 3. No back button for back key
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
