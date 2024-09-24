export type ActionItemStack = {
  topNodes: DataNav[]
  expandNodes?: DataNav[]
  subExperience?: DataNav[]
  switchNodes?: DataNav[]
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
  src: string
  action?: string
  clearCache?: boolean
  disabled?: boolean
  experience: string
  'nav-index': number
  subExperience?: string
}

export const EXPERIENCES = {
  BANNER: 'ketch-consent-banner',
  MODAL: 'ketch-purpose-modal',
  PREFERENCES: 'ketch-preferences',
} as const

export enum LanyardItemActions {
  back = 'back',
  close = 'close',
  confirm = 'confirm',
  expand = 'expand',
  switch = 'switch',
}

export type SelectionObject = {
  prev: DataNav | null
  next: DataNav | null
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
