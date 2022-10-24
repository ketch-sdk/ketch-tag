import loglevel from './logging'
import { Callback } from '@ketch-sdk/ketch-types'
const log = loglevel.getLogger('Future')

/**
 * Future implements a value that can be listened to where resolvers
 * are called when the value is available.
 */
export default class Future<T> {
  _name: string
  _value?: T
  _pendingResolvers: any[]
  _subscribers: Callback[]

  /**
   * Creates a new Future.
   *
   * @param name The name of the future.
   * @param value The initial value.
   */
  constructor(name: string, value?: T) {
    this._name = name
    this._value = value
    this._pendingResolvers = []
    this._subscribers = []
  }

  /**
   * Determines if the Future has a value.
   */
  hasValue(): boolean {
    return this._value !== undefined
  }

  /**
   * Returns the raw value immediately.
   */
  getRawValue(): T | undefined {
    return this._value
  }

  /**
   * Sets the raw value immediately.
   *
   * @param v
   */
  setRawValue(v?: T): void {
    this._value = v

    if (v !== undefined) {
      // Notify any pending resolvers
      for (let r = this._pendingResolvers.shift(); r; r = this._pendingResolvers.shift()) {
        r(v)
      }

      // Notify any subscribers
      for (let i = this._subscribers.length - 1; i >= 0; i--) {
        const callback = this._subscribers[i]
        callback(v)
      }
    }
  }

  /**
   * Retrieves the value, calling resolve with the value.
   */
  async getValue(): Promise<T> {
    return new Promise(resolve => {
      this._pendingResolvers.push(resolve)

      const v = this.getRawValue()
      if (v !== undefined) {
        resolve(v)
      }
    })
  }

  /**
   * Sets the value, calling any pending resolvers.
   *
   * @param v
   */
  async setValue(v: T): Promise<T> {
    log.trace('setValue', this._name, v)

    return new Promise(resolve => {
      this.setRawValue(v)

      resolve(v)
    })
  }

  /**
   * Clears the value, calling any pending resolvers.
   *
   */
  async clearValue(): Promise<void> {
    log.trace('clearValue', this._name)

    this.setRawValue(undefined)
  }

  /**
   * Subscribes to notification on changes to the value.
   *
   * @param callback
   */
  subscribe(callback: Callback): void {
    log.trace('subscribe', this._name, callback)

    for (let i = this._subscribers.length - 1; i >= 0; i--) {
      if (callback === this._subscribers[i]) {
        return
      }
    }

    this._subscribers.push(callback)
  }

  // /**
  //  * Unsubscribes the callback from notifications on changes to the value.
  //  *
  //  * @param callback
  //  */
  // unsubscribe(callback: Function): void {
  //   log.trace('unsubscribe', this._name);
  //
  //   for (let i = this._subscribers.length - 1; i >= 0; i--) {
  //     if (callback === this._subscribers[i]) {
  //       this._subscribers.splice(i, 1);
  //     }
  //   }
  // }
}
