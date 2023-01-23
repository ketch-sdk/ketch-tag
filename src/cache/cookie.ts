import { getCookie, setCookie } from '@ketch-sdk/ketch-data-layer'

declare type CookieCacherParams = {
  ttl?: number
}

export default class CookieCacher<T> implements Cacher<T> {
  constructor(options: CookieCacherParams = {}) {
    this._options = options
  }

  async getItem(key: string): Promise<T | undefined> {
    const value = getCookie(window, key)
    if (!value) {
      return undefined
    }
    return JSON.parse(atob(value)) as T
  }

  async setItem(key: string, value: T): Promise<boolean> {
    setCookie(window, key, btoa(JSON.stringify(value)), this._options.ttl)
    return this.getItem(key).then(v => !!v)
  }

  async removeItem(key: string): Promise<boolean> {
    setCookie(window, key, '', -1)
    return this.getItem(key).then(v => !v)
  }

  readonly _options: CookieCacherParams
}
