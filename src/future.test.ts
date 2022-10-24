import Future from './future'
import errors from './errors'

/**
 * Return a timeout Promise.
 *
 * @param ms
 */
function timeout(ms: number): Promise<void> {
  return new Promise((_, reject) => {
    const id = setTimeout(() => {
      clearTimeout(id)
      reject(errors.timedOutError(ms))
    }, ms)
  })
}

describe('Future', () => {
  it('does not have value initially', () => {
    const f = new Future('f')
    expect(f.hasValue()).toBe(false)
  })

  it('returns an unfulfilled promise on empty get', () => {
    const f = new Future('f')
    const p = f.getValue()
    expect.assertions(0)
    return Promise.race([p, timeout(1000)])
      .then(v => {
        expect(v).toBeUndefined()
      })
      .catch(() => ({}))
  })

  it('fulfils promise on setValue', () => {
    const f = new Future('f')
    const p = f.getValue()
    expect.assertions(1)
    f.setValue(456)
    return p.then(v => {
      expect(v).toBe(456)
    })
  })

  it('fulfils promise on getValue after setValue', () => {
    const f = new Future('f')
    f.setValue(456)

    const p = f.getValue()
    expect.assertions(1)
    return p.then(v => {
      expect(v).toBe(456)
    })
  })

  it('notifies subscribers', () => {
    const spy = jest.fn()
    const f = new Future('f')
    f.subscribe(spy)
    f.subscribe(spy)
    f.setValue(123)
    expect(spy).toHaveBeenCalled()
  })
})
