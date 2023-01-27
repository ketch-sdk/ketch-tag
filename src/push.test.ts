import pusher from './push'

describe('push', () => {
  it('returns immediately if given undefined', () => {
    const entrypoint = jest.fn()
    const push = pusher(entrypoint)
    push(undefined)
    expect(entrypoint).not.toHaveBeenCalled()
  })

  it('calls entrypoint from string', () => {
    const entrypoint = jest.fn()
    const push = pusher(entrypoint)
    push('fn')
    expect(entrypoint).toHaveBeenCalledWith('fn')
  })

  it('calls entrypoint from array length 1', () => {
    const entrypoint = jest.fn()
    const push = pusher(entrypoint)
    push(['fn'])
    expect(entrypoint).toHaveBeenCalledWith('fn')
  })

  it('calls entrypoint from array length 2', () => {
    const entrypoint = jest.fn()
    const push = pusher(entrypoint)
    push(['fn', 'arg1'])
    expect(entrypoint).toHaveBeenCalledWith('fn', 'arg1')
  })

  it('calls entrypoint from arguments', () => {
    const entrypoint = jest.fn()
    const push = pusher(entrypoint)
    function p() {
      push(arguments) //eslint-disable-line
    }
    ;(p as any)('fn', 'arg1')
    expect(entrypoint).toHaveBeenCalledWith('fn', 'arg1')
  })

  it('handles a Promise', () => {
    const entrypoint = jest.fn().mockResolvedValue(1)
    const push = pusher(entrypoint)
    push(['fn', 'arg1'])
    expect(entrypoint).toHaveBeenCalledWith('fn', 'arg1')
  })

  it('handles a Promise that rejects', () => {
    const entrypoint = jest.fn().mockRejectedValue('oops')
    const push = pusher(entrypoint)
    push(['fn', 'arg1'])
    expect(entrypoint).toHaveBeenCalledWith('fn', 'arg1')
  })
})
