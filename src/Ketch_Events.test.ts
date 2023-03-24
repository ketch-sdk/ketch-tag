import { Configuration } from '@ketch-sdk/ketch-types'
import { Ketch } from './Ketch'
import { KetchWebAPI } from '@ketch-sdk/ketch-web-api'

declare interface Window {
  [name: string]: any
}

describe('emit', () => {
  const config = {
    language: 'en',
  } as Configuration

  it('does not call handlers if not registered', () => {
    const ketch = new Ketch(new KetchWebAPI(''), config)

    expect(ketch.emit('foo', 'bar', 'baz')).toBe(false)
  })

  it('call handler if registered', () => {
    const ketch = new Ketch(new KetchWebAPI(''), config)

    const handler = jest.fn()
    ketch.on('foo', handler)
    expect(ketch.emit('foo', 'bar', 'baz')).toBe(true)
    expect(handler).toHaveBeenCalledWith('bar', 'baz')
  })

  it('does not call android listener if event not defined', () => {
    const ketch = new Ketch(new KetchWebAPI(''), config)

    const androidHandler = jest.fn()
    window.androidListener = {
      bar: androidHandler,
    }
    const handler = jest.fn()
    ketch.on('foo', handler)
    expect(ketch.emit('foo', 'bar', 'baz')).toBe(true)
    expect(handler).toHaveBeenCalledWith('bar', 'baz')
    expect(androidHandler).not.toHaveBeenCalled()
  })

  it('calls android listener if event defined', () => {
    const ketch = new Ketch(new KetchWebAPI(''), config)

    const androidHandler = jest.fn()
    window.androidListener = {
      foo: androidHandler,
    }
    const handler = jest.fn()
    ketch.on('foo', handler)
    expect(ketch.emit('foo', 'bar', 'baz')).toBe(true)
    expect(handler).toHaveBeenCalledWith('bar', 'baz')
    expect(androidHandler).toHaveBeenCalledWith(JSON.stringify(['bar', 'baz']))
  })

  it('calls android listener with no arguments', () => {
    const ketch = new Ketch(new KetchWebAPI(''), config)

    const androidHandler = jest.fn()
    window.androidListener = {
      foo: androidHandler,
    }
    const handler = jest.fn()
    ketch.on('foo', handler)
    expect(ketch.emit('foo')).toBe(true)
    expect(handler).toHaveBeenCalledWith()
    expect(androidHandler).toHaveBeenCalledWith()
  })

  it('does not call iOS messageHandler postMessage if not defined', () => {
    const ketch = new Ketch(new KetchWebAPI(''), config)

    const webkitHandler = jest.fn()
    window.webkit = {
      messageHandlers: {},
    }

    const handler = jest.fn()
    ketch.on('foo', handler)
    expect(ketch.emit('foo', 'bar', 'baz')).toBe(true)
    expect(handler).toHaveBeenCalledWith('bar', 'baz')
    expect(webkitHandler).not.toHaveBeenCalled()
  })

  it('calls iOS messageHandler postMessage if defined', () => {
    const ketch = new Ketch(new KetchWebAPI(''), config)

    const webkitHandler = jest.fn()
    window.webkit = {
      messageHandlers: {
        foo: { postMessage: webkitHandler },
      },
    }

    const handler = jest.fn()
    ketch.on('foo', handler)
    expect(ketch.emit('foo', 'bar', 'baz')).toBe(true)
    expect(handler).toHaveBeenCalledWith('bar', 'baz')
    expect(webkitHandler).toHaveBeenCalledWith(JSON.stringify(['bar', 'baz']))
  })

  it('calls external listener if defined and a function', () => {
    const customConfig = {
      language: 'en',
    } as Configuration
    customConfig.options = {}
    customConfig.options['externalListener'] = 'ReactNative'

    const ketch = new Ketch(new KetchWebAPI(''), customConfig)

    const externalListener = jest.fn()

    const externalListenerName = customConfig.options['externalListener']
    window[externalListenerName] = externalListener

    const handler = jest.fn()
    ketch.on('foo', handler)
    expect(ketch.emit('foo', 'bar', 'baz')).toBe(true)
    expect(handler).toHaveBeenCalledWith('bar', 'baz')
    expect(externalListener).toHaveBeenCalledWith(
      JSON.stringify({
        event: 'foo',
        data: ['bar', 'baz'],
      }),
    )
  })

  it('calls external listener if defined and is a postMessage object', () => {
    const customConfig = {
      language: 'en',
    } as Configuration
    customConfig.options = {}
    customConfig.options['externalListener'] = 'ReactNative'

    const ketch = new Ketch(new KetchWebAPI(''), customConfig)

    const externalListener = jest.fn()

    const externalListenerName = customConfig.options['externalListener']
    window[externalListenerName] = {
      postMessage: externalListener,
    }

    const handler = jest.fn()
    ketch.on('foo', handler)
    expect(ketch.emit('foo', 'bar', 'baz')).toBe(true)
    expect(handler).toHaveBeenCalledWith('bar', 'baz')
    expect(externalListener).toHaveBeenCalledWith(
      JSON.stringify({
        event: 'foo',
        data: ['bar', 'baz'],
      }),
    )
  })
})
