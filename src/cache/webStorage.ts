export default class WebStorageCacher<T> implements Cacher<T> {
  constructor(storage: Storage) {
    this._storage = storage
  }

  async getItem(key: string): Promise<T | undefined> {
    try {
      const value = this._storage.getItem(key)
      if (!value) {
        return undefined
      }

      return JSON.parse(value) as T
    } catch (e) {
      return undefined
    }
  }

  async setItem(key: string, value: T): Promise<boolean> {
    try {
      const j = JSON.stringify(value)
      this._storage.setItem(key, j)
      return j === this._storage.getItem(key)
    } catch (e) {
      return false
    }
  }

  async removeItem(key: string): Promise<boolean> {
    try {
      this._storage.removeItem(key)
      return !this._storage.getItem(key)
    } catch (e) {
      return false
    }
  }

  readonly _storage: Storage
}
