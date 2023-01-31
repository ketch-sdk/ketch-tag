import ketch from './ketchfn'

describe('ketch', () => {
  it('sets ketch function', () => {
    window.semaphore = [] as any
    ketch('foo')
    expect(window.semaphore).toEqual([['foo']])
  })

  it('sets up semaphore queue', () => {
    window.semaphore = undefined as any
    ketch('foo')
    expect(window.semaphore).toEqual([['foo']])
  })
})
