export const EXPERIENCES  = {
  BANNER: 'ketch-consent-banner',
  MODAL: 'ketch-purposes-modal',
  PREFERENCES: 'ketch-preferences'
} as const

export type BannerActionTree = Array<KetchHTMLElement>

export type ModalActionTree = Record<string, Array<KetchHTMLElement>>

export type ActionTree = BannerActionTree | ModalActionTree

export type DataNav = {
  experience: string,
  'nav-index': number,
  action?: string,
}

/* KetchHTMLElements are HTML elements stuffed with
  * a tracer that lets you find it in a DOM tree
  * a DataNav - that lets ketch tag handle keyboard events for navigation
 */
export interface KetchHTMLElement extends HTMLElement  { ketch: any }
