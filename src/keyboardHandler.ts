import { wrapLogger } from '@ketch-sdk/ketch-logging'
import log from './log'
import { getCachedDomNode, KEYBOARD_HANDLER_CACHE_KEYS } from './cache'
import { LANYARD_ID } from './constants'

enum SupportedUserAgents {
  TIZEN = 'TIZEN',
}

enum ArrowActions {
  BACK = 'BACK',
  DOWN = 'DOWN',
  LEFT = 'LEFT',
  OK = 'OK',
  RIGHT = 'RIGHT',
  UP = 'UP',
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
  /*
   * TODO Decide if we need to update action in currentCtx?
   */
  const node: HTMLElement | null = getCachedDomNode(KEYBOARD_HANDLER_CACHE_KEYS.CTX_KEY)
  if (node && typeof node.click === 'function') {
    node.click()
  }
}

function handleNavigation(arrowAction: ArrowActions): void {
  const l = wrapLogger(log, 'handleNavigation')
  l.debug(arrowAction)
  const lanyard = getCachedDomNode(KEYBOARD_HANDLER_CACHE_KEYS.LANYARD_DOM, document.getElementById(LANYARD_ID))
  if (!lanyard) {
    l.error('Cannot find lanyard root')
    return
  }
  const allClickables = getCachedDomNode(
    KEYBOARD_HANDLER_CACHE_KEYS.FOCUSABLE_ELEMS,
    lanyard.querySelectorAll('button, input'),
  )
  /*
   * <done> Retrieve current context
   * Understand DOM -> build map of experiences
   * Navigate to next actionableToken
   * Mark it as selected/focussed
   * actionableToken = [button, inputs, filter(i.role === 'link') for Cookies Link in pref manager]
   * Let's call the expansion buttons as name='combo-buttons'
   * Let's leverage tabIndex. document.querySelectorAll('[tabindex]')
   * <done> ...easier way via accessibility? -> culled focusableElements.
   */
}

function onKeyPress(event: KeyboardEvent) {
  const l = wrapLogger(log, 'onKeyPress')
  const userAgent = getUserAgent()
  if (!userAgent) {
    l.error(`Unknown userAgent: ${navigator.userAgent}`)
    return
  }
  /*
   * MDN has deprecated keyCode from KeyboardAPI.
   * 1. However, all the browsers support it.
   * 2. Tizen (6+) supports only keyCode.
   * 3. Reevaluate this decision when Tizen upgrades to support KeyboardAPI key
   */
  const userAgentKeyMap = UserAgentHandlerMap[userAgent]
  if (!userAgentKeyMap) {
    l.error(`Misconfigured userAgent: ${userAgent}`)
    return
  }
  const arrowAction = userAgentKeyMap(event.keyCode)

  if (arrowAction === ArrowActions.UNKNOWN) {
    l.error(`Unknown keycode: ${event.keyCode}`)
    return
  } else if (arrowAction === ArrowActions.OK) {
    handleSelection()
  } else {
    handleNavigation(arrowAction)
  }
}

export default onKeyPress

/*
 *TODO
 * Test event propagation into iframe
 * Why is github testing site not an iframe?
 */
