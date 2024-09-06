import log from './log'
import { safeJsonParse } from './utils'

jest.mock('./log')

describe('safeJsonParse', () => {
  it('should parse a valid JSON string correctly', () => {
    const input = '{"name":"John","age":30}'
    const expected = { name: 'John', age: 30 }
    expect(safeJsonParse(input)).toEqual(expected)
  })

  it('should return {} for an empty string', () => {
    expect(safeJsonParse('')).toEqual({})
  })

  it('should return {} for undefined input', () => {
    expect(safeJsonParse()).toEqual({})
  })

  it('should return {} for a string with only whitespace', () => {
    expect(safeJsonParse('   ')).toEqual({})
  })

  it('should log an error and return null for invalid JSON', () => {
    const invalidJson = '{"name": "John", "age":}'
    const result = safeJsonParse(invalidJson)
    expect(result).toBeNull()
    expect(log.error).toHaveBeenCalled()
  })
})
