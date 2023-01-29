import isFunction from './isFunction'

function fn() {}

const arrow = () => {}

describe('isFunction', () => {
  it('returns true for a old style function', () => {
    expect(isFunction(fn)).toBeTruthy()
  })

  it('returns true for a arrow function', () => {
    expect(isFunction(arrow)).toBeTruthy()
  })

  it('returns false for object', () => {
    expect(isFunction({})).toBeFalsy()
  })

  it('returns false for string', () => {
    expect(isFunction('foo')).toBeFalsy()
  })

  it('returns false for number', () => {
    expect(isFunction(123)).toBeFalsy()
  })

  it('returns false for array', () => {
    expect(isFunction([])).toBeFalsy()
  })
})
