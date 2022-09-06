import loglevel from './logging'
import { Callback } from '@ketch-sdk/ketch-plugin/src'
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
  getValue(): Promise<T | undefined> {
    return new Promise(resolve => {
      this._pendingResolvers.push(resolve)

      if (this.hasValue()) {
        resolve(this.getRawValue())
      }
    })
  }

  /**
   * Sets the value, calling any pending resolvers.
   *
   * @param v
   */
  setValue(v?: T): Promise<T | undefined> {
    log.trace('setValue', this._name, v)

    return new Promise(resolve => {
      this.setRawValue(v)

      resolve(v)
    })
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
