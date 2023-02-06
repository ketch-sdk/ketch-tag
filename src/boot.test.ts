import init from './init'
import log from './log'
import { boot } from './boot'

jest.mock('./init')
jest.mock('./log')

describe('boot', () => {
  beforeEach(jest.resetAllMocks)

  it('ensures semaphore queue is set', async () => {
    const mockInit = jest.mocked(init).mockResolvedValue(undefined)

    expect(window.semaphore).toBeUndefined()
    expect(document.readyState).toBe('complete')
    await boot()
    expect(mockInit).toHaveBeenCalled()
    expect(window.semaphore).toBeDefined()
  })

  it('ensures ketch function is set', async () => {
    delete (window as any)['ketch']
    jest.mocked(init).mockResolvedValue(undefined)
    expect(window.ketch).toBeUndefined()
    await boot()
    expect(window.ketch).toBeDefined()
  })

  it('calls init immediately when document.readyState === complete', async () => {
    const mockInit = jest.mocked(init).mockResolvedValue(undefined)

    expect(document.readyState).toBe('complete')
    await boot()
    expect(mockInit).toHaveBeenCalled()
  })

  it('addsListener when document.readyState === loading', async () => {
    const mockInit = jest.mocked(init).mockResolvedValue(undefined)
    const mockAddEventListener = jest.spyOn(document, 'addEventListener')

    jest.spyOn(document, 'readyState', 'get').mockReturnValue('loading')
    expect(document.readyState).toBe('loading')
    await boot()
    expect(mockInit).not.toHaveBeenCalled()
    expect(mockAddEventListener).toHaveBeenCalled()
    expect(mockAddEventListener.mock.lastCall).toBeDefined()
    expect(mockAddEventListener.mock.lastCall).toContain('DOMContentLoaded')
    expect(mockAddEventListener.mock.lastCall).toContainEqual({
      once: true,
    })
  })

  it('logs error on rejection when document.readyState === complete', async () => {
    const mockInit = jest.mocked(init).mockRejectedValue('oops')
    expect(document.readyState).toBe('complete')
    await boot()
    expect(mockInit).toHaveBeenCalled()
    return expect(log.error).toHaveBeenCalled()
  })
})
