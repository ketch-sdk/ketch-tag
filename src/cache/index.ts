import CookieCacher from './cookie'
import WebStorageCacher from './webStorage'
import MetaCacher from './meta'

declare type DefaultCacherParams = {
  ttl?: number
}

export function getDefaultCacher<T>(params: DefaultCacherParams = {}) {
  return new MetaCacher<T>(
    new CookieCacher<T>({
      ttl: params.ttl,
    }),
    new WebStorageCacher<T>(window.localStorage),
    new WebStorageCacher<T>(window.sessionStorage),
  )
}

export { CookieCacher, WebStorageCacher, MetaCacher }
