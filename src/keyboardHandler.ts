import { wrapLogger } from '@ketch-sdk/ketch-logging'
import log from './log'

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
  [SupportedUserAgents.TIZEN]: TizenKeyBoardHandler
}

function TizenKeyBoardHandler(keyCode: number): ArrowActions {
    const l = wrapLogger(log, 'TizenKeyboardHandler')
    switch(keyCode){
      case 37: return ArrowActions.LEFT
      case 38: return ArrowActions.UP
      case 39: return ArrowActions.RIGHT
      case 40: return ArrowActions.DOWN
      case 13: return ArrowActions.OK
      case 10009: return ArrowActions.BACK
      default:
        l.error(`Unhandled Key code: ${keyCode}`);
        return ArrowActions.UNKNOWN
      }
}

function getUserAgent(): SupportedUserAgents {
  const l = wrapLogger(log, 'GetUserAgent')
  const userAgentStr = navigator.userAgent.toUpperCase()
  if(userAgentStr.search(SupportedUserAgents.TIZEN) === -1) {
    l.error(`Non Tizen device trying to use remote control: ${userAgentStr}`)
  }
  return SupportedUserAgents.TIZEN
}

function onKeyPress(event: KeyboardEvent ){
  const l = wrapLogger(log, 'onKeyPress')
  const userAgent = getUserAgent()
  /*
  * MDN has deprecated keyCode from KeyboardAPI.
  * 1. However, all the browsers support it.
  * 2. Tizen (6+) supports only keyCode.
  * 3. Reevaluate this decision when Tizen upgrades to support KeyboardAPI key
   */
  const arrowAction = UserAgentHandlerMap[userAgent](event.keyCode)

  if(arrowAction === ArrowActions.UNKNOWN) { l.error(`Unknown Keycode - ${event.keyCode}`) }
  else if(arrowAction === ArrowActions.OK) { handleSelection() }
  else { handleNavigation(arrowAction) }
}

function handleSelection() {
  /*
  * Retrieve currentCtx
  * Invoke Ketch.js API
  * Update action in currentCtx?
   */
}

function handleNavigation(arrowAction: ArrowActions): void {
  const l = wrapLogger(log, 'handleNavigation')
  l.debug(arrowAction)
  /*
  * Retrieve current context
  * Understand DOM
  * Navigate to next actionableToken => [button, inputs, filter(i.role === 'link') for Cookies Link in pref manager]
  * Let's call the expansion buttons as name='combo-buttons'
  * Let's leverage tabIndex. document.querySelectorAll('[tabindex]')
    * <done> ...easier way via accessibility? -> culled focusableElements.
   */
}

export default onKeyPress


/*
*TODO
* Test event propagation into iframe
* Why is github testing site not an iframe?
 */
