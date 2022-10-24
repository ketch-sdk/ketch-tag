import * as scripts from './scripts'

describe('script', () => {
  describe('load', () => {
    it('loads script', () => {
      const appendChild = jest.fn()
      const addEventListener = jest.fn().mockImplementation((_1: string, listener: Function, _2: boolean) => {
        listener()
      })
      const getElementsByTagName = jest.fn().mockImplementation(() => {
        return [
          {
            appendChild,
          },
        ]
      })
      const createElement = jest.fn().mockImplementation(() => {
        return {
          src: '',
          onerror: null,
          addEventListener,
        }
      })

      Object.defineProperty(document, 'getElementsByTagName', { value: getElementsByTagName })
      Object.defineProperty(document, 'createElement', { value: createElement })

      return scripts.load('http://localhost/test.js').then(() => {
        expect(createElement).toHaveBeenCalled()
        expect(appendChild).toHaveBeenCalled()
        expect(addEventListener).toHaveBeenCalled()
        expect(getElementsByTagName).toHaveBeenCalled()
      })
    })
  })
})
