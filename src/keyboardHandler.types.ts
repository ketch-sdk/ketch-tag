export type ActionItemsTree = Array<KetchHTMLElement>

export type ActionItemStack = {
  topNodes: ActionItemsTree
  expandNodes?: ActionItemsTree
  switchNodes?: ActionItemsTree
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

export type DataNav = {
  action?: string
  experience: string
  'nav-index': number
  subExperience?: string
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

export enum LanyardItemActions {
  back = 'back',
  close = 'close',
  confirm = 'confirm',
  expand = 'expand',
  switch = 'switch',
}

export type SelectionObject = {
  prevNode: KetchHTMLElement | null
  nextNode: KetchHTMLElement | null
}

export enum SupportedUserAgents {
  TIZEN = 'TIZEN',
  MACINTOSH = 'MACINTOSH',
}

const TizenKeys: Record<number, ArrowActions> = {
  37: ArrowActions.LEFT,
  38: ArrowActions.UP,
  39: ArrowActions.RIGHT,
  40: ArrowActions.DOWN,
  13: ArrowActions.OK,
  10009: ArrowActions.BACK,
} as const

const DesktopKeys: Record<number, ArrowActions> = {
  37: ArrowActions.LEFT,
  38: ArrowActions.UP,
  39: ArrowActions.RIGHT,
  40: ArrowActions.DOWN,
  13: ArrowActions.OK,
  27: ArrowActions.BACK,
}

export const UserAgentHandlerMap = {
  [SupportedUserAgents.TIZEN]: TizenKeys,
  [SupportedUserAgents.MACINTOSH]: DesktopKeys,
}
