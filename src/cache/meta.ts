export default class MetaCacher<T> implements Cacher<T> {
  constructor(...cachers: Cacher<T>[]) {
    this._cachers = cachers
  }

  async getItem(key: string): Promise<T | undefined> {
    for (const cacher of this._cachers) {
      const value = await cacher.getItem(key)
      if (value) {
        return value
      }
    }
    return
  }

  async setItem(key: string, value: T): Promise<boolean> {
    for (const cacher of this._cachers) {
      const b = await cacher.setItem(key, value)
      if (b) {
        return true
      }
    }

    return false
  }

  async removeItem(key: string): Promise<boolean> {
    for (const cacher of this._cachers) {
      const b = await cacher.removeItem(key)
      if (b) {
        return true
      }
    }

    return false
  }

  readonly _cachers: Cacher<T>[]
}
