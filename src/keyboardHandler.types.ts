export type ActionItemsTree = Array<KetchHTMLElement>

export enum ArrowActions {
  LEFT = 'LEFT',
  RIGHT = 'RIGHT',
  UP = 'UP',
  DOWN = 'DOWN',
  BACK = 'BACK',
  OK = 'OK',
  UNKNOWN = 'UNKNOWN',
}

export type DataNav = {
  experience: string
  'nav-index': number
  action?: string
}

export const EXPERIENCES = {
  BANNER: 'ketch-consent-banner',
  MODAL: 'ketch-purpose-modal',
  PREFERENCES: 'ketch-preferences',
} as const

export const focusVisibleClasses = ['ketch-outline', 'ketch-outline-2', 'ketch-outline-offset-2', 'ketch-outline-black']

/* KetchHTMLElements are HTML elements stuffed with
 * a tracer that lets you find it in a DOM tree
 * a DataNav - that lets ketch tag handle keyboard events for navigation
 */
export interface KetchHTMLElement extends HTMLElement {
  ketch: any
}

export type SelectionObject = {
  prevNode: KetchHTMLElement | null
  nextNode: KetchHTMLElement | null
}

export enum SupportedUserAgents {
  TIZEN = 'TIZEN',
}

const TizenKeys: Record<number, ArrowActions> = {
  37: ArrowActions.LEFT,
  38: ArrowActions.UP,
  39: ArrowActions.RIGHT,
  40: ArrowActions.DOWN,
  13: ArrowActions.OK,
  10009: ArrowActions.BACK,
} as const

export const UserAgentHandlerMap = {
  [SupportedUserAgents.TIZEN]: TizenKeys,
}
