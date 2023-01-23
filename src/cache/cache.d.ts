declare interface Cacher<T> {
  getItem(key: string): Promise<T | undefined>
  setItem(key: string, value: T): Promise<boolean>
  removeItem(key: string): Promise<boolean>
}
