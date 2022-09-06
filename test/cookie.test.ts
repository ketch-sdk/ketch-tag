import { getCookie, setCookie } from '../src/internal/cookie'
import errors from '../src/internal/errors'

describe('cookie', () => {
  describe('getItem', () => {
    it('returns null if not set', () => {
      return expect(getCookie('key')).rejects.toBe(errors.itemNotFoundError)
    })

    it('returns if set', () => {
      document.cookie = 'key=value'
      return expect(getCookie('key')).resolves.toEqual('value')
    })
  })

  describe('setItem', () => {
    it('returns null if not set', () => {
      return setCookie('key', 'value', 0).then(() => {
        expect(document.cookie).toBe('key=value')
      })
    })
  })
})
