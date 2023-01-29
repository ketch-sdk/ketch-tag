import errors from './errors'

describe('errors', () => {
  describe('actionNotFoundError', () => {
    it('returns action not found error', () => {
      expect(() => {
        throw errors.actionNotFoundError('fn')
      }).toThrow('action "fn" not found')
    })
  })

  describe('expectedFunctionError', () => {
    it('returns expected a function error', () => {
      expect(() => {
        throw errors.expectedFunctionError('fn')
      }).toThrow('action "fn" expected a function')
    })
  })
})
