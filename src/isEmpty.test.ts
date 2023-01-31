import isEmpty from './isEmpty'

describe('isEmpty', () => {
  it('returns true for empty object', () => {
    expect(isEmpty({})).toBeTruthy()
  })

  it('returns false for object', () => {
    expect(isEmpty({ something: true })).toBeFalsy()
  })
})
